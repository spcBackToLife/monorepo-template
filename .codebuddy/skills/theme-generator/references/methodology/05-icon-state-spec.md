# IconSpec + StateSpec 推导

T5-icon-state 任务的方法论。两套规范一次性推导。

## 一、IconSpec（图标规格）

下游 design-executor 用 material-painter 画图标时，统一按这套规格出图（保证全项目图标视觉一致）。

### 字段全集

```jsonc
iconSpec: {
  style:        "outline" | "solid" | "duotone" | "glyph",
  strokeWidth:  1.5,                    // outline 用
  linecap:      "round" | "butt" | "square",
  linejoin:     "round" | "miter" | "bevel",
  cornerRadius: 0,                      // 内部圆角（如折角处）
  complexity:   "simple" | "medium" | "detailed",
  geometric:    true | false,           // 是几何还是手绘风
  colors: {
    default:    "$token:textSecondary",
    active:     "$token:primary",
    inactive:   "$token:textTertiary",
    secondary:  "$token:primaryLight"   // duotone 第二层用
  },
  sizing: {
    containerRatio: 0.55,               // 图标占容器比例（0.5~0.6）
    minPadding:     6                   // 最小内边距 px
  },
  variants: {
    inactive: { opacity: 0.5 },
    active:   { opacity: 1.0, strokeWidth: 1.8 },  // outline 时加粗
    hover:    { opacity: 0.85 },
    disabled: { opacity: 0.3, grayscale: true }
  }
}
```

### aesthetics → iconSpec 映射

| aesthetics | style | strokeWidth | linecap | linejoin | cornerRadius | complexity | geometric |
|-----------|-------|:-----------:|---------|----------|:------------:|-----------|:---------:|
| minimal / flat | outline | 1.5 | round | round | 0 | simple | true |
| glassmorphism | outline | 1.5 | round | round | 1 | medium | false |
| luxury | solid | — | — | — | — | medium | false |
| futuristic | outline | 1.5 | butt | miter | 0 | medium | true |
| organic / hand-drawn | outline | 2.0 | round | round | 2 | detailed | false |
| brutalist | glyph | 2.5 | square | miter | 0 | simple | true |
| playful | duotone | 1.5 | round | round | 1 | medium | false |
| corporate / flat | outline | 1.5 | round | round | 0 | simple | true |

### colors 推导

```
默认情况：
colors.default   = $token:textSecondary
colors.active    = $token:primary
colors.inactive  = $token:textTertiary
colors.secondary = $token:primaryLight    // duotone 模式的填充层

特殊情况：
- luxury    → colors.default = $token:primary（金色图标体系）
- futuristic → colors.default = $token:primary（带低透明度）
- colorful   → 使用色板 [primary, secondary, success, warning, info]
```

### sizing 推导

```
containerRatio:
  - simple 图标 → 0.50（留更多呼吸空间）
  - medium 图标 → 0.55
  - detailed 图标 → 0.60（需要更多绘制空间）

minPadding:
  - 小图标(≤24px) → 4px
  - 中图标(24~48px) → 6px
  - 大图标(>48px) → 8px
```

### variants 推导

```
inactive: { opacity: 0.5~0.6, color: $token:textTertiary }
active:   { opacity: 1.0, strokeWidth: 默认 + 0.3（outline）, color: $token:primary }
hover:    { opacity: 0.85~0.9 }
disabled: { opacity: 0.3, grayscale: brightness==='dark' ? false : true }
```

## 二、StateSpec（组件状态规范）

下游 design-planner 写 visualStates（hover/pressed/focus/disabled）时按这套规格统一。

### 字段全集

```jsonc
stateSpec: {
  hover: {
    scale:           1.02,            // 0=不缩放，0.02=放大 2%
    lightnessChange: "+6%",           // primary 等主色的明度变化
    shadowChange:    "up"             // up=阴影加大 / same=不变 / glow=加 glow
  },
  pressed: {
    scale:           0.98,
    lightnessChange: "-8%"
  },
  focus: {
    ringWidth:   "2px",
    ringColor:   "$token:primary",
    ringOpacity: 0.4,
    ringOffset:  "2px"
  },
  disabled: {
    opacity:   0.4,
    grayscale: true                   // 是否去色
  }
}
```

### 风格 → stateSpec 偏好

| 风格 | hover scale | hover lightness | hover shadow | focus ring |
|------|:-----------:|:---------------:|:------------:|-----------|
| minimal | 1.0 | +6% | same | 2px primary |
| flat | 1.02 | +6% | up | 2px primary |
| luxury | 1.02 | +4% | up + glow | 2px primary 0.5 opacity |
| brutalist | 1.0 | +0%（换底色）| same | 3px black |
| organic | 1.03 | +6% | up | 2px primary |
| playful | 1.05 | +8% | up | 2px primary + animated |
| futuristic | 1.02 | +6% | glow | 2px primary glow |
| glassmorphism | 1.0 | +4% | glow | 2px primary 0.4 opacity |

### pressed 通用规则

```
全部风格统一：scale 0.98 + lightness -8%
（按下感是物理直觉，不需要风格化）
```

### disabled 通用规则

```
opacity 0.4 + grayscale 是默认
特殊情况：
- 暗模式可降至 opacity 0.3（暗底上更需对比）
- luxury 风格可不去色（保留品牌金色暗示），用 opacity 0.5
```

## 沉淀到 schema

```jsonc
// MCP: theme/update_tokens（iconSpec + stateSpec 都通过 update_tokens 写入根级别）
// 注：当前 MCP 的 theme/update_tokens 接受 tokens 字段；iconSpec/stateSpec 是 ThemeConfig
//     的根级字段，需用 theme/update 全量写或 update_tokens 扩展支持。
//     ⚠️ 实际调用前 read schema-spec/theme-config.md §4+§5 确认 MCP 字段路径。

theme/update {
  projectId,
  themeConfig: {
    // ... 已有字段保留
    iconSpec: {
      style: "duotone",
      strokeWidth: 1.5,
      linecap: "round",
      linejoin: "round",
      cornerRadius: 1,
      complexity: "medium",
      geometric: false,
      colors: {
        default:   "$token:textSecondary",
        active:    "$token:primary",
        inactive:  "$token:textTertiary",
        secondary: "$token:primaryLight"
      },
      sizing: { containerRatio: 0.55, minPadding: 6 },
      variants: {
        inactive: { opacity: 0.5 },
        active:   { opacity: 1.0, strokeWidth: 1.8 },
        hover:    { opacity: 0.85 },
        disabled: { opacity: 0.3, grayscale: true }
      }
    },
    stateSpec: {
      hover:    { scale: 1.05, lightnessChange: "+8%", shadowChange: "up" },
      pressed:  { scale: 0.98, lightnessChange: "-8%" },
      focus:    { ringWidth: "2px", ringColor: "$token:primary", ringOpacity: 0.4, ringOffset: "2px" },
      disabled: { opacity: 0.4, grayscale: true }
    }
  }
}
```

完整字段定义见 `../schema-spec/theme-config.md` §4 + §5。
