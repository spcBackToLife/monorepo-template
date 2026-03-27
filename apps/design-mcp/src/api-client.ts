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
