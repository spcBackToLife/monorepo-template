# 字体 / 间距 / 圆角 / 阴影 / 动效

T3-typo-spacing 任务的方法论。所有非颜色 token 一次性推导落地。

## 一、间距：8px 网格（强制，R-THEME-04）

> 所有 spacing 值必须是 4 的倍数（一般 8 的倍数，紧凑场景允许 2/4）。

```
2xs = 2px      // 极紧（icon 内边距、徽标偏移）
xs  = 4px      // 紧（行内元素间距、icon 与文字）
sm  = 8px      // 小（按钮内边距、Tag）
md  = 16px     // 中（卡片内边距、行间距）
lg  = 24px     // 大（区块间距、表单字段间距）
xl  = 32px     // 特大（屏幕主区块间距）
2xl = 48px     // 巨大（Hero / 主标题块间距）
3xl = 64px     // 超巨（落地页主版块间距）
```

**禁止**：3 / 5 / 7 / 9 / 11 / 13 / 14 / 15 / 17 / 18 / 19 / 21 / 23 等非 4 倍数 → R-THEME-04 失败。

## 二、字体：Modular Scale 1.25（major third，强制 R-THEME-05）

```
base = 14px，scale ratio = 1.25

caption = 12px   (base / 1.17)
body    = 14px   (base × 1)
bodyLg  = 16px   (base × 1.14)
h5      = 18px   (base × 1.25^1)      ≈ 17.5
h4      = 20px   (base × 1.25^1.5)    ≈ 19.6
h3      = 24px   (base × 1.25^2.3)    ≈ 24
h2      = 28px   (base × 1.25^2.8)    ≈ 28
h1      = 36px   (base × 1.25^3.5)    ≈ 36
display = 48px   (base × 1.25^4.5)    ≈ 48
```

**容差**：每档允许 ±5% 偏离（向 4px 网格取整时常需调整）。

### 行高规则

```
display / h1   → lineHeight 1.1~1.2 （标题紧凑）
h2 / h3 / h4   → lineHeight 1.2~1.3
h5 / bodyLg    → lineHeight 1.4
body           → lineHeight 1.5
caption        → lineHeight 1.4
```

### 字重规则

```
fontWeight: {
  regular:  400,
  medium:   500,    // 用于强调正文 / 次按钮
  semibold: 600,    // 用于标题 h3/h4 / 主按钮
  bold:     700     // 用于 display / h1 / 强调
}
```

### 字体栈

```
默认（无 brand 字体时）：
  -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
  "Hiragino Sans GB", "Microsoft YaHei", sans-serif

数字等宽（金额/计时器）：
  ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace
```

## 三、圆角：根据 cornerStyle 选阶梯

> cornerStyle 来自 T4-decoration（aesthetics 决定）。

| cornerStyle | none | sm | md | lg | xl | full |
|------------|:----:|:--:|:--:|:--:|:--:|:----:|
| sharp（brutalist / 严肃）| 0 | 2 | 4 | 6 | 8 | 9999 |
| rounded（默认 / minimal / luxury / glass / futuristic）| 0 | 4 | 8 | 12 | 16 | 9999 |
| pill（organic / playful）| 0 | 8 | 16 | 24 | 32 | 9999 |

**注**：full = 9999 用于头像 / Pill 按钮 / 完全圆。

## 四、阴影：根据 shadow strategy 选

> shadow strategy 来自 T4-decoration（aesthetics 决定）。

### soft（默认，亮模式）

```
sm = "0 2px 4px rgba(0,0,0,0.06)"
md = "0 4px 12px rgba(0,0,0,0.08)"
lg = "0 8px 24px rgba(0,0,0,0.12)"
xl = "0 12px 48px rgba(0,0,0,0.16)"
```

### soft-dark（暗模式加深）

```
sm = "0 2px 4px rgba(0,0,0,0.30)"
md = "0 4px 12px rgba(0,0,0,0.40)"
lg = "0 8px 24px rgba(0,0,0,0.50)"
xl = "0 12px 48px rgba(0,0,0,0.60)"
```

### glow（luxury / futuristic / glassmorphism）

```
基于 primary 色：const {r,g,b} = hex2rgb(primary)

sm   = `0 0 8px rgba(${r},${g},${b},0.15)`
md   = `0 0 16px rgba(${r},${g},${b},0.20)`
lg   = `0 0 32px rgba(${r},${g},${b},0.25)`
xl   = `0 0 64px rgba(${r},${g},${b},0.30)`
glow = `0 0 24px rgba(${r},${g},${b},0.40)`   // 命名 glow 单独提供
```

### hard（brutalist）

```
sm = "2px 2px 0 rgba(0,0,0,1)"      // 偏移阴影，无模糊
md = "4px 4px 0 rgba(0,0,0,1)"
lg = "6px 6px 0 rgba(0,0,0,1)"
xl = "8px 8px 0 rgba(0,0,0,1)"
```

### none（minimal / flat）

```
完全不输出 shadows token（或全部为 "none"）
```

## 五、动效：durations + easings

### durations（毫秒）

```
instant = 100ms      // 微反馈（hover / focus）
fast    = 200ms      // 快速过渡（按钮 / Tab）
medium  = 300ms      // 中等（Modal / Drawer 进出）
slow    = 500ms      // 慢（页面切换 / 大组件）
```

### easings（CSS 缓动函数）

```
ease       = "cubic-bezier(0.4, 0, 0.2, 1)"      // 标准（默认）
easeIn     = "cubic-bezier(0.4, 0, 1, 1)"        // 加速进入
easeOut    = "cubic-bezier(0, 0, 0.2, 1)"        // 减速退出
easeInOut  = "cubic-bezier(0.4, 0, 0.6, 1)"      // 双向
spring     = "cubic-bezier(0.34, 1.56, 0.64, 1)" // 弹簧（playful / organic）
```

### 风格 → 动效曲线偏好

| aesthetics | 主用 easing | duration 偏好 |
|-----------|-----------|--------------|
| minimal / flat | ease / easeOut | fast |
| luxury | easeOut / easeInOut | medium |
| organic / playful | spring | medium |
| brutalist | ease | instant / fast（突兀感）|
| glassmorphism / futuristic | easeOut + 长 duration | medium / slow |

## 沉淀到 schema

```jsonc
// MCP: theme/update_tokens
theme/update_tokens {
  projectId,
  tokens: {
    typography: {
      fontFamily:    "<栈>",
      fontFamilyMono: "<等宽栈>",
      fontSize:      { caption,body,bodyLg,h5,h4,h3,h2,h1,display },
      fontWeight:    { regular,medium,semibold,bold },
      lineHeight:    { tight,normal,relaxed }
    },
    spacing: { "2xs":2, xs:4, sm:8, md:16, lg:24, xl:32, "2xl":48, "3xl":64 },
    radii:   { none:0, sm, md, lg, xl, full:9999 },
    shadows: { sm, md, lg, xl, glow? },
    durations: { instant:100, fast:200, medium:300, slow:500 },
    easings:   { ease, easeIn, easeOut, easeInOut, spring }
  }
}
```

完整字段清单见 `../schema-spec/theme-config.md` §2。
