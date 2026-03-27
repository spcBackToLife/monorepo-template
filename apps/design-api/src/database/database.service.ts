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
        author        VARCHAR(255),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, seq)
      );
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
