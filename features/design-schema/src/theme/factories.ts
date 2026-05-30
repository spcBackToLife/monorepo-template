/**
 * Theme 工厂函数
 *
 * 用途：MCP `scaffold_theme` action / 编辑器新建主题 / 迁移脚本 等场景，
 *      需要创建一个"完整骨架"的 ThemeDefinition / ColorScheme / ThemeConfig，
 *      避免调用方手工拼 24+ token 的繁琐和易错。
 *
 * 设计原则：
 *   - 工厂返回的对象**字段全集齐全**，可直接落库（不会触发 R-THEME-* 红线）
 *   - 工厂参数仅是"必须的差异"，其他字段从 DEFAULT_THEME_DEFINITION 继承
 *   - 工厂内部不做副作用（不读写后端），只是纯函数
 */
import type {
  ThemeConfig,
  ThemeDefinition,
  ColorScheme,
  StyleIntent,
  DesignTokenSet,
  TokenOverrides,
} from '../types/theme';
import { DEFAULT_THEME_CONFIG } from '../presets/theme-defaults';

const DEFAULT_THEME = DEFAULT_THEME_CONFIG.themes[0]!;

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** 创建一个干净的 ThemeConfig（用于全新项目或迁移目标） */
export function createEmptyThemeConfig(): ThemeConfig {
  return {
    schemaVersion: '1.0',
    themes: [createDefaultTheme()],
    activeThemeId: 'default',
    customized: false,
  };
}

/** 创建默认 ThemeDefinition（Ant Design 风格 + light/dark） */
export function createDefaultTheme(overrides?: {
  id?: string;
  name?: string;
  description?: string;
}): ThemeDefinition {
  const now = new Date().toISOString();
  const base = deepClone(DEFAULT_THEME);
  return {
    ...base,
    id: overrides?.id ?? base.id,
    name: overrides?.name ?? base.name,
    description: overrides?.description ?? base.description,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 从已有主题派生一个新主题骨架（用于"加节日主题/品牌变体"）
 * 仅复制 base tokens / decorationRules / iconSpec / stateSpec / colorSchemes，
 * intent / id / name 必须新填。
 */
export function deriveThemeFromBase(
  base: ThemeDefinition,
  opts: {
    id: string;
    name: string;
    description?: string;
    intent: StyleIntent;
  },
): ThemeDefinition {
  const now = new Date().toISOString();
  return {
    ...deepClone(base),
    id: opts.id,
    name: opts.name,
    description: opts.description,
    intent: opts.intent,
    createdAt: now,
    updatedAt: now,
  };
}

/** 创建一个空 ColorScheme（用户后续逐项填 overrides） */
export function createColorScheme(opts: {
  id: string;
  name?: string;
  label?: string;
  overrides?: TokenOverrides;
}): ColorScheme {
  return {
    id: opts.id,
    name: opts.name ?? opts.id,
    label: opts.label ?? opts.id,
    overrides: opts.overrides ?? {},
  };
}

/** 从亮色 base tokens 派生暗色 colorScheme overrides（启发式骨架，AI 会再细化） */
export function deriveDarkSchemeOverrides(baseTokens: DesignTokenSet): TokenOverrides {
  const primaryColor = baseTokens.colors?.primary?.value ?? '#1677ff';
  return {
    colors: {
      background: '#0F1218',
      surface: '#181B22',
      surfaceElevated: '#21252D',
      overlay: 'rgba(0, 0, 0, 0.65)',
      textPrimary: 'rgba(255, 255, 255, 0.92)',
      textSecondary: 'rgba(255, 255, 255, 0.65)',
      textTertiary: 'rgba(255, 255, 255, 0.45)',
      textInverse: '#0F1218',
      border: '#2A2F3A',
      borderLight: '#1F232C',
      borderFocus: primaryColor,
      // 状态色暗模式提亮（详细推导见 theme-generator T6 方法论）
      success: '#5DE095',
      warning: '#FFD466',
      error: '#FF6B6B',
      info: '#5DA8E8',
    },
    shadows: {
      sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
      md: '0 4px 12px rgba(0, 0, 0, 0.5)',
      lg: '0 8px 24px rgba(0, 0, 0, 0.6)',
      xl: '0 12px 48px rgba(0, 0, 0, 0.7)',
    },
  };
}
