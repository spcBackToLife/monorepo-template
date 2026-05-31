/**
 * 内置函数白名单（与 design-schema BuiltinFunctions 接口保持一致）。
 *
 * 这些函数挂在表达式作用域 `$` 命名空间下，写法如：
 *   {{ $.length(state.data.messages) }}
 *   {{ $.format("hi {0}", state.view.name) }}
 *
 * 实现要点：
 *   - 全部纯函数，不修改入参
 *   - 对 null/undefined/异常入参做容错（返回合理默认值），不抛错
 */

export interface BuiltinFunctions {
  length(v: unknown): number;
  upper(s: string): string;
  lower(s: string): string;
  format(template: string, ...args: unknown[]): string;
  includes(arr: unknown[] | string, item: unknown): boolean;
  first<T>(arr: T[]): T | undefined;
  last<T>(arr: T[]): T | undefined;
  isEmpty(v: unknown): boolean;
  not(v: unknown): boolean;
  defaultTo<T>(v: T | null | undefined, fallback: T): T;
  /** v1.0 ★ 当前时间戳（ms）。等价 Date.now()；推荐前端首选 */
  now(): number;
  /** v1.0 ★ 正则匹配；pattern 可以是字符串或 RegExp 字面量 */
  matches(s: string, pattern: string | RegExp): boolean;
}

export const builtinFunctions: BuiltinFunctions = {
  length(v: unknown): number {
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'string') return v.length;
    if (v && typeof v === 'object') return Object.keys(v as Record<string, unknown>).length;
    return 0;
  },

  upper(s: string): string {
    return typeof s === 'string' ? s.toUpperCase() : String(s ?? '').toUpperCase();
  },

  lower(s: string): string {
    return typeof s === 'string' ? s.toLowerCase() : String(s ?? '').toLowerCase();
  },

  /** 形如 "hi {0}, age {1}" 的模板，按位置 / 按 key 替换 */
  format(template: string, ...args: unknown[]): string {
    if (typeof template !== 'string') return String(template ?? '');
    return template.replace(/\{([^}]+)\}/g, (_m, key: string) => {
      const trimmed = key.trim();
      const numeric = /^\d+$/.test(trimmed) ? Number(trimmed) : -1;
      if (numeric >= 0) {
        const v = args[numeric];
        return v === undefined || v === null ? '' : String(v);
      }
      // 按 key 找：format("hi {name}", { name: 'tom' })
      const obj = args[0];
      if (obj && typeof obj === 'object') {
        const v = (obj as Record<string, unknown>)[trimmed];
        return v === undefined || v === null ? '' : String(v);
      }
      return '';
    });
  },

  includes(arr: unknown[] | string, item: unknown): boolean {
    if (Array.isArray(arr)) return arr.includes(item);
    if (typeof arr === 'string') return arr.includes(String(item));
    return false;
  },

  first<T>(arr: T[]): T | undefined {
    return Array.isArray(arr) ? arr[0] : undefined;
  },

  last<T>(arr: T[]): T | undefined {
    return Array.isArray(arr) ? arr[arr.length - 1] : undefined;
  },

  isEmpty(v: unknown): boolean {
    if (v === undefined || v === null) return true;
    if (typeof v === 'string') return v.length === 0;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length === 0;
    return false;
  },

  not(v: unknown): boolean {
    return !v;
  },

  defaultTo<T>(v: T | null | undefined, fallback: T): T {
    return v === undefined || v === null ? fallback : v;
  },

  now(): number {
    return Date.now();
  },

  matches(s: string, pattern: string | RegExp): boolean {
    if (typeof s !== 'string') return false;
    try {
      const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      return re.test(s);
    } catch {
      return false;
    }
  },
};

/** 不允许被访问的全局名（防御层；解析期不让 identifier 命中也能挡） */
export const FORBIDDEN_GLOBALS = new Set([
  'globalThis',
  'window',
  'self',
  'Function',
  'eval',
  'process',
  'require',
  'import',
  'document',
  'fetch',
  'XMLHttpRequest',
]);
