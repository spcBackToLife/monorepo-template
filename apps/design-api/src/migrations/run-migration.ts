/**
 * 一次性数据迁移脚本：v1 → v2 state-action-expression schema
 *
 * 执行流程（幂等）：
 *   1. 准备备份表 `design_snapshots_v1_backup`（不存在则建）
 *   2. 遍历 `design_snapshots` 的**每一行**
 *   3. 若该行不在备份表中：写入备份
 *   4. 通过 `migrateV1toV2()` 转换 schema
 *   5. UPDATE 回 `design_snapshots.schema`
 *   6. 统计 & 日志
 *
 * 用法（命令行）：
 *   pnpm --filter @globallink/design-api build
 *   node dist/migrations/run-migration.js         # 正式跑
 *   node dist/migrations/run-migration.js --dry   # 试跑（不写回）
 *
 * 关联 RFC：design_docs/03-tech/state-action-expression-rfc.md §4.3
 */

import 'reflect-metadata';
import { Pool } from 'pg';
import { migrateV1toV2 } from './v1-to-v2-state-model';

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ projectId: string; version: number; error: string }>;
}

interface SnapshotRow {
  id: string;
  project_id: string;
  version: number;
  schema: unknown;
}

async function ensureBackupTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS design_snapshots_v1_backup (
      id            UUID PRIMARY KEY,
      project_id    UUID NOT NULL,
      version       INTEGER NOT NULL,
      schema        JSONB NOT NULL,
      backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_v1_backup_project_version
      ON design_snapshots_v1_backup(project_id, version);
  `);
}

async function backupSnapshot(pool: Pool, row: SnapshotRow): Promise<void> {
  await pool.query(
    `INSERT INTO design_snapshots_v1_backup (id, project_id, version, schema)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [row.id, row.project_id, row.version, JSON.stringify(row.schema)],
  );
}

function looksLikeV1(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return false;
  const s = schema as Record<string, unknown>;
  if (Array.isArray(s.environmentStates) && s.environmentStates.length > 0) return true;
  const screens = Array.isArray(s.screens) ? s.screens : [];
  for (const scrRaw of screens) {
    const scr = (scrRaw ?? {}) as Record<string, unknown>;
    if (Array.isArray(scr.domainStates) && scr.domainStates.length > 0) return true;
    const dss = Array.isArray(scr.dataSources) ? (scr.dataSources as unknown[]) : [];
    for (const dsRaw of dss) {
      const ds = (dsRaw ?? {}) as Record<string, unknown>;
      if ('lifecycle' in ds) return true;
      if (Array.isArray(ds.scenarios) && !('mock' in ds)) return true;
    }
  }
  return false;
}

async function run(): Promise<void> {
  const isDry = process.argv.includes('--dry');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[migration] 缺少环境变量 DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 5 });
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log(`[migration] start (mode=${isDry ? 'DRY-RUN' : 'APPLY'})`);

  try {
    if (!isDry) {
      await ensureBackupTable(pool);
    }

    const { rows } = await pool.query<SnapshotRow>(
      `SELECT id, project_id, version, schema
       FROM design_snapshots
       ORDER BY project_id, version`,
    );
    stats.total = rows.length;

    for (const row of rows) {
      try {
        if (!looksLikeV1(row.schema)) {
          stats.skipped += 1;
          continue;
        }

        const migrated = migrateV1toV2(row.schema);

        if (isDry) {
          stats.migrated += 1;
          continue;
        }

        await backupSnapshot(pool, row);
        await pool.query(
          `UPDATE design_snapshots SET schema = $1 WHERE id = $2`,
          [JSON.stringify(migrated), row.id],
        );
        stats.migrated += 1;
      } catch (e) {
        stats.failed += 1;
        const message = e instanceof Error ? e.message : String(e);
        stats.errors.push({
          projectId: row.project_id,
          version: row.version,
          error: message,
        });
        console.error(
          `[migration] FAIL project=${row.project_id} version=${row.version}: ${message}`,
        );
      }
    }

    console.log('[migration] done');
    console.log(`  total    : ${stats.total}`);
    console.log(`  migrated : ${stats.migrated}`);
    console.log(`  skipped  : ${stats.skipped}`);
    console.log(`  failed   : ${stats.failed}`);
    if (stats.errors.length > 0) {
      console.log('  errors   :');
      for (const e of stats.errors) {
        console.log(`    - project=${e.projectId} v=${e.version}: ${e.error}`);
      }
    }

    process.exit(stats.failed > 0 ? 2 : 0);
  } finally {
    await pool.end();
  }
}

run().catch((e) => {
  console.error('[migration] fatal:', e);
  process.exit(1);
});
