import type { ThemeConfig, ThemeDefinition, TypographyToken, TokenOverrides, DesignTokenSet } from '@globallink/design-schema';

/**
 * Token 引用前缀。样式值以此开头表示引用项目 Token。
 * 例如: "$token:primary" → ThemeConfig.themes[active].tokens.colors.primary.value
 *      （查找顺序：先 active colorScheme.overrides，回退 active theme.tokens）
 */
const TOKEN_PREFIX = '$token:';

/**
 * 解析单个样式值中的 Token 引用。
 *
 * 支持两套等价语法（设计 SKILL 教 AI 写的 dot 语法 与 内部 canonical dash 语法）：
 *
 *   颜色：
 *     "$token:primary"                 ←→  "$token:colors.primary"
 *     "$token:textPrimary"             ←→  "$token:colors.textPrimary"
 *
 *   间距：
 *     "$token:spacing-md"              ←→  "$token:spacing.md"
 *
 *   圆角：
 *     "$token:radius-lg"               ←→  "$token:radius.lg"
 *
 *   阴影（复数 group → 单数 dash）：
 *     "$token:shadow-sm"               ←→  "$token:shadows.sm"
 *
 *   动效（复数 group → 单数 dash；尾部 .value 自动剥）：
 *     "$token:transition-fast"         ←→  "$token:transitions.fast"
 *                                      ←→  "$token:transitions.fast.value"
 *
 *   字体（typography group → font- dash 前缀，子属性保留 dot）：
 *     "$token:font-body.fontSize"      ←→  "$token:typography.body.fontSize"
 *     "$token:font-body"               ←→  "$token:typography.body"
 *
 *   复合值：
 *     "$token:spacing.sm $token:spacing.md"  →  "8px 16px"
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
    const resolved = resolveSingleToken(value, themeConfig);
    if (resolved !== undefined) return resolved;
    // ★ Fallback: 解析失败时（开发环境）警告，便于 design AI 立刻看到契约错位
    warnUnresolvedToken(value);
    return value;
  }

  return value;
}

/**
 * 已警告过的 token 引用（去重，避免 console 刷屏）
 */
const _warnedTokens = new Set<string>();

function warnUnresolvedToken(ref: string): void {
  // 仅在浏览器/Node dev 环境警告；生产构建被 build 步骤剪掉
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  if (_warnedTokens.has(ref)) return;
  _warnedTokens.add(ref);
  // eslint-disable-next-line no-console
  console.warn(
    `[design-engine] Token 引用未解析：${ref}\n` +
      `  → 检查 ThemeConfig 中是否有对应 token；或语法是否合法（dot/dash 双语法均支持，见 resolveTokens.ts 顶部 jsdoc）`,
  );
}

/**
 * Normalize token path：把"嵌套 group + dot"语法统一转成内部 canonical 形式
 *
 * 这是为了兼容 SKILL.md / schema-spec 教设计 AI 写的 dot 语法（与 ThemeConfig 实际嵌套结构一致），
 * 而前端 SchemaRenderer 早期实现走的是 dash 语法。两套写法等价，统一在解析层 normalize。
 *
 * 转换规则：
 *   "colors.primary"              → "primary"            （color group 前缀去掉，直接走 colors lookup）
 *   "spacing.md"                  → "spacing-md"
 *   "radius.lg"                   → "radius-lg"
 *   "shadows.sm" (复数)           → "shadow-sm"          （复数→单数）
 *   "transitions.fast"            → "transition-fast"
 *   "transitions.fast.value"      → "transition-fast"    （尾部 .value 是 ThemeConfig 字段名，剥掉）
 *   "typography.body.fontSize"    → "font-body.fontSize"
 *   "typography.body"             → "font-body"
 *
 * 已是 dash 语法的（"primary" / "spacing-md" / "font-body.fontSize"）原样穿透，零侵入。
 */
function normalizeTokenPath(path: string): string {
  // 字体（dot → font-X[.subprop]）
  if (path.startsWith('typography.')) {
    return 'font-' + path.slice('typography.'.length);
  }

  // 颜色 group 前缀（colors.X → X，因为 colors 在 lookup 是 path 直接 key）
  if (path.startsWith('colors.')) {
    return path.slice('colors.'.length);
  }

  // 其他（spacing / radius / shadows / transitions）—— dot 转 dash + 复数转单数
  const dotIndex = path.indexOf('.');
  if (dotIndex < 0) return path; // 无 dot 直接返回（已是 dash 或单 key）

  const head = path.slice(0, dotIndex);
  const tail = path.slice(dotIndex + 1);

  // 复数 group → 单数 dash 前缀
  const HEAD_MAP: Record<string, string> = {
    spacing: 'spacing',
    radius: 'radius',
    shadows: 'shadow',         // 复数 → 单数
    shadow: 'shadow',
    transitions: 'transition', // 复数 → 单数
    transition: 'transition',
  };

  const mappedHead = HEAD_MAP[head];
  if (!mappedHead) return path; // 未识别 group，原样返回

  // transitions.fast.value → transition-fast（ThemeConfig 里 transitions.fast.value 是字段，
  // 但 SKILL 习惯把整个 transition 字符串引用为 transitions.fast.value，这里剥掉 .value 让它命中 transitions[fast].value）
  const cleanTail = tail.endsWith('.value') ? tail.slice(0, -'.value'.length) : tail;

  return `${mappedHead}-${cleanTail}`;
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
  const rawPath = ref.slice(TOKEN_PREFIX.length); // "primary" / "spacing-md" / "colors.primary" / "typography.body.fontSize"
  const path = normalizeTokenPath(rawPath);        // 统一转为内部 canonical 形式

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
