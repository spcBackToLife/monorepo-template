export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'ApiError';
  }
}

/** Shape of error response bodies from the API */
interface ApiErrorBody {
  message?: string | string[];
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'message' in value;
}

export function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '请求失败';
  if (!isApiErrorBody(body)) return '请求失败';
  if (Array.isArray(body.message)) return body.message.map(String).join('；');
  if (typeof body.message === 'string') return body.message;
  return '请求失败';
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (init?.token) {
    headers.set('Authorization', `Bearer ${init.token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}

// ===== Shared response interfaces for raw fetch + .json() calls =====

/** Generic asset upload response (url is optional when upload fails) */
export interface AssetUploadResponse {
  url?: string;
  filename?: string;
}

/** Material export upload response (url is always present on success) */
export interface MaterialExportUploadResponse {
  url: string;
}
