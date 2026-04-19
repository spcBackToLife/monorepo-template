import { API_BASE } from '@/api/client';

/** 将 `/uploads`、`/api` 等同源路径解析为可加载静态文件的 origin（设计 API 与 Vite 不同端口时必需） */
export function getEditorStaticAssetOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return new URL(API_BASE, window.location.href).origin;
  } catch {
    return window.location.origin;
  }
}
