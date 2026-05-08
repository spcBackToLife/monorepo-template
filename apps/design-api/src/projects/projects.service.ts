import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import {
  type DesignProject,
  type Screen,
  type Viewport,
  MOBILE_VIEWPORTS,
  TABLET_VIEWPORTS,
  DESKTOP_VIEWPORTS,
  getDefaultViewport,
  generateScreenId,
  generateNodeId,
  normalizeNode,
} from '@globallink/design-schema';
import {
  OperationExecutor,
  type Operation,
} from '@globallink/design-operations';
import { migrateV1toV2 } from '../migrations/v1-to-v2-state-model';

// ===== DB row types =====

export interface ProjectRow {
  id: string;
  name: string;
  platform: 'pc' | 'mobile';
  default_viewport: Viewport;
  current_version: number;
  latest_snapshot: number;
  thumbnail: string | null;
  created_at: Date;
  updated_at: Date;
}

interface SnapshotRow {
  id: string;
  project_id: string;
  version: number;
  /** DB 存 JSONB；可能是 v1 或 v2，findOne 统一过迁移层得到 v2 */
  schema: unknown;
  created_at: Date;
}

interface OperationRow {
  id: string;
  project_id: string;
  seq: number;
  operation: Operation;
  author: string | null;
  created_at: Date;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  private viewportToId(v: Viewport): string {
    return `${v.platform}:${v.name}`;
  }

  private getViewportCandidates(platform: 'pc' | 'mobile'): Viewport[] {
    return platform === 'mobile'
      ? [...MOBILE_VIEWPORTS, ...TABLET_VIEWPORTS]
      : DESKTOP_VIEWPORTS;
  }

  /** 创建项目（含初始 Screen + V0 快照，v2 schema） */
  async create(dto: CreateProjectDto): Promise<DesignProject> {
    const pool = this.db.getPool();
    const presets = this.getViewportCandidates(dto.platform);
    const viewport =
      (dto.viewportId
        ? presets.find((v) => this.viewportToId(v) === dto.viewportId)
        : undefined) ?? getDefaultViewport(dto.platform);
    const now = new Date().toISOString();

    // v2 初始 Screen（删除 v1 字段 domainStates；state init 默认留空）
    const initialScreen: Screen = {
      id: generateScreenId(),
      name: 'Screen 1',
      rootNode: {
        id: generateNodeId(),
        type: 'div',
        name: 'Root',
        styles: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100%',
          backgroundColor: '#ffffff',
        },
        props: {},
        states: [],
        activeState: 'default',
        events: [],
        locked: false,
        visible: true,
      },
      backgroundColor: '#ffffff',
      dataSources: [],
    };

    const projResult = await pool.query<{ id: string }>(
      `INSERT INTO design_projects (name, platform, default_viewport, current_version, latest_snapshot)
       VALUES ($1, $2, $3, 0, 0)
       RETURNING id`,
      [dto.name, dto.platform, JSON.stringify(viewport)],
    );
    const projectId = projResult.rows[0]!.id;

    // v2 DesignProject（删除 v1 字段 environmentStates）
    const project: DesignProject = {
      id: projectId,
      name: dto.name,
      platform: dto.platform,
      defaultViewport: viewport,
      currentViewport: viewport,
      viewportPresets: presets,
      screens: [initialScreen],
      componentAssets: [],
      createdAt: now,
      updatedAt: now,
    };

    await pool.query(
      `INSERT INTO design_snapshots (project_id, version, schema)
       VALUES ($1, 0, $2)`,
      [projectId, JSON.stringify(project)],
    );

    return project;
  }

  /** 获取项目列表 */
  async findAll(): Promise<Omit<ProjectRow, 'default_viewport'>[]> {
    const r = await this.db.getPool().query<ProjectRow>(
      `SELECT id, name, platform, thumbnail, current_version, created_at, updated_at
       FROM design_projects
       ORDER BY updated_at DESC`,
    );
    return r.rows;
  }

  /**
   * 核心：快照 + 重放 → 返回完整 DesignProject（v2）
   *
   * 关键路径上接入 **v1 → v2 迁移层**（RFC §4.1）：
   * 1. 查最新快照
   * 2. 先跑 `migrateV1toV2(snapshot.schema)` —— DB 未升级时得到正确 v2 形态
   * 3. 重放快照之后的 op（executor 一律按 v2 协议）
   * 4. 规范化节点
   *
   * 迁移层在 F.2 阶段删除（全库永久升级完毕后）。
   */
  async findOne(id: string): Promise<DesignProject> {
    const pool = this.db.getPool();

    const projResult = await pool.query<ProjectRow>(
      `SELECT * FROM design_projects WHERE id = $1`,
      [id],
    );
    const projRow = projResult.rows[0];
    if (!projRow) {
      throw new NotFoundException('项目不存在');
    }

    const snapResult = await pool.query<SnapshotRow>(
      `SELECT * FROM design_snapshots
       WHERE project_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [id],
    );
    const snapshot = snapResult.rows[0];
    if (!snapshot) {
      throw new NotFoundException('项目快照不存在');
    }

    const opsResult = await pool.query<OperationRow>(
      `SELECT * FROM design_operations
       WHERE project_id = $1 AND seq > $2
       ORDER BY seq ASC`,
      [id, snapshot.version],
    );

    // 关键：先迁移为 v2，再喂给 v2 executor
    let project: DesignProject = migrateV1toV2(snapshot.schema);

    if (opsResult.rows.length > 0) {
      const executor = new OperationExecutor(project);
      for (const row of opsResult.rows) {
        executor.execute(row.operation);
      }
      project = executor.getProject();
    }

    // 规范化：确保所有节点的 props/states/events/styles 字段存在
    for (const screen of project.screens ?? []) {
      if (screen.rootNode) normalizeNode(screen.rootNode);
    }
    for (const asset of project.componentAssets ?? []) {
      if (asset.schema) normalizeNode(asset.schema);
    }

    return project;
  }

  /** 删除项目（CASCADE 自动清理 operations + snapshots） */
  async remove(id: string): Promise<void> {
    const result = await this.db.getPool().query(
      `DELETE FROM design_projects WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('项目不存在');
    }
  }

  /** 更新项目缩略图 */
  async updateThumbnail(id: string, thumbnail: string): Promise<void> {
    await this.db.getPool().query(
      `UPDATE design_projects SET thumbnail = $1, updated_at = NOW() WHERE id = $2`,
      [thumbnail, id],
    );
  }
}
