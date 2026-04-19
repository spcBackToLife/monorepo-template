/**
 * 将 Schema / applyMaterialDesign 中常见的「同源相对路径」资源，
 * 补全为可在任意宿主（独立端口、iframe、未配置代理）下加载的绝对 URL。
 *
 * 典型：`url("/uploads/...")`、`/uploads/foo.png`
 */
function joinOrigin(origin: string, path: string): string {
  const o = origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${o}${p}`;
}

/** 重写 CSS 值里的 url("/uploads/...") */
export function rewriteCssUrlValues(value: string, origin: string): string {
  return value.replace(/url\(\s*(['"]?)(\/uploads\/[^'")]+)\1\s*\)/gi, (_m, q: string, path: string) => {
    return `url(${q}${joinOrigin(origin, path)}${q})`;
  });
}

/** 对 React 样式对象中可能是 url(...) 的字段做补全 */
export function rewriteStyleObjectUrls<T extends Record<string, unknown>>(
  styles: T,
  origin: string | undefined,
): T {
  if (!origin || typeof origin !== 'string') return styles;
  const out = { ...styles };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === 'string' && v.includes('/uploads/')) {
      (out as Record<string, unknown>)[key] = rewriteCssUrlValues(v, origin);
    }
  }
  return out as T;
}

/** img / video 等 src */
export function rewriteMediaSrc(src: string | undefined, origin: string | undefined): string | undefined {
  if (!origin || typeof src !== 'string' || src.length === 0) return src;
  if (src.startsWith('/uploads/')) return joinOrigin(origin, src);
  return src;
}
