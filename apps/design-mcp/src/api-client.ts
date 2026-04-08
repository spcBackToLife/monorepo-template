/**
 * API Client for MCP Server → design-api REST communication.
 *
 * All MCP tools call design-api through this client.
 */

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
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ===== Projects =====

export async function getProject(projectId: string): Promise<unknown> {
  return request(`/api/projects/${projectId}`);
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
  operations: unknown[],
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
  const params: Record<string, string> = {};
  if (scope) params.scope = scope;
  if (projectId) params.projectId = projectId;
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

// ===== File Upload =====

export async function uploadFile(
  projectId: string,
  filePath: string,
): Promise<unknown> {
  // Note: File upload requires multipart form data; this is a placeholder
  // for use in contexts where fetch FormData is available.
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
    canvasJSON?: Record<string, unknown>;
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

// ===== Material Editor Actions =====

/**
 * 素材编辑器 v2 操作系统 — 执行单条操作
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
 * 素材编辑器 v2 操作系统 — 批量执行操作
 */
export async function executeMaterialBatch(
  projectId: string,
  materialId: string,
  operations: unknown[],
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
 * 素材编辑器 v2 操作系统 — 增量拉取操作日志
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
 * 素材编辑器 v2 操作系统 — 撤销
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
 * 素材编辑器 v2 操作系统 — 重做
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
 * 素材编辑器 v2 操作系统 — 获取完整 Schema
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
  params: Record<string, unknown>,
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
 * 获取素材编辑器工程数据（用于 MCP Resource 读取）。
 */
export async function getMaterialEditorProject(
  projectId: string,
  materialId?: string,
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (materialId) params.materialId = materialId;
  return request(`/api/projects/${projectId}/material-editor/project`, { params });
}

/**
 * 获取素材编辑器所有预设（渐变、动画、纹理、阴影）。
 */
export async function getMaterialEditorPresets(): Promise<unknown> {
  return request('/api/material-editor/presets');
}

/**
 * 获取素材编辑器能力清单（可用操作列表及其参数说明）。
 */
export async function getMaterialEditorCapabilities(): Promise<unknown> {
  return request('/api/material-editor/capabilities');
}
