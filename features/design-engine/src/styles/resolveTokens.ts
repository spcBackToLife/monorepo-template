import type { ThemeConfig, ThemeDefinition, TypographyToken, TokenOverrides, DesignTokenSet } from '@globallink/design-schema';

/**
 * Token 引用前缀。样式值以此开头表示引用项目 Token。
 * 例如: "$token:primary" → ThemeConfig.tokens.colors.primary.value
 */
const TOKEN_PREFIX = '$token:';

/**
 * 解析单个样式值中的 Token 引用。
 *
 * 支持的格式：
 *   - "$token:primary"                  → colors.primary.value
 *   - "$token:spacing-md"               → spacing.md.value
 *   - "$token:radius-lg"                → radius.lg.value
 *   - "$token:shadow-sm"                → shadows.sm.value
 *   - "$token:transition-fast"          → transitions.fast.value
 *   - "$token:font-body.fontSize"       → typography.body.fontSize
 *   - "$token:font-h1.lineHeight"       → typography.h1.lineHeight
 *   - "$token:spacing-sm $token:spacing-md" → "8px 16px"（复合值）
 *
 * 如果 themeConfig 为 null/undefined 或 Token 不存在，原样返回。
 */
export function resolveTokenValue(
  value: string | number | undefined,
  themeConfig: ThemeConfig | null | undefined,
): string | number | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === 'number') return value;
  if (!themeConfig) return value;
  if (!value.includes(TOKEN_PREFIX)) return value;

  // 处理复合值（如 padding: "$token:spacing-sm $token:spacing-md"）
  if (value.includes(' ') && value.includes(TOKEN_PREFIX)) {
    return value.split(' ').map(part =>
      part.startsWith(TOKEN_PREFIX) ? resolveSingleToken(part, themeConfig) ?? part : part
    ).join(' ');
  }

  // 单值
  if (value.startsWith(TOKEN_PREFIX)) {
    return resolveSingleToken(value, themeConfig) ?? value;
  }

  return value;
}

/**
 * 解析单个 $token:xxx 引用
 *
 * 查找顺序：
 * 1. 当前激活主题 → 当前色彩方案的 overrides
 * 2. 当前激活主题 → base tokens
 */
function resolveSingleToken(
  ref: string,
  themeConfig: ThemeConfig,
): string | undefined {
  const path = ref.slice(TOKEN_PREFIX.length); // "primary" / "spacing-md" / "font-body.fontSize"

  // 找到当前激活的主题定义
  const activeTheme = themeConfig.themes?.find(t => t.id === themeConfig.activeThemeId);
  if (!activeTheme) return undefined;

  // 1. 先查当前色彩方案的 overrides
  const activeScheme = activeTheme.colorSchemes?.find(s => s.id === activeTheme.activeColorSchemeId);
  const overrideValue = lookupOverride(path, activeScheme?.overrides);
  if (overrideValue !== undefined) return overrideValue;

  // 2. 回退到主题的 base tokens
  return lookupBaseToken(path, activeTheme.tokens);
}

/**
 * 在色彩方案 overrides 中查找
 */
function lookupOverride(
  path: string,
  overrides: TokenOverrides | undefined,
): string | undefined {
  if (!overrides) return undefined;

  // 颜色: "primary" / "textPrimary" → overrides.colors.primary
  if (overrides.colors?.[path] !== undefined) {
    return overrides.colors[path];
  }

  // 间距: "spacing-md" → overrides.spacing.md
  if (path.startsWith('spacing-')) {
    const key = path.slice('spacing-'.length);
    return overrides.spacing?.[key];
  }

  // 圆角: "radius-md" → overrides.radius.md
  if (path.startsWith('radius-')) {
    const key = path.slice('radius-'.length);
    return overrides.radius?.[key];
  }

  // 阴影: "shadow-sm" → overrides.shadows.sm
  if (path.startsWith('shadow-')) {
    const key = path.slice('shadow-'.length);
    return overrides.shadows?.[key];
  }

  // 动效: "transition-fast" → overrides.transitions.fast
  if (path.startsWith('transition-')) {
    const key = path.slice('transition-'.length);
    return overrides.transitions?.[key];
  }

  return undefined;
}

/**
 * 在 base tokens 中查找
 */
function lookupBaseToken(
  path: string,
  tokens: DesignTokenSet | undefined,
): string | undefined {
  if (!tokens) return undefined;

  // 字体子属性: "font-body.fontSize" / "font-h1.lineHeight"
  if (path.startsWith('font-') && path.includes('.')) {
    const [fontPath, prop] = path.split('.');
    const fontKey = fontPath!.slice('font-'.length);
    const typo = tokens.typography?.[fontKey] as TypographyToken | undefined;
    if (typo && prop && prop in typo) {
      return typo[prop as keyof TypographyToken];
    }
    return undefined;
  }

  // 间距: "spacing-md"
  if (path.startsWith('spacing-')) {
    const key = path.slice('spacing-'.length);
    return tokens.spacing?.[key]?.value;
  }

  // 圆角: "radius-md"
  if (path.startsWith('radius-')) {
    const key = path.slice('radius-'.length);
    return tokens.radius?.[key]?.value;
  }

  // 阴影: "shadow-sm"
  if (path.startsWith('shadow-')) {
    const key = path.slice('shadow-'.length);
    return tokens.shadows?.[key]?.value;
  }

  // 动效: "transition-fast"
  if (path.startsWith('transition-')) {
    const key = path.slice('transition-'.length);
    return tokens.transitions?.[key]?.value;
  }

  // 字体整体: "font-body" → 返回 fontSize（最常用）
  if (path.startsWith('font-')) {
    const key = path.slice('font-'.length);
    return tokens.typography?.[key]?.fontSize;
  }

  // 颜色: 直接用 path 作 key（"primary" / "textPrimary" / "surface"）
  if (tokens.colors?.[path]) {
    return tokens.colors[path].value;
  }

  // 自定义
  if (tokens.custom?.[path]) {
    return tokens.custom[path].value;
  }

  return undefined;
}

/**
 * 批量解析一组样式中的所有 Token 引用
 */
export function resolveTokensInStyles(
  styles: Record<string, string | number | undefined>,
  themeConfig: ThemeConfig | null | undefined,
): Record<string, string | number | undefined> {
  if (!themeConfig) return styles;

  const resolved: Record<string, string | number | undefined> = {};
  for (const [key, value] of Object.entries(styles)) {
    resolved[key] = resolveTokenValue(value, themeConfig);
  }
  return resolved;
}
