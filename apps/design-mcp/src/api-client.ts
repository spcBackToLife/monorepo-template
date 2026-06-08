import { ApiHttpError } from './tools/helpers/toolResponse.js';
import type { MaterialProjectUpdateBody } from './types/canvas.js';
import type { DesignProject } from '@globallink/design-schema';

const BASE_URL = process.env.DESIGN_API_URL ?? 'http://localhost:3001';

interface FetchOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = opts;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiHttpError(res.status, path, method, text);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ===== Projects =====

export async function getProject(projectId: string): Promise<DesignProject> {
  return request<DesignProject>(`/api/projects/${projectId}`);
}

/** 完成度对账（Schema-First） */
export async function getProjectIntegrity(
  projectId: string,
  screenId?: string,
): Promise<unknown> {
  const qs = screenId ? `?screenId=${encodeURIComponent(screenId)}` : '';
  return request<unknown>(`/api/projects/${projectId}/integrity${qs}`);
}

export async function createProject(data: { name: string; platform?: string }): Promise<unknown> {
  return request('/api/projects', {
    method: 'POST',
    body: data,
  });
}

export async function listProjects(): Promise<unknown> {
  return request('/api/projects');
}

export async function deleteProject(projectId: string): Promise<void> {
  await request(`/api/projects/${projectId}`, { method: 'DELETE' });
}

// ===== Operations =====

export async function executeOperation(
  projectId: string,
  operation: unknown,
  author?: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/operations`, {
    method: 'POST',
    body: { operation, author: author ?? 'ai:mcp' },
  });
}

export async function executeBatch(
  projectId: string,
  operations: unknown[], // polymorphic operation shapes — intentionally untyped
  author?: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/operations/batch`, {
    method: 'POST',
    body: { operations, author: author ?? 'ai:mcp' },
  });
}

export async function getOperationsSince(
  projectId: string,
  since: number,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/operations`, {
    params: { since: String(since) },
  });
}

export async function undo(projectId: string): Promise<unknown> {
  return request(`/api/projects/${projectId}/operations/undo`, {
    method: 'POST',
    body: { author: 'ai:mcp' },
  });
}

// ===== Assets =====

export async function listAssets(
  scope?: string,
  projectId?: string,
): Promise<unknown> {
  if (projectId) {
    const project = await getProject(projectId);
    return project.componentAssets ?? [];
  }
  const params: Record<string, string> = {};
  if (scope) params.scope = scope;
  return request('/api/assets', { params });
}

export async function createAsset(data: unknown): Promise<unknown> {
  return request('/api/assets', { method: 'POST', body: data });
}

export async function updateAsset(
  id: string,
  data: unknown,
): Promise<unknown> {
  return request(`/api/assets/${id}`, { method: 'PUT', body: data });
}

export async function deleteAsset(id: string): Promise<void> {
  await request(`/api/assets/${id}`, { method: 'DELETE' });
}

// ===== Data sources =====

export async function listDataSources(
  projectId: string,
  screenId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/screens/${screenId}/datasources`);
}

export async function getDataSource(
  projectId: string,
  screenId: string,
  dataSourceId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/screens/${screenId}/datasources/${dataSourceId}`);
}

// ===== File Upload (multipart) =====

/**
 * Upload exported material PNG to the export endpoint.
 * Uses multipart/form-data as required by FileInterceptor.
 */
export async function uploadExportedMaterial(
  projectId: string,
  materialProjectId: string,
  pngBuffer: Buffer | ArrayBuffer,
  filename?: string,
): Promise<unknown> {
  const url = `${BASE_URL}/api/projects/${projectId}/material-projects/${materialProjectId}/export`;
  const form = new FormData();
  const blob = new Blob([pngBuffer as BlobPart], { type: 'image/png' });
  form.append('file', blob, filename ?? 'material-export.png');

  const res = await fetch(url, { method: 'POST', body: form });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload export failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** Legacy placeholder — prefer uploadExportedMaterial() */
export async function uploadFile(
  projectId: string,
  filePath: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/assets/upload`, {
    method: 'POST',
    body: { filePath },
  });
}

// ===== Snapshots =====

export async function generateSnapshots(
  projectId: string,
  config: {
    screenIds: string[];
    viewportIds?: string[];
    format?: 'png' | 'jpeg' | 'webp';
    mode?: 'viewport' | 'frame' | 'multi-viewport';
  },
): Promise<unknown> {
  return request(`/api/projects/${projectId}/snapshots/generate`, {
    method: 'POST',
    body: config,
  });
}

export async function getSnapshotJob(
  projectId: string,
  jobId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/snapshots/jobs/${jobId}`);
}

// ===== Materials =====

export async function searchMaterials(
  projectId: string,
  options?: { category?: string; search?: string },
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (options?.category) params.category = options.category;
  if (options?.search) params.search = options.search;
  return request(`/api/projects/${projectId}/materials`, { params });
}

export async function getMaterial(
  projectId: string,
  materialId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}`);
}

export async function updateMaterialMeta(
  projectId: string,
  materialId: string,
  data: { originalName?: string; category?: string; tags?: string[] },
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}/meta`, {
    method: 'PUT',
    body: data,
  });
}

// ===== Material Projects (素材工程 CRUD) =====

/**
 * 创建素材工程（持久化到数据库）
 *
 * 创建后返回 materialProjectId，可用于后续 MCP 操作和 WS 同步。
 */
export async function createMaterialProject(
  projectId: string,
  data: {
    name: string;
    targetNodeId?: string;
    canvasWidth: number;
    canvasHeight: number;
    canvasJSON?: Record<string, unknown>; // intentional: raw JSON structure from backend
    backgroundColor?: string;
    referenceFrameWidth?: number;
    referenceFrameHeight?: number;
    tags?: string[];
  },
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-projects`, {
    method: 'POST',
    body: {
      ...data,
      canvasJSON: data.canvasJSON ?? {},
    },
  });
}

/**
 * 列出素材工程（摘要，不含 canvasJSON）
 */
export async function listMaterialProjects(
  projectId: string,
  options?: { targetNodeId?: string; search?: string },
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (options?.targetNodeId) params.targetNodeId = options.targetNodeId;
  if (options?.search) params.search = options.search;
  return request(`/api/projects/${projectId}/material-projects`, { params });
}

/**
 * 获取素材工程详情（含完整 canvasJSON）
 */
export async function getMaterialProject(
  projectId: string,
  materialProjectId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-projects/${materialProjectId}`);
}

/**
 * 按关联节点查找素材工程
 */
export async function findMaterialProjectByNode(
  projectId: string,
  nodeId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-projects/by-node/${nodeId}`);
}

/**
 * 按关联节点查找所有素材工程（一对多）
 */
export async function findAllMaterialProjectsByNode(
  projectId: string,
  nodeId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-projects/all-by-node/${nodeId}`);
}

/**
 * 删除素材工程
 */
export async function deleteMaterialProject(
  projectId: string,
  materialProjectId: string,
): Promise<void> {
  await request(`/api/projects/${projectId}/material-projects/${materialProjectId}`, {
    method: 'DELETE',
  });
}

/** 更新素材工程元数据（如 targetNodeId，与设计节点建立「主关联」） */
export async function updateMaterialProject(
  projectId: string,
  materialProjectId: string,
  body: MaterialProjectUpdateBody,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-projects/${materialProjectId}`, {
    method: 'PUT',
    body,
  });
}

// ===== Material slots（节点 ↔ 素材工程，可编辑绑定 — 与前端 MaterialEditorModal 一致）=====

export interface MaterialSlotRecordDto {
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

/** 查询某设计节点上所有素材槽位 */
export async function listMaterialSlotsByNode(
  projectId: string,
  nodeId: string,
): Promise<MaterialSlotRecordDto[]> {
  return request(`/api/projects/${projectId}/material-slots/by-node/${nodeId}`);
}

/** 创建槽位：把素材工程挂到节点 + 指定 CSS 落点（如 background-image） */
export async function createMaterialSlot(
  projectId: string,
  body: {
    nodeId: string;
    slotName?: string;
    materialProjectId: string;
    sortOrder?: number;
    cssTarget?: string;
    isActive?: boolean;
  },
): Promise<MaterialSlotRecordDto> {
  return request(`/api/projects/${projectId}/material-slots`, {
    method: 'POST',
    body,
  });
}

export async function updateMaterialSlot(
  projectId: string,
  slotId: string,
  body: {
    slotName?: string;
    materialProjectId?: string;
    sortOrder?: number;
    cssTarget?: string;
    isActive?: boolean;
  },
): Promise<MaterialSlotRecordDto> {
  return request(`/api/projects/${projectId}/material-slots/${slotId}`, {
    method: 'PUT',
    body,
  });
}

/**
 * 保证「节点 + 素材工程」在 node_material_slots 中有记录（前端「设计素材…」依赖此表）。
 * 仅 applyMaterialDesign / 手写 backgroundImage 不会自动建槽位，必须在导出或绑定时调用本函数。
 */
export async function ensureMaterialNodeBinding(
  projectId: string,
  nodeId: string,
  materialProjectId: string,
  options?: { preferredCssTarget?: string },
): Promise<{ ok: boolean; action: 'none' | 'created' | 'updated'; slotId?: string; error?: string }> {
  try {
    const slots = await listMaterialSlotsByNode(projectId, nodeId);
    const preferred = options?.preferredCssTarget;
    const same = slots.find((s) => s.materialProjectId === materialProjectId);
    if (same) {
      // 绝不把 border-image / mask-image 等槽位强行改成 background-image（会与「边框素材」语义冲突）
      if (same.isActive !== true) {
        await updateMaterialSlot(projectId, same.id, {
          materialProjectId,
          cssTarget: same.cssTarget,
          isActive: true,
        });
        return { ok: true, action: 'updated', slotId: same.id };
      }
      return { ok: true, action: 'none', slotId: same.id };
    }
    const def = slots.find((s) => s.slotName === 'default');
    if (def) {
      const cssTarget = preferred ?? def.cssTarget ?? 'background-image';
      await updateMaterialSlot(projectId, def.id, {
        materialProjectId,
        cssTarget,
        isActive: true,
      });
      return { ok: true, action: 'updated', slotId: def.id };
    }
    try {
      const created = await createMaterialSlot(projectId, {
        nodeId,
        slotName: 'default',
        materialProjectId,
        cssTarget: preferred ?? 'background-image',
        isActive: true,
      });
      return { ok: true, action: 'created', slotId: created.id };
    } catch (e) {
      if (e instanceof ApiHttpError && e.statusCode === 409) {
        const again = await listMaterialSlotsByNode(projectId, nodeId);
        const d = again.find((s) => s.slotName === 'default');
        if (d) {
          await updateMaterialSlot(projectId, d.id, {
            materialProjectId,
            cssTarget: preferred ?? d.cssTarget ?? 'background-image',
            isActive: true,
          });
          return { ok: true, action: 'updated', slotId: d.id };
        }
      }
      throw e;
    }
  } catch (e) {
    return {
      ok: false,
      action: 'none',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ===== Material Editor Actions =====

/**
 * 执行单条素材编辑器操作
 *
 * 与 executeOperation() 完全同构，但路由指向素材操作端点。
 */
export async function executeMaterialOperation(
  projectId: string,
  materialId: string,
  operation: unknown,
  author?: string,
  fingerprint?: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}/operations`, {
    method: 'POST',
    body: {
      operation,
      author: author ?? 'ai:mcp',
      fingerprint,
    },
  });
}

/**
 * 批量执行素材编辑器操作
 */
export async function executeMaterialBatch(
  projectId: string,
  materialId: string,
  operations: unknown[], // polymorphic operation shapes — intentionally untyped
  author?: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}/operations/batch`, {
    method: 'POST',
    body: {
      operations,
      author: author ?? 'ai:mcp',
    },
  });
}

/**
 * 增量拉取素材编辑器操作日志
 */
export async function getMaterialOperationsSince(
  projectId: string,
  materialId: string,
  since: number,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}/operations`, {
    params: { since: String(since) },
  });
}

/**
 * 素材编辑器撤销
 */
export async function materialUndo(
  projectId: string,
  materialId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}/operations/undo`, {
    method: 'POST',
    body: { author: 'ai:mcp' },
  });
}

/**
 * 素材编辑器重做
 */
export async function materialRedo(
  projectId: string,
  materialId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}/operations/redo`, {
    method: 'POST',
    body: { author: 'ai:mcp' },
  });
}

/**
 * 获取素材编辑器完整 Schema
 */
export async function getMaterialSchema(
  projectId: string,
  materialId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/materials/${materialId}/schema`);
}

/**
 * 素材编辑器统一操作接口（旧版，兼容期间保留）。
 *
 * @deprecated 使用 executeMaterialOperation() 代替
 */
export async function materialEditorAction(
  projectId: string,
  action: string,
  params: Record<string, unknown>, // intentional: legacy action params are untyped
  options?: { materialProjectId?: string; fingerprint?: string },
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-editor/${action}`, {
    method: 'POST',
    body: {
      params,
      materialProjectId: options?.materialProjectId,
      author: 'ai:mcp',
      fingerprint: options?.fingerprint,
    },
  });
}

/**
 * 获取素材编辑器所有预设（渐变、动画、纹理、阴影）。
 */
export async function getMaterialEditorPresets(): Promise<unknown> {
  return request('/api/material-editor/presets');
}

// ===== Material Slots (素材槽位 CRUD) =====

/**
 * 查询节点的所有素材槽位（含素材工程摘要）
 */
export async function findSlotsByNode(
  projectId: string,
  nodeId: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-slots/by-node/${nodeId}`);
}

/**
 * 查询节点指定槽位
 */
export async function findSlot(
  projectId: string,
  nodeId: string,
  slotName: string,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-slots/by-node/${nodeId}/${slotName}`);
}

/**
 * 创建素材槽位
 */
export async function createSlot(
  projectId: string,
  data: {
    nodeId: string;
    slotName?: string;
    materialProjectId: string;
    sortOrder?: number;
    cssTarget?: string;
    isActive?: boolean;
  },
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-slots`, {
    method: 'POST',
    body: data,
  });
}

/**
 * 更新素材槽位
 */
export async function updateSlot(
  projectId: string,
  slotId: string,
  data: {
    slotName?: string;
    materialProjectId?: string;
    sortOrder?: number;
    cssTarget?: string;
    isActive?: boolean;
  },
): Promise<unknown> {
  return request(`/api/projects/${projectId}/material-slots/${slotId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * 删除素材槽位
 */
export async function deleteSlot(
  projectId: string,
  slotId: string,
): Promise<void> {
  await request(`/api/projects/${projectId}/material-slots/${slotId}`, {
    method: 'DELETE',
  });
}

// ===== Theme =====

export async function getTheme(projectId: string): Promise<unknown> {
  return request(`/api/projects/${projectId}/theme`);
}

export async function updateTheme(
  projectId: string,
  themeConfig: unknown,
): Promise<unknown> {
  return request(`/api/projects/${projectId}/theme`, {
    method: 'PUT',
    body: { themeConfig },
  });
}

// Default export for compatibility with dynamic import().default patterns used in domain tools
const apiClient = {
  getProject, getProjectIntegrity, createProject, listProjects, deleteProject,
  executeOperation, executeBatch, getOperationsSince, undo,
  listAssets, createAsset, updateAsset, deleteAsset,
  listDataSources, getDataSource, uploadFile,
  generateSnapshots, getSnapshotJob,
  searchMaterials, getMaterial, updateMaterialMeta,
  createMaterialProject, listMaterialProjects, getMaterialProject,
  findMaterialProjectByNode, findAllMaterialProjectsByNode, deleteMaterialProject,
  executeMaterialOperation, executeMaterialBatch, getMaterialOperationsSince,
  materialUndo, materialRedo, getMaterialSchema,
  materialEditorAction,
  getMaterialEditorPresets,
  findSlotsByNode, findSlot, createSlot, updateSlot, deleteSlot,
  uploadExportedMaterial,
  getTheme, updateTheme,
};
export { apiClient };
export { apiClient as default };
