# ThemeConfig 完整字段规范（project.themeConfig）

## 字段总览

```jsonc
project.themeConfig = {
  customized: true,                  // ★ 必须显式置真（出场门禁，R-THEME-01）
  intent:     IntentSpec,            // §1 风格意图（7 维度）
  tokens:     TokenSet,              // §2 完整 Token（colors/typography/spacing/radii/shadows/durations/easings）
  decorationRules: DecorationRules,  // §3 装饰规则（6 类）
  iconSpec:   IconSpec,              // §4 图标规格
  stateSpec:  StateSpec,             // §5 组件状态规范
  themes:     ThemeVariant[],        // §6 主题变体（≥ 2 套）
  activeThemeId: "default"
}
```

## §1. intent（风格意图）

```jsonc
intent: {
  summary:          "≤30 字一句话定性",
  aesthetics:       string[],        // 1~3 个标签，取自 8 类
  decoration:       "minimal" | "moderate" | "rich",
  colorTemperature: "warm" | "neutral" | "cool",
  brightness:       "light" | "dark" | "both",
  seedColors:       string[],        // 1~2 个 hex 种子色
  references:       string[]          // 用户给的参考品牌，可空数组
}
```

**MCP**：`theme/set_intent { projectId, intent }`（自动 customized=true）

## §2. tokens（完整 Token 集）

### §2.colors（17+ 必备）★

```jsonc
tokens.colors = {
  // 语义色（7）
  primary, secondary, accent, success, warning, error, info,
  // 表面色（3）
  bgPage, bgCard, bgElevated,
  // 文字色（4）
  textPrimary, textSecondary, textTertiary, textInverse,
  // 状态色（3）
  primaryHover, primaryActive, primaryLight,
  // 边界色（4）
  borderDefault, borderStrong, divider, overlay,
  // 中性灰阶（10）
  gray100, gray200, gray300, gray400, gray500,
  gray600, gray700, gray800, gray900,
  gray50?    // 可选：极浅
}
```

**红线**：
- R-THEME-02：缺以下任一即失败：primary/secondary/success/warning/error/info/bgPage/bgCard/textPrimary/textSecondary/textTertiary/borderDefault/divider
- R-THEME-03：textPrimary on bgPage 的 APCA Lc 必须 ≥ 75；textSecondary on bgCard ≥ 60

### §2.typography

```jsonc
tokens.typography = {
  fontFamily:     string,                       // 主字体栈
  fontFamilyMono: string,                        // 等宽字体栈（数字/计时器用）
  fontSize: {
    caption: 12, body: 14, bodyLg: 16,
    h5: 18, h4: 20, h3: 24, h2: 28, h1: 36,
    display: 48
  },
  fontWeight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700
  },
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.7
  }
}
```

**红线 R-THEME-05**：fontSize 偏离 modular scale 1.25 超过 ±5% → 失败。

### §2.spacing（8px 网格）

```jsonc
tokens.spacing = {
  "2xs": 2, "xs": 4, "sm": 8, "md": 16,
  "lg": 24, "xl": 32, "2xl": 48, "3xl": 64
}
```

**红线 R-THEME-04**：所有 spacing 值必须是 4 的倍数（一般 8 倍数）→ 否则失败。

### §2.radii

```jsonc
tokens.radii = {
  none: 0,
  sm:   4 | 2 | 8,                  // 由 cornerStyle 决定（见 04-decoration-rules）
  md:   8 | 4 | 16,
  lg:   12 | 6 | 24,
  xl:   16 | 8 | 32,
  full: 9999
}
```

### §2.shadows

```jsonc
tokens.shadows = {
  sm: string,                       // CSS box-shadow 字符串
  md: string,
  lg: string,
  xl: string,
  glow?: string                     // luxury / futuristic / glassmorphism 用
}
```

具体配方按 shadow strategy 选（见 03-typography-spacing.md §四）。

### §2.durations + easings

```jsonc
tokens.durations = {
  instant: 100, fast: 200, medium: 300, slow: 500
}
tokens.easings = {
  ease:      "cubic-bezier(0.4, 0, 0.2, 1)",
  easeIn:    "cubic-bezier(0.4, 0, 1, 1)",
  easeOut:   "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.6, 1)",
  spring:    "cubic-bezier(0.34, 1.56, 0.64, 1)"
}
```

**MCP**：
- 增量：`theme/update_tokens { projectId, tokens: { colors: { primary: "..." } } }`（仅传需要改的，深合并）
- 全量：`theme/update { projectId, themeConfig: {...} }`（覆盖整个 ThemeConfig）

## §3. decorationRules

```jsonc
decorationRules = {
  background: {
    strategy: "solid" | "gradient" | "glassmorphism",
    gradientAngle?: number,
    gradientStops?: [{ color, offset }],
    blur?: number,
    opacity?: number
  },
  border: {
    strategy: "none" | "subtle" | "accent" | "glow",
    width:    "1px" | "2px" | "3px",
    color:    "$token:borderDefault" | "$token:primary" | string
  },
  shadow: {
    strategy: "soft" | "hard" | "glow" | "none"
  },
  motion: {
    strategy: "minimal" | "smooth" | "spring" | "dramatic"
  },
  cornerStyle: "sharp" | "rounded" | "pill",
  iconStyle:   "geometric" | "organic"
}
```

**MCP**：`theme/set_decoration { projectId, decorationRules }`（自动 customized=true）

**红线 R-THEME-07**：decorationRules 任一字段为空对象 → 失败。

## §4. iconSpec

```jsonc
iconSpec = {
  style:        "outline" | "solid" | "duotone" | "glyph",
  strokeWidth:  number,                   // outline 用
  linecap:      "round" | "butt" | "square",
  linejoin:     "round" | "miter" | "bevel",
  cornerRadius: number,
  complexity:   "simple" | "medium" | "detailed",
  geometric:    boolean,
  colors: {
    default:   string,                   // 一般 $token:textSecondary
    active:    string,                   // 一般 $token:primary
    inactive:  string,
    secondary: string                    // duotone 第二层
  },
  sizing: {
    containerRatio: number,              // 0.5~0.6
    minPadding:     number               // px
  },
  variants: {
    inactive: { opacity },
    active:   { opacity, strokeWidth? },
    hover:    { opacity },
    disabled: { opacity, grayscale }
  }
}
```

**MCP**：通过 `theme/update` 全量写或 `theme/update_tokens` 扩展支持（实际调用前查 v2-actions-cheatsheet）

**红线 R-THEME-07**：iconSpec 为空对象 → 失败。

## §5. stateSpec

```jsonc
stateSpec = {
  hover: {
    scale:           number,               // 0=不缩放，1.02=放大 2%
    lightnessChange: string,               // "+6%"
    shadowChange:    "up" | "same" | "glow"
  },
  pressed: {
    scale:           number,               // 一般 0.98
    lightnessChange: string                // 一般 "-8%"
  },
  focus: {
    ringWidth:   string,                   // "2px"
    ringColor:   string,                   // "$token:primary"
    ringOpacity: number,                   // 0~1
    ringOffset?: string                    // "2px"
  },
  disabled: {
    opacity:   number,                     // 一般 0.4
    grayscale: boolean
  }
}
```

**MCP**：通过 `theme/update` 全量写。

**红线 R-THEME-07**：stateSpec 为空对象 → 失败。

## §6. themes（变体数组，≥ 2 套）

```jsonc
themes = [
  {
    id:             "default",
    name:           "亮色",
    colorScheme:    "light",
    tokenOverrides: {}                     // base 不 override
  },
  {
    id:             "dark",
    name:           "暗色",
    colorScheme:    "dark",
    tokenOverrides: {
      colors:  { /* 仅差异字段 */ },
      shadows: { /* dark 配方 */ }
    }
  }
]
activeThemeId = "default"
```

**红线 R-THEME-06**：themes.length < 2 → 失败。

**MCP 切换变体（编辑期预览）**：`theme/switch_variant { projectId, themeId }`

## §7. customized 标记

```jsonc
themeConfig.customized: boolean
```

- 默认 false（项目刚创建时）
- 任一 set_intent / update / update_tokens / set_decoration 都会自动置 true
- 下游所有 stage 把 customized=true 作为入场门禁

**MCP 检查**：`theme/check { projectId }` → `{ customized: boolean, summary }`

**红线 R-THEME-01**：出场时 customized 不为 true → 失败。

## MCP Action 速查

| Action | 用途 | 写入字段 |
|--------|------|---------|
| `theme/check { projectId }` | 入场门禁查 | 只读 customized + summary |
| `theme/get { projectId }` | 取完整 ThemeConfig | 只读 |
| `theme/set_intent { projectId, intent }` | 写 intent（T1）| intent + 自动 customized=true |
| `theme/update { projectId, themeConfig }` | 全量替换 | 整个 themeConfig |
| `theme/update_tokens { projectId, tokens }` | 增量改 token | tokens.* 深合并 |
| `theme/set_decoration { projectId, decorationRules }` | 写装饰（T4）| decorationRules + 自动 customized=true |
| `theme/switch_variant { projectId, themeId }` | 切换预览 | activeThemeId |

详情见 `../../common/references/v2-actions-cheatsheet.md`。
