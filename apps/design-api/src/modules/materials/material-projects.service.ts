import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readdirSync, readFileSync } from 'fs';

export interface MaterialProjectRecord {
  id: string;
  projectId: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: unknown[];
  shadows: unknown[];
  filters: unknown[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 素材编辑器工程文件服务
 *
 * 保存素材编辑器的图层信息以便后续重新编辑，
 * 类似 PSD 文件但是 JSON 格式。
 *
 * Phase 1: JSON 文件存储 → 后续迁移到数据库。
 */
@Injectable()
export class MaterialProjectsService {
  private readonly baseDir = join(process.cwd(), 'uploads', 'material-projects');

  private ensureDir(projectId: string): string {
    const dir = join(this.baseDir, projectId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async create(
    projectId: string,
    data: {
      name: string;
      canvasWidth: number;
      canvasHeight: number;
      layers: unknown[];
      shadows?: unknown[];
      filters?: unknown[];
    },
  ): Promise<MaterialProjectRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const record: MaterialProjectRecord = {
      id,
      projectId,
      name: data.name,
      canvasWidth: data.canvasWidth,
      canvasHeight: data.canvasHeight,
      layers: data.layers,
      shadows: data.shadows ?? [],
      filters: data.filters ?? [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const dir = this.ensureDir(projectId);
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(record, null, 2));

    return record;
  }

  async findOne(projectId: string, id: string): Promise<MaterialProjectRecord> {
    const filepath = join(this.ensureDir(projectId), `${id}.json`);
    if (!existsSync(filepath)) {
      throw new NotFoundException('素材工程不存在');
    }
    return JSON.parse(readFileSync(filepath, 'utf-8')) as MaterialProjectRecord;
  }

  async update(
    projectId: string,
    id: string,
    data: {
      name?: string;
      canvasWidth?: number;
      canvasHeight?: number;
      layers?: unknown[];
      shadows?: unknown[];
      filters?: unknown[];
    },
  ): Promise<MaterialProjectRecord> {
    const record = await this.findOne(projectId, id);

    if (data.name !== undefined) record.name = data.name;
    if (data.canvasWidth !== undefined) record.canvasWidth = data.canvasWidth;
    if (data.canvasHeight !== undefined) record.canvasHeight = data.canvasHeight;
    if (data.layers !== undefined) record.layers = data.layers;
    if (data.shadows !== undefined) record.shadows = data.shadows;
    if (data.filters !== undefined) record.filters = data.filters;
    record.version += 1;
    record.updatedAt = new Date().toISOString();

    const dir = this.ensureDir(projectId);
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(record, null, 2));

    return record;
  }

  async remove(projectId: string, id: string): Promise<void> {
    const filepath = join(this.ensureDir(projectId), `${id}.json`);
    if (!existsSync(filepath)) {
      throw new NotFoundException('素材工程不存在');
    }
    unlinkSync(filepath);
  }
}
