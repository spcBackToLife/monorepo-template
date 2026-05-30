import type { ThemeConfig, ThemeDefinition } from '../types/theme';

/**
 * 默认主题定义（Ant Design 风格 / Light + Dark 色彩方案）
 */
const DEFAULT_THEME_DEFINITION: ThemeDefinition = {
  id: 'default',
  name: '默认主题',
  description: '简洁专业的默认风格（基于 Ant Design）',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',

  intent: {
    summary: '简洁专业的默认风格',
    aesthetics: ['flat', 'minimal'],
    decoration: 'minimal',
    colorTemperature: 'neutral',
    brightness: 'light',
  },

  tokens: {
    colors: {
      // 品牌色
      primary: { value: '#1677ff', description: '主色' },
      primaryHover: { value: '#4096ff', description: '主色悬浮' },
      primaryActive: { value: '#0958d9', description: '主色按下' },
      primaryLight: { value: '#e6f4ff', description: '主色浅底' },
      secondary: { value: '#722ed1', description: '辅色' },
      secondaryHover: { value: '#9254de', description: '辅色悬浮' },
      secondaryActive: { value: '#531dab', description: '辅色按下' },
      // 表面/背景
      background: { value: '#ffffff', description: '页面底色' },
      surface: { value: '#ffffff', description: '卡片表面' },
      surfaceElevated: { value: '#ffffff', description: '悬浮面' },
      overlay: { value: 'rgba(0, 0, 0, 0.45)', description: '遮罩' },
      // 文字
      textPrimary: { value: 'rgba(0, 0, 0, 0.88)', description: '正文' },
      textSecondary: { value: 'rgba(0, 0, 0, 0.65)', description: '辅助' },
      textTertiary: { value: 'rgba(0, 0, 0, 0.45)', description: '占位符' },
      textInverse: { value: '#ffffff', description: '反色文字' },
      // 边框
      border: { value: '#d9d9d9', description: '默认边框' },
      borderLight: { value: '#f0f0f0', description: '分割线' },
      borderFocus: { value: '#1677ff', description: '聚焦边框' },
      // 语义
      success: { value: '#52c41a', description: '成功' },
      warning: { value: '#faad14', description: '警告' },
      error: { value: '#ff4d4f', description: '错误' },
      info: { value: '#1677ff', description: '信息' },
    },

    spacing: {
      '2xs': { value: '2px', px: 2, description: '极小' },
      xs: { value: '4px', px: 4, description: '超小' },
      sm: { value: '8px', px: 8, description: '小' },
      md: { value: '16px', px: 16, description: '中' },
      lg: { value: '24px', px: 24, description: '大' },
      xl: { value: '32px', px: 32, description: '超大' },
      '2xl': { value: '48px', px: 48, description: '极大' },
      '3xl': { value: '64px', px: 64, description: '巨大' },
    },

    radius: {
      none: { value: '0', description: '无圆角' },
      sm: { value: '4px', description: '小圆角' },
      md: { value: '8px', description: '中圆角' },
      lg: { value: '12px', description: '大圆角' },
      xl: { value: '16px', description: '超大圆角' },
      full: { value: '9999px', description: '全圆（药丸/圆形）' },
    },

    typography: {
      display: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '48px', lineHeight: '1.1', fontWeight: '700', description: '展示标题' },
      h1: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '36px', lineHeight: '1.2', fontWeight: '700', description: '一级标题' },
      h2: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '28px', lineHeight: '1.2', fontWeight: '700', description: '二级标题' },
      h3: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '24px', lineHeight: '1.3', fontWeight: '600', description: '三级标题' },
      h4: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '20px', lineHeight: '1.3', fontWeight: '600', description: '四级标题' },
      h5: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '18px', lineHeight: '1.4', fontWeight: '500', description: '五级标题' },
      'body-lg': { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '16px', lineHeight: '1.5', fontWeight: '400', description: '大正文' },
      body: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '14px', lineHeight: '1.5', fontWeight: '400', description: '正文' },
      caption: { fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '12px', lineHeight: '1.4', fontWeight: '400', description: '辅助文字' },
      overline: {
        fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '10px', lineHeight: '1.4', fontWeight: '500',
        letterSpacing: '0.08em', description: '上标文字',
      },
    },

    shadows: {
      sm: { value: '0 2px 4px rgba(0, 0, 0, 0.06)', description: '小阴影（卡片）' },
      md: { value: '0 4px 12px rgba(0, 0, 0, 0.08)', description: '中阴影（下拉）' },
      lg: { value: '0 8px 24px rgba(0, 0, 0, 0.12)', description: '大阴影（弹窗）' },
      xl: { value: '0 12px 48px rgba(0, 0, 0, 0.16)', description: '超大阴影（模态）' },
    },

    transitions: {
      fast: { value: 'all 150ms ease', durationMs: 150, description: '快速（微交互）' },
      normal: { value: 'all 300ms ease', durationMs: 300, description: '正常（状态切换）' },
      slow: { value: 'all 500ms ease-out', durationMs: 500, description: '缓慢（页面切换）' },
    },
  },

  colorSchemes: [
    {
      id: 'light',
      name: 'light',
      label: '浅色模式',
      overrides: {},
    },
    {
      id: 'dark',
      name: 'dark',
      label: '深色模式',
      overrides: {
        colors: {
          background: '#141414',
          surface: '#1f1f1f',
          surfaceElevated: '#2a2a2a',
          overlay: 'rgba(0, 0, 0, 0.65)',
          textPrimary: 'rgba(255, 255, 255, 0.88)',
          textSecondary: 'rgba(255, 255, 255, 0.65)',
          textTertiary: 'rgba(255, 255, 255, 0.45)',
          textInverse: '#141414',
          border: '#424242',
          borderLight: '#303030',
          primaryLight: '#111a2c',
        },
        shadows: {
          sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
          md: '0 4px 12px rgba(0, 0, 0, 0.4)',
          lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
          xl: '0 12px 48px rgba(0, 0, 0, 0.6)',
        },
      },
    },
  ],
  activeColorSchemeId: 'light',

  decorationRules: {
    background: { strategy: 'solid' },
    border: { strategy: 'subtle', width: '1px' },
    shadow: { strategy: 'soft' },
    motion: { strategy: 'smooth', easing: 'ease' },
    iconStyle: 'outline',
    cornerStyle: 'rounded',
  },

  iconSpec: {
    style: 'outline',
    stroke: {
      width: 1.5,
      linecap: 'round',
      linejoin: 'round',
      cornerRadius: 0,
    },
    colors: {
      default: '$token:textSecondary',
      active: '$token:primary',
      inactive: '$token:textTertiary',
    },
    sizing: {
      containerRatio: 0.55,
      minPadding: 6,
      strokeCompensation: true,
    },
    variants: {
      inactive: { opacity: 0.6, color: '$token:textTertiary' },
      active: { opacity: 1.0, strokeWidth: 1.8, color: '$token:primary' },
      hover: { opacity: 0.85 },
      disabled: { opacity: 0.35, grayscale: true },
    },
    consistency: {
      targetComplexity: 'medium',
      uniformStrokeWidth: true,
      geometricOnly: false,
    },
  },

  stateSpec: {
    hover: {
      backgroundLightnessShift: 6,
      shadowLevel: 'up',
      scale: 1.0,
      transition: '$token:transition-fast',
    },
    active: {
      backgroundLightnessShift: -8,
      shadowLevel: 'down',
      scale: 0.98,
      transition: '$token:transition-fast',
    },
    focus: {
      ringColor: '$token:primary',
      ringWidth: '2px',
      ringOffset: '2px',
      animated: false,
    },
    disabled: {
      opacity: 0.5,
      removeShadow: true,
      cursor: 'not-allowed',
      grayscale: false,
    },
    loading: {
      opacity: 0.8,
      spinnerColor: '$token:primary',
      skeleton: false,
    },
  },
};

/**
 * 默认主题配置
 *
 * 新项目初始化时使用。包含一个默认主题（Ant Design 风格），
 * 内含 Light + Dark 两个色彩方案。customized=false 表示用户尚未定制。
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  schemaVersion: '1.0',
  themes: [DEFAULT_THEME_DEFINITION],
  activeThemeId: 'default',
  customized: false,
};
