/**
 * LocalStorageProvider — 本地文件系统存储实现
 *
 * 开发阶段使用。将文件存储在 `./uploads/materials/{projectId}/` 目录下。
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs';
import type { StorageProvider, FileMeta, AssetInfo } from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir = join(process.cwd(), 'uploads', 'materials');

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async upload(file: Buffer, meta: FileMeta): Promise<AssetInfo> {
    const projectDir = join(this.baseDir, meta.projectId);
    this.ensureDir(projectDir);

    const assetId = randomUUID();
    const ext = extname(meta.originalName) || '.bin';
    const filename = `${assetId}${ext}`;
    const filepath = join(projectDir, filename);

    writeFileSync(filepath, file);

    const url = `/uploads/materials/${meta.projectId}/${filename}`;

    return {
      assetId,
      filename,
      url,
      size: file.length,
    };
  }

  getUrl(projectId: string, assetId: string): string {
    // 在 LocalStorage 中，assetId 就是文件名前缀
    // 需要找到实际文件（可能有不同扩展名）
    return `/uploads/materials/${projectId}/${assetId}`;
  }

  async delete(projectId: string, assetId: string): Promise<void> {
    const projectDir = join(this.baseDir, projectId);
    // 查找所有匹配 assetId 前缀的文件并删除
    if (existsSync(projectDir)) {
      const { readdirSync } = await import('fs');
      const files = readdirSync(projectDir).filter((f) => f.startsWith(assetId));
      for (const file of files) {
        const filepath = join(projectDir, file);
        if (existsSync(filepath)) {
          unlinkSync(filepath);
        }
      }
    }

    // 删除缩略图
    const thumbPath = join(this.baseDir, projectId, 'thumbs', `${assetId}.webp`);
    if (existsSync(thumbPath)) {
      unlinkSync(thumbPath);
    }
  }

  getThumbnailUrl(projectId: string, assetId: string): string {
    return `/uploads/materials/${projectId}/thumbs/${assetId}.webp`;
  }

  async read(projectId: string, assetId: string): Promise<Buffer> {
    const projectDir = join(this.baseDir, projectId);
    // 找到 assetId 对应的文件
    const { readdirSync } = await import('fs');
    const files = readdirSync(projectDir).filter((f) => f.startsWith(assetId) && !f.endsWith('.json'));
    if (files.length === 0) {
      throw new Error(`Asset ${assetId} not found in project ${projectId}`);
    }
    return readFileSync(join(projectDir, files[0]));
  }

  async write(projectId: string, assetId: string, data: Buffer): Promise<void> {
    const projectDir = join(this.baseDir, projectId);
    this.ensureDir(projectDir);
    // 找到现有文件并覆盖
    const { readdirSync } = await import('fs');
    const files = readdirSync(projectDir).filter((f) => f.startsWith(assetId) && !f.endsWith('.json'));
    if (files.length > 0) {
      writeFileSync(join(projectDir, files[0]), data);
    }
  }

  async exists(projectId: string, assetId: string): Promise<boolean> {
    const projectDir = join(this.baseDir, projectId);
    if (!existsSync(projectDir)) return false;
    const { readdirSync } = await import('fs');
    const files = readdirSync(projectDir).filter((f) => f.startsWith(assetId) && !f.endsWith('.json'));
    return files.length > 0;
  }
}
