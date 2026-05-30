/**
 * ThemeConfig 验证 / 红线对账
 *
 * 集中实现 R-THEME-01 ~ R-THEME-10 红线检查。
 * 任意调用方（MCP `theme/validate` action / integrity checker / 编辑器面板）共用。
 *
 * 红线清单参见 STAGE-CONTRACT.md §2.7.1。
 */
import type {
  ThemeConfig,
  ThemeDefinition,
  ColorScheme,
  DesignTokenSet,
  ColorTokenGroup,
  TokenOverrides,
} from '../types/theme';

export interface ThemeViolation {
  rule: string;
  severity: 'error' | 'warning';
  themeId?: string;
  schemeId?: string;
  message: string;
}

export interface ThemeValidationReport {
  ok: boolean;
  errors: ThemeViolation[];
  warnings: ThemeViolation[];
}

/** 必备语义色（R-THEME-02） */
const REQUIRED_COLOR_KEYS: ReadonlyArray<keyof ColorTokenGroup> = [
  'primary',
  'secondary',
  'success',
  'warning',
  'error',
  'info',
  'background',
  'surface',
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'border',
  'borderLight',
];

/** APCA 阈值（R-THEME-03） */
const APCA_THRESHOLDS = {
  textPrimaryOnBackground: 75,
  textSecondaryOnSurface: 60,
} as const;

export function validateThemeConfig(cfg: ThemeConfig | null | undefined): ThemeValidationReport {
  const errors: ThemeViolation[] = [];
  const warnings: ThemeViolation[] = [];

  if (!cfg) {
    return { ok: false, errors: [{ rule: 'R-THEME-00', severity: 'error', message: 'ThemeConfig 为空' }], warnings };
  }

  // R-THEME-01
  if (cfg.customized !== true) {
    errors.push({ rule: 'R-THEME-01', severity: 'error', message: 'themeConfig.customized 不为 true' });
  }

  // R-THEME-08: activeThemeId 命中
  const activeTheme = cfg.themes?.find(t => t.id === cfg.activeThemeId);
  if (!activeTheme) {
    errors.push({
      rule: 'R-THEME-08',
      severity: 'error',
      message: `activeThemeId="${cfg.activeThemeId}" 未命中 themes[] 中任何主题`,
    });
  }

  for (const theme of cfg.themes ?? []) {
    validateThemeDefinition(theme, errors, warnings);
  }

  // R-THEME-10: 多主题必备语义色集合一致
  if ((cfg.themes?.length ?? 0) >= 2) {
    const colorKeySets = cfg.themes.map(t => new Set(Object.keys(t.tokens?.colors ?? {})));
    const baseSet = colorKeySets[0]!;
    for (let i = 1; i < colorKeySets.length; i++) {
      const cur = colorKeySets[i]!;
      const diff = [...baseSet].filter(k => !cur.has(k)).concat([...cur].filter(k => !baseSet.has(k)));
      if (diff.length > 0) {
        warnings.push({
          rule: 'R-THEME-10',
          severity: 'warning',
          themeId: cfg.themes[i]!.id,
          message: `主题间必备语义色集合不一致，差异字段：${diff.join(', ')}`,
        });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validateThemeDefinition(
  theme: ThemeDefinition,
  errors: ThemeViolation[],
  warnings: ThemeViolation[],
): void {
  const tid = theme.id;

  // R-THEME-02: 必备语义色
  const missing = REQUIRED_COLOR_KEYS.filter(k => !theme.tokens?.colors?.[k]?.value);
  if (missing.length > 0) {
    errors.push({
      rule: 'R-THEME-02',
      severity: 'error',
      themeId: tid,
      message: `缺必备语义色：${missing.join(', ')}`,
    });
  }

  // R-THEME-04: spacing 必须是 4 的倍数
  for (const [k, v] of Object.entries(theme.tokens?.spacing ?? {})) {
    if (typeof v.px === 'number' && v.px % 4 !== 0 && v.px !== 2) {
      errors.push({
        rule: 'R-THEME-04',
        severity: 'error',
        themeId: tid,
        message: `spacing.${k} = ${v.px}px 不在 4 倍数网格上`,
      });
    }
  }

  // R-THEME-05: fontSize 偏离 modular scale 1.25 超 ±5%
  const fontSizes: Array<{ key: string; px: number; expect: number }> = [
    { key: 'caption', expect: 12 },
    { key: 'body', expect: 14 },
    { key: 'body-lg', expect: 16 },
    { key: 'h5', expect: 18 },
    { key: 'h4', expect: 20 },
    { key: 'h3', expect: 24 },
    { key: 'h2', expect: 28 },
    { key: 'h1', expect: 36 },
    { key: 'display', expect: 48 },
  ].map(it => {
    const px = parseFloat(theme.tokens?.typography?.[it.key]?.fontSize ?? '');
    return { ...it, px };
  });
  for (const fs of fontSizes) {
    if (!Number.isFinite(fs.px)) continue;
    const deviation = Math.abs(fs.px - fs.expect) / fs.expect;
    if (deviation > 0.05) {
      errors.push({
        rule: 'R-THEME-05',
        severity: 'error',
        themeId: tid,
        message: `typography.${fs.key} = ${fs.px}px 偏离 modular scale 1.25 期望值 ${fs.expect}px 超过 5%`,
      });
    }
  }

  // R-THEME-06: 每个主题至少 2 个色彩方案
  if ((theme.colorSchemes?.length ?? 0) < 2) {
    errors.push({
      rule: 'R-THEME-06',
      severity: 'error',
      themeId: tid,
      message: `主题 ${tid} 的 colorSchemes 少于 2 套（至少 light + dark）`,
    });
  }

  // R-THEME-07: decorationRules / iconSpec / stateSpec 不可为空
  if (!theme.decorationRules || Object.keys(theme.decorationRules).length === 0) {
    errors.push({ rule: 'R-THEME-07', severity: 'error', themeId: tid, message: `主题 ${tid} decorationRules 为空` });
  }
  if (!theme.iconSpec || Object.keys(theme.iconSpec).length === 0) {
    errors.push({ rule: 'R-THEME-07', severity: 'error', themeId: tid, message: `主题 ${tid} iconSpec 为空` });
  }
  if (!theme.stateSpec || Object.keys(theme.stateSpec).length === 0) {
    errors.push({ rule: 'R-THEME-07', severity: 'error', themeId: tid, message: `主题 ${tid} stateSpec 为空` });
  }

  // R-THEME-03: APCA 对比度 + R-THEME-08: activeColorSchemeId 命中
  const activeScheme = theme.colorSchemes?.find(s => s.id === theme.activeColorSchemeId);
  if (!activeScheme) {
    errors.push({
      rule: 'R-THEME-08',
      severity: 'error',
      themeId: tid,
      message: `activeColorSchemeId="${theme.activeColorSchemeId}" 未命中 colorSchemes`,
    });
  }
  for (const scheme of theme.colorSchemes ?? []) {
    validateColorSchemeContrast(theme, scheme, errors, warnings);
    validateOverridesKeys(theme.tokens, scheme, errors, warnings);
  }
}

function validateColorSchemeContrast(
  theme: ThemeDefinition,
  scheme: ColorScheme,
  errors: ThemeViolation[],
  _warnings: ThemeViolation[],
): void {
  const tid = theme.id;
  const sid = scheme.id;
  const resolve = makeResolver(theme.tokens, scheme.overrides);

  const bg = resolve('background');
  const surface = resolve('surface');
  const textPrimary = resolve('textPrimary');
  const textSecondary = resolve('textSecondary');

  if (bg && textPrimary) {
    const lc = apcaContrast(textPrimary, bg);
    if (Math.abs(lc) < APCA_THRESHOLDS.textPrimaryOnBackground) {
      errors.push({
        rule: 'R-THEME-03',
        severity: 'error',
        themeId: tid,
        schemeId: sid,
        message: `textPrimary on background APCA Lc=${lc.toFixed(1)} < ${APCA_THRESHOLDS.textPrimaryOnBackground}（${theme.id}/${sid}）`,
      });
    }
  }
  if (surface && textSecondary) {
    const lc = apcaContrast(textSecondary, surface);
    if (Math.abs(lc) < APCA_THRESHOLDS.textSecondaryOnSurface) {
      errors.push({
        rule: 'R-THEME-03',
        severity: 'error',
        themeId: tid,
        schemeId: sid,
        message: `textSecondary on surface APCA Lc=${lc.toFixed(1)} < ${APCA_THRESHOLDS.textSecondaryOnSurface}（${theme.id}/${sid}）`,
      });
    }
  }
}

function validateOverridesKeys(
  baseTokens: DesignTokenSet,
  scheme: ColorScheme,
  _errors: ThemeViolation[],
  warnings: ThemeViolation[],
): void {
  // R-THEME-09: overrides 写了 base 没定义的 token → warning（不阻塞，但提示）
  const baseColorKeys = new Set(Object.keys(baseTokens?.colors ?? {}));
  for (const k of Object.keys(scheme.overrides.colors ?? {})) {
    if (!baseColorKeys.has(k)) {
      warnings.push({
        rule: 'R-THEME-09',
        severity: 'warning',
        schemeId: scheme.id,
        message: `colorScheme "${scheme.id}" overrides.colors.${k} 未在 base tokens 中定义`,
      });
    }
  }
}

// ============================================================================
// 工具：base + overrides 合并解析（最小子集，与 design-engine resolveTokens 等价）
// ============================================================================
function makeResolver(baseTokens: DesignTokenSet, overrides: TokenOverrides) {
  return (colorKey: string): string | undefined => {
    return overrides.colors?.[colorKey] ?? baseTokens.colors?.[colorKey]?.value;
  };
}

// ============================================================================
// APCA-W3 对比度（Accessible Perceptual Contrast Algorithm，简化实现）
// 参考：https://github.com/Myndex/SAPC-APCA
// ============================================================================
/**
 * 计算 APCA Lc 值（取值 -108 ~ +106）。
 * 正值 = 暗文字在亮底；负值 = 亮文字在暗底。门禁取绝对值。
 *
 * 注意：本实现是 APCA-W3 草案的近似版本，足够用作设计阶段门禁；
 *      生产可访问性认证请用官方实现 `apca-w3` npm 包。
 */
export function apcaContrast(fg: string, bg: string): number {
  const fgY = sRGBtoY(parseColor(fg));
  const bgY = sRGBtoY(parseColor(bg));

  // APCA 简化公式（W3C 草案 v0.1.9）
  const normBg = Math.pow(bgY, 0.56);
  const normFg = Math.pow(fgY, 0.57);
  const normBgRev = Math.pow(bgY, 0.62);
  const normFgRev = Math.pow(fgY, 0.65);

  let scaled: number;
  if (bgY > fgY) {
    // 亮底 → 暗字（正向）
    scaled = (normBg - normFg) * 1.14;
  } else {
    // 暗底 → 亮字（反向）
    scaled = (normBgRev - normFgRev) * 1.14;
  }

  const Lc = scaled * 100;
  // 极低对比度返回 0
  if (Math.abs(Lc) < 7.5) return 0;
  return Lc;
}

function sRGBtoY(rgb: { r: number; g: number; b: number; a: number }): number {
  // 把 sRGB(0~255) + alpha 合成（假设底是白）→ 线性化 → 加权 Y
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const lum = 0.2126 * Math.pow(r, 2.4) + 0.7152 * Math.pow(g, 2.4) + 0.0722 * Math.pow(b, 2.4);
  // alpha 复合（假设底是白色 1.0）
  return lum * rgb.a + 1.0 * (1 - rgb.a);
}

function parseColor(input: string): { r: number; g: number; b: number; a: number } {
  const s = input.trim();
  // rgba(r,g,b,a) / rgb(r,g,b)
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1]!.split(',').map(x => parseFloat(x.trim()));
    return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
  }
  // #rrggbb / #rgb
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0]! + hex[0]!, 16),
        g: parseInt(hex[1]! + hex[1]!, 16),
        b: parseInt(hex[2]! + hex[2]!, 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
  }
  // 兜底：当作纯黑
  return { r: 0, g: 0, b: 0, a: 1 };
}
