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

export function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '请求失败';
  const b = body as { message?: unknown };
  if (Array.isArray(b.message)) return b.message.map(String).join('；');
  if (typeof b.message === 'string') return b.message;
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
  const data: unknown = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}
