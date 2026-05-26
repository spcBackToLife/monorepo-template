# 15 - 设计主题风格系统 (Design Token & Theme System)

> **根本问题：如何让一个项目的所有设计在视觉上保持科学一致，并让 AI 自动遵循？**
>
> ← [返回总纲](../README.md)
>
> 相关文档：
> - [04-状态系统](../04-state-system/README.md) — 主题切换与全局状态的关系
> - [03-属性面板](../03-property-panel/panel-design-v2.md) — Token 选择器的 UI 位置
> - [design-schema](../../../03-tech/design-schema.md) — ThemeConfig 类型定义
> - [design-mcp](../../../03-tech/design-mcp.md) — theme/* MCP 工具集

---

## 一、第一性原理：主题系统解决什么根本问题？

### 1.1 现实世界的设计一致性问题

```
没有主题系统的设计过程：

  设计师/AI 创建按钮 → 随手选了 #1677ff 做主色
  设计师/AI 创建卡片 → 凭记忆用了 #1677ff... 还是 #1678ff？
  设计师/AI 创建导航 → 搜索历史记录找颜色值 → 复制粘贴
  
  产品说"主色换成紫色" → 逐节点搜索替换 → 漏了几个 → 不一致
  AI 帮忙设计新页面 → 不知道项目约定 → 用了 prompt 里提的颜色 → 和原有页面风格不统一
  导出代码 → 所有颜色是硬编码 hex → 维护噩梦

有主题系统的设计过程：

  项目创建时 → 制定主题方案（AI 辅助或手动）
  设计师/AI 创建按钮 → 选择 $primary（主色 Token）
  设计师/AI 创建卡片 → 选择 $surface（表面色 Token）
  
  产品说"主色换成紫色" → 改一个 Token 值 → 全项目生效
  AI 设计新页面 → 读取项目 ThemeConfig → 自动使用正确 Token
  导出代码 → Token → CSS Variables → 一处修改全局生效
```

### 1.2 本质推导

```
设计一致性的来源：

  来源 1：颜色规范 → 有限的语义色板（主色/辅色/中性色/语义色）
  来源 2：间距规范 → 基于网格的有限间距值（4/8/12/16/24/32/48）
  来源 3：字体规范 → 层级化的字体方案（标题/正文/辅助/代码）
  来源 4：圆角规范 → 统一的圆角体系
  来源 5：阴影规范 → 层级化的阴影深度
  来源 6：风格基调 → 整体性的装饰策略（毛玻璃/渐变/极简...）

这六项 = Design Token + Style Intent

关键洞察：
  - Token 是「值」→ #1677ff, 16px, 8px
  - Intent 是「策略」→ 毛玻璃效果、渐变背景、柔和阴影
  - 两者共同构成完整的「主题风格」
  
  Token 解决「用什么颜色/尺寸」
  Intent 解决「用什么手法/装饰」
```

### 1.3 与现有系统的关系

```
当前系统：
  ComponentNode.styles = { color: "#1677ff", padding: "16px", borderRadius: "8px" }
  ↑ 硬编码 CSS 值，无间接引用层

主题系统后：
  ComponentNode.styles = { color: "$token:text-primary", padding: "$token:spacing-md", borderRadius: "$token:radius-md" }
  ↑ Token 引用，渲染时按当前主题解析为实际值

  渲染引擎增加一步：
    "$token:xxx" → 查 ThemeConfig.tokens → 得到 CSS 值 → 应用到 DOM
```

---

## 二、三层主题模型

### 2.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Layer 3：风格意图 (Style Intent / Aesthetic)                         │
│                                                                     │
│    "轻奢暗色科技风"、"清新自然"、"毛玻璃 + 圆角 + 柔和阴影"         │
│    → 一段结构化的风格描述                                            │
│    → 驱动 Layer 2 的 Token 值生成                                    │
│    → 指导 AI 在设计时选择装饰手法                                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 2：设计 Token (Design Tokens)                                 │
│                                                                     │
│    颜色: primary, secondary, surface, text-primary, border, ...     │
│    间距: spacing-xs(4), spacing-sm(8), spacing-md(16), ...          │
│    圆角: radius-sm(4), radius-md(8), radius-lg(16), ...            │
│    字体: font-h1(28/1.3/Bold), font-body(14/1.5/Regular), ...      │
│    阴影: shadow-sm, shadow-md, shadow-lg                            │
│    动效: transition-fast(150ms), transition-normal(300ms)           │
│                                                                     │
│    存储: DesignProject.themeConfig.tokens                           │
│    多主题: themes = { light: {...}, dark: {...} }                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1：Token 引用 (Token Reference in Styles)                    │
│                                                                     │
│    ComponentNode.styles.color = "$token:text-primary"               │
│    ComponentNode.styles.padding = "$token:spacing-md"               │
│    ComponentNode.styles.borderRadius = "$token:radius-md"           │
│                                                                     │
│    渲染引擎: "$token:xxx" → 查 themeConfig → 实际 CSS 值            │
│    代码导出: "$token:xxx" → var(--xxx) / theme.xxx                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 三层的本质区别

| 维度 | Token 引用 (L1) | Design Token (L2) | 风格意图 (L3) |
|------|----------------|-------------------|---------------|
| **是什么** | 节点样式中的间接引用 | 项目级的设计变量定义 | 抽象的美学描述 |
| **粒度** | 单个 CSS 属性 | 单个语义变量 | 整体风格策略 |
| **谁定义** | 设计过程中自动/手动选用 | 项目初始化时制定 | 用户用自然语言描述 |
| **改动频率** | 高（每次设计） | 低（项目初期确定） | 极低（项目定位决定） |
| **AI 参与度** | 自动选取合适 Token | 根据 Intent 科学计算 | 理解用户意图 |

---

## 三、数据结构定义

### 3.1 ThemeConfig — 主题配置（项目级）

```typescript
/** 项目级主题管理配置 */
interface ThemeConfig {
  /**
   * 项目下的所有主题列表（至少一个）。
   * 支持多套完全不同的风格共存（品牌/活动/节日等），用户可按场景切换。
   */
  themes: ThemeDefinition[];

  /** 当前激活的主题 ID（编辑器中预览/设计时使用的主题） */
  activeThemeId: string;

  /** 是否已被用户/AI 定制过 */
  customized: boolean;
}

/**
 * 单个完整主题方案
 *
 * 核心区别：
 * - "主题" = 完全不同的视觉风格（品牌 vs 活动 vs 节日）
 * - "色彩方案" = 同一风格内的明暗变体（light vs dark）
 */
interface ThemeDefinition {
  id: string;
  name: string;              // 用户可见名称（如「品牌主色」「科技暗夜」）
  description?: string;
  createdAt: string;
  updatedAt: string;

  intent: StyleIntent;
  tokens: DesignTokenSet;
  colorSchemes: ColorScheme[];      // light/dark/高对比 等
  activeColorSchemeId: string;
  decorationRules: DecorationRules;
  stateSpec: ComponentStateSpec;
}

interface ColorScheme {
  id: string;
  name: string;              // "light" / "dark" / "high-contrast"
  label: string;             // "浅色" / "深色"
  overrides: TokenOverrides; // 只覆盖与明暗相关的 Token
}
```

### 3.2 StyleIntent — 风格意图

```typescript
/** 风格意图：用户对整体美学的描述，AI 据此生成 Token */
interface StyleIntent {
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

  /** 用户提供的种子色（可选，作为 AI 生成的约束） */
  seedColors?: string[];

  /** 目标受众描述 */
  audience?: string;

  /** 应用场景 */
  scenario?: string;

  /** 参考品牌/产品（如 "类似 Linear"、"参考 Spotify"） */
  references?: string[];
}

/** 风格标签枚举 */
type AestheticTag =
  | 'glassmorphism'    // 毛玻璃
  | 'neumorphism'      // 新拟态
  | 'flat'             // 扁平
  | 'gradient'         // 渐变
  | 'luxury'           // 轻奢
  | 'minimal'          // 极简
  | 'brutalist'        // 粗野/前卫
  | 'organic'          // 有机/自然
  | 'retro'            // 复古
  | 'futuristic'       // 未来感/科技
  | 'playful'          // 活泼/趣味
  | 'corporate'        // 商务/正式
  | 'editorial'        // 编辑/杂志风
  | 'hand-drawn'       // 手绘风
  | string;            // 用户自定义标签
```

### 3.3 DesignTokenSet — Token 集合

```typescript
/** 完整的 Token 定义集 */
interface DesignTokenSet {
  /** 颜色 Token */
  colors: ColorTokenGroup;

  /** 间距 Token */
  spacing: Record<string, SpacingToken>;

  /** 圆角 Token */
  radius: Record<string, RadiusToken>;

  /** 字体 Token */
  typography: Record<string, TypographyToken>;

  /** 阴影 Token */
  shadows: Record<string, ShadowToken>;

  /** 动效 Token */
  transitions: Record<string, TransitionToken>;

  /** 用户自定义 Token（不属于上述分类） */
  custom?: Record<string, CustomToken>;
}

/** 颜色 Token 按语义分组 */
interface ColorTokenGroup {
  /** 品牌色 */
  primary: ColorToken;
  primaryHover: ColorToken;
  primaryActive: ColorToken;
  primaryLight: ColorToken;      // 浅底色（用于 Tag/Badge 背景）

  secondary: ColorToken;
  secondaryHover: ColorToken;
  secondaryActive: ColorToken;

  /** 中性色 / 表面色 */
  background: ColorToken;        // 页面底色
  surface: ColorToken;           // 卡片/容器表面
  surfaceElevated: ColorToken;   // 悬浮面（弹窗/下拉）
  overlay: ColorToken;           // 遮罩层

  /** 文字色 */
  textPrimary: ColorToken;       // 标题/正文
  textSecondary: ColorToken;     // 辅助文字
  textTertiary: ColorToken;      // 占位符/禁用文字
  textInverse: ColorToken;       // 反色文字（用在主色背景上）

  /** 边框色 */
  border: ColorToken;            // 默认边框
  borderLight: ColorToken;       // 浅边框/分割线
  borderFocus: ColorToken;       // 聚焦边框

  /** 语义色 */
  success: ColorToken;
  warning: ColorToken;
  error: ColorToken;
  info: ColorToken;

  /** 用户扩展色 */
  [key: string]: ColorToken;
}

interface ColorToken {
  /** CSS 颜色值 */
  value: string;
  /** 描述 */
  description?: string;
}

interface SpacingToken {
  /** CSS 尺寸值（如 "4px", "0.5rem"） */
  value: string;
  /** 像素数值（用于编辑器显示） */
  px: number;
  description?: string;
}

interface RadiusToken {
  value: string;
  description?: string;
}

interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing?: string;
  description?: string;
}

interface ShadowToken {
  /** CSS box-shadow 值 */
  value: string;
  description?: string;
}

interface TransitionToken {
  /** CSS transition 值（如 "all 150ms ease"） */
  value: string;
  /** 毫秒数（用于编辑器显示） */
  durationMs: number;
  description?: string;
}

interface CustomToken {
  value: string;
  type: 'color' | 'size' | 'shadow' | 'string' | 'number';
  description?: string;
}
```

### 3.4 ThemeVariant — 主题变体

```typescript
/** 主题变体：每个变体覆盖部分 Token 值 */
interface ThemeVariant {
  id: string;
  name: string;           // "light" / "dark" / "high-contrast"
  label: string;          // "浅色模式" / "深色模式" / "高对比"
  /** 基于 base tokens 的覆盖值 */
  overrides: TokenOverrides;
}

/** Token 覆盖：只写与 base 不同的值 */
interface TokenOverrides {
  colors?: Partial<Record<string, string>>;
  spacing?: Partial<Record<string, string>>;
  radius?: Partial<Record<string, string>>;
  typography?: Partial<Record<string, Partial<TypographyToken>>>;
  shadows?: Partial<Record<string, string>>;
  transitions?: Partial<Record<string, string>>;
  custom?: Partial<Record<string, string>>;
}
```

### 3.5 DecorationRules — 装饰规则

```typescript
/** 装饰规则：定义整体性的装饰策略（Token 管值，这里管手法） */
interface DecorationRules {
  /** 背景策略 */
  background: {
    strategy: 'solid' | 'gradient' | 'glassmorphism' | 'mesh-gradient' | 'noise';
    /** 毛玻璃参数 */
    glassmorphism?: {
      blur: string;           // "12px"
      backgroundOpacity: number;  // 0.1
      borderOpacity: number;      // 0.2
    };
    /** 渐变参数 */
    gradient?: {
      direction: string;      // "135deg"
      type: 'linear' | 'radial' | 'conic';
    };
  };

  /** 边框策略 */
  border: {
    strategy: 'none' | 'subtle' | 'accent' | 'glow';
    /** subtle/accent 时的默认宽度 */
    width?: string;
  };

  /** 阴影策略 */
  shadow: {
    strategy: 'none' | 'soft' | 'hard' | 'layered' | 'glow';
  };

  /** 动效策略 */
  motion: {
    strategy: 'minimal' | 'smooth' | 'spring' | 'dramatic';
    /** 默认缓动函数 */
    easing?: string;
  };

  /** 图标风格 */
  iconStyle: 'outline' | 'solid' | 'duotone' | 'colorful';

  /** 圆角策略 */
  cornerStyle: 'sharp' | 'rounded' | 'pill' | 'mixed';

  /** 文字装饰策略 */
  textDecoration: {
    /** 标题是否使用渐变色 */
    gradientHeading?: boolean;
    /** 是否使用装饰下划线 */
    accentUnderline?: boolean;
  };

  /** 装饰性元素建议（光晕/噪点/网格/粒子等） */
  ornaments?: OrnamentConfig[];
}

interface OrnamentConfig {
  type: 'glow' | 'noise-texture' | 'grid-pattern' | 'gradient-orb' | 'particles';
  /** 应用位置 */
  placement: 'background' | 'accent' | 'header' | 'hero';
  /** 具体参数 */
  params: Record<string, unknown>;
}
```

### 3.6 DesignProject 扩展

```typescript
interface DesignProject {
  // ===== 现有字段（不变）=====
  id: string;
  name: string;
  platform: 'pc' | 'mobile';
  defaultViewport: Viewport;
  currentViewport: Viewport;
  viewportPresets: Viewport[];
  screens: Screen[];
  componentAssets: ComponentTemplate[];
  createdAt: string;
  updatedAt: string;

  // ===== 新增字段 =====

  /** 主题风格配置（项目级唯一） */
  themeConfig: ThemeConfig;
}
```

**默认值：** 新项目创建时 `themeConfig` 初始化为一套 Ant Design 风格的默认 Token（neutral/accessible/familiar）。

---

## 四、完整 UI 风格规范清单

### 4.1 一个完整的 UI 风格规范应该包含什么？

参考 Ant Design / Material Design / Apple HIG 等成熟设计系统，一个**完整的 UI 风格规范**不只是「几个颜色值」，而是覆盖所有视觉维度的系统性约束：

```
┌─────────────────────────────────────────────────────────────────────┐
│                    完整 UI 风格规范 (Full Design Spec)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 色彩系统 (Color System)                                          │
│     ├─ 品牌色：primary / secondary（+ 5 级明度梯度）                 │
│     ├─ 中性色：gray-50 ~ gray-900（或语义命名 surface/background）   │
│     ├─ 语义色：success / warning / error / info                     │
│     ├─ 文字色：primary / secondary / tertiary / inverse / link      │
│     ├─ 边框色：default / light / focus / error                      │
│     └─ 遮罩色：overlay / backdrop                                   │
│                                                                     │
│  2. 字体系统 (Typography System)                                     │
│     ├─ 字体族：primary（正文）/ heading（标题，可选不同字体）         │
│     ├─ 字号层级：display / h1-h6 / body-lg / body / caption / overline│
│     ├─ 行高：每个字号对应的 line-height                              │
│     ├─ 字重：Regular(400) / Medium(500) / SemiBold(600) / Bold(700) │
│     └─ 字间距：letter-spacing（标题 -0.02em，正文 0）               │
│                                                                     │
│  3. 间距系统 (Spacing System)                                        │
│     ├─ 基础网格：4px 或 8px                                         │
│     ├─ 间距阶梯：2xs/xs/sm/md/lg/xl/2xl/3xl                        │
│     ├─ 组件内间距：按钮内边距、卡片内边距、列表项间距                │
│     └─ 布局间距：section 间距、页面边距                              │
│                                                                     │
│  4. 圆角系统 (Border Radius System)                                  │
│     ├─ 圆角阶梯：none/sm/md/lg/xl/full                             │
│     ├─ 组件映射：按钮=md, 卡片=lg, 头像=full, 输入框=sm             │
│     └─ 嵌套规则：内层圆角 = 外层圆角 - 外层 padding                 │
│                                                                     │
│  5. 阴影系统 (Shadow / Elevation)                                    │
│     ├─ 层级：sm(卡片) / md(下拉) / lg(弹窗) / xl(模态)             │
│     ├─ 暗色模式：更深阴影 或 发光边缘替代                            │
│     └─ 内阴影：输入框 focus、凹陷效果                                │
│                                                                     │
│  6. 动效系统 (Motion / Animation)                                    │
│     ├─ 时长：instant(0) / fast(150ms) / normal(300ms) / slow(500ms) │
│     ├─ 缓动：ease-out（进入）/ ease-in（退出）/ spring（弹性）       │
│     ├─ 交互反馈：hover scale / press scale / focus ring animation    │
│     └─ 页面切换：slide / fade / zoom                                 │
│                                                                     │
│  7. 组件状态规范 (Component State Spec) ⬅️ 关键！                     │
│     ├─ 通用状态：default / hover / active / focus / disabled / loading│
│     ├─ 状态视觉变化规则：                                            │
│     │   hover   → 背景色亮 6% + 阴影升一级 + scale(1.02)            │
│     │   active  → 背景色暗 8% + 阴影降 + scale(0.98)                │
│     │   focus   → focus ring (2px $primary, offset 2px)             │
│     │   disabled→ opacity 0.5 + cursor not-allowed + 去阴影          │
│     │   loading → opacity 0.8 + spinner overlay                     │
│     └─ 叠加规则：hover + focus 同时存在时如何合并                     │
│                                                                     │
│  8. 布局规范 (Layout Spec)                                           │
│     ├─ 最大宽度：mobile 100% / tablet 768px / desktop 1200px        │
│     ├─ 栅格：12列 / gutter = spacing-md                             │
│     ├─ 安全边距：mobile 16px / desktop 24px                         │
│     └─ 组件间距：同级 spacing-md / 分组间 spacing-xl                 │
│                                                                     │
│  9. 图标规范 (Icon Spec)                                             │
│     ├─ 风格：outline / solid / duotone                              │
│     ├─ 尺寸：16 / 20 / 24 / 32 / 48                                │
│     ├─ 颜色：默认 textSecondary，激活 primary                        │
│     └─ 描边宽度：1.5px (outline) / 2px (bold)                       │
│                                                                     │
│  10. 装饰规范 (Decoration Spec)                                      │
│      ├─ 背景：纯色 / 渐变 / 毛玻璃 / 噪点纹理 / 网格               │
│      ├─ 分割线：颜色 + 粗细 + 是否用间距替代                         │
│      ├─ 空状态：插图风格 + 文案规范                                  │
│      └─ 徽标/标签：形状 + 颜色方案 + 字号                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 在 ThemeConfig 中的对应关系

| 风格规范维度 | 对应 ThemeConfig 位置 | 具体内容 |
|-------------|---------------------|---------|
| 色彩系统 | `tokens.colors` | ColorTokenGroup（30+ 语义色） |
| 字体系统 | `tokens.typography` | TypographyToken × 10 级 |
| 间距系统 | `tokens.spacing` | SpacingToken × 8 级 |
| 圆角系统 | `tokens.radius` | RadiusToken × 5 级 |
| 阴影系统 | `tokens.shadows` | ShadowToken × 4 级 |
| 动效系统 | `tokens.transitions` + `decorationRules.motion` | Token 管时长，Rules 管缓动策略 |
| 组件状态规范 | **`stateSpec`（新增）** | 通用状态变化规则 |
| 布局规范 | `tokens.spacing` + `tokens.custom` | 间距 + 自定义(maxWidth/gutter) |
| 图标规范 | `decorationRules.iconStyle` | 风格 + 尺寸约束 |
| 装饰规范 | `decorationRules.*` | 背景/边框/阴影/动效策略 |

### 4.3 组件状态规范 (ComponentStateSpec)

这是 Token 系统中**最容易被忽视但最关键**的部分——按钮的 hover 变多亮？active 缩多少？disabled 透明度多少？这些必须全项目统一：

```typescript
/** 新增到 ThemeConfig：组件状态视觉变化规范 */
interface ComponentStateSpec {
  /** Hover 态变化规则 */
  hover: {
    /** 背景色明度偏移（+6 = 亮 6%） */
    backgroundLightnessShift: number;
    /** 阴影变化 */
    shadowLevel: 'same' | 'up' | 'down' | 'none';
    /** 缩放 */
    scale: number;                    // 1.02
    /** 过渡 */
    transition: string;               // "$token:transition-fast"
  };

  /** Active/Pressed 态变化规则 */
  active: {
    backgroundLightnessShift: number; // -8
    shadowLevel: 'same' | 'up' | 'down' | 'none';
    scale: number;                    // 0.98
    transition: string;
  };

  /** Focus 态规则 */
  focus: {
    ringColor: string;                // "$token:primary"
    ringWidth: string;                // "2px"
    ringOffset: string;               // "2px"
    animated: boolean;                // true
  };

  /** Disabled 态规则 */
  disabled: {
    opacity: number;                  // 0.5
    removeShadow: boolean;            // true
    cursor: string;                   // "not-allowed"
    grayscale: boolean;               // false
  };

  /** Loading 态规则 */
  loading: {
    opacity: number;                  // 0.8
    spinnerColor: string;             // "$token:textInverse"
    skeleton: boolean;                // false
  };
}
```

**为什么这很重要？**

```
没有 StateSpec：
  按钮 A 的 hover 是 +10% 亮度
  按钮 B 的 hover 是换了个颜色
  卡片的 hover 是加了阴影但没有亮度变化
  → 交互反馈不一致，用户认知混乱

有 StateSpec：
  所有可交互元素的 hover → 统一 +6% 亮度 + 阴影升一级 + scale(1.02)
  → 用户形成肌肉记忆：「能亮的都能点」
  → AI 创建新组件时自动应用一致的状态规则
```

### 4.4 完整 ThemeConfig 结构（含 StateSpec）

```typescript
interface ThemeConfig {
  intent: StyleIntent;
  tokens: DesignTokenSet;
  themes: ThemeVariant[];
  activeThemeId: string;
  decorationRules: DecorationRules;

  /** 🆕 组件状态视觉规范 */
  stateSpec: ComponentStateSpec;
}
```

---

## 五、组件资产的主题自动适配

### 5.1 核心问题

```
场景：
  团队沉淀了一套「通用按钮组件」→ 在 A 项目（Ant Design 蓝色风格）中设计的
  现在 B 项目（暗色科技紫色风格）想复用这个按钮

没有主题适配：
  拖入按钮 → 蓝色背景 #1677ff + 8px 圆角 + 浅阴影
  → 与 B 项目的暗色紫色主题格格不入
  → 手动逐属性修改颜色/圆角/字体/间距/阴影
  → 修改 hover/active/disabled 各状态
  → 每次复用都要重做一遍
  → 组件复用形同虚设

有主题适配：
  拖入按钮 → 自动变成紫色背景 + 暗色主题圆角 + 发光阴影
  → hover/active/disabled 全部自动适配
  → 零调整，开箱即用
  → 真正的「一次设计，处处适配」
```

### 5.2 核心机制：组件用 Token 而非硬编码

**设计原则**：所有组件资产内部的样式**必须使用 Token 引用**。

```typescript
// ❌ 硬编码组件（无法跨主题适配）
buttonStyles = {
  backgroundColor: "#1677ff",       // 写死了蓝色
  color: "#ffffff",
  padding: "8px 16px",
  borderRadius: "8px",
};

// ✅ Token 化组件（自动适配任何主题）
buttonStyles = {
  backgroundColor: "$token:primary",
  color: "$token:textInverse",
  padding: "$token:spacing-sm $token:spacing-md",
  borderRadius: "$token:radius-md",
};
```

当这个按钮被拖入不同项目时：
- A 项目（Ant Design）→ `$token:primary` = `#1677ff` → 蓝色按钮
- B 项目（暗色科技）→ `$token:primary` = `#667eea` → 电光蓝按钮
- C 项目（清新自然）→ `$token:primary` = `#10b981` → 翡翠绿按钮

**零手动调整，系统自动完成。**

### 5.3 状态样式也全部 Token 化

按钮不只有一个静态样子——它的 hover/active/disabled/loading 等状态的样式也必须用 Token + StateSpec 表达：

```json
{
  "states": [
    {
      "name": "default",
      "styles": {
        "backgroundColor": "$token:primary",
        "color": "$token:textInverse",
        "boxShadow": "$token:shadow-sm",
        "transition": "$token:transition-fast"
      }
    },
    {
      "name": "hover",
      "styles": {
        "backgroundColor": "$token:primaryHover",
        "boxShadow": "$token:shadow-md",
        "transform": "scale(1.02)"
      }
    },
    {
      "name": "active",
      "styles": {
        "backgroundColor": "$token:primaryActive",
        "boxShadow": "none",
        "transform": "scale(0.98)"
      }
    },
    {
      "name": "focus",
      "styles": {
        "outline": "2px solid $token:primary",
        "outlineOffset": "2px"
      }
    },
    {
      "name": "disabled",
      "styles": {
        "backgroundColor": "$token:border",
        "color": "$token:textTertiary",
        "cursor": "not-allowed",
        "opacity": "0.5",
        "boxShadow": "none"
      }
    },
    {
      "name": "loading",
      "styles": {
        "backgroundColor": "$token:primary",
        "opacity": "0.8",
        "cursor": "wait"
      }
    }
  ]
}
```

切换项目/主题时，**所有状态自动适配**——hover 色、disabled 色、阴影深度都由 Token 系统统一决定。

### 5.4 组件变体规范 (Component Variants)

一个完整的通用组件通常有多种尺寸和形态，全部用 Token 表达：

```typescript
interface ComponentTemplate {
  // ... 现有字段

  /** 是否为主题感知组件（内部样式全部使用 Token） */
  themeAware: boolean;

  /** 组件使用的 Token 清单（实例化前检查目标项目兼容性） */
  requiredTokens?: string[];

  /** 组件变体规范 */
  variants?: ComponentVariantSpec[];
}

interface ComponentVariantSpec {
  /** 变体维度 */
  dimension: string;      // "size" / "variant" / "shape"
  /** 该维度的可选值 */
  options: VariantOption[];
}

interface VariantOption {
  name: string;           // "sm" / "md" / "lg"
  label: string;          // "小号" / "中号" / "大号"
  /** 该变体的 Token 映射 */
  tokenOverrides: Record<string, string>;
}
```

**示例：按钮的完整变体**

```json
{
  "variants": [
    {
      "dimension": "size",
      "options": [
        { "name": "sm", "label": "小号", "tokenOverrides": {
            "padding": "$token:spacing-xs $token:spacing-sm",
            "fontSize": "$token:font-caption.fontSize",
            "borderRadius": "$token:radius-sm",
            "height": "28px"
        }},
        { "name": "md", "label": "中号", "tokenOverrides": {
            "padding": "$token:spacing-sm $token:spacing-md",
            "fontSize": "$token:font-body.fontSize",
            "borderRadius": "$token:radius-md",
            "height": "36px"
        }},
        { "name": "lg", "label": "大号", "tokenOverrides": {
            "padding": "$token:spacing-md $token:spacing-lg",
            "fontSize": "$token:font-body-lg.fontSize",
            "borderRadius": "$token:radius-md",
            "height": "44px"
        }}
      ]
    },
    {
      "dimension": "variant",
      "options": [
        { "name": "primary", "label": "主要", "tokenOverrides": {
            "backgroundColor": "$token:primary",
            "color": "$token:textInverse",
            "border": "none"
        }},
        { "name": "secondary", "label": "次要", "tokenOverrides": {
            "backgroundColor": "transparent",
            "color": "$token:primary",
            "border": "1px solid $token:primary"
        }},
        { "name": "ghost", "label": "幽灵", "tokenOverrides": {
            "backgroundColor": "transparent",
            "color": "$token:textPrimary",
            "border": "1px solid $token:border"
        }},
        { "name": "danger", "label": "危险", "tokenOverrides": {
            "backgroundColor": "$token:error",
            "color": "$token:textInverse",
            "border": "none"
        }}
      ]
    }
  ]
}
```

### 5.5 实例化时的主题适配流程

```
┌────────────────────────────────────────────────────────────────────┐
│                     组件实例化 → 主题自动适配                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  用户/AI 从资产库选择组件模板                                       │
│                         │                                          │
│                         ▼                                          │
│  ┌──────────────────────────────────────┐                         │
│  │ 检查 themeAware 标记                  │                         │
│  └──────────┬───────────────────┬───────┘                         │
│             │                   │                                  │
│    themeAware = true    themeAware = false                         │
│             │                 （旧组件/硬编码）                      │
│             ▼                   │                                  │
│  ┌────────────────┐            ▼                                  │
│  │ 直接实例化     │  ┌──────────────────────────────────┐         │
│  │ Token 引用     │  │ 「主题适配向导」                   │         │
│  │ 自动生效  ✅   │  │                                  │         │
│  └────────────────┘  │ 1. 扫描组件内硬编码值             │         │
│                      │ 2. CIEDE2000 匹配到最接近 Token    │         │
│                      │ 3. 展示对照表让用户确认            │         │
│                      │ 4. 批量替换为 Token 引用            │         │
│                      │ 5. 标记为 themeAware = true         │         │
│                      └──────────────────────────────────┘         │
│                                                                    │
│  结果：组件实例内所有样式 = Token 引用                               │
│       → 切换主题变体时自动跟随                                      │
│       → 跨项目复用时自动适配                                        │
└────────────────────────────────────────────────────────────────────┘
```

### 5.6 AI 创建的组件自动 themeAware

当 AI 通过 MCP 创建组件时，Skill 强制约束使用 Token → 产出的组件天然就是 `themeAware: true`，无需额外适配步骤。

```
AI 创建按钮 → 全部使用 $token:xxx
           → 保存为资产时自动标记 themeAware: true
           → 其他项目复用时零适配
```

---

## 六、Token 引用机制

### 6.1 语法约定

样式值中以 `$token:` 前缀标识 Token 引用：

```typescript
// 节点样式中使用 Token 引用
const nodeStyles = {
  color: "$token:textPrimary",
  backgroundColor: "$token:surface",
  padding: "$token:spacing-md",
  borderRadius: "$token:radius-md",
  boxShadow: "$token:shadow-sm",
  fontSize: "$token:font-body.fontSize",
  lineHeight: "$token:font-body.lineHeight",
};
```

### 6.2 解析规则

```typescript
/**
 * Token 引用解析器
 * 输入: "$token:textPrimary" + ThemeConfig
 * 输出: "#333333"
 */
function resolveTokenRef(
  value: string,
  themeConfig: ThemeConfig
): string {
  if (!value.startsWith('$token:')) return value; // 非 Token 引用，原样返回

  const tokenPath = value.slice('$token:'.length); // "textPrimary" / "spacing-md" / "font-body.fontSize"

  // 1. 查找当前激活主题的 override
  const activeTheme = themeConfig.themes.find(t => t.id === themeConfig.activeThemeId);
  const overrideValue = lookupOverride(activeTheme?.overrides, tokenPath);
  if (overrideValue !== undefined) return overrideValue;

  // 2. 回退到 base tokens
  return lookupBaseToken(themeConfig.tokens, tokenPath);
}
```

### 6.3 渲染引擎集成

在现有 `resolveNodeStyles()` 的 4 层叠加算法中，增加一步 Token 解析：

```
Layer 0 (token resolve) → 将所有 "$token:xxx" 替换为实际 CSS 值（新增）
Layer 1 (base)          → node.styles
Layer 2 (global)        → matching globalStateBindings[].styles
Layer 3 (business)      → node.states[activeState].styles
Layer 4 (interaction)   → hover / active / focus styles
```

### 6.4 代码导出映射

| Token 引用 | CSS 导出 | Tailwind 导出 | React 导出 |
|-----------|---------|--------------|-----------|
| `$token:primary` | `var(--color-primary)` | `text-primary` | `theme.colors.primary` |
| `$token:spacing-md` | `var(--spacing-md)` | `p-4` (mapping) | `theme.spacing.md` |
| `$token:radius-md` | `var(--radius-md)` | `rounded-md` | `theme.radius.md` |
| `$token:shadow-sm` | `var(--shadow-sm)` | `shadow-sm` | `theme.shadows.sm` |

---

## 七、MCP 工具设计

### 7.1 新增 MCP Tool 集：theme

| Tool 名 | 操作 | 说明 |
|---------|------|------|
| `theme` | `get` | 获取项目完整 ThemeConfig |
| `theme` | `set_intent` | 设置/更新风格意图描述 |
| `theme` | `generate` | **核心**：根据 intent 用色彩科学生成完整 Token |
| `theme` | `update_tokens` | 批量更新 Token 值 |
| `theme` | `add_variant` | 添加主题变体（如 dark mode） |
| `theme` | `remove_variant` | 删除主题变体 |
| `theme` | `switch_variant` | 切换当前预览的主题变体 |
| `theme` | `set_decoration` | 设置装饰规则 |
| `theme` | `preview_demo` | 生成主题预览截图（标准组件集应用当前 Token） |

### 7.2 theme/generate 详细设计

```json
{
  "name": "theme",
  "action": "generate",
  "description": "根据用户的风格描述，运用色彩科学生成完整的 Design Token 配置。使用 HSL 色轮关系计算语义色板，用 APCA 对比度标准保证可访问性，用 modular scale 推导字体层级。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "intent": {
        "type": "object",
        "description": "风格意图描述",
        "properties": {
          "summary": { "type": "string", "description": "一句话风格描述，如'轻奢暗色科技风，主色用电光蓝'" },
          "aesthetics": { "type": "array", "items": { "type": "string" } },
          "decoration": { "type": "string", "enum": ["minimal", "moderate", "rich"] },
          "brightness": { "type": "string", "enum": ["light", "dark", "both"] },
          "seedColors": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["summary"]
      }
    },
    "required": ["projectId", "intent"]
  }
}
```

### 7.3 MCP Resource 新增

```
theme://project/{projectId}
  → 返回完整 ThemeConfig JSON
  → AI 在开始设计前必须先读取此 Resource 了解项目主题
```

---

## 八、AI Skill 设计：theme-generator

### 8.1 Skill 定位

```yaml
name: theme-generator
trigger: 当用户要求"制定主题风格"、"生成设计规范"、"设置项目配色"时触发
```

### 8.2 Skill 能力

**输入**：用户的自然语言风格描述

**处理**：
1. 解析用户意图 → 提取 aesthetics 标签、seedColors、brightness 等
2. 色彩科学计算：
   - 从 seed color 出发，用 HSL 色轮推导互补色/类比色/三角色
   - 60-30-10 法则分配颜色权重
   - APCA 对比度验证（文字/背景对比 ≥ 60 Lc）
   - 生成 5 级明度梯度（用于 hover/active/light 变体）
3. 间距体系：基于 4px 或 8px 网格，用黄金比例（1.618）或 modular scale 推导
4. 字体层级：基于 base size 用 major third (1.25) 或 perfect fourth (1.333) 比例生成
5. 圆角体系：根据 cornerStyle 策略生成 3-4 级圆角
6. 阴影体系：根据亮暗模式计算 3 级阴影（柔和/中等/强烈）
7. 装饰规则：根据 aesthetics 标签推导 background/border/shadow/motion 策略

**输出**：完整的 `ThemeConfig` JSON，通过 `theme/generate` MCP 工具写入项目

### 8.3 色彩科学核心算法

```
输入: seedColor = "#667eea" (电光蓝)
      brightness = "dark"

Step 1: 解析为 HSL
  → H=230, S=80%, L=66%

Step 2: 语义色板推导
  primary     = HSL(230, 80%, 66%)           ← seed
  secondary   = HSL(230 + 150, 72%, 66%)     ← 分裂互补 (+150°)
  success     = HSL(145, 65%, 55%)           ← 绿色系，固定
  warning     = HSL(38, 92%, 60%)            ← 橙色系，固定
  error       = HSL(0, 72%, 58%)             ← 红色系，固定
  info        = HSL(210, 70%, 60%)           ← 蓝色系

Step 3: 暗色模式表面色推导
  background        = HSL(230, 25%, 8%)      ← seed hue + 极低亮度
  surface           = HSL(230, 20%, 12%)     ← 略亮
  surfaceElevated   = HSL(230, 18%, 16%)     ← 再亮一级

Step 4: 文字色（APCA 对比度验证）
  textPrimary    = HSL(0, 0%, 98%)           ← 近白
  textSecondary  = HSL(230, 10%, 65%)        ← 带色相的灰
  textTertiary   = HSL(230, 8%, 45%)         ← 更灰

Step 5: 交互状态色（明度偏移）
  primaryHover   = HSL(230, 80%, 72%)        ← +6% lightness
  primaryActive  = HSL(230, 80%, 58%)        ← -8% lightness
  primaryLight   = HSL(230, 80%, 20%)        ← 极低亮度（暗色下的浅底色）

Step 6: APCA 验证
  textPrimary on background → Lc = 92 ✅ (>60)
  textPrimary on surface    → Lc = 88 ✅ (>60)
  textSecondary on surface  → Lc = 62 ✅ (>60)
```

### 8.4 间距计算

```
基于 8px 网格 + perfect fourth (1.333) 比例:

  spacing-2xs = 2px   (特殊)
  spacing-xs  = 4px   (8 × 0.5)
  spacing-sm  = 8px   (base)
  spacing-md  = 16px  (8 × 2)
  spacing-lg  = 24px  (8 × 3)
  spacing-xl  = 32px  (8 × 4)
  spacing-2xl = 48px  (8 × 6)
  spacing-3xl = 64px  (8 × 8)
```

### 8.5 字体层级计算

```
基于 base = 14px, scale = 1.25 (major third):

  font-caption = 12px / 1.4 / Regular
  font-body    = 14px / 1.5 / Regular     ← base
  font-body-lg = 16px / 1.5 / Regular
  font-h6      = 16px / 1.4 / Medium
  font-h5      = 18px / 1.4 / Medium
  font-h4      = 20px / 1.3 / SemiBold
  font-h3      = 24px / 1.3 / SemiBold
  font-h2      = 28px / 1.2 / Bold
  font-h1      = 36px / 1.2 / Bold
  font-display = 48px / 1.1 / Bold
```

---

## 九、主题风格中心（独立全屏页面）

### 9.1 产品定位

主题风格中心**不是一个侧边面板或弹窗**，而是一个**独立的全屏页面**——类似 Ant Design 官网的 Theme Editor、Figma 的 Design System 页面、或 Storybook。

原因：
- 主题包含大量细节信息（30+ 颜色、8 级间距、10 级字体、组件状态……），侧边面板塞不下
- 需要同时看到 Token 定义和实时 Demo 效果的对照
- 需要交互式调整 Token 并即时看到所有组件的变化
- 需要完整展示每个组件在各种状态下的风格表现

### 9.2 入口位置

```
编辑器顶部导航栏：
┌──────────────────────────────────────────────────────────────┐
│ ← 项目名  │  [📄 页面编辑]  [🎨 主题风格中心]  [👁 预览]     │
└──────────────────────────────────────────────────────────────┘
                               ↑
                    独立的顶级导航 Tab，与页面编辑同级
```

### 9.3 页面整体布局

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🎨 主题风格中心                    主题: [◉ Dark ▾]  [导出 JSON] [导出 CSS] │
├────────────────────┬─────────────────────────────────────────────────────┤
│                    │                                                     │
│  左侧导航          │  右侧内容区（滚动）                                  │
│  (固定 220px)      │                                                     │
│                    │  根据左侧选中的导航项展示对应区块                     │
│  ┌──────────────┐  │                                                     │
│  │ 📋 概览      │  │                                                     │
│  │ 🎯 风格意图  │  │                                                     │
│  │              │  │                                                     │
│  │ ─ Token ──── │  │                                                     │
│  │ 🎨 颜色     │  │                                                     │
│  │ 📐 间距     │  │                                                     │
│  │ ⬜ 圆角     │  │                                                     │
│  │ 🔤 字体     │  │                                                     │
│  │ 🌫 阴影     │  │                                                     │
│  │ ⚡ 动效     │  │                                                     │
│  │              │  │                                                     │
│  │ ─ 组件 ──── │  │                                                     │
│  │ 🔘 按钮     │  │                                                     │
│  │ 📇 卡片     │  │                                                     │
│  │ 📝 表单     │  │                                                     │
│  │ 📋 列表     │  │                                                     │
│  │ 🧭 导航     │  │                                                     │
│  │ 💬 反馈     │  │                                                     │
│  │ 📊 数据展示 │  │                                                     │
│  │ 🪟 弹层     │  │                                                     │
│  │              │  │                                                     │
│  │ ─ 布局 ──── │  │                                                     │
│  │ 📏 栅格     │  │                                                     │
│  │ 📱 页面模板 │  │                                                     │
│  │              │  │                                                     │
│  │ ─ 装饰 ──── │  │                                                     │
│  │ ✨ 装饰规则 │  │                                                     │
│  │ 🖼 图标     │  │                                                     │
│  └──────────────┘  │                                                     │
│                    │                                                     │
└────────────────────┴─────────────────────────────────────────────────────┘
```

### 9.4 各区块详细设计

#### 9.4.1 概览页（Overview）

进入主题中心的第一屏，展示主题的整体概貌：

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─── 风格摘要卡片 ──────────────────────────────────────────────┐   │
│  │                                                                │   │
│  │  "轻奢暗色科技风"                                              │   │
│  │  标签: [毛玻璃] [渐变] [科技] [冷色]                           │   │
│  │  装饰密度: 适中 │ 色温: 冷色 │ 明暗: 暗色                      │   │
│  │                                              [✨ AI 重新生成]  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── 色板一览 ──────────────────────────────────────────────────┐   │
│  │ ■■■■■■■■ ■■■■■■■■ ■■■■■■■■ ■■■■■■■■ ■■■■■■■■ ■■■■■■■■      │   │
│  │ primary   secondary success  warning  error    info            │   │
│  │ #667eea   #ea62a6   #4ade80  #fbbf24  #f87171  #60a5fa        │   │
│  │                                                                │   │
│  │ ████████████████████████████████████████████████████████████    │   │
│  │ bg        surface   elevated border   textPri  textSec         │   │
│  │ #0f0f17   #1a1a2e   #252540  #fff1a   #f8f8f8  #a8a8c0        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── 字体预览 ──┐  ┌── 间距预览 ──┐  ┌── 圆角预览 ──┐              │
│  │ Heading 1    │  │ ▓ 4px  xs    │  │ ┌─┐ sm 4px  │              │
│  │ Heading 2    │  │ ▓▓ 8px  sm   │  │ ┌──┐ md 8px │              │
│  │ Body text    │  │ ▓▓▓ 16px md  │  │ ┌───┐ lg 12 │              │
│  │ Caption      │  │ ▓▓▓▓ 24 lg   │  │ (●) full    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌─── 快速预览：一组核心组件 ─────────────────────────────────────┐  │
│  │                                                                │  │
│  │  [Primary 按钮]  [Secondary]  [Ghost]  [Danger]               │  │
│  │                                                                │  │
│  │  ┌─ 卡片 ─────────────────┐  ┌─ 输入框 ──────────────────┐   │  │
│  │  │ 标题                    │  │ 请输入搜索内容...    [🔍] │   │  │
│  │  │ 描述文字 desc text      │  └───────────────────────────┘   │  │
│  │  │ [Action]    辅助文字 →  │                                  │  │
│  │  └────────────────────────┘  Tag: [标签1] [标签2] [+]         │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.4.2 颜色详情页（Colors）

展示完整色板，每个颜色有**5 级明度梯度**、对比度信息、使用场景说明：

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🎨 颜色 Token                                        [+ 新增颜色]    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ━━━ 品牌色 (Brand) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  primary — 主色，用于主要交互元素                                     │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ ░░░░░░░░  ▒▒▒▒▒▒▒▒  ████████  ▓▓▓▓▓▓▓▓  ████████            │   │
│  │ Light     Hover      Base       Active     Dark               │   │
│  │ #e8ecfe   #7b93ed    #667eea    #5268d4    #3d50a8            │   │
│  │                                                               │   │
│  │ 对比度 (on background #0f0f17):  Lc = 72 ✅ AAA              │   │
│  │ 对比度 (on surface #1a1a2e):     Lc = 65 ✅ AA               │   │
│  │                                                               │   │
│  │ 使用场景:                                                     │   │
│  │  • 按钮主背景色    • 链接文字    • 选中态指示器               │   │
│  │  • Tab 激活下划线  • Switch 开启态  • Progress 填充色          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  secondary — 辅色，用于次要强调                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ ░░░░░░░░  ▒▒▒▒▒▒▒▒  ████████  ▓▓▓▓▓▓▓▓  ████████            │   │
│  │ Light     Hover      Base       Active     Dark               │   │
│  │ #fce7f2   #ed7bb8    #ea62a6    #d44e8f    #a83b70            │   │
│  │ ...                                                           │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ━━━ 文字色 (Text) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌────────────────────────┬────────────┬─────────────────────────┐   │
│  │ Token 名               │ 值         │ 示例                    │   │
│  ├────────────────────────┼────────────┼─────────────────────────┤   │
│  │ textPrimary            │ #f8f8f8    │ 这是标题文字 (Heading)  │   │
│  │ textSecondary          │ #a8a8c0    │ 这是辅助说明文字        │   │
│  │ textTertiary           │ #6b6b85    │ 这是占位符/禁用文字     │   │
│  │ textInverse            │ #0f0f17    │ 按钮上的白底反色文字    │   │
│  │ textLink               │ #667eea    │ 这是一个链接            │   │
│  └────────────────────────┴────────────┴─────────────────────────┘   │
│                                                                      │
│  ━━━ 语义色 (Semantic) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  (success / warning / error / info 各自展开同样的 5 级梯度 + 场景)    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.4.3 间距详情页（Spacing）

用**可视化方块**展示每级间距的实际大小，并展示在组件中的应用：

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📐 间距 Token                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ━━━ 间距阶梯（基于 8px 网格）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌────────┬───────┬──────────────────────────────────────────────┐   │
│  │ Token  │ 值    │ 可视化                                       │   │
│  ├────────┼───────┼──────────────────────────────────────────────┤   │
│  │ 2xs    │ 2px   │ ▌                                            │   │
│  │ xs     │ 4px   │ ▐▌                                           │   │
│  │ sm     │ 8px   │ ████                                         │   │
│  │ md     │ 16px  │ ████████                                     │   │
│  │ lg     │ 24px  │ ████████████                                 │   │
│  │ xl     │ 32px  │ ████████████████                             │   │
│  │ 2xl    │ 48px  │ ████████████████████████                     │   │
│  │ 3xl    │ 64px  │ ████████████████████████████████             │   │
│  └────────┴───────┴──────────────────────────────────────────────┘   │
│                                                                      │
│  ━━━ 组件内间距应用示例 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  按钮内边距:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  sm 按钮: │←xs→│文字│←xs→│    padding: xs(4) sm(8)         │     │
│  │  md 按钮: │←sm→│文字│←sm→│    padding: sm(8) md(16)        │     │
│  │  lg 按钮: │←md→│文字│←md→│    padding: md(16) lg(24)       │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  卡片内间距:                                                         │
│  ┌────────────────────────────────────────┐                          │
│  │ ←────── lg(24) ──────→               │                          │
│  │ ↑                                     │                          │
│  │ lg   标题文字 (font-h4)               │                          │
│  │      ←── sm(8) ──→                    │                          │
│  │      描述文字 (font-body)             │                          │
│  │      ←── md(16) ──→                   │                          │
│  │      [按钮]                            │                          │
│  │ ↓                                     │                          │
│  │ lg                                    │                          │
│  └────────────────────────────────────────┘                          │
│                                                                      │
│  列表项间距:                                                         │
│  ┌────────────────────────────────────────┐                          │
│  │ │←md→│ 标题          │←md→│            │ 行高: 44px              │
│  │ │    │ 描述          │    │            │ 项间距: borderLight分割  │
│  ├────────────────────────────────────────┤                          │
│  │ │←md→│ 标题          │←md→│            │                          │
│  └────────────────────────────────────────┘                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.4.4 字体详情页（Typography）

展示完整的字体层级、实际渲染效果和使用建议：

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔤 字体 Token                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ━━━ 字体层级一览 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  Display 大标题展示                                 48/1.1/700 │  │
│  │                                                                │  │
│  │  Heading 1 一级标题                                 36/1.2/700 │  │
│  │                                                                │  │
│  │  Heading 2 二级标题                                 28/1.2/700 │  │
│  │                                                                │  │
│  │  Heading 3 三级标题                                 24/1.3/600 │  │
│  │                                                                │  │
│  │  Heading 4 四级标题                                 20/1.3/600 │  │
│  │                                                                │  │
│  │  Heading 5 五级标题                                 18/1.4/500 │  │
│  │                                                                │  │
│  │  Body Large 大正文，适用于重要段落                   16/1.5/400 │  │
│  │                                                                │  │
│  │  Body 正文，默认文字大小，适用于大部分内容           14/1.5/400 │  │
│  │                                                                │  │
│  │  Caption 辅助文字，时间戳、标签                     12/1.4/400 │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ━━━ 字重对照 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  Regular (400):  The quick brown fox jumps over the lazy dog         │
│  Medium  (500):  The quick brown fox jumps over the lazy dog         │
│  SemiBold(600):  The quick brown fox jumps over the lazy dog         │
│  Bold    (700):  The quick brown fox jumps over the lazy dog         │
│                                                                      │
│  ━━━ 行间距示例 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  (展示紧凑/正常/宽松三种行高在段落中的效果对比)                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.4.5 组件展示页（以「按钮」为例）

每个组件类型一个完整的展示页，展示所有变体 × 所有状态 × 所有尺寸：

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔘 按钮 (Button)                                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ━━━ 变体 × 尺寸矩阵 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│           │ Small (28px)  │ Medium (36px) │ Large (44px)  │          │
│  ─────────┼───────────────┼───────────────┼───────────────┤          │
│  Primary  │ [Primary SM]  │ [Primary MD]  │ [Primary LG]  │          │
│  Secondary│ [Secondary SM]│ [Secondary MD]│ [Secondary LG]│          │
│  Ghost    │ [Ghost SM]    │ [Ghost MD]    │ [Ghost LG]    │          │
│  Danger   │ [Danger SM]   │ [Danger MD]   │ [Danger LG]   │          │
│  Text     │ [Text SM]     │ [Text MD]     │ [Text LG]     │          │
│                                                                      │
│  ━━━ 状态展示 (以 Primary Medium 为例) ━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Default  │ │  Hover   │ │  Active  │ │  Focus   │ │ Disabled │  │
│  │          │ │ (+6% L)  │ │ (-8% L)  │ │ (ring)   │ │ (0.5 op) │  │
│  │ #667eea  │ │ #7b93ed  │ │ #5268d4  │ │ #667eea  │ │ #d9d9d9  │  │
│  │ 1.00     │ │ 1.02     │ │ 0.98     │ │ 1.00     │ │ 1.00     │  │
│  │ shadow-sm│ │ shadow-md│ │ none     │ │ ring 2px │ │ none     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  ━━━ 带图标变体 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [🔍 搜索]  [+ 新增]  [↗ 分享]  [← 返回]  [⏳ Loading...]          │
│                                                                      │
│  ━━━ Token 映射详情 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 属性             │ Token                │ 当前值             │    │
│  │ backgroundColor  │ $token:primary       │ #667eea            │    │
│  │ color            │ $token:textInverse   │ #ffffff            │    │
│  │ padding          │ $token:spacing-sm md │ 8px 16px           │    │
│  │ borderRadius     │ $token:radius-md     │ 8px                │    │
│  │ fontSize         │ $token:font-body     │ 14px               │    │
│  │ boxShadow        │ $token:shadow-sm     │ 0 2px 4px ...      │    │
│  │ transition       │ $token:transition-fast│ all 150ms ease    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.4.6 其他组件展示页（同样模式）

每种组件类型都有完整的展示页：

| 组件类型 | 展示内容 |
|---------|---------|
| **卡片** | 无图/有图/水平/垂直 × 不同内边距 × hover 态 × 各种阴影层级 |
| **表单** | 输入框(各状态)/下拉/开关/复选/单选/Slider × 各尺寸 × 校验态 |
| **列表** | 单行/双行/带图/带操作 × 不同间距 × 分割线 × 选中态 |
| **导航** | 顶部导航/底部 Tab/侧边栏/面包屑 × 激活态 × 响应式 |
| **反馈** | Toast/Alert/Modal/Drawer/Popover × 4 种语义色 × 不同尺寸 |
| **数据** | Tag/Badge/Avatar/Progress/Skeleton × 颜色变体 × 尺寸 |
| **弹层** | Modal/Drawer/Dropdown/Tooltip × 阴影层级 × 圆角 × 动效 |

#### 9.4.7 装饰规则展示页

展示整体性装饰风格的效果对比：

```
┌──────────────────────────────────────────────────────────────────────┐
│ ✨ 装饰规则                                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ━━━ 背景策略: 毛玻璃 (glassmorphism) ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  当前参数: blur=12px | bg-opacity=0.1 | border-opacity=0.2          │
│                                                                      │
│  ┌─── 效果演示（渐变底图上的毛玻璃卡片）───────────────────────┐     │
│  │  ╔══════════════════════════╗                              │     │
│  │  ║  模糊透明背景            ║  ← backdrop-filter: blur()  │     │
│  │  ║  带半透明白色边框        ║  ← border: 1px solid        │     │
│  │  ║  内容文字清晰可读        ║     rgba(255,255,255,0.2)   │     │
│  │  ╚══════════════════════════╝                              │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ━━━ 阴影策略: 发光 (glow) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │
│  │  sm: 微光  │  │  md: 柔光  │  │  lg: 强光  │                     │
│  │  (淡蓝辉)  │  │  (蓝紫辉)  │  │  (明亮辉)  │                     │
│  └────────────┘  └────────────┘  └────────────┘                     │
│                                                                      │
│  ━━━ 动效策略: 平滑 (smooth) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  [▶️ 播放 hover 动画]  [▶️ 播放 press 动画]  [▶️ 播放页面切换]      │
│  时长: 300ms | 缓动: ease-out | hover scale: 1.02                   │
│                                                                      │
│  ━━━ 圆角策略: 圆润 (rounded) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌──┐  ┌────┐  ┌──────┐  ┌────────┐  (●)                           │
│  sm    md      lg        xl        full                              │
│  4px   8px     12px      16px      pill                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.4.8 页面模板展示

展示 Token 在完整页面布局中的效果——这是最终检验「风格是否统一」的地方：

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📱 页面模板预览                     视口: [iPhone 15 Pro ▾]           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────── 模板 1: 登录页 ──────┐  ┌────── 模板 2: 列表页 ──────┐    │
│  │ ┌───────────────────────┐  │  │ ┌───────────────────────┐  │    │
│  │ │                       │  │  │ │ ┌── 搜索栏 ─────────┐ │  │    │
│  │ │        Logo           │  │  │ │ └───────────────────┘ │  │    │
│  │ │                       │  │  │ │ ┌── 列表项1 ────────┐ │  │    │
│  │ │  ┌── 输入框 ──────┐   │  │  │ │ ├── 列表项2 ────────┤ │  │    │
│  │ │  └────────────────┘   │  │  │ │ ├── 列表项3 ────────┤ │  │    │
│  │ │  ┌── 密码框 ──────┐   │  │  │ │ └── 列表项4 ────────┘ │  │    │
│  │ │  └────────────────┘   │  │  │ │                       │  │    │
│  │ │  [██ 登 录 ██████]    │  │  │ │  ┌── FAB ──┐          │  │    │
│  │ │   忘记密码？ | 注册   │  │  │ │  │   +    │          │  │    │
│  │ │                       │  │  │ │  └────────┘          │  │    │
│  │ │ ── 或 ──              │  │  │ │ ┌── BottomTab ──────┐ │  │    │
│  │ │ [G] [Apple] [微信]    │  │  │ │ └───────────────────┘ │  │    │
│  │ └───────────────────────┘  │  │ └───────────────────────┘  │    │
│  └────────────────────────────┘  └────────────────────────────┘    │
│                                                                      │
│  ┌────── 模板 3: 详情页 ──────┐  ┌────── 模板 4: 设置页 ──────┐    │
│  │          ...               │  │          ...               │    │
│  └────────────────────────────┘  └────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.5 交互特性

| 交互 | 说明 |
|------|------|
| **实时预览** | 修改任何 Token 值 → 右侧所有 Demo 组件即时更新 |
| **主题切换** | 顶部切换 Light/Dark → 全页面 Demo 切换对应主题渲染 |
| **可编辑** | Token 值可以直接在页面上点击编辑（颜色弹出取色器，尺寸弹出滑块） |
| **对比模式** | 可以同时展示 Light + Dark 两套主题的并排对比 |
| **复制 Token** | 点击任何 Token 名直接复制 `$token:xxx` 引用到剪贴板 |
| **搜索** | 全局搜索 Token 名/值/描述 |
| **AI 生成** | 在风格意图区域输入描述 → AI 重新生成全套 Token → 全页面 Demo 即时刷新 |
| **导出** | 导出为 JSON / CSS Variables / Tailwind Config / Figma Tokens 格式 |

### 9.6 属性面板中的 Token 选择器（编辑器内联组件）

除了独立全屏页面，在**编辑器画布**中编辑节点属性时，也需要内联的 Token 选择器：

```
颜色选择弹窗:
┌────────────────────────────────────┐
│ 项目 Token（推荐）                   │
│ ┌──┐ primary      #667eea  主色    │
│ ┌──┐ secondary    #ea62a6  辅色    │
│ ┌──┐ surface      #1a1a2e  表面    │
│ ┌──┐ textPrimary  #f8f8f8  正文    │
│ ┌──┐ textSecondary#a8a8c0  辅助    │
│ ... [展开全部 →]                    │
├────────────────────────────────────┤
│ 自定义颜色                          │
│ ┌──────────────────────────────┐   │
│ │    HSL/Hex 颜色选择器         │   │
│ └──────────────────────────────┘   │
│ 最近使用: ● ● ● ● ●               │
│                                    │
│ ⚠️ 建议使用 Token 以保持主题一致性  │
└────────────────────────────────────┘

间距选择弹窗:
┌────────────────────────────────────┐
│ 间距 Token                          │
│ ▌  2xs   2px                       │
│ ▐▌ xs    4px                       │
│ ██ sm    8px    ← 当前值匹配       │
│ ████ md  16px                      │
│ ██████ lg 24px                     │
│ ████████ xl 32px                   │
│ ...                                │
├────────────────────────────────────┤
│ 自定义值: [    ] px                 │
└────────────────────────────────────┘
```

---

## 十、AI 设计时的主题遵循机制

### 10.0 ⛔ 主题门禁（最高优先级）

**核心原则：先有主题，后有设计。**

在 AI 执行任何设计操作（`element/add`、`style/update`、`asset/instantiate` 等）之前，**必须**先调用 `theme/check`：

```
Step 0: theme / check → { customized: boolean, summary: string }

if customized === false:
  ⛔ 立即停止！不执行任何设计操作！
  → 告诉用户：「项目尚未制定主题风格。请先描述你期望的风格
    （如"轻奢暗色科技风"、"清新自然"、"类似 Linear 的极简科技感"），
    我来帮你生成完整的主题配置。制定好主题后再开始设计。」
  → 等待用户回复 → 触发 theme-generator Skill → 生成并写入主题
  → customized 自动变为 true → 重新开始设计流程

if customized === true:
  ✅ 继续设计，所有样式使用 $token:xxx 引用
```

**为什么这是必要的？**

```
没有门禁：
  AI 直接开始设计 → 用硬编码色值 #1677ff
  → 后来用户说"我要暗色科技风"
  → 之前设计的所有页面全部需要返工
  → 无法批量替换（因为不是 Token 引用）
  → 巨大的浪费

有门禁：
  AI 发现未定制 → 先引导用户确定风格 → 生成完整主题
  → 之后所有设计都用 Token → 切换风格一键适配
  → 零返工
```

**门禁检查点（ThemeConfig.customized 字段）：**

| 状态 | 含义 | 来源 |
|------|------|------|
| `customized: false` | 默认模板，用户未主动设定 | 新项目初始化时 |
| `customized: true` | 用户/AI 已主动制定了主题 | `theme/update`、`theme/update_tokens`、`theme/set_intent`、`theme/set_decoration` 任一操作后自动设为 true |

### 10.1 设计时约束注入

当 AI 通过 MCP 执行设计操作时：

```
Step 1: AI 开始设计前，自动读取 theme://project/{id} Resource
Step 2: AI 获得完整 ThemeConfig，包含所有 Token 和装饰规则
Step 3: AI 在设置样式时使用 Token 引用

示例 —— AI 创建一个按钮：
  element/add: { tag: "button", parentId: "xxx" }
  style/update: {
    backgroundColor: "$token:primary",
    color: "$token:textInverse",
    padding: "$token:spacing-sm $token:spacing-md",
    borderRadius: "$token:radius-md",
    fontSize: "$token:font-body.fontSize",
    boxShadow: "$token:shadow-sm",
    transition: "$token:transition-normal"
  }
```

### 10.2 Skill 中的主题约束 Prompt

在 `design-from-reference` 和 `design-from-screenshot` Skill 中注入：

```markdown
## 主题约束（自动注入，不可跳过）

当前项目已定义主题 Token，设置任何样式时必须遵循：

### 颜色
- 文字颜色 → 使用 $token:textPrimary / textSecondary / textTertiary
- 背景颜色 → 使用 $token:background / surface / surfaceElevated
- 交互颜色 → 使用 $token:primary / secondary
- 语义颜色 → 使用 $token:success / warning / error / info
- 边框颜色 → 使用 $token:border / borderLight
- ❌ 禁止直接写 hex 色值，除非 Token 中确实没有合适的

### 间距
- padding/margin/gap → 使用 $token:spacing-{xs|sm|md|lg|xl|2xl}
- ❌ 禁止使用不在 Token 体系中的间距值

### 圆角
- borderRadius → 使用 $token:radius-{sm|md|lg|xl|full}

### 字体
- fontSize + lineHeight + fontWeight → 使用 $token:font-{h1|h2|...|body|caption}

### 装饰
- 卡片/容器背景 → 参考 decorationRules.background.strategy
- 如果 strategy=glassmorphism → 使用 backdrop-filter: blur(...)
- 如果 strategy=gradient → 使用项目定义的渐变方向

### 如果需要的值不在 Token 中
→ 先通过 theme/update_tokens 提议新增 Token
→ 再使用 $token:xxx 引用
```

### 10.3 Token 匹配算法（用于分析参考截图）

当 AI 分析参考设计截图时，需要将截图中的颜色映射到已有 Token：

```typescript
/**
 * 将一个 hex 颜色匹配到最接近的 Token
 * 使用 CIEDE2000 色差公式
 */
function matchColorToToken(
  hex: string,
  colorTokens: ColorTokenGroup
): { tokenName: string; distance: number } | null {
  let bestMatch = null;
  let minDistance = Infinity;

  for (const [name, token] of Object.entries(colorTokens)) {
    const distance = ciede2000(hex, token.value);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = { tokenName: name, distance };
    }
  }

  // 色差 < 5 认为匹配成功
  return bestMatch && bestMatch.distance < 5 ? bestMatch : null;
}
```

---

## 十一、代码导出

### 11.1 CSS Variables 导出

```css
/* 自动生成: theme-tokens.css */
:root {
  /* Colors */
  --color-primary: #667eea;
  --color-primary-hover: #7b93ed;
  --color-primary-active: #5268d4;
  --color-secondary: #ea62a6;
  --color-background: #0f0f17;
  --color-surface: #1a1a2e;
  --color-text-primary: #f8f8f8;
  --color-text-secondary: #a8a8c0;
  --color-border: rgba(255, 255, 255, 0.1);
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-error: #f87171;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);

  /* Transitions */
  --transition-fast: all 150ms ease;
  --transition-normal: all 300ms ease;
  --transition-slow: all 500ms ease;
}

/* Dark theme variant (default for this project) */
[data-theme="dark"] {
  /* 使用上述变量即可，dark 是 base */
}

/* Light theme variant */
[data-theme="light"] {
  --color-background: #ffffff;
  --color-surface: #f5f5f5;
  --color-surface-elevated: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: rgba(0, 0, 0, 0.1);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

### 11.2 Tailwind Config 导出

```typescript
// 自动生成: tailwind.config.ts (theme 部分)
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        secondary: 'var(--color-secondary)',
        surface: 'var(--color-surface)',
        // ...
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        // ...
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        // ...
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
};
```

---

## 十二、实施路径

### Phase 1：Schema + 存储（1 周）

| # | 任务 | 说明 |
|---|------|------|
| 1.1 | 定义 ThemeConfig 类型 | `features/design-schema/src/types/theme.ts` |
| 1.2 | 扩展 DesignProject | 新增 `themeConfig` 字段 |
| 1.3 | 默认 Token 集 | Ant Design 风格的默认 Token 作为新项目初始值 |
| 1.4 | 后端存储 | `design-api` 增加 theme CRUD 端点 |
| 1.5 | 迁移工具 | 旧项目自动补全默认 ThemeConfig |

### Phase 2：MCP 工具 + Skill（1 周）

| # | 任务 | 说明 |
|---|------|------|
| 2.1 | `theme/*` MCP 工具集 | get/set_intent/generate/update_tokens/add_variant/switch_variant |
| 2.2 | `theme://` MCP Resource | 返回项目 ThemeConfig |
| 2.3 | `theme-generator` Skill | 色彩科学算法 + Token 生成逻辑 |
| 2.4 | Skill prompt 注入 | 在 design-from-reference/screenshot 中注入主题约束 |

### Phase 3：渲染引擎 + Token 解析（1 周）

| # | 任务 | 说明 |
|---|------|------|
| 3.1 | Token 引用解析器 | `resolveTokenRef()` 函数 |
| 3.2 | 渲染管线集成 | `resolveNodeStyles()` Layer 0 Token 解析 |
| 3.3 | 主题变体切换 | 切换 activeTheme 时全画布重新渲染 |
| 3.4 | style/update 支持 Token | MCP style 工具接受 `$token:xxx` 值 |

### Phase 4：编辑器 UI（2 周）

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | 主题面板组件 | `ThemePanel` 完整 UI |
| 4.2 | Token 选择器 | 颜色/间距/字体选取时优先展示 Token |
| 4.3 | 主题变体切换器 | 顶部/面板内的主题切换 UI |
| 4.4 | 装饰规则编辑 | DecorationRules 可视化编辑 |

### Phase 5：Demo 预览（1 周）

| # | 任务 | 说明 |
|---|------|------|
| 5.1 | 标准 Demo 组件集 | 按钮/卡片/输入框/列表/导航/弹窗 |
| 5.2 | 实时预览渲染 | Demo 组件应用当前 Token 实时渲染 |
| 5.3 | 预览截图 | `theme/preview_demo` 工具生成截图 |

### Phase 6：代码导出（1 周）

| # | 任务 | 说明 |
|---|------|------|
| 6.1 | CSS Variables 导出 | Token → :root CSS 变量 |
| 6.2 | Tailwind Config 导出 | Token → tailwind.config.ts |
| 6.3 | codegen 集成 | 组件代码中使用 var(--xxx) 而非硬编码 |
| 6.4 | ThemeProvider 导出 | 主题切换逻辑的代码生成 |

---

## 十三、与现有系统的关系

### 13.1 与 GlobalStateVariable 的关系

当前全局状态中的 `theme: ["light", "dark"]` 变量 → 升级为 ThemeConfig 的 `activeThemeId` 切换。

```
旧: globalStates = [{ name: "theme", values: ["light", "dark"] }]
    + globalStateBindings 逐个绑定样式覆盖

新: themeConfig.themes = [{ id: "light", ... }, { id: "dark", ... }]
    + Token 引用自动解析为对应主题的值
    + 无需逐节点绑定，系统级自动生效
```

### 13.2 与 EnvironmentVariable 的关系

V2 规划中的 `EnvironmentVariable(theme)` 概念 → 被 ThemeConfig 完整替代。ThemeConfig 是更完整、更科学的实现方案。

### 13.3 向后兼容

- 现有项目（无 themeConfig）→ 迁移层自动补全默认 ThemeConfig
- 现有硬编码样式值 → 继续正常工作（`resolveTokenRef` 遇到非 `$token:` 前缀直接返回原值）
- 渐进式迁移：用户可以在属性面板中将硬编码值「升级」为 Token 引用

---

## 十四、核心技术决策

### Decision 1：Token 引用语法

| 方案 | 优点 | 缺点 |
|------|------|------|
| **`$token:xxx`（选定）** | 简洁、不冲突、grep 友好 | 需要 schema 层面约定 |
| CSS var(--xxx) 直接写 | 原生 CSS 标准 | 渲染引擎需要维护变量表、多主题切换复杂 |
| `{theme.colors.primary}` | 类 JS 表达式 | 与现有表达式语法 `{{ }}` 冲突 |

**结论**：`$token:xxx` 作为 Schema 存储格式。渲染时解析为实际值，代码导出时转为 `var(--xxx)`。

### Decision 2：Token 存储位置

| 方案 | 优点 | 缺点 |
|------|------|------|
| **DesignProject 级（选定）** | 全项目一致、简单 | 不支持单页面独立主题 |
| Screen 级 | 每页可以不同主题 | 过于碎片化、违背一致性目标 |
| 独立 Token 文件 | 可跨项目复用 | 额外管理成本 |

**结论**：Token 定义在 `DesignProject.themeConfig`。若未来需要跨项目共享，可将 ThemeConfig 导出为 JSON 模板再导入。

### Decision 3：装饰规则 vs 纯 Token

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Token + DecorationRules 分离（选定）** | Token 管值，Rules 管策略，AI 可分别遵循 | 两套概念 |
| 一切皆 Token | 统一模型 | 「毛玻璃」「渐变方向」不是 CSS 值，硬塞不自然 |

**结论**：分离。Token 是具体的 CSS 值（可直接渲染），DecorationRules 是方法论（指导 AI 选择手法）。

### Decision 4：AI 是否强制使用 Token

| 方案 | 优点 | 缺点 |
|------|------|------|
| **强制（选定）** | 100% 一致性 | AI 灵活性降低 |
| 建议但不强制 | 灵活 | 一致性无法保证 |

**结论**：Skill 中通过 prompt 强制约束 AI 使用 Token。如果确实需要新值 → 先新增 Token 再引用。

---

## 附录 A：默认 Token 集（Ant Design 风格 / Light）

```json
{
  "colors": {
    "primary": { "value": "#1677ff", "description": "主色" },
    "primaryHover": { "value": "#4096ff", "description": "主色悬浮" },
    "primaryActive": { "value": "#0958d9", "description": "主色按下" },
    "primaryLight": { "value": "#e6f4ff", "description": "主色浅底" },
    "secondary": { "value": "#722ed1", "description": "辅色" },
    "background": { "value": "#ffffff", "description": "页面底色" },
    "surface": { "value": "#ffffff", "description": "卡片表面" },
    "surfaceElevated": { "value": "#ffffff", "description": "悬浮面" },
    "textPrimary": { "value": "rgba(0, 0, 0, 0.88)", "description": "正文" },
    "textSecondary": { "value": "rgba(0, 0, 0, 0.65)", "description": "辅助" },
    "textTertiary": { "value": "rgba(0, 0, 0, 0.45)", "description": "占位符" },
    "textInverse": { "value": "#ffffff", "description": "反色文字" },
    "border": { "value": "#d9d9d9", "description": "默认边框" },
    "borderLight": { "value": "#f0f0f0", "description": "分割线" },
    "success": { "value": "#52c41a", "description": "成功" },
    "warning": { "value": "#faad14", "description": "警告" },
    "error": { "value": "#ff4d4f", "description": "错误" },
    "info": { "value": "#1677ff", "description": "信息" }
  },
  "spacing": {
    "2xs": { "value": "2px", "px": 2 },
    "xs": { "value": "4px", "px": 4 },
    "sm": { "value": "8px", "px": 8 },
    "md": { "value": "16px", "px": 16 },
    "lg": { "value": "24px", "px": 24 },
    "xl": { "value": "32px", "px": 32 },
    "2xl": { "value": "48px", "px": 48 },
    "3xl": { "value": "64px", "px": 64 }
  },
  "radius": {
    "sm": { "value": "4px" },
    "md": { "value": "8px" },
    "lg": { "value": "12px" },
    "xl": { "value": "16px" },
    "full": { "value": "9999px" }
  },
  "typography": {
    "display": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "48px", "lineHeight": "1.1", "fontWeight": "700" },
    "h1": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "36px", "lineHeight": "1.2", "fontWeight": "700" },
    "h2": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "28px", "lineHeight": "1.2", "fontWeight": "700" },
    "h3": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "24px", "lineHeight": "1.3", "fontWeight": "600" },
    "h4": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "20px", "lineHeight": "1.3", "fontWeight": "600" },
    "h5": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "18px", "lineHeight": "1.4", "fontWeight": "500" },
    "body-lg": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "16px", "lineHeight": "1.5", "fontWeight": "400" },
    "body": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "14px", "lineHeight": "1.5", "fontWeight": "400" },
    "caption": { "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "fontSize": "12px", "lineHeight": "1.4", "fontWeight": "400" }
  },
  "shadows": {
    "sm": { "value": "0 2px 4px rgba(0, 0, 0, 0.06)" },
    "md": { "value": "0 4px 12px rgba(0, 0, 0, 0.08)" },
    "lg": { "value": "0 8px 24px rgba(0, 0, 0, 0.12)" }
  },
  "transitions": {
    "fast": { "value": "all 150ms ease", "durationMs": 150 },
    "normal": { "value": "all 300ms ease", "durationMs": 300 },
    "slow": { "value": "all 500ms ease-out", "durationMs": 500 }
  }
}
```

---

## 附录 B：参考系统对比

| 系统 | Token 数量 | 特点 | 我们借鉴的 |
|------|-----------|------|-----------|
| Ant Design | ~80 | 语义化命名、完整的亮暗两套 | 语义色板分组、命名约定 |
| Tailwind CSS | ~200+ | 数字化命名（gray-500）、utility-first | 间距/圆角的有限集思路 |
| Material Design 3 | ~50 核心 | Dynamic Color、tone-based | 从种子色自动派生的算法 |
| Apple HIG | ~30 | 平台语义（label/fill/separator） | 按用途而非色相命名 |
| Figma Tokens | 无限自定义 | 嵌套引用、数学计算 | Token 引用语法 |

---

> **最后更新**：2026-05-26
> **作者**：@pikun
> **状态**：设计阶段
