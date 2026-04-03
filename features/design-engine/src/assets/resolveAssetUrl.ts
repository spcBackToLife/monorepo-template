/**
 * 将 Schema 中的静态资源引用解析为浏览器可加载的 URL。
 *
 * - `asset://uploads/xxx.png` 或 `asset:///uploads/xxx.png` → `/uploads/xxx.png`
 * - 其它 http(s) / data: / 普通路径原样返回
 */
export function resolveAssetUrl(src: unknown): string {
  if (typeof src !== 'string' || src.length === 0) return '';
  if (!src.startsWith('asset://')) return src;
  const raw = src.slice('asset://'.length).replace(/^\/+/, '').replace(/\\/g, '/');
  return raw.startsWith('/') ? raw : `/${raw}`;
}
