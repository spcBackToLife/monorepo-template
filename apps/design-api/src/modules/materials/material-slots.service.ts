import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * 素材槽位记录 — 节点与素材工程的关联
 *
 * 一个设计节点可以有多个素材槽位（slot），
 * 每个槽位绑定一个素材工程，并指定其用途（CSS 目标属性）。
 *
 * 典型槽位：
 *   - default（默认背景素材）
 *   - hover（悬浮态素材）
 *   - decoration（装饰层）
 *   - dark-theme（暗色主题）
 */
export interface MaterialSlotRecord {
  id: string;
  projectId: string;
  nodeId: string;
  slotName: string;
  materialProjectId: string;
  sortOrder: number;
  cssTarget: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 数据库行类型 */
interface MaterialSlotRow {
  id: string;
  project_id: string;
  node_id: string;
  slot_name: string;
  material_project_id: string;
  sort_order: number;
  css_target: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/** 数据库行 → API 记录 */
function rowToRecord(row: MaterialSlotRow): MaterialSlotRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    nodeId: row.node_id,
    slotName: row.slot_name,
    materialProjectId: row.material_project_id,
    sortOrder: row.sort_order,
    cssTarget: row.css_target,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** 槽位 + 素材工程联合查询结果 */
export interface MaterialSlotWithProject extends MaterialSlotRecord {
  materialProjectName: string;
  thumbnailUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

interface SlotWithProjectRow extends MaterialSlotRow {
  mp_name: string;
  mp_thumbnail_url: string | null;
  mp_canvas_width: number;
  mp_canvas_height: number;
}

@Injectable()
export class MaterialSlotsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 创建槽位 — 将素材工程绑定到节点的某个槽位
   */
  async create(
    projectId: string,
    data: {
      nodeId: string;
      slotName?: string;
      materialProjectId: string;
      sortOrder?: number;
      cssTarget?: string;
      isActive?: boolean;
    },
  ): Promise<MaterialSlotRecord> {
    const pool = this.db.getPool();
    try {
      const result = await pool.query<MaterialSlotRow>(
        `INSERT INTO node_material_slots
          (project_id, node_id, slot_name, material_project_id, sort_order, css_target, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          projectId,
          data.nodeId,
          data.slotName ?? 'default',
          data.materialProjectId,
          data.sortOrder ?? 0,
          data.cssTarget ?? 'background-image',
          data.isActive ?? true,
        ],
      );
      return rowToRecord(result.rows[0]);
    } catch (err: unknown) {
      // 唯一约束冲突 — 同一节点同名槽位已存在
      if ((err as Record<string, unknown>).code === '23505') {
        throw new ConflictException(
          `节点 ${data.nodeId} 的槽位 "${data.slotName ?? 'default'}" 已被占用`,
        );
      }
      throw err;
    }
  }

  /**
   * 查询节点的所有槽位（含素材工程摘要信息）
   */
  async findByNode(
    projectId: string,
    nodeId: string,
  ): Promise<MaterialSlotWithProject[]> {
    const pool = this.db.getPool();
    const result = await pool.query<SlotWithProjectRow>(
      `SELECT s.*, 
              mp.name AS mp_name,
              mp.thumbnail_url AS mp_thumbnail_url,
              mp.canvas_width AS mp_canvas_width,
              mp.canvas_height AS mp_canvas_height
       FROM node_material_slots s
       JOIN material_design_projects mp ON mp.id = s.material_project_id
       WHERE s.project_id = $1 AND s.node_id = $2
       ORDER BY s.sort_order ASC, s.created_at ASC`,
      [projectId, nodeId],
    );
    return result.rows.map((row) => ({
      ...rowToRecord(row),
      materialProjectName: row.mp_name,
      thumbnailUrl: row.mp_thumbnail_url,
      canvasWidth: row.mp_canvas_width,
      canvasHeight: row.mp_canvas_height,
    }));
  }

  /**
   * 查询节点指定槽位
   */
  async findSlot(
    projectId: string,
    nodeId: string,
    slotName: string,
  ): Promise<MaterialSlotWithProject | null> {
    const pool = this.db.getPool();
    const result = await pool.query<SlotWithProjectRow>(
      `SELECT s.*, 
              mp.name AS mp_name,
              mp.thumbnail_url AS mp_thumbnail_url,
              mp.canvas_width AS mp_canvas_width,
              mp.canvas_height AS mp_canvas_height
       FROM node_material_slots s
       JOIN material_design_projects mp ON mp.id = s.material_project_id
       WHERE s.project_id = $1 AND s.node_id = $2 AND s.slot_name = $3`,
      [projectId, nodeId, slotName],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...rowToRecord(row),
      materialProjectName: row.mp_name,
      thumbnailUrl: row.mp_thumbnail_url,
      canvasWidth: row.mp_canvas_width,
      canvasHeight: row.mp_canvas_height,
    };
  }

  /**
   * 更新槽位
   */
  async update(
    projectId: string,
    slotId: string,
    data: {
      slotName?: string;
      materialProjectId?: string;
      sortOrder?: number;
      cssTarget?: string;
      isActive?: boolean;
    },
  ): Promise<MaterialSlotRecord> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.slotName !== undefined) { sets.push(`slot_name = $${idx++}`); params.push(data.slotName); }
    if (data.materialProjectId !== undefined) { sets.push(`material_project_id = $${idx++}`); params.push(data.materialProjectId); }
    if (data.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); params.push(data.sortOrder); }
    if (data.cssTarget !== undefined) { sets.push(`css_target = $${idx++}`); params.push(data.cssTarget); }
    if (data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(data.isActive); }

    if (sets.length === 0) {
      const existing = await this.findById(projectId, slotId);
      if (!existing) throw new NotFoundException('槽位不存在');
      return existing;
    }

    sets.push(`updated_at = NOW()`);
    params.push(projectId);
    params.push(slotId);

    const pool = this.db.getPool();
    const result = await pool.query<MaterialSlotRow>(
      `UPDATE node_material_slots
       SET ${sets.join(', ')}
       WHERE project_id = $${idx++} AND id = $${idx}
       RETURNING *`,
      params,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('槽位不存在');
    }

    return rowToRecord(result.rows[0]);
  }

  /**
   * 删除槽位（返回被删记录，便于前端 / 网络面板确认，并在客户端联动清理节点样式）
   */
  async remove(projectId: string, slotId: string): Promise<MaterialSlotRecord> {
    const existing = await this.findById(projectId, slotId);
    if (!existing) {
      throw new NotFoundException('槽位不存在');
    }
    const pool = this.db.getPool();
    await pool.query(
      `DELETE FROM node_material_slots WHERE project_id = $1 AND id = $2`,
      [projectId, slotId],
    );
    return existing;
  }

  /**
   * 根据 ID 查找单个槽位
   */
  async findById(projectId: string, slotId: string): Promise<MaterialSlotRecord | null> {
    const pool = this.db.getPool();
    const result = await pool.query<MaterialSlotRow>(
      `SELECT * FROM node_material_slots WHERE project_id = $1 AND id = $2`,
      [projectId, slotId],
    );
    if (result.rows.length === 0) return null;
    return rowToRecord(result.rows[0]);
  }

  /**
   * 为节点创建素材工程并自动绑定到槽位（便捷方法）
   *
   * 在右键菜单"新建素材"时使用，同时创建素材工程和槽位关联。
   */
  async createWithProject(
    projectId: string,
    data: {
      nodeId: string;
      slotName?: string;
      cssTarget?: string;
      sortOrder?: number;
      materialProjectId: string;
    },
  ): Promise<MaterialSlotRecord> {
    return this.create(projectId, {
      nodeId: data.nodeId,
      slotName: data.slotName,
      materialProjectId: data.materialProjectId,
      sortOrder: data.sortOrder,
      cssTarget: data.cssTarget,
    });
  }
}
