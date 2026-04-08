import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { MaterialProjectsService } from './material-projects.service';
import { MaterialEditorGateway } from './material-editor.gateway';
import { DatabaseService } from '../../database/database.service';
import {
  MaterialOperationExecutor,
  createMaterialProject,
  type MaterialOperation,
  type MaterialProjectSchema,
  type OperationResult,
} from '@globallink/material-operations';

/** 每隔多少次操作自动创建快照 */
const SNAPSHOT_INTERVAL = 50;

/** 数据库行类型 */
interface MaterialVersionRow {
  current_version: number;
  latest_snapshot: number;
}

export interface MaterialOperationRow {
  id: string;
  project_id: string;
  material_id: string;
  seq: number;
  operation: MaterialOperation;
  fingerprint: string | null;
  author: string | null;
  author_id: string | null;
  created_at: Date;
}

/**
 * 素材编辑器操作服务
 *
 * v2 改造：后端是数据唯一真相来源
 *
 * 数据流：
 *   MCP/前端 → REST/WS → execute() → MaterialOperationExecutor 执行
 *   → 写入 material_operations 操作日志 → 更新版本 → 检查快照 → WS 广播
 *
 * 与 OperationsService（设计编辑器）完全同构。
 */
@Injectable()
export class MaterialEditorService {
  private readonly logger = new Logger(MaterialEditorService.name);

  /** 内存中的 Executor 实例缓存（materialId → executor） */
  private executorCache = new Map<string, MaterialOperationExecutor>();

  constructor(
    private readonly materialProjects: MaterialProjectsService,
    @Inject(forwardRef(() => MaterialEditorGateway))
    private readonly gateway: MaterialEditorGateway,
    private readonly db: DatabaseService,
  ) {}

  // ===================================================================
  // 核心操作 API — 与 design-api OperationsService 同构
  // ===================================================================

  /**
   * 执行单条素材操作
   *
   * 1. 获取/重建当前 Schema
   * 2. 用 MaterialOperationExecutor 执行操作
   * 3. 写入 material_operations 日志
   * 4. 更新 current_version
   * 5. 检查是否需要快照
   * 6. WS 广播
   */
  async execute(
    projectId: string,
    materialId: string,
    operation: MaterialOperation,
    author?: string,
    fingerprint?: string,
    authorId?: string,
  ): Promise<{ seq: number; result: OperationResult }> {
    const pool = this.db.getPool();

    // 1. 获取当前版本
    const verRow = await this.getMaterialVersion(projectId, materialId);
    const newSeq = verRow.current_version + 1;

    // 2. 获取 Executor 并执行操作
    const executor = await this.getOrCreateExecutor(projectId, materialId);
    const result = executor.execute(operation);
    if (!result.success) {
      throw new BadRequestException(result.description || '操作执行失败');
    }

    // 3. 写入操作日志
    await pool.query(
      `INSERT INTO material_operations (project_id, material_id, seq, operation, fingerprint, author, author_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [projectId, materialId, newSeq, JSON.stringify(operation), fingerprint ?? null, author ?? 'user', authorId ?? null],
    );

    // 4. 更新版本号
    await pool.query(
      `UPDATE material_design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2 AND project_id = $3`,
      [newSeq, materialId, projectId],
    );

    // 5. 检查快照
    await this.maybeSnapshot(projectId, materialId);

    // 6. WS 广播
    this.gateway.broadcastOperation(projectId, materialId, operation, newSeq, author, fingerprint);

    this.logger.log(
      `Executed material operation: ${operation.type} for material ${materialId} (seq=${newSeq})`,
    );

    return { seq: newSeq, result };
  }

  /**
   * 批量执行操作（事务）
   */
  async executeBatch(
    projectId: string,
    materialId: string,
    operations: MaterialOperation[],
    author?: string,
    fingerprints?: string[],
    authorId?: string,
  ): Promise<{ startSeq: number; endSeq: number; results: OperationResult[] }> {
    if (operations.length === 0) {
      throw new BadRequestException('操作列表不能为空');
    }

    const pool = this.db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 获取当前版本（加锁）
      const verResult = await client.query<MaterialVersionRow>(
        `SELECT current_version, latest_snapshot FROM material_design_projects WHERE id = $1 AND project_id = $2 FOR UPDATE`,
        [materialId, projectId],
      );
      if (verResult.rows.length === 0) {
        throw new NotFoundException('素材工程不存在');
      }
      const { current_version } = verResult.rows[0]!;

      // 获取 Executor 并执行所有操作
      const executor = await this.getOrCreateExecutor(projectId, materialId);
      const results: OperationResult[] = [];

      for (const op of operations) {
        const result = executor.execute(op);
        if (!result.success) {
          throw new BadRequestException(result.description || '批量操作中有失败项');
        }
        results.push(result);
      }

      // 批量写入操作日志
      const startSeq = current_version + 1;
      for (let i = 0; i < operations.length; i++) {
        const fp = fingerprints?.[i] ?? null;
        await client.query(
          `INSERT INTO material_operations (project_id, material_id, seq, operation, fingerprint, author, author_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [projectId, materialId, startSeq + i, JSON.stringify(operations[i]), fp, author ?? 'user', authorId ?? null],
        );
      }

      const endSeq = current_version + operations.length;

      // 更新版本号
      await client.query(
        `UPDATE material_design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2 AND project_id = $3`,
        [endSeq, materialId, projectId],
      );

      await client.query('COMMIT');

      // 检查快照（事务提交后）
      await this.maybeSnapshot(projectId, materialId);

      // WS 广播每条操作
      for (let i = 0; i < operations.length; i++) {
        const fp = fingerprints?.[i];
        this.gateway.broadcastOperation(projectId, materialId, operations[i]!, startSeq + i, author, fp);
      }

      return { startSeq, endSeq, results };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 增量拉取操作日志（断线重连用）
   */
  async findSince(
    projectId: string,
    materialId: string,
    sinceSeq: number,
  ): Promise<MaterialOperationRow[]> {
    const r = await this.db.getPool().query<MaterialOperationRow>(
      `SELECT * FROM material_operations
       WHERE project_id = $1 AND material_id = $2 AND seq > $3
       ORDER BY seq ASC`,
      [projectId, materialId, sinceSeq],
    );
    return r.rows;
  }

  /**
   * 获取素材工程完整 Schema（快照+重放恢复）
   */
  async getSchema(
    projectId: string,
    materialId: string,
  ): Promise<MaterialProjectSchema> {
    const executor = await this.getOrCreateExecutor(projectId, materialId);
    return executor.getProject();
  }

  /**
   * 撤销最后一条操作
   *
   * 与 OperationsService.undo() 同构：
   * 1. 获取 Executor（内含 HistoryManager 的 undo/redo 双栈）
   * 2. 调用 executor.undo()
   * 3. 创建快照记录新状态
   * 4. 广播 undo 事件
   */
  async undo(
    projectId: string,
    materialId: string,
    author?: string,
  ): Promise<{ seq: number; undoneSeq: number }> {
    const pool = this.db.getPool();

    const verRow = await this.getMaterialVersion(projectId, materialId);
    const { current_version } = verRow;

    if (current_version === 0) {
      throw new BadRequestException('没有可撤销的操作');
    }

    // 获取 Executor 并调用 undo
    const executor = await this.getOrCreateExecutor(projectId, materialId);
    const undoResult = executor.undo();

    if (!undoResult.success) {
      throw new BadRequestException(undoResult.description || '没有可撤销的操作（undo 栈为空）');
    }

    const newSeq = current_version + 1;

    // 更新版本号
    await pool.query(
      `UPDATE material_design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2 AND project_id = $3`,
      [newSeq, materialId, projectId],
    );

    // 创建快照记录 undo 后的状态
    const undoneProject = executor.getProject();
    await pool.query(
      `INSERT INTO material_snapshots (project_id, material_id, version, schema)
       VALUES ($1, $2, $3, $4)`,
      [projectId, materialId, newSeq, JSON.stringify(undoneProject)],
    );
    await pool.query(
      `UPDATE material_design_projects SET latest_snapshot = $1 WHERE id = $2 AND project_id = $3`,
      [newSeq, materialId, projectId],
    );

    // 广播 undo 事件
    this.gateway.broadcastUndo(projectId, materialId, newSeq, current_version);

    this.logger.log(
      `Undo for material ${materialId}: undone seq ${current_version}, new seq ${newSeq}`,
    );

    return { seq: newSeq, undoneSeq: current_version };
  }

  /**
   * 重做上一次撤销的操作
   */
  async redo(
    projectId: string,
    materialId: string,
    author?: string,
  ): Promise<{ seq: number }> {
    const pool = this.db.getPool();

    const verRow = await this.getMaterialVersion(projectId, materialId);
    const { current_version } = verRow;

    // 获取 Executor 并调用 redo
    const executor = await this.getOrCreateExecutor(projectId, materialId);
    const redoResult = executor.redo();

    if (!redoResult.success) {
      throw new BadRequestException(redoResult.description || '没有可重做的操作（redo 栈为空）');
    }

    const newSeq = current_version + 1;

    // 更新版本号
    await pool.query(
      `UPDATE material_design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2 AND project_id = $3`,
      [newSeq, materialId, projectId],
    );

    // 创建快照
    const redoneProject = executor.getProject();
    await pool.query(
      `INSERT INTO material_snapshots (project_id, material_id, version, schema)
       VALUES ($1, $2, $3, $4)`,
      [projectId, materialId, newSeq, JSON.stringify(redoneProject)],
    );
    await pool.query(
      `UPDATE material_design_projects SET latest_snapshot = $1 WHERE id = $2 AND project_id = $3`,
      [newSeq, materialId, projectId],
    );

    // 广播 redo — 通知前端重新同步 Schema
    // 使用与 undo 同样的快照同步方式（前端收到后从 getSchema 刷新）
    this.gateway.broadcastUndo(projectId, materialId, newSeq, current_version);

    this.logger.log(
      `Redo for material ${materialId}: new seq ${newSeq}`,
    );

    return { seq: newSeq };
  }

  // ===================================================================
  // 预设与能力清单
  // ===================================================================

  /**
   * 获取操作能力清单
   */
  getCapabilities(): {
    operations: string[];
    legacyActions: string[];
  } {
    return {
      operations: [
        'me:setBackgroundColor', 'me:resizeCanvas', 'me:resizeReferenceFrame',
        'me:addObject', 'me:removeObject', 'me:updateObject', 'me:duplicateObject',
        'me:reorderObject', 'me:setVisibility', 'me:setLock', 'me:renameObject',
        'me:setFill', 'me:setStroke', 'me:setOpacity', 'me:setShadow', 'me:setBlendMode',
        'me:groupObjects', 'me:ungroupObjects',
        'me:updateText',
      ],
      legacyActions: ['(deprecated) Use operations instead'],
    };
  }

  /**
   * 获取预设数据（纯只读）
   */
  getPresets(presetType?: string): Record<string, unknown> {
    const presets: Record<string, unknown> = {
      gradients: [
        { name: '日出渐变', type: 'linear', angle: 135, stops: [{ offset: 0, color: '#ff6b6b' }, { offset: 1, color: '#feca57' }] },
        { name: '海洋渐变', type: 'linear', angle: 180, stops: [{ offset: 0, color: '#667eea' }, { offset: 1, color: '#764ba2' }] },
        { name: '薄荷绿', type: 'linear', angle: 120, stops: [{ offset: 0, color: '#a8edea' }, { offset: 1, color: '#fed6e3' }] },
        { name: '深空', type: 'linear', angle: 45, stops: [{ offset: 0, color: '#0c0c1d' }, { offset: 0.5, color: '#1a1a2e' }, { offset: 1, color: '#16213e' }] },
        { name: '极光', type: 'linear', angle: 90, stops: [{ offset: 0, color: '#00d2ff' }, { offset: 1, color: '#3a7bd5' }] },
      ],
      shadows: [
        { name: '轻柔阴影', css: '0 2px 8px rgba(0,0,0,0.1)' },
        { name: '中等阴影', css: '0 4px 16px rgba(0,0,0,0.15)' },
        { name: '深度阴影', css: '0 8px 32px rgba(0,0,0,0.2)' },
      ],
    };

    if (presetType) {
      const typeMap: Record<string, string> = {
        listGradientPresets: 'gradients',
        listShadowPresets: 'shadows',
      };
      const key = typeMap[presetType];
      if (key) return { [key]: presets[key] };
    }

    return presets;
  }

  // ===================================================================
  // 内部方法
  // ===================================================================

  /**
   * 获取或创建 Executor（带内存缓存）
   *
   * 恢复流程（与 design-api ProjectsService.findOne 同构）：
   *   1. 查最新快照
   *   2. 查快照后的操作日志
   *   3. 重放操作 → 得到完整 Schema
   */
  private async getOrCreateExecutor(
    projectId: string,
    materialId: string,
  ): Promise<MaterialOperationExecutor> {
    // 检查缓存
    const cacheKey = `${projectId}:${materialId}`;
    const cached = this.executorCache.get(cacheKey);
    if (cached) return cached;

    // 从数据库重建
    const schema = await this.rebuildSchema(projectId, materialId);
    const executor = new MaterialOperationExecutor(schema);
    this.executorCache.set(cacheKey, executor);
    return executor;
  }

  /**
   * 从快照+操作日志重建完整 Schema
   */
  private async rebuildSchema(
    projectId: string,
    materialId: string,
  ): Promise<MaterialProjectSchema> {
    const pool = this.db.getPool();

    // 1. 查最新快照
    const snapResult = await pool.query<{ version: number; schema: MaterialProjectSchema }>(
      `SELECT version, schema FROM material_snapshots
       WHERE project_id = $1 AND material_id = $2
       ORDER BY version DESC LIMIT 1`,
      [projectId, materialId],
    );

    let schema: MaterialProjectSchema;
    let fromVersion = 0;

    if (snapResult.rows.length > 0) {
      const snap = snapResult.rows[0]!;
      schema = snap.schema;
      fromVersion = snap.version;
    } else {
      // 没有快照，查基础记录构造初始 Schema
      const rec = await this.materialProjects.findOne(projectId, materialId);
      if (!rec) {
        throw new NotFoundException('素材工程不存在');
      }
      schema = createMaterialProject(
        rec.id,
        rec.projectId,
        rec.name,
        rec.referenceFrameWidth || rec.canvasWidth,
        rec.referenceFrameHeight || rec.canvasHeight,
        rec.canvasWidth,
        rec.canvasHeight,
      );
      schema.backgroundColor = rec.backgroundColor || '#ffffff';
      if (rec.referenceFrameWidth && rec.referenceFrameHeight) {
        schema.referenceFrame = {
          enabled: true,
          width: rec.referenceFrameWidth,
          height: rec.referenceFrameHeight,
        };
      }
    }

    // 2. 查快照之后的操作日志
    const opsResult = await pool.query<{ operation: MaterialOperation }>(
      `SELECT operation FROM material_operations
       WHERE project_id = $1 AND material_id = $2 AND seq > $3
       ORDER BY seq ASC`,
      [projectId, materialId, fromVersion],
    );

    // 3. 重放操作
    if (opsResult.rows.length > 0) {
      const executor = new MaterialOperationExecutor(schema);
      for (const row of opsResult.rows) {
        executor.execute(row.operation);
      }
      schema = executor.getProject();
    }

    return schema;
  }

  /**
   * 获取素材工程的版本信息
   */
  private async getMaterialVersion(
    projectId: string,
    materialId: string,
  ): Promise<MaterialVersionRow> {
    const r = await this.db.getPool().query<MaterialVersionRow>(
      `SELECT current_version, latest_snapshot FROM material_design_projects WHERE id = $1 AND project_id = $2`,
      [materialId, projectId],
    );
    if (r.rows.length === 0) {
      throw new NotFoundException('素材工程不存在');
    }
    return r.rows[0]!;
  }

  /**
   * 自动快照检查
   */
  private async maybeSnapshot(projectId: string, materialId: string): Promise<void> {
    const pool = this.db.getPool();

    const r = await pool.query<MaterialVersionRow>(
      `SELECT current_version, latest_snapshot FROM material_design_projects WHERE id = $1 AND project_id = $2`,
      [materialId, projectId],
    );
    const row = r.rows[0];
    if (!row) return;

    const { current_version, latest_snapshot } = row;
    if (current_version - latest_snapshot < SNAPSHOT_INTERVAL) return;

    // 重建完整状态并写入快照
    const schema = await this.rebuildSchema(projectId, materialId);
    await pool.query(
      `INSERT INTO material_snapshots (project_id, material_id, version, schema)
       VALUES ($1, $2, $3, $4)`,
      [projectId, materialId, current_version, JSON.stringify(schema)],
    );
    await pool.query(
      `UPDATE material_design_projects SET latest_snapshot = $1 WHERE id = $2 AND project_id = $3`,
      [current_version, materialId, projectId],
    );

    this.logger.log(
      `Created snapshot for material ${materialId} at version ${current_version}`,
    );
  }

  /**
   * 清除 Executor 缓存（用于测试或强制刷新）
   */
  clearExecutorCache(materialId?: string): void {
    if (materialId) {
      for (const key of this.executorCache.keys()) {
        if (key.endsWith(`:${materialId}`)) {
          this.executorCache.delete(key);
        }
      }
    } else {
      this.executorCache.clear();
    }
  }
}
