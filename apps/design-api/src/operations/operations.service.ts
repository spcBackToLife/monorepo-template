import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';
import { OperationsGateway } from './operations.gateway';
import {
  OperationExecutor,
  type Operation,
  type OperationResult,
} from '@globallink/design-operations';
import { generateNodeId, generateScreenId, generateId } from '@globallink/design-schema';
import type { DesignProject } from '@globallink/design-schema';

/** 每隔多少次操作自动创建快照 */
const SNAPSHOT_INTERVAL = 100;

/**
 * 事件溯源确定性保证：
 *
 * 事件溯源（Event Sourcing）的核心不变量是：同一组操作日志，无论重放多少次，
 * 必须得到完全相同的结果。如果某个操作在执行时调用了随机 ID 生成器（如
 * generateNodeId / generateScreenId），而该 ID 没有被写回 operation.params，
 * 那么每次重放都会生成不同的 UUID → 节点"找不到"、删除失败、ID 漂移等 bug。
 *
 * 本函数在 Service 层（存入 DB 前）统一预填充所有可能缺失的确定性 ID，
 * 确保 DB 中存储的 operation 天然包含完整信息，executor 重放时直接使用即可。
 *
 * 覆盖场景：
 * - addElement: params.elementId 缺失时预生成
 * - duplicateElement: 克隆树需要确定性 ID
 * - addScreen: params.screenId / params.rootNodeId 缺失时预生成
 * - addEvent: targetScreenId === 'new' 时自动创建 screen 的 ID
 * - addDomainState: id 缺失
 * - addEnvironmentState: id 缺失
 */
function ensureDeterministicIds(operation: Operation): void {
  const p = (operation.params ?? {}) as Record<string, unknown>;

  switch (operation.type) {
    case 'addElement': {
      if (!p.elementId) {
        p.elementId = generateNodeId();
      }
      break;
    }

    case 'duplicateElement': {
      // duplicateElement 内部会遍历克隆树对每个节点重新生成随机 ID
      // 必须预先生成并写入 params，让 executor 能读到并复用
      if (!p.newElementId) {
        p.newElementId = generateNodeId();
      }
      break;
    }

    case 'addScreen': {
      if (!p.screenId) p.screenId = generateScreenId();
      if (!p.rootNodeId) p.rootNodeId = generateNodeId();
      break;
    }

    case 'addEvent': {
      // targetScreenId === 'new' 时，event 操作会自动创建一个新 screen
      if (p.targetScreenId === 'new') {
        p._generatedScreenId = generateScreenId(); // 预生成 screen ID
        p._generatedRootNodeId = generateNodeId(); // 预生成 root node ID
      }
      break;
    }

    case 'addDomainState':
    case 'addEnvironmentState': {
      if (!p._id) p._id = generateId();
      break;
    }

    default:
      // 其他操作类型不涉及随机实体创建，无需处理
      break;
  }
}

export interface OperationRow {
  id: string;
  project_id: string;
  seq: number;
  operation: Operation;
  fingerprint: string | null;
  author: string | null;
  author_id: string | null;
  created_at: Date;
}

interface ProjectVersionRow {
  current_version: number;
  latest_snapshot: number;
}

@Injectable()
export class OperationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly projects: ProjectsService,
    @Inject(forwardRef(() => OperationsGateway))
    private readonly gateway: OperationsGateway,
  ) {}

  /**
   * 执行单条操作
   * 1. 写入 operation 日志
   * 2. 更新 current_version
   * 3. 检查是否需要创建快照
   */
  async execute(
    projectId: string,
    operation: Operation,
    author?: string,
    fingerprint?: string,
    authorId?: string,
  ): Promise<{ seq: number; result: OperationResult }> {
    const pool = this.db.getPool();

    // 验证项目存在 & 获取当前版本
    const projResult = await pool.query<ProjectVersionRow>(
      `SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1`,
      [projectId],
    );
    if (projResult.rows.length === 0) {
      throw new NotFoundException('项目不存在');
    }

    const { current_version } = projResult.rows[0]!;
    const newSeq = current_version + 1;

    // ⚠️ 确定性 ID 预处理：在执行前、存入 DB 前，预填充所有随机生成的 ID
    // 确保 DB 中的 operation 日志包含完整信息，重放时天然一致
    ensureDeterministicIds(operation);

    // 先验证操作可执行
    const project = await this.projects.findOne(projectId);
    const executor = new OperationExecutor(project);
    const result = executor.execute(operation);
    if (!result.success) {
      throw new BadRequestException(result.description || '操作执行失败');
    }

    // 写入操作日志
    await pool.query(
      `INSERT INTO design_operations (project_id, seq, operation, fingerprint, author, author_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [projectId, newSeq, JSON.stringify(operation), fingerprint ?? null, author ?? 'user', authorId ?? null],
    );

    // 更新版本号
    await pool.query(
      `UPDATE design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2`,
      [newSeq, projectId],
    );

    // 检查是否需要快照
    await this.maybeSnapshot(projectId);

    // WebSocket 广播
    this.gateway.broadcast(projectId, operation, newSeq, author, fingerprint);

    return { seq: newSeq, result };
  }

  /**
   * 批量执行操作（事务）
   */
  async executeBatch(
    projectId: string,
    operations: Operation[],
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

      // 获取当前版本
      const projResult = await client.query<ProjectVersionRow>(
        `SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1 FOR UPDATE`,
        [projectId],
      );
      if (projResult.rows.length === 0) {
        throw new NotFoundException('项目不存在');
      }

      const { current_version } = projResult.rows[0]!;

      // ⚠️ 确定性 ID 预处理：批量操作中每个操作都预填充随机 ID
      for (const op of operations) {
        ensureDeterministicIds(op);
      }

      // 先验证所有操作可执行
      const project = await this.projects.findOne(projectId);
      const executor = new OperationExecutor(project);
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
          `INSERT INTO design_operations (project_id, seq, operation, fingerprint, author, author_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [projectId, startSeq + i, JSON.stringify(operations[i]), fp, author ?? 'user', authorId ?? null],
        );
      }

      const endSeq = current_version + operations.length;

      // 更新版本号
      await client.query(
        `UPDATE design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2`,
        [endSeq, projectId],
      );

      await client.query('COMMIT');

      // 检查是否需要快照（事务提交后）
      await this.maybeSnapshot(projectId);

      // WebSocket 广播每条操作
      for (let i = 0; i < operations.length; i++) {
        const fp = fingerprints?.[i];
        this.gateway.broadcast(projectId, operations[i]!, startSeq + i, author, fp);
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
   * 增量拉取操作日志（WebSocket 断线重连用）
   */
  async findSince(
    projectId: string,
    sinceSeq: number,
  ): Promise<OperationRow[]> {
    const r = await this.db.getPool().query<OperationRow>(
      `SELECT * FROM design_operations
       WHERE project_id = $1 AND seq > $2
       ORDER BY seq ASC`,
      [projectId, sinceSeq],
    );
    return r.rows;
  }

  /**
   * 撤销最后一条操作
   * 1. 查询最后一条 operation
   * 2. 用 OperationExecutor 生成反向操作
   * 3. 写入日志
   */
  async undo(
    projectId: string,
    author?: string,
  ): Promise<{ seq: number; undoneSeq: number }> {
    const pool = this.db.getPool();

    // 获取当前项目状态
    const projResult = await pool.query<ProjectVersionRow>(
      `SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1`,
      [projectId],
    );
    if (projResult.rows.length === 0) {
      throw new NotFoundException('项目不存在');
    }
    const { current_version } = projResult.rows[0]!;

    if (current_version === 0) {
      throw new BadRequestException('没有可撤销的操作');
    }

    // 获取最后一条操作
    const lastOpResult = await pool.query<OperationRow>(
      `SELECT * FROM design_operations
       WHERE project_id = $1 AND seq = $2`,
      [projectId, current_version],
    );
    const lastOp = lastOpResult.rows[0];
    if (!lastOp) {
      throw new BadRequestException('未找到最后一条操作');
    }

    // 用 Executor 重建状态并生成 undo
    const project = await this.projects.findOne(projectId);
    const executor = new OperationExecutor(project);
    // OperationExecutor 的 undo 需要先有历史记录
    // 所以我们重新执行最后一条操作来填充历史，然后 undo
    executor.execute(lastOp.operation);
    const undoResult = executor.undo();

    if (!undoResult) {
      throw new BadRequestException('无法生成撤销操作');
    }

    // 将 undo 结果作为新操作写入日志
    // 使用 undo 后得到的项目状态创建快照策略
    const newSeq = current_version + 1;

    // 写入一条特殊的 undo 标记操作
    // 这里我们记录被撤销的操作的反向效果
    await pool.query(
      `UPDATE design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2`,
      [newSeq, projectId],
    );

    // 创建当前状态的快照来代替复杂的反向操作
    const undoneProject = executor.getProject();
    await pool.query(
      `INSERT INTO design_snapshots (project_id, version, schema)
       VALUES ($1, $2, $3)`,
      [projectId, newSeq, JSON.stringify(undoneProject)],
    );
    await pool.query(
      `UPDATE design_projects SET latest_snapshot = $1 WHERE id = $2`,
      [newSeq, projectId],
    );

    // WebSocket 广播 undo
    this.gateway.broadcastUndo(projectId, newSeq, current_version);

    return { seq: newSeq, undoneSeq: current_version };
  }

  /**
   * 重做（redo）上一次撤销的操作
   * 1. 重建项目状态
   * 2. 用 OperationExecutor 执行 redo
   * 3. 创建快照记录新状态
   */
  async redo(
    projectId: string,
    author?: string,
  ): Promise<{ seq: number }> {
    const pool = this.db.getPool();

    // 获取当前项目状态
    const projResult = await pool.query<ProjectVersionRow>(
      `SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1`,
      [projectId],
    );
    if (projResult.rows.length === 0) {
      throw new NotFoundException('项目不存在');
    }
    const { current_version } = projResult.rows[0]!;

    // 获取最后两条操作来重建 undo/redo 上下文
    const lastOpsResult = await pool.query<OperationRow>(
      `SELECT * FROM design_operations
       WHERE project_id = $1 AND seq <= $2
       ORDER BY seq DESC LIMIT 2`,
      [projectId, current_version],
    );
    if (lastOpsResult.rows.length < 2) {
      throw new BadRequestException('没有可重做的操作');
    }

    // 重建项目状态并尝试 redo
    const project = await this.projects.findOne(projectId);
    const executor = new OperationExecutor(project);

    // We need the executor to have undo history to redo.
    // Execute the second-to-last op, then undo it, so redo is available.
    const secondLast = lastOpsResult.rows[1]!;
    executor.execute(secondLast.operation);
    const undoResult = executor.undo();

    if (!undoResult) {
      throw new BadRequestException('无法重做：没有可重做的操作');
    }

    const redoResult = executor.redo();
    if (!redoResult) {
      throw new BadRequestException('无法重做：重做栈为空');
    }

    const newSeq = current_version + 1;

    // 更新版本号
    await pool.query(
      `UPDATE design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2`,
      [newSeq, projectId],
    );

    // 创建快照
    const redoneProject = executor.getProject();
    await pool.query(
      `INSERT INTO design_snapshots (project_id, version, schema)
       VALUES ($1, $2, $3)`,
      [projectId, newSeq, JSON.stringify(redoneProject)],
    );
    await pool.query(
      `UPDATE design_projects SET latest_snapshot = $1 WHERE id = $2`,
      [newSeq, projectId],
    );

    // WebSocket 广播
    this.gateway.broadcast(projectId, secondLast.operation, newSeq, author);

    return { seq: newSeq };
  }

  /**
   * 检查是否需要创建快照
   * 当 current_version - latest_snapshot >= SNAPSHOT_INTERVAL 时触发
   */
  private async maybeSnapshot(projectId: string): Promise<void> {
    const pool = this.db.getPool();

    const r = await pool.query<ProjectVersionRow>(
      `SELECT current_version, latest_snapshot FROM design_projects WHERE id = $1`,
      [projectId],
    );
    const row = r.rows[0];
    if (!row) return;

    const { current_version, latest_snapshot } = row;
    if (current_version - latest_snapshot < SNAPSHOT_INTERVAL) {
      return;
    }

    // 恢复完整状态并写入快照
    const project = await this.projects.findOne(projectId);
    await pool.query(
      `INSERT INTO design_snapshots (project_id, version, schema)
       VALUES ($1, $2, $3)`,
      [projectId, current_version, JSON.stringify(project)],
    );
    await pool.query(
      `UPDATE design_projects SET latest_snapshot = $1 WHERE id = $2`,
      [current_version, projectId],
    );
  }
}
