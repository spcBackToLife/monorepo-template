/**
 * StorageProvider 接口
 *
 * 素材文件存储的抽象层。开发阶段使用 LocalStorageProvider（本地文件系统），
 * 生产环境可切换为 S3StorageProvider 或 COS StorageProvider。
 */

export interface FileMeta {
  /** 原始文件名 */
  originalName: string;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小（bytes） */
  size: number;
  /** 关联的项目 ID */
  projectId: string;
}

export interface AssetInfo {
  /** 存储后的文件标识（用于后续 getUrl/delete） */
  assetId: string;
  /** 存储后的文件名 */
  filename: string;
  /** 可访问的 URL */
  url: string;
  /** 文件大小 */
  size: number;
}

export interface StorageProvider {
  /** 上传文件，返回资产信息 */
  upload(file: Buffer, meta: FileMeta): Promise<AssetInfo>;

  /** 获取文件的访问 URL */
  getUrl(projectId: string, assetId: string): string;

  /** 删除文件 */
  delete(projectId: string, assetId: string): Promise<void>;

  /** 获取缩略图 URL（图片类型） */
  getThumbnailUrl(projectId: string, assetId: string): string;

  /** 读取文件内容 */
  read(projectId: string, assetId: string): Promise<Buffer>;

  /** 写入文件内容（覆盖） */
  write(projectId: string, assetId: string, data: Buffer): Promise<void>;

  /** 检查文件是否存在 */
  exists(projectId: string, assetId: string): Promise<boolean>;
}
