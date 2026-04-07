import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { StorageProvider, FileMeta } from './storage/storage-provider.interface';

/**
 * 素材编辑器工程文件记录（数据库行映射）
 *
 * 类似 PSD/Figma 文件：保存完整的 Fabric.js 画布 JSON，
 * 让用户可以重新打开并继续编辑素材。
 */
export interface MaterialProjectRecord {
  id: string;
  projectId: string;
  targetNodeId: string | null;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasJSON: Record<string, unknown>;
  backgroundColor: string;
  referenceFrameWidth: number | null;
  referenceFrameHeight: number | null;
  fileVersion: number;
  thumbnailUrl: string | null;
  exportedMaterialId: string | null;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** 数据库行类型 */
interface MaterialProjectRow {
  id: string;
  project_id: string;
  target_node_id: string | null;
  name: string;
  canvas_width: number;
  canvas_height: number;
  canvas_json: Record<string, unknown>;
  background_color: string;
  reference_frame_width: number | null;
  reference_frame_height: number | null;
  file_version: number;
  thumbnail_url: string | null;
  exported_material_id: string | null;
  tags: string[] | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

/** 数据库行 → API 返回的记录 */
function rowToRecord(row: MaterialProjectRow): MaterialProjectRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    targetNodeId: row.target_node_id,
    name: row.name,
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    canvasJSON: row.canvas_json,
    backgroundColor: row.background_color,
    referenceFrameWidth: row.reference_frame_width,
    referenceFrameHeight: row.reference_frame_height,
    fileVersion: row.file_version,
    thumbnailUrl: row.thumbnail_url,
    exportedMaterialId: row.exported_material_id,
    tags: row.tags ?? [],
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** 列表返回的摘要信息（不含完整 canvasJSON） */
export interface MaterialProjectSummary {
  id: string;
  projectId: string;
  targetNodeId: string | null;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  referenceFrameWidth: number | null;
  referenceFrameHeight: number | null;
  thumbnailUrl: string | null;
  exportedMaterialId: string | null;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 素材编辑器工程文件服务
 *
 * 保存素材编辑器的完整 Fabric.js 画布状态（canvasJSON），
 * 让用户可以随时重新打开并继续编辑——类似 PSD 可编辑源文件。
 *
 * 存储策略：
 *   - 工程元数据 + canvasJSON → PostgreSQL（material_design_projects 表）
 *   - 导出的 PNG/SVG 素材文件 → StorageProvider（LocalStorage → 后续 S3）
 */
@Injectable()
export class MaterialProjectsService {
  constructor(
    private readonly db: DatabaseService,
    @Inject('STORAGE_PROVIDER') private readonly storage: StorageProvider,
  ) {}

  /**
   * 创建素材工程
   */
  async create(
    projectId: string,
    data: {
      name: string;
      targetNodeId?: string;
      canvasWidth: number;
      canvasHeight: number;
      canvasJSON: Record<string, unknown>;
      backgroundColor?: string;
      referenceFrameWidth?: number;
      referenceFrameHeight?: number;
      tags?: string[];
    },
  ): Promise<MaterialProjectRecord> {
    const pool = this.db.getPool();
    const result = await pool.query<MaterialProjectRow>(
      `INSERT INTO material_design_projects
        (project_id, target_node_id, name, canvas_width, canvas_height,
         canvas_json, background_color, reference_frame_width, reference_frame_height,
         file_version, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 3, $10)
       RETURNING *`,
      [
        projectId,
        data.targetNodeId ?? null,
        data.name,
        data.canvasWidth,
        data.canvasHeight,
        JSON.stringify(data.canvasJSON),
        data.backgroundColor ?? '#ffffff',
        data.referenceFrameWidth ?? null,
        data.referenceFrameHeight ?? null,
        data.tags ?? [],
      ],
    );
    return rowToRecord(result.rows[0]);
  }

  /**
   * 获取工程列表（摘要，不含 canvasJSON 大对象）
   */
  async findAll(
    projectId: string,
    options?: { targetNodeId?: string; search?: string },
  ): Promise<MaterialProjectSummary[]> {
    const pool = this.db.getPool();
    let sql = `
      SELECT id, project_id, target_node_id, name, canvas_width, canvas_height,
             reference_frame_width, reference_frame_height, thumbnail_url,
             exported_material_id, tags, version, created_at, updated_at
      FROM material_design_projects
      WHERE project_id = $1
    `;
    const params: unknown[] = [projectId];
    let idx = 2;

    if (options?.targetNodeId) {
      sql += ` AND target_node_id = $${idx}`;
      params.push(options.targetNodeId);
      idx++;
    }

    if (options?.search) {
      sql += ` AND name ILIKE $${idx}`;
      params.push(`%${options.search}%`);
      idx++;
    }

    sql += ` ORDER BY updated_at DESC`;

    const result = await pool.query<Omit<MaterialProjectRow, 'canvas_json' | 'background_color' | 'file_version'>>(sql, params);
    return result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      targetNodeId: row.target_node_id,
      name: row.name,
      canvasWidth: row.canvas_width,
      canvasHeight: row.canvas_height,
      referenceFrameWidth: row.reference_frame_width,
      referenceFrameHeight: row.reference_frame_height,
      thumbnailUrl: row.thumbnail_url,
      exportedMaterialId: row.exported_material_id,
      tags: row.tags ?? [],
      version: row.version,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  /**
   * 获取单个工程（含完整 canvasJSON）
   */
  async findOne(projectId: string, id: string): Promise<MaterialProjectRecord> {
    const pool = this.db.getPool();
    const result = await pool.query<MaterialProjectRow>(
      `SELECT * FROM material_design_projects WHERE project_id = $1 AND id = $2`,
      [projectId, id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('素材工程不存在');
    }
    return rowToRecord(result.rows[0]);
  }

  /**
   * 根据 targetNodeId 查找工程（组件关联的素材工程）
   */
  async findByTargetNode(projectId: string, targetNodeId: string): Promise<MaterialProjectRecord | null> {
    const pool = this.db.getPool();
    const result = await pool.query<MaterialProjectRow>(
      `SELECT * FROM material_design_projects
       WHERE project_id = $1 AND target_node_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [projectId, targetNodeId],
    );
    if (result.rows.length === 0) return null;
    return rowToRecord(result.rows[0]);
  }

  /**
   * 更新工程
   */
  async update(
    projectId: string,
    id: string,
    data: {
      name?: string;
      targetNodeId?: string;
      canvasWidth?: number;
      canvasHeight?: number;
      canvasJSON?: Record<string, unknown>;
      backgroundColor?: string;
      referenceFrameWidth?: number;
      referenceFrameHeight?: number;
      thumbnailUrl?: string;
      exportedMaterialId?: string;
      tags?: string[];
    },
  ): Promise<MaterialProjectRecord> {
    // 构建动态 SET 子句
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
    if (data.targetNodeId !== undefined) { sets.push(`target_node_id = $${idx++}`); params.push(data.targetNodeId); }
    if (data.canvasWidth !== undefined) { sets.push(`canvas_width = $${idx++}`); params.push(data.canvasWidth); }
    if (data.canvasHeight !== undefined) { sets.push(`canvas_height = $${idx++}`); params.push(data.canvasHeight); }
    if (data.canvasJSON !== undefined) { sets.push(`canvas_json = $${idx++}`); params.push(JSON.stringify(data.canvasJSON)); }
    if (data.backgroundColor !== undefined) { sets.push(`background_color = $${idx++}`); params.push(data.backgroundColor); }
    if (data.referenceFrameWidth !== undefined) { sets.push(`reference_frame_width = $${idx++}`); params.push(data.referenceFrameWidth); }
    if (data.referenceFrameHeight !== undefined) { sets.push(`reference_frame_height = $${idx++}`); params.push(data.referenceFrameHeight); }
    if (data.thumbnailUrl !== undefined) { sets.push(`thumbnail_url = $${idx++}`); params.push(data.thumbnailUrl); }
    if (data.exportedMaterialId !== undefined) { sets.push(`exported_material_id = $${idx++}`); params.push(data.exportedMaterialId); }
    if (data.tags !== undefined) { sets.push(`tags = $${idx++}`); params.push(data.tags); }

    if (sets.length === 0) {
      return this.findOne(projectId, id);
    }

    sets.push(`version = version + 1`);
    sets.push(`updated_at = NOW()`);

    params.push(projectId);
    params.push(id);

    const pool = this.db.getPool();
    const result = await pool.query<MaterialProjectRow>(
      `UPDATE material_design_projects
       SET ${sets.join(', ')}
       WHERE project_id = $${idx++} AND id = $${idx}
       RETURNING *`,
      params,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('素材工程不存在');
    }

    return rowToRecord(result.rows[0]);
  }

  /**
   * 删除工程
   */
  async remove(projectId: string, id: string): Promise<void> {
    const pool = this.db.getPool();
    const result = await pool.query(
      `DELETE FROM material_design_projects WHERE project_id = $1 AND id = $2`,
      [projectId, id],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('素材工程不存在');
    }
  }

  /**
   * 上传导出的素材文件（PNG/SVG/WebP），返回访问 URL
   *
   * 当前阶段通过 StorageProvider 存储到本地文件系统，
   * 后续切换为 S3 只需替换 Provider 实现。
   */
  async uploadExportedAsset(
    projectId: string,
    materialProjectId: string,
    file: Buffer,
    meta: { originalName: string; mimeType: string },
  ): Promise<{ url: string; assetId: string }> {
    const fileMeta: FileMeta = {
      originalName: meta.originalName,
      mimeType: meta.mimeType,
      size: file.length,
      projectId,
    };

    const assetInfo = await this.storage.upload(file, fileMeta);

    // 更新工程记录的 exported_material_id
    await this.db.getPool().query(
      `UPDATE material_design_projects
       SET exported_material_id = $1, updated_at = NOW()
       WHERE id = $2 AND project_id = $3`,
      [assetInfo.assetId, materialProjectId, projectId],
    );

    return { url: assetInfo.url, assetId: assetInfo.assetId };
  }

  /**
   * 上传缩略图
   */
  async uploadThumbnail(
    projectId: string,
    materialProjectId: string,
    file: Buffer,
  ): Promise<string> {
    const fileMeta: FileMeta = {
      originalName: `thumb-${materialProjectId}.png`,
      mimeType: 'image/png',
      size: file.length,
      projectId,
    };

    const assetInfo = await this.storage.upload(file, fileMeta);
    const url = assetInfo.url;

    await this.db.getPool().query(
      `UPDATE material_design_projects
       SET thumbnail_url = $1, updated_at = NOW()
       WHERE id = $2 AND project_id = $3`,
      [url, materialProjectId, projectId],
    );

    return url;
  }
}
