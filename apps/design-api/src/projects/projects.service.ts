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
} from '@globallink/design-schema';
import {
  OperationExecutor,
  type Operation,
} from '@globallink/design-operations';

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
  schema: DesignProject;
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

  /** 创建项目（含初始 Screen + V0 快照） */
  async create(dto: CreateProjectDto): Promise<DesignProject> {
    const pool = this.db.getPool();
    const presets = this.getViewportCandidates(dto.platform);
    const viewport =
      (dto.viewportId
        ? presets.find((v) => this.viewportToId(v) === dto.viewportId)
        : undefined) ?? getDefaultViewport(dto.platform);
    const now = new Date().toISOString();

    // 构建初始空 Screen
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
        globalStateBindings: [],
      },
      backgroundColor: '#ffffff',
      globalStates: [],
      dataSets: [],
      activeDataSetId: '',
    };

    // INSERT project
    const projResult = await pool.query<{ id: string }>(
      `INSERT INTO design_projects (name, platform, default_viewport, current_version, latest_snapshot)
       VALUES ($1, $2, $3, 0, 0)
       RETURNING id`,
      [dto.name, dto.platform, JSON.stringify(viewport)],
    );
    const projectId = projResult.rows[0]!.id;

    // 构建完整 DesignProject 对象
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

    // 写入 V0 快照
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

  /** 核心：快照 + 重放 → 返回完整 DesignProject */
  async findOne(id: string): Promise<DesignProject> {
    const pool = this.db.getPool();

    // 1. 查询项目元数据
    const projResult = await pool.query<ProjectRow>(
      `SELECT * FROM design_projects WHERE id = $1`,
      [id],
    );
    const projRow = projResult.rows[0];
    if (!projRow) {
      throw new NotFoundException('项目不存在');
    }

    // 2. 查询最新快照
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

    // 3. 查询快照之后的操作日志
    const opsResult = await pool.query<OperationRow>(
      `SELECT * FROM design_operations
       WHERE project_id = $1 AND seq > $2
       ORDER BY seq ASC`,
      [id, snapshot.version],
    );

    // 4. 重放操作
    let project = snapshot.schema;
    if (opsResult.rows.length > 0) {
      const executor = new OperationExecutor(project);
      for (const row of opsResult.rows) {
        executor.execute(row.operation);
      }
      project = executor.getProject();
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
