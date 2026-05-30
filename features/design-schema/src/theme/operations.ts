/**
 * Theme 操作 reducer — 纯函数，唯一的 themeConfig 变更入口。
 *
 * 所有调用方（MCP / 后端 API / 前端 store）共用同一份语义，
 * 保证"无论从哪个入口改主题，最终落库结构 100% 一致"。
 *
 * 设计原则：
 *   - 接收当前 ThemeConfig + op 描述，返回新的 ThemeConfig（不 mutate 入参）
 *   - 所有写入定位到 themes[<targetThemeId or active>] 内部
 *   - 别名自动映射（bgPage→background 等）
 *   - 裸值自动包装为 schema 期望的 { value, description, ... } 结构
 *   - 深合并：不传字段不删
 */
import type {
  ThemeConfig,
  ThemeDefinition,
  ColorScheme,
  DesignTokenSet,
  TokenOverrides,
  StyleIntent,
  DecorationRules,
  IconSpec,
  ComponentStateSpec,
} from '../types/theme';
import {
  createDefaultTheme,
  deriveThemeFromBase,
  createColorScheme,
  deriveDarkSchemeOverrides,
} from './factories';

// ============================================================================
// 别名映射（让认知友好的字段名最终落到 schema 真理名）
// ============================================================================
export const COLOR_NAME_ALIAS: Record<string, string> = {
  bgPage: 'background',
  bgCard: 'surface',
  bgElevated: 'surfaceElevated',
  borderDefault: 'border',
  borderStrong: 'borderFocus',
  divider: 'borderLight',
  accent: 'secondary',
};

export const TYPOGRAPHY_NAME_ALIAS: Record<string, string> = {
  bodyLg: 'body-lg',
};

export function normalizeColorKey(k: string): string {
  return COLOR_NAME_ALIAS[k] ?? k;
}

export function normalizeTypographyKey(k: string): string {
  return TYPOGRAPHY_NAME_ALIAS[k] ?? k;
}

// ============================================================================
// 值包装（裸值 → schema 期望的对象形态）
// ============================================================================
type RawTokenValue = string | number | Record<string, unknown>;

export function wrapColorValue(raw: RawTokenValue): { value: string; description?: string } {
  if (typeof raw === 'string') return { value: raw };
  if (raw && typeof raw === 'object' && typeof (raw as { value?: unknown }).value === 'string') {
    return raw as { value: string; description?: string };
  }
  throw new Error(`Invalid color token value: ${JSON.stringify(raw)}`);
}

export function wrapSpacingValue(raw: RawTokenValue): { value: string; px: number; description?: string } {
  if (typeof raw === 'number') return { value: `${raw}px`, px: raw };
  if (typeof raw === 'string') {
    const px = parseFloat(raw);
    return { value: raw.endsWith('px') ? raw : `${px}px`, px };
  }
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const v = raw as { value: string; px?: number; description?: string };
    return { value: v.value, px: v.px ?? parseFloat(v.value), description: v.description };
  }
  throw new Error(`Invalid spacing token value: ${JSON.stringify(raw)}`);
}

export function wrapRadiusValue(raw: RawTokenValue): { value: string; description?: string } {
  if (typeof raw === 'number') return { value: raw === 9999 ? '9999px' : `${raw}px` };
  if (typeof raw === 'string') return { value: raw };
  if (raw && typeof raw === 'object' && 'value' in raw) return raw as { value: string; description?: string };
  throw new Error(`Invalid radius token value: ${JSON.stringify(raw)}`);
}

export function wrapShadowValue(raw: RawTokenValue): { value: string; description?: string } {
  if (typeof raw === 'string') return { value: raw };
  if (raw && typeof raw === 'object' && 'value' in raw) return raw as { value: string; description?: string };
  throw new Error(`Invalid shadow token value: ${JSON.stringify(raw)}`);
}

export function wrapTransitionValue(raw: RawTokenValue): { value: string; durationMs: number; description?: string } {
  if (typeof raw === 'string') {
    const m = raw.match(/(\d+)ms/);
    return { value: raw, durationMs: m ? parseInt(m[1]!, 10) : 0 };
  }
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const v = raw as { value: string; durationMs?: number; description?: string };
    return { value: v.value, durationMs: v.durationMs ?? 0, description: v.description };
  }
  throw new Error(`Invalid transition token value: ${JSON.stringify(raw)}`);
}

export function wrapTypographyValue(raw: Record<string, unknown>): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid typography token value: ${JSON.stringify(raw)}`);
  }
  return { ...raw };
}

// ============================================================================
// 定位 + 深合并
// ============================================================================
export function findTheme(cfg: ThemeConfig, themeId?: string): ThemeDefinition {
  const id = themeId ?? cfg.activeThemeId;
  const theme = cfg.themes.find(t => t.id === id);
  if (!theme) {
    throw new Error(`Theme "${id}" not found. Available: ${cfg.themes.map(t => t.id).join(', ')}`);
  }
  return theme;
}

export function findScheme(theme: ThemeDefinition, schemeId?: string): ColorScheme {
  const id = schemeId ?? theme.activeColorSchemeId;
  const scheme = theme.colorSchemes.find(s => s.id === id);
  if (!scheme) {
    throw new Error(
      `ColorScheme "${id}" not found in theme "${theme.id}". Available: ${theme.colorSchemes.map(s => s.id).join(', ')}`,
    );
  }
  return scheme;
}

export function deepMerge<T extends Record<string, unknown>>(base: T | undefined, patch: Partial<T>): T {
  const result = { ...(base ?? {}) } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && result[k] && typeof result[k] === 'object' && !Array.isArray(result[k])) {
      result[k] = deepMerge(result[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result as T;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// ============================================================================
// ThemeOp 联合类型 —— 全部 13 种操作的描述
// ============================================================================
export type TokenKind = 'colors' | 'spacing' | 'radius' | 'typography' | 'shadows' | 'transitions';

export type ThemeOp =
  | { type: 'scaffold_theme'; themeId: string; name: string; description?: string; copyFrom?: string; activate?: boolean }
  | { type: 'delete_theme'; themeId: string }
  | { type: 'switch_theme'; themeId: string }
  | { type: 'set_theme_intent'; intent: Partial<StyleIntent>; themeId?: string }
  | { type: 'set_theme_tokens'; kind: TokenKind; values: Record<string, unknown>; themeId?: string }
  | { type: 'set_theme_decoration'; decorationRules: Partial<DecorationRules>; themeId?: string }
  | { type: 'set_theme_icon_spec'; iconSpec: Partial<IconSpec>; themeId?: string }
  | { type: 'set_theme_state_spec'; stateSpec: Partial<ComponentStateSpec>; themeId?: string }
  | { type: 'switch_color_scheme'; schemeId: string; themeId?: string }
  | { type: 'add_color_scheme'; schemeId: string; name?: string; label?: string; kind?: 'dark' | 'light' | 'high-contrast' | 'custom'; overrides?: TokenOverrides; themeId?: string }
  | { type: 'update_color_scheme_overrides'; schemeId: string; kind: TokenKind; values: Record<string, unknown>; themeId?: string }
  | { type: 'remove_color_scheme'; schemeId: string; themeId?: string };

// ============================================================================
// applyThemeOp —— 唯一的 reducer 入口
// ============================================================================
export interface ApplyThemeOpResult {
  /** 应用 op 后的新 themeConfig（深拷贝，调用方可安全使用） */
  next: ThemeConfig;
  /** 受影响的字段路径（前端可用于增量渲染 / 操作历史展示） */
  changed: string[];
}

export function applyThemeOp(cfg: ThemeConfig, op: ThemeOp): ApplyThemeOpResult {
  const next = clone(cfg);
  next.schemaVersion = '1.0';
  next.customized = true;

  switch (op.type) {
    case 'scaffold_theme': {
      if (next.themes.some(t => t.id === op.themeId)) {
        throw new Error(`Theme "${op.themeId}" 已存在`);
      }
      const newTheme = op.copyFrom
        ? deriveThemeFromBase(findTheme(next, op.copyFrom), {
            id: op.themeId,
            name: op.name,
            description: op.description,
            intent: findTheme(next, op.copyFrom).intent,
          })
        : createDefaultTheme({ id: op.themeId, name: op.name, description: op.description });
      next.themes.push(newTheme);
      if (op.activate !== false) next.activeThemeId = op.themeId;
      return { next, changed: [`themes[+${op.themeId}]`, 'activeThemeId'] };
    }

    case 'delete_theme': {
      if (op.themeId === next.activeThemeId) {
        throw new Error(`不能删除 active 主题 "${op.themeId}"`);
      }
      const before = next.themes.length;
      next.themes = next.themes.filter(t => t.id !== op.themeId);
      if (next.themes.length === before) throw new Error(`Theme "${op.themeId}" 不存在`);
      return { next, changed: [`themes[-${op.themeId}]`] };
    }

    case 'switch_theme': {
      findTheme(next, op.themeId);
      next.activeThemeId = op.themeId;
      return { next, changed: ['activeThemeId'] };
    }

    case 'set_theme_intent': {
      const theme = findTheme(next, op.themeId);
      theme.intent = deepMerge(theme.intent as unknown as Record<string, unknown>, op.intent as Record<string, unknown>) as unknown as StyleIntent;
      theme.updatedAt = new Date().toISOString();
      return { next, changed: [`themes[${theme.id}].intent`] };
    }

    case 'set_theme_tokens': {
      const theme = findTheme(next, op.themeId);
      theme.tokens ??= {} as DesignTokenSet;
      const group = (theme.tokens as unknown as Record<string, Record<string, unknown>>)[op.kind] ??= {};
      for (const [rawKey, rawVal] of Object.entries(op.values)) {
        const { key, wrapped } = wrapTokenForKind(op.kind, rawKey, rawVal);
        group[key] = deepMerge(group[key] as Record<string, unknown> | undefined, wrapped as Record<string, unknown>);
      }
      theme.updatedAt = new Date().toISOString();
      return { next, changed: Object.keys(op.values).map(k => `themes[${theme.id}].tokens.${op.kind}.${k}`) };
    }

    case 'set_theme_decoration': {
      const theme = findTheme(next, op.themeId);
      theme.decorationRules = deepMerge(theme.decorationRules as unknown as Record<string, unknown>, op.decorationRules as Record<string, unknown>) as unknown as DecorationRules;
      theme.updatedAt = new Date().toISOString();
      return { next, changed: [`themes[${theme.id}].decorationRules`] };
    }

    case 'set_theme_icon_spec': {
      const theme = findTheme(next, op.themeId);
      theme.iconSpec = deepMerge(theme.iconSpec as unknown as Record<string, unknown>, op.iconSpec as Record<string, unknown>) as unknown as IconSpec;
      theme.updatedAt = new Date().toISOString();
      return { next, changed: [`themes[${theme.id}].iconSpec`] };
    }

    case 'set_theme_state_spec': {
      const theme = findTheme(next, op.themeId);
      theme.stateSpec = deepMerge(theme.stateSpec as unknown as Record<string, unknown>, op.stateSpec as Record<string, unknown>) as unknown as ComponentStateSpec;
      theme.updatedAt = new Date().toISOString();
      return { next, changed: [`themes[${theme.id}].stateSpec`] };
    }

    case 'switch_color_scheme': {
      const theme = findTheme(next, op.themeId);
      findScheme(theme, op.schemeId);
      theme.activeColorSchemeId = op.schemeId;
      return { next, changed: [`themes[${theme.id}].activeColorSchemeId`] };
    }

    case 'add_color_scheme': {
      const theme = findTheme(next, op.themeId);
      if (theme.colorSchemes.some(s => s.id === op.schemeId)) {
        throw new Error(`ColorScheme "${op.schemeId}" 在主题 "${theme.id}" 已存在`);
      }
      let overrides = op.overrides ?? {};
      // 别名映射
      if (overrides.colors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(overrides.colors)) {
          if (v !== undefined) mapped[normalizeColorKey(k)] = v;
        }
        overrides = { ...overrides, colors: mapped };
      }
      // 暗色自动派生骨架
      if (op.kind === 'dark' && (!overrides.colors || Object.keys(overrides.colors).length === 0)) {
        overrides = deriveDarkSchemeOverrides(theme.tokens) as TokenOverrides;
      }
      theme.colorSchemes.push(createColorScheme({ id: op.schemeId, name: op.name, label: op.label, overrides }));
      theme.updatedAt = new Date().toISOString();
      return { next, changed: [`themes[${theme.id}].colorSchemes[+${op.schemeId}]`] };
    }

    case 'update_color_scheme_overrides': {
      const theme = findTheme(next, op.themeId);
      const scheme = findScheme(theme, op.schemeId);
      const overrides = (scheme.overrides ??= {});
      const group = ((overrides as unknown as Record<string, Record<string, unknown>>)[op.kind] ??= {});
      for (const [rawKey, rawVal] of Object.entries(op.values)) {
        const key = op.kind === 'colors' ? normalizeColorKey(rawKey) : op.kind === 'typography' ? normalizeTypographyKey(rawKey) : rawKey;
        // overrides 内部存裸值（resolveTokens 直接读 string）
        if (typeof rawVal === 'string' || typeof rawVal === 'number') {
          group[key] = String(rawVal);
        } else if (rawVal && typeof rawVal === 'object' && 'value' in (rawVal as Record<string, unknown>)) {
          group[key] = (rawVal as { value: string }).value;
        } else {
          group[key] = rawVal as unknown as string;
        }
      }
      if (Object.keys(group).length === 0) delete (overrides as Record<string, unknown>)[op.kind];
      theme.updatedAt = new Date().toISOString();
      return { next, changed: Object.keys(op.values).map(k => `themes[${theme.id}].colorSchemes[${op.schemeId}].overrides.${op.kind}.${k}`) };
    }

    case 'remove_color_scheme': {
      const theme = findTheme(next, op.themeId);
      if (theme.activeColorSchemeId === op.schemeId) {
        throw new Error(`不能删除 active colorScheme "${op.schemeId}"`);
      }
      if (theme.colorSchemes.length <= 2) {
        throw new Error(`主题 "${theme.id}" 至少保留 2 个色彩方案`);
      }
      const before = theme.colorSchemes.length;
      theme.colorSchemes = theme.colorSchemes.filter(s => s.id !== op.schemeId);
      if (theme.colorSchemes.length === before) throw new Error(`ColorScheme "${op.schemeId}" 不存在`);
      theme.updatedAt = new Date().toISOString();
      return { next, changed: [`themes[${theme.id}].colorSchemes[-${op.schemeId}]`] };
    }
  }
}

function wrapTokenForKind(kind: TokenKind, rawKey: string, rawVal: unknown): { key: string; wrapped: unknown } {
  switch (kind) {
    case 'colors':
      return { key: normalizeColorKey(rawKey), wrapped: wrapColorValue(rawVal as RawTokenValue) };
    case 'spacing':
      return { key: rawKey, wrapped: wrapSpacingValue(rawVal as RawTokenValue) };
    case 'radius':
      return { key: rawKey, wrapped: wrapRadiusValue(rawVal as RawTokenValue) };
    case 'shadows':
      return { key: rawKey, wrapped: wrapShadowValue(rawVal as RawTokenValue) };
    case 'transitions':
      return { key: rawKey, wrapped: wrapTransitionValue(rawVal as RawTokenValue) };
    case 'typography':
      return { key: normalizeTypographyKey(rawKey), wrapped: wrapTypographyValue(rawVal as Record<string, unknown>) };
  }
}
