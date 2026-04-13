/**
 * 素材编辑器工程文件 — 前端 API 客户端
 *
 * 与后端 /api/projects/:projectId/material-projects 接口对接。
 * 负责素材工程的 CRUD 和导出素材上传。
 *
 * 素材槽位 API — 管理节点与素材工程的多对多关联。
 */
import { apiJson, API_BASE } from '@/api/client';
import { authStore } from '@/stores/auth';

function token() {
  return authStore.token;
}

// ===== 类型定义 =====

/** 工程列表摘要（不含 canvasJSON） */
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

/** 工程详情（含完整 canvasJSON） */
export interface MaterialProjectDetail extends MaterialProjectSummary {
  canvasJSON: Record<string, unknown>;
  backgroundColor: string;
  fileVersion: number;
}

/** 创建工程参数 */
export interface CreateMaterialProjectParams {
  name: string;
  targetNodeId?: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasJSON: Record<string, unknown>;
  backgroundColor?: string;
  referenceFrameWidth?: number;
  referenceFrameHeight?: number;
  tags?: string[];
}

/** 更新工程参数 */
export interface UpdateMaterialProjectParams {
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
}

/** 素材槽位记录 */
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

/** 槽位 + 素材工程联合信息 */
export interface MaterialSlotWithProject extends MaterialSlotRecord {
  materialProjectName: string;
  thumbnailUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

// ===== API 方法 =====

export const materialProjectApi = {
  /** 获取工程列表 */
  async list(
    projectId: string,
    options?: { targetNodeId?: string; search?: string },
  ): Promise<MaterialProjectSummary[]> {
    const params = new URLSearchParams();
    if (options?.targetNodeId) params.set('targetNodeId', options.targetNodeId);
    if (options?.search) params.set('search', options.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiJson<MaterialProjectSummary[]>(
      `/projects/${projectId}/material-projects${qs}`,
      { token: token() },
    );
  },

  /** 获取工程详情（含 canvasJSON） */
  async get(projectId: string, id: string): Promise<MaterialProjectDetail> {
    return apiJson<MaterialProjectDetail>(
      `/projects/${projectId}/material-projects/${id}`,
      { token: token() },
    );
  },

  /** 按关联节点查找工程（返回最近一个，向后兼容） */
  async findByNode(
    projectId: string,
    nodeId: string,
  ): Promise<MaterialProjectDetail | null> {
    const resp = await apiJson<MaterialProjectDetail & { found?: boolean }>(
      `/projects/${projectId}/material-projects/by-node/${nodeId}`,
      { token: token() },
    );
    if ('found' in resp && resp.found === false) return null;
    return resp;
  },

  /** 按关联节点查找所有工程（一对多） */
  async findAllByNode(
    projectId: string,
    nodeId: string,
  ): Promise<MaterialProjectDetail[]> {
    return apiJson<MaterialProjectDetail[]>(
      `/projects/${projectId}/material-projects/all-by-node/${nodeId}`,
      { token: token() },
    );
  },

  /** 创建工程 */
  async create(
    projectId: string,
    data: CreateMaterialProjectParams,
  ): Promise<MaterialProjectDetail> {
    return apiJson<MaterialProjectDetail>(
      `/projects/${projectId}/material-projects`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        token: token(),
      },
    );
  },

  /** 更新工程（保存） */
  async update(
    projectId: string,
    id: string,
    data: UpdateMaterialProjectParams,
  ): Promise<MaterialProjectDetail> {
    return apiJson<MaterialProjectDetail>(
      `/projects/${projectId}/material-projects/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token: token(),
      },
    );
  },

  /** 删除工程 */
  async remove(projectId: string, id: string): Promise<void> {
    await apiJson(`/projects/${projectId}/material-projects/${id}`, {
      method: 'DELETE',
      token: token(),
    });
  },

  /**
   * 上传导出的素材文件（PNG/SVG/WebP）
   *
   * 返回素材的访问 URL 和 assetId。
   * 当前存储在后端本地 uploads/ 目录，后续迁移 S3 时 URL 格式会变化，
   * 但 API 接口保持不变。
   */
  async uploadExport(
    projectId: string,
    materialProjectId: string,
    file: Blob,
    filename: string,
  ): Promise<{ url: string; assetId: string }> {
    const formData = new FormData();
    formData.append('file', file, filename);

    const headers: Record<string, string> = {};
    if (token()) headers['Authorization'] = `Bearer ${token()}`;

    const res = await fetch(
      `${API_BASE}/projects/${projectId}/material-projects/${materialProjectId}/export`,
      {
        method: 'POST',
        body: formData,
        headers,
      },
    );

    if (!res.ok) {
      throw new Error(`上传导出素材失败: HTTP ${res.status}`);
    }

    return res.json() as Promise<{ url: string; assetId: string }>;
  },

  /**
   * 上传缩略图
   */
  async uploadThumbnail(
    projectId: string,
    materialProjectId: string,
    file: Blob,
  ): Promise<{ thumbnailUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, 'thumbnail.png');

    const headers: Record<string, string> = {};
    if (token()) headers['Authorization'] = `Bearer ${token()}`;

    const res = await fetch(
      `${API_BASE}/projects/${projectId}/material-projects/${materialProjectId}/thumbnail`,
      {
        method: 'POST',
        body: formData,
        headers,
      },
    );

    if (!res.ok) {
      throw new Error(`上传缩略图失败: HTTP ${res.status}`);
    }

    return res.json() as Promise<{ thumbnailUrl: string }>;
  },
};

// ===== 素材槽位 API =====

export const materialSlotApi = {
  /** 查询节点的所有槽位 */
  async findByNode(
    projectId: string,
    nodeId: string,
  ): Promise<MaterialSlotWithProject[]> {
    return apiJson<MaterialSlotWithProject[]>(
      `/projects/${projectId}/material-slots/by-node/${nodeId}`,
      { token: token() },
    );
  },

  /** 查询节点指定槽位 */
  async findSlot(
    projectId: string,
    nodeId: string,
    slotName: string,
  ): Promise<MaterialSlotWithProject | null> {
    const resp = await apiJson<MaterialSlotWithProject & { found?: boolean }>(
      `/projects/${projectId}/material-slots/by-node/${nodeId}/${slotName}`,
      { token: token() },
    );
    if ('found' in resp && resp.found === false) return null;
    return resp;
  },

  /** 创建槽位 */
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
    return apiJson<MaterialSlotRecord>(
      `/projects/${projectId}/material-slots`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        token: token(),
      },
    );
  },

  /** 更新槽位 */
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
    return apiJson<MaterialSlotRecord>(
      `/projects/${projectId}/material-slots/${slotId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token: token(),
      },
    );
  },

  /** 删除槽位 */
  async remove(projectId: string, slotId: string): Promise<void> {
    await apiJson(`/projects/${projectId}/material-slots/${slotId}`, {
      method: 'DELETE',
      token: token(),
    });
  },
};
