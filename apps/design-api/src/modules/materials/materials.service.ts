import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readdirSync, readFileSync } from 'fs';
import sharp from 'sharp';

/** 素材记录 */
export interface MaterialRecord {
  id: string;
  projectId: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  thumbnailUrl?: string;
  category: 'image' | 'icon' | 'animation' | 'video' | 'other';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 允许的 MIME 类型 */
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  'image/avif',
  'image/bmp',
  'video/mp4',
  'video/webm',
  'application/json', // Lottie
  'application/octet-stream', // PAG / Rive
]);

/** 文件大小限制：20 MB */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** 根据 MIME 推断分类 */
function inferCategory(mimeType: string, filename: string): MaterialRecord['category'] {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'image/svg+xml') return 'icon';
  if (mimeType === 'application/json' && filename.endsWith('.json')) return 'animation'; // Lottie
  if (filename.endsWith('.pag') || filename.endsWith('.riv')) return 'animation';
  if (mimeType.startsWith('image/')) return 'image';
  return 'other';
}

/**
 * 素材服务 — Phase 1: 本地文件系统存储
 *
 * 开发阶段使用本地文件系统（`./uploads/{projectId}/`）。
 * 后续通过 StorageProvider 接口抽象切换到 S3。
 */
@Injectable()
export class MaterialsService {
  private readonly baseUploadDir = join(process.cwd(), 'uploads');

  /** 确保项目目录存在 */
  private ensureProjectDir(projectId: string): string {
    const dir = join(this.baseUploadDir, 'materials', projectId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /** 上传素材 */
  async upload(
    projectId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<MaterialRecord> {
    // 校验 MIME
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}。支持: ${[...ALLOWED_MIMES].join(', ')}`,
      );
    }

    // 校验大小
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `文件大小 ${(file.size / 1024 / 1024).toFixed(1)}MB 超过限制 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const dir = this.ensureProjectDir(projectId);
    const id = randomUUID();
    const ext = extname(file.originalname) || '.bin';
    const filename = `${id}${ext}`;
    const filepath = join(dir, filename);

    // 写入文件
    writeFileSync(filepath, file.buffer);

    const category = inferCategory(file.mimetype, file.originalname);
    const url = `/uploads/materials/${projectId}/${filename}`;
    const now = new Date().toISOString();

    const record: MaterialRecord = {
      id,
      projectId,
      originalName: file.originalname,
      filename,
      mimeType: file.mimetype,
      size: file.size,
      url,
      category,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    // 对图片类型获取宽高并生成缩略图
    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
      try {
        let imageBuffer = file.buffer;
        const metadata = await sharp(imageBuffer).metadata();

        // Step 9.3: 大尺寸图片安全检查 — >4096px 自动缩小
        const MAX_SAFE_DIMENSION = 4096;
        if (
          (metadata.width && metadata.width > MAX_SAFE_DIMENSION) ||
          (metadata.height && metadata.height > MAX_SAFE_DIMENSION)
        ) {
          imageBuffer = await sharp(imageBuffer)
            .resize({
              width: Math.min(metadata.width ?? MAX_SAFE_DIMENSION, MAX_SAFE_DIMENSION),
              height: Math.min(metadata.height ?? MAX_SAFE_DIMENSION, MAX_SAFE_DIMENSION),
              fit: 'inside',
              withoutEnlargement: false,
            })
            .toBuffer();

          // 覆盖原文件
          writeFileSync(filepath, imageBuffer);

          const resizedMeta = await sharp(imageBuffer).metadata();
          record.width = resizedMeta.width;
          record.height = resizedMeta.height;
          record.size = imageBuffer.length;
        } else {
          record.width = metadata.width;
          record.height = metadata.height;
        }

        record.thumbnailUrl = await this.generateThumbnail(projectId, id, imageBuffer);
      } catch {
        // 无法处理的图片格式，跳过尺寸和缩略图
      }
    }

    // Phase 1: 使用 JSON 文件做简单持久化（生产环境改用数据库）
    this.saveMeta(projectId, id, record);

    return record;
  }

  /** 获取项目下的素材列表 */
  async findAll(
    projectId: string,
    filter?: { category?: string; search?: string },
  ): Promise<{ materials: MaterialRecord[]; total: number }> {
    let materials = this.loadAllMeta(projectId);

    if (filter?.category) {
      materials = materials.filter((m) => m.category === filter.category);
    }

    if (filter?.search) {
      const keyword = filter.search.toLowerCase();
      materials = materials.filter(
        (m) =>
          m.originalName.toLowerCase().includes(keyword) ||
          m.tags.some((t) => t.toLowerCase().includes(keyword)),
      );
    }

    // 按创建时间降序
    materials.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { materials, total: materials.length };
  }

  /** 获取单个素材 */
  async findOne(projectId: string, id: string): Promise<MaterialRecord | null> {
    return this.loadMeta(projectId, id);
  }

  /** 删除素材 */
  async remove(projectId: string, id: string): Promise<void> {
    const record = this.loadMeta(projectId, id);
    if (!record) {
      throw new NotFoundException('素材不存在');
    }

    // 删除文件
    const filepath = join(this.baseUploadDir, 'materials', projectId, record.filename);
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }

    // 删除缩略图
    const thumbPath = join(this.baseUploadDir, 'materials', projectId, 'thumbs', `${id}.webp`);
    if (existsSync(thumbPath)) {
      unlinkSync(thumbPath);
    }

    // 删除元数据
    this.deleteMeta(projectId, id);
  }

  /** 更新素材元数据（名称、分类、标签） */
  async updateMeta(
    projectId: string,
    id: string,
    data: { originalName?: string; category?: MaterialRecord['category']; tags?: string[] },
  ): Promise<MaterialRecord> {
    const record = this.loadMeta(projectId, id);
    if (!record) {
      throw new NotFoundException('素材不存在');
    }

    if (data.originalName !== undefined) record.originalName = data.originalName;
    if (data.category !== undefined) record.category = data.category;
    if (data.tags !== undefined) record.tags = data.tags;
    record.updatedAt = new Date().toISOString();

    this.saveMeta(projectId, id, record);
    return record;
  }

  /** 服务端图片缩放 */
  async resize(
    projectId: string,
    id: string,
    options: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' },
  ): Promise<MaterialRecord> {
    const record = this.loadMeta(projectId, id);
    if (!record) {
      throw new NotFoundException('素材不存在');
    }

    if (!record.mimeType.startsWith('image/') || record.mimeType === 'image/svg+xml') {
      throw new BadRequestException('仅支持对位图图片进行缩放操作');
    }

    const filepath = join(this.baseUploadDir, 'materials', projectId, record.filename);
    if (!existsSync(filepath)) {
      throw new NotFoundException('素材文件不存在');
    }

    const inputBuffer = readFileSync(filepath);
    const outputBuffer = await sharp(inputBuffer)
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit ?? 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // 覆盖原文件
    writeFileSync(filepath, outputBuffer);

    // 更新元数据
    const metadata = await sharp(outputBuffer).metadata();
    record.size = outputBuffer.length;
    record.width = metadata.width;
    record.height = metadata.height;
    record.updatedAt = new Date().toISOString();

    this.saveMeta(projectId, id, record);

    // 重新生成缩略图
    await this.generateThumbnail(projectId, id, outputBuffer);

    return record;
  }

  /** 服务端图片裁切 */
  async crop(
    projectId: string,
    id: string,
    options: { left: number; top: number; width: number; height: number },
  ): Promise<MaterialRecord> {
    const record = this.loadMeta(projectId, id);
    if (!record) {
      throw new NotFoundException('素材不存在');
    }

    if (!record.mimeType.startsWith('image/') || record.mimeType === 'image/svg+xml') {
      throw new BadRequestException('仅支持对位图图片进行裁切操作');
    }

    const filepath = join(this.baseUploadDir, 'materials', projectId, record.filename);
    if (!existsSync(filepath)) {
      throw new NotFoundException('素材文件不存在');
    }

    const inputBuffer = readFileSync(filepath);
    const outputBuffer = await sharp(inputBuffer)
      .extract({
        left: Math.max(0, Math.round(options.left)),
        top: Math.max(0, Math.round(options.top)),
        width: Math.max(1, Math.round(options.width)),
        height: Math.max(1, Math.round(options.height)),
      })
      .toBuffer();

    // 覆盖原文件
    writeFileSync(filepath, outputBuffer);

    // 更新元数据
    const metadata = await sharp(outputBuffer).metadata();
    record.size = outputBuffer.length;
    record.width = metadata.width;
    record.height = metadata.height;
    record.updatedAt = new Date().toISOString();

    this.saveMeta(projectId, id, record);

    // 重新生成缩略图
    await this.generateThumbnail(projectId, id, outputBuffer);

    return record;
  }

  /** 格式转换（PNG→WebP、JPEG→PNG 等） */
  async convert(
    projectId: string,
    id: string,
    options: { format: 'png' | 'jpeg' | 'webp' | 'avif'; quality?: number },
  ): Promise<MaterialRecord> {
    const record = this.loadMeta(projectId, id);
    if (!record) {
      throw new NotFoundException('素材不存在');
    }

    if (!record.mimeType.startsWith('image/') || record.mimeType === 'image/svg+xml') {
      throw new BadRequestException('仅支持对位图图片进行格式转换');
    }

    const filepath = join(this.baseUploadDir, 'materials', projectId, record.filename);
    if (!existsSync(filepath)) {
      throw new NotFoundException('素材文件不存在');
    }

    const inputBuffer = readFileSync(filepath);
    let pipeline = sharp(inputBuffer);

    const formatOpts: Record<string, any> = {};
    if (options.quality !== undefined) {
      formatOpts.quality = Math.min(100, Math.max(1, options.quality));
    }

    switch (options.format) {
      case 'png':
        pipeline = pipeline.png(formatOpts);
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg(formatOpts);
        break;
      case 'webp':
        pipeline = pipeline.webp(formatOpts);
        break;
      case 'avif':
        pipeline = pipeline.avif(formatOpts);
        break;
      default:
        throw new BadRequestException(`不支持的目标格式: ${options.format}`);
    }

    const outputBuffer = await pipeline.toBuffer();

    // 生成新文件名
    const extMap: Record<string, string> = { png: '.png', jpeg: '.jpg', webp: '.webp', avif: '.avif' };
    const newExt = extMap[options.format] ?? `.${options.format}`;
    const newFilename = `${id}${newExt}`;
    const newFilepath = join(this.baseUploadDir, 'materials', projectId, newFilename);

    // 写入新文件
    writeFileSync(newFilepath, outputBuffer);

    // 删除旧文件（如果文件名不同）
    if (record.filename !== newFilename && existsSync(filepath)) {
      unlinkSync(filepath);
    }

    // 更新元数据
    const mimeMap: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif' };
    record.filename = newFilename;
    record.mimeType = mimeMap[options.format] ?? `image/${options.format}`;
    record.size = outputBuffer.length;
    record.url = `/uploads/materials/${projectId}/${newFilename}`;
    record.updatedAt = new Date().toISOString();

    this.saveMeta(projectId, id, record);

    // 重新生成缩略图
    await this.generateThumbnail(projectId, id, outputBuffer);

    return record;
  }

  // ===== 缩略图生成 =====

  /** 为图片素材生成 128×128 WebP 缩略图 */
  private async generateThumbnail(projectId: string, id: string, imageBuffer: Buffer): Promise<string | undefined> {
    try {
      const thumbDir = join(this.baseUploadDir, 'materials', projectId, 'thumbs');
      if (!existsSync(thumbDir)) {
        mkdirSync(thumbDir, { recursive: true });
      }

      const thumbFilename = `${id}.webp`;
      const thumbPath = join(thumbDir, thumbFilename);

      await sharp(imageBuffer)
        .resize(128, 128, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(thumbPath);

      return `/uploads/materials/${projectId}/thumbs/${thumbFilename}`;
    } catch {
      // 缩略图生成失败不影响主流程
      return undefined;
    }
  }

  // ===== 元数据持久化（JSON 文件，Phase 1 临时方案） =====

  private metaDir(projectId: string): string {
    const dir = join(this.baseUploadDir, 'materials', projectId, '.meta');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private saveMeta(projectId: string, id: string, record: MaterialRecord): void {
    const filepath = join(this.metaDir(projectId), `${id}.json`);
    writeFileSync(filepath, JSON.stringify(record, null, 2));
  }

  private loadMeta(projectId: string, id: string): MaterialRecord | null {
    const filepath = join(this.metaDir(projectId), `${id}.json`);
    if (!existsSync(filepath)) return null;
    try {
      const content = readFileSync(filepath, 'utf-8');
      return JSON.parse(content) as MaterialRecord;
    } catch {
      return null;
    }
  }

  private loadAllMeta(projectId: string): MaterialRecord[] {
    const dir = this.metaDir(projectId);
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const records: MaterialRecord[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(dir, file), 'utf-8');
        records.push(JSON.parse(content) as MaterialRecord);
      } catch {
        // skip corrupted files
      }
    }

    return records;
  }

  private deleteMeta(projectId: string, id: string): void {
    const filepath = join(this.metaDir(projectId), `${id}.json`);
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }
  }
}
