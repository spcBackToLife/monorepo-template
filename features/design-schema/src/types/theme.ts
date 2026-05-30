/**
 * 主题风格系统类型定义
 *
 * 三层模型：
 * - Layer 3: StyleIntent（风格意图 → 描述美学方向）
 * - Layer 2: DesignTokenSet（设计 Token → 具体值）
 * - Layer 1: "$token:xxx" 引用（在 ComponentNode.styles 中使用）
 */

// ===== Layer 3: 风格意图 =====

/** 风格标签 */
export type AestheticTag =
  | 'glassmorphism'
  | 'neumorphism'
  | 'flat'
  | 'gradient'
  | 'luxury'
  | 'minimal'
  | 'brutalist'
  | 'organic'
  | 'retro'
  | 'futuristic'
  | 'playful'
  | 'corporate'
  | 'editorial'
  | 'hand-drawn'
  | (string & {});

/** 风格意图：用户对整体美学的描述，AI 据此生成 Token */
export interface StyleIntent {
  /** 一句话风格描述（用户原始输入） */
  summary: string;
  /** 结构化风格标签 */
  aesthetics: AestheticTag[];
  /** 装饰密度 */
  decoration: 'minimal' | 'moderate' | 'rich';
  /** 色调倾向 */
  colorTemperature: 'warm' | 'neutral' | 'cool';
  /** 明暗倾向 */
  brightness: 'light' | 'dark' | 'both';
  /** 种子色（用户提供的约束） */
  seedColors?: string[];
  /** 目标受众 */
  audience?: string;
  /** 应用场景 */
  scenario?: string;
  /** 参考品牌/产品 */
  references?: string[];
}

// ===== Layer 2: Design Token =====

/** 颜色 Token */
export interface ColorToken {
  /** CSS 颜色值 */
  value: string;
  /** 描述 */
  description?: string;
}

/** 间距 Token */
export interface SpacingToken {
  /** CSS 尺寸值 */
  value: string;
  /** 像素数值（编辑器显示用） */
  px: number;
  /** 描述 */
  description?: string;
}

/** 圆角 Token */
export interface RadiusToken {
  /** CSS 值 */
  value: string;
  /** 描述 */
  description?: string;
}

/** 字体 Token */
export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing?: string;
  description?: string;
}

/** 阴影 Token */
export interface ShadowToken {
  /** CSS box-shadow 值 */
  value: string;
  description?: string;
}

/** 动效 Token */
export interface TransitionToken {
  /** CSS transition 值 */
  value: string;
  /** 毫秒数 */
  durationMs: number;
  description?: string;
}

/** 自定义 Token */
export interface CustomToken {
  value: string;
  type: 'color' | 'size' | 'shadow' | 'string' | 'number';
  description?: string;
}

/** 颜色 Token 分组 */
export interface ColorTokenGroup {
  // 品牌色
  primary: ColorToken;
  primaryHover: ColorToken;
  primaryActive: ColorToken;
  primaryLight: ColorToken;
  secondary: ColorToken;
  secondaryHover: ColorToken;
  secondaryActive: ColorToken;
  // 表面/背景
  background: ColorToken;
  surface: ColorToken;
  surfaceElevated: ColorToken;
  overlay: ColorToken;
  // 文字
  textPrimary: ColorToken;
  textSecondary: ColorToken;
  textTertiary: ColorToken;
  textInverse: ColorToken;
  // 边框
  border: ColorToken;
  borderLight: ColorToken;
  borderFocus: ColorToken;
  // 语义
  success: ColorToken;
  warning: ColorToken;
  error: ColorToken;
  info: ColorToken;
  // 扩展
  [key: string]: ColorToken;
}

/** 完整 Token 集合 */
export interface DesignTokenSet {
  colors: ColorTokenGroup;
  spacing: Record<string, SpacingToken>;
  radius: Record<string, RadiusToken>;
  typography: Record<string, TypographyToken>;
  shadows: Record<string, ShadowToken>;
  transitions: Record<string, TransitionToken>;
  custom?: Record<string, CustomToken>;
}

// ===== 主题变体 =====

/** Token 覆盖：色彩方案（明暗 / 高对比）只写与 base 不同的值。深合并到 base tokens 上。 */
export interface TokenOverrides {
  colors?: Partial<Record<string, string>>;
  spacing?: Partial<Record<string, string>>;
  radius?: Partial<Record<string, string>>;
  typography?: Partial<Record<string, Partial<TypographyToken>>>;
  shadows?: Partial<Record<string, string>>;
  transitions?: Partial<Record<string, string>>;
  custom?: Partial<Record<string, string>>;
}

// ===== 装饰规则 =====

/** 背景策略 */
export interface BackgroundRule {
  strategy: 'solid' | 'gradient' | 'glassmorphism' | 'mesh-gradient' | 'noise';
  glassmorphism?: {
    blur: string;
    backgroundOpacity: number;
    borderOpacity: number;
  };
  gradient?: {
    direction: string;
    type: 'linear' | 'radial' | 'conic';
  };
}

/** 装饰规则：整体性装饰策略 */
export interface DecorationRules {
  background: BackgroundRule;
  border: {
    strategy: 'none' | 'subtle' | 'accent' | 'glow';
    width?: string;
  };
  shadow: {
    strategy: 'none' | 'soft' | 'hard' | 'layered' | 'glow';
  };
  motion: {
    strategy: 'minimal' | 'smooth' | 'spring' | 'dramatic';
    easing?: string;
  };
  iconStyle: 'outline' | 'solid' | 'duotone' | 'colorful';
  cornerStyle: 'sharp' | 'rounded' | 'pill' | 'mixed';
  textDecoration?: {
    gradientHeading?: boolean;
    accentUnderline?: boolean;
  };
}

// ===== 图标规格系统 =====

/**
 * 图标风格规格
 *
 * 定义项目中所有图标的视觉风格参数。
 * AI 绘制图标时必须严格遵循此规格，零自由度。
 * 由 theme-generator 在生成主题时一并产出。
 */
export interface IconSpec {
  /** 结构风格 */
  style: 'outline' | 'solid' | 'duotone' | 'glyph' | 'two-tone';

  /** 描边参数（outline/two-tone 模式使用） */
  stroke: {
    /** 描边宽度（px） */
    width: number;
    /** 端点形状 */
    linecap: 'round' | 'butt' | 'square';
    /** 连接形状 */
    linejoin: 'round' | 'miter' | 'bevel';
    /** path 转角是否有圆滑处理（影响 pathData 中是否用 C 替代 L 转角） */
    cornerRadius: number;
  };

  /** 色彩策略 */
  colors: {
    /** 主色（默认/静态态图标颜色） — 引用 Token */
    default: string;
    /** 激活态颜色 */
    active: string;
    /** 不可用/未选中态颜色 */
    inactive: string;
    /** duotone/two-tone 模式的辅助色（低透明度填充） */
    secondary?: string;
    /** colorful 模式下的多色板 */
    palette?: string[];
  };

  /** 尺寸 & 间距规格 */
  sizing: {
    /** 图标在容器中的占比（0~1），用于计算 pathData 的绘图区域 */
    containerRatio: number;
    /** 最小内边距（px），pathData 不可超出此区域 */
    minPadding: number;
    /** 是否根据描边宽度补偿视觉重量（粗描边图标整体缩小一点） */
    strokeCompensation: boolean;
  };

  /** 状态变体（图标在不同交互态下的视觉变化） */
  variants: {
    inactive: { opacity: number; strokeWidth?: number; color: string };
    active: { opacity: number; strokeWidth?: number; color: string };
    hover?: { opacity: number; color?: string };
    disabled?: { opacity: number; grayscale: boolean };
  };

  /**
   * 视觉重量均衡规则
   * 同组图标应保持接近的视觉重量（笔画总面积）
   */
  consistency: {
    /** 目标复杂度等级：简单(3-5笔) / 中等(6-10笔) / 复杂(11-15笔) */
    targetComplexity: 'simple' | 'medium' | 'detailed';
    /** 是否强制所有图标使用统一的 strokeWidth */
    uniformStrokeWidth: boolean;
    /** 是否限制只用直线和圆弧（禁止自由曲线，保证几何感） */
    geometricOnly: boolean;
  };
}

// ===== 组件状态规范 =====

/** 组件状态视觉变化规范 */
export interface ComponentStateSpec {
  hover: {
    backgroundLightnessShift: number;
    shadowLevel: 'same' | 'up' | 'down' | 'none';
    scale: number;
    transition: string;
  };
  active: {
    backgroundLightnessShift: number;
    shadowLevel: 'same' | 'up' | 'down' | 'none';
    scale: number;
    transition: string;
  };
  focus: {
    ringColor: string;
    ringWidth: string;
    ringOffset: string;
    animated: boolean;
  };
  disabled: {
    opacity: number;
    removeShadow: boolean;
    cursor: string;
    grayscale: boolean;
  };
  loading: {
    opacity: number;
    spinnerColor: string;
    skeleton: boolean;
  };
}

// ===== ThemeConfig 顶层 =====

/**
 * 单个完整主题方案（一套完整的 Token + 装饰 + 状态规范）
 *
 * 一个项目可以有多个主题（如「品牌默认」「活动主题」「节日主题」），
 * 每个主题内部又可以有多个色彩方案（如 light/dark）。
 */
export interface ThemeDefinition {
  /** 唯一 ID */
  id: string;
  /** 主题名称（用户可见，如「品牌主色」「春节红」「科技暗夜」） */
  name: string;
  /** 简短描述 */
  description?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;

  /** 风格意图 */
  intent: StyleIntent;
  /** 设计 Token 集合（base 值，默认方案） */
  tokens: DesignTokenSet;
  /**
   * 色彩方案列表（至少一个）
   *
   * 与"主题"的区别：
   * - 主题 = 完全不同的视觉风格（品牌 vs 活动）
   * - 色彩方案 = 同一套风格的明暗变体（light vs dark）
   *
   * 色彩方案只覆盖颜色/阴影等与明暗相关的 Token，
   * 间距/圆角/字体/动效保持不变。
   */
  colorSchemes: ColorScheme[];
  /** 当前预览的色彩方案 ID */
  activeColorSchemeId: string;

  /** 装饰规则 */
  decorationRules: DecorationRules;
  /** 图标视觉规格 */
  iconSpec: IconSpec;
  /** 组件状态视觉规范 */
  stateSpec: ComponentStateSpec;
}

/**
 * 色彩方案（light/dark/high-contrast 等）
 * 属于某个 ThemeDefinition 内部的变体。
 */
export interface ColorScheme {
  id: string;
  /** 方案名（如 "浅色" / "深色" / "高对比"） */
  name: string;
  /** 标签（UI 展示用） */
  label: string;
  /** 相对于 base tokens 的覆盖值（只覆盖与明暗相关的 Token） */
  overrides: TokenOverrides;
}

/** 项目级主题管理配置 */
export interface ThemeConfig {
  /** Schema 版本号，用于迁移识别。当前 "1.0"。 */
  schemaVersion?: string;
  /**
   * 项目下的所有主题列表（至少一个）。
   * 支持多套完全不同的风格共存（品牌/活动/节日等），用户可按场景切换。
   */
  themes: ThemeDefinition[];

  /** 当前激活的主题 ID（编辑器中预览/设计时使用的主题） */
  activeThemeId: string;

  /**
   * 是否已被用户/AI 定制过。
   * - false：还是默认模板，用户尚未制定自己的主题风格
   * - true：用户已经主动设置/生成了主题
   *
   * AI 在开始任何设计操作前必须检查此字段：
   * 如果 customized === false，必须先引导用户制定主题再开始设计。
   */
  customized: boolean;
}
