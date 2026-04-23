import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('缺少环境变量 DATABASE_URL（见 .env.example）');
    }
    this.pool = new Pool({ connectionString, max: 10 });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ===== Design 模块表 =====

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS design_projects (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(255) NOT NULL,
        platform         VARCHAR(20) NOT NULL,
        default_viewport JSONB NOT NULL,
        current_version  INTEGER NOT NULL DEFAULT 0,
        latest_snapshot  INTEGER NOT NULL DEFAULT 0,
        thumbnail        TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS design_operations (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id    UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
        seq           INTEGER NOT NULL,
        operation     JSONB NOT NULL,
        fingerprint   VARCHAR(100),
        author        VARCHAR(128) DEFAULT 'user',
        author_id     VARCHAR(100),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, seq)
      );
    `);

    // Migrate: add new columns to existing tables (idempotent)
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'design_operations' AND column_name = 'fingerprint'
        ) THEN
          ALTER TABLE design_operations ADD COLUMN fingerprint VARCHAR(100);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'design_operations' AND column_name = 'author_id'
        ) THEN
          ALTER TABLE design_operations ADD COLUMN author_id VARCHAR(100);
        END IF;
      END $$;
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ops_project_seq
        ON design_operations(project_id, seq);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS design_snapshots (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id    UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
        version       INTEGER NOT NULL,
        schema        JSONB NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_snap_project_version
        ON design_snapshots(project_id, version);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS component_assets (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(255) NOT NULL,
        description   TEXT,
        category      VARCHAR(100),
        tags          TEXT[],
        scope         VARCHAR(20) NOT NULL,
        project_id    UUID REFERENCES design_projects(id) ON DELETE CASCADE,
        schema        JSONB NOT NULL,
        thumbnail     TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ===== 素材编辑器工程文件表 =====
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS material_design_projects (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id            UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
        target_node_id        VARCHAR(255),
        name                  VARCHAR(255) NOT NULL,
        canvas_width          INTEGER NOT NULL,
        canvas_height         INTEGER NOT NULL,
        canvas_json           JSONB NOT NULL,
        background_color      VARCHAR(50) NOT NULL DEFAULT '#ffffff',
        reference_frame_width  INTEGER,
        reference_frame_height INTEGER,
        file_version          INTEGER NOT NULL DEFAULT 3,
        thumbnail_url         TEXT,
        exported_material_id  VARCHAR(255),
        tags                  TEXT[],
        version               INTEGER NOT NULL DEFAULT 1,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mdp_project
        ON material_design_projects(project_id);
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mdp_target_node
        ON material_design_projects(project_id, target_node_id);
    `);

    // ===== 素材槽位关联表（节点 ↔ 素材工程多对多） =====
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS node_material_slots (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id            UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
        node_id               VARCHAR(255) NOT NULL,
        slot_name             VARCHAR(100) NOT NULL DEFAULT 'default',
        material_project_id   UUID NOT NULL REFERENCES material_design_projects(id) ON DELETE CASCADE,
        sort_order            INTEGER NOT NULL DEFAULT 0,
        css_target            VARCHAR(100) DEFAULT 'background-image',
        is_active             BOOLEAN NOT NULL DEFAULT true,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, node_id, slot_name)
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nms_project_node
        ON node_material_slots(project_id, node_id);
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nms_material_project
        ON node_material_slots(material_project_id);
    `);

    // Migrate: add 操作系统所需字段到 material_design_projects（幂等）
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'material_design_projects' AND column_name = 'current_version'
        ) THEN
          ALTER TABLE material_design_projects ADD COLUMN current_version INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'material_design_projects' AND column_name = 'latest_snapshot'
        ) THEN
          ALTER TABLE material_design_projects ADD COLUMN latest_snapshot INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);

    // ===== 素材操作日志表（与 design_operations 同构） =====
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS material_operations (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id    UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
        material_id   UUID NOT NULL REFERENCES material_design_projects(id) ON DELETE CASCADE,
        seq           INTEGER NOT NULL,
        operation     JSONB NOT NULL,
        fingerprint   VARCHAR(100),
        author        VARCHAR(128) DEFAULT 'user',
        author_id     VARCHAR(100),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(material_id, seq)
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mat_ops_material_seq
        ON material_operations(material_id, seq);
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mat_ops_project
        ON material_operations(project_id);
    `);

    // Migrate: widen author (scripts/MCP may use labels longer than legacy VARCHAR(10))
    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = current_schema()
            AND c.table_name = 'design_operations'
            AND c.column_name = 'author'
            AND c.data_type = 'character varying'
            AND c.character_maximum_length IS NOT NULL
            AND c.character_maximum_length < 128
        ) THEN
          ALTER TABLE design_operations ALTER COLUMN author TYPE VARCHAR(128);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = current_schema()
            AND c.table_name = 'material_operations'
            AND c.column_name = 'author'
            AND c.data_type = 'character varying'
            AND c.character_maximum_length IS NOT NULL
            AND c.character_maximum_length < 128
        ) THEN
          ALTER TABLE material_operations ALTER COLUMN author TYPE VARCHAR(128);
        END IF;
      END $$;
    `);

    // ===== 素材快照表（与 design_snapshots 同构） =====
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS material_snapshots (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id    UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
        material_id   UUID NOT NULL REFERENCES material_design_projects(id) ON DELETE CASCADE,
        version       INTEGER NOT NULL,
        schema        JSONB NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mat_snap_material_version
        ON material_snapshots(material_id, version);
    `);
  }

  getPool(): Pool {
    return this.pool;
  }

  async check(): Promise<
    { ok: true; version: string } | { ok: false; error: string }
  > {
    try {
      const r = await this.pool.query<{ v: string }>('SELECT version() AS v');
      const row = r.rows[0];
      if (!row) return { ok: false, error: 'empty result' };
      return { ok: true, version: row.v };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
