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
import type { DesignProject } from '@globallink/design-schema';

/** 每隔多少次操作自动创建快照 */
const SNAPSHOT_INTERVAL = 100;

export interface OperationRow {
  id: string;
  project_id: string;
  seq: number;
  operation: Operation;
  author: string | null;
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

    // 先验证操作可执行
    const project = await this.projects.findOne(projectId);
    const executor = new OperationExecutor(project);
    const result = executor.execute(operation);
    if (!result.success) {
      throw new BadRequestException(result.description || '操作执行失败');
    }

    // 写入操作日志
    await pool.query(
      `INSERT INTO design_operations (project_id, seq, operation, author)
       VALUES ($1, $2, $3, $4)`,
      [projectId, newSeq, JSON.stringify(operation), author ?? null],
    );

    // 更新版本号
    await pool.query(
      `UPDATE design_projects SET current_version = $1, updated_at = NOW() WHERE id = $2`,
      [newSeq, projectId],
    );

    // 检查是否需要快照
    await this.maybeSnapshot(projectId);

    // WebSocket 广播
    this.gateway.broadcast(projectId, operation, newSeq, author);

    return { seq: newSeq, result };
  }

  /**
   * 批量执行操作（事务）
   */
  async executeBatch(
    projectId: string,
    operations: Operation[],
    author?: string,
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
        await client.query(
          `INSERT INTO design_operations (project_id, seq, operation, author)
           VALUES ($1, $2, $3, $4)`,
          [projectId, startSeq + i, JSON.stringify(operations[i]), author ?? null],
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
        this.gateway.broadcast(projectId, operations[i]!, startSeq + i, author);
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
