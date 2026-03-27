import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';

export interface AssetRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  scope: string;
  project_id: string | null;
  schema: Record<string, unknown>;
  thumbnail: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AssetsService {
  constructor(private readonly db: DatabaseService) {}

  /** 获取资产列表，支持 scope 和 projectId 过滤 */
  async findAll(scope?: string, projectId?: string): Promise<AssetRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (scope) {
      conditions.push(`scope = $${idx++}`);
      params.push(scope);
    }
    if (projectId) {
      conditions.push(`project_id = $${idx++}`);
      params.push(projectId);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const r = await this.db.getPool().query<AssetRow>(
      `SELECT * FROM component_assets ${where} ORDER BY updated_at DESC`,
      params,
    );
    return r.rows;
  }

  /** 创建资产 */
  async create(dto: CreateAssetDto): Promise<AssetRow> {
    const r = await this.db.getPool().query<AssetRow>(
      `INSERT INTO component_assets (name, description, category, tags, scope, project_id, schema, thumbnail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.name,
        dto.description ?? null,
        dto.category ?? null,
        dto.tags ?? [],
        dto.scope,
        dto.projectId ?? null,
        JSON.stringify(dto.schema),
        dto.thumbnail ?? null,
      ],
    );
    return r.rows[0]!;
  }

  /** 更新资产 */
  async update(id: string, dto: UpdateAssetDto): Promise<AssetRow> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(dto.name);
    }
    if (dto.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(dto.description);
    }
    if (dto.category !== undefined) {
      sets.push(`category = $${idx++}`);
      params.push(dto.category);
    }
    if (dto.tags !== undefined) {
      sets.push(`tags = $${idx++}`);
      params.push(dto.tags);
    }
    if (dto.schema !== undefined) {
      sets.push(`schema = $${idx++}`);
      params.push(JSON.stringify(dto.schema));
    }
    if (dto.thumbnail !== undefined) {
      sets.push(`thumbnail = $${idx++}`);
      params.push(dto.thumbnail);
    }

    if (sets.length === 0) {
      // 无更新字段，直接返回当前数据
      return this.findOne(id);
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const r = await this.db.getPool().query<AssetRow>(
      `UPDATE component_assets SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    if (r.rows.length === 0) {
      throw new NotFoundException('资产不存在');
    }
    return r.rows[0]!;
  }

  /** 查询单个资产 */
  async findOne(id: string): Promise<AssetRow> {
    const r = await this.db.getPool().query<AssetRow>(
      `SELECT * FROM component_assets WHERE id = $1`,
      [id],
    );
    if (r.rows.length === 0) {
      throw new NotFoundException('资产不存在');
    }
    return r.rows[0]!;
  }

  /** 删除资产 */
  async remove(id: string): Promise<void> {
    const result = await this.db.getPool().query(
      `DELETE FROM component_assets WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('资产不存在');
    }
  }
}
