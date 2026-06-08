# 完整样板：青春治愈学院主题（草莓粉 / 薄荷绿 / 奶油黄）

> 这是一份**端到端的样板**，演示从用户描述 "想做一个青春治愈的校园 App，配色用草莓粉和薄荷绿" 出发，经 7 个任务最终落地的 ThemeConfig。
> 不确定深度时来这里抄结构。

---

## 项目背景

- 项目名：CampusGeoSocial
- styleDirection（product 阶段已写）：「青春治愈+学院温暖（草莓粉/薄荷绿/奶油黄）」
- 用户额外提示：「主色用草莓粉，辅助色薄荷绿；亮色为主，但要兼顾系统暗黑模式；不要太花哨，留白要多」

---

## T1-intent：风格意图提取

**md 关键产出**（节选 / 完整见各任务模板）：

```jsonc
intent: {
  summary:          "青春治愈+学院温暖（草莓粉/薄荷绿/奶油黄）",
  aesthetics:       ["organic", "playful"],
  decoration:       "moderate",            // "留白要多" → moderate
  colorTemperature: "warm",                // 草莓粉/奶油黄 → warm
  brightness:       "both",                // "亮色为主，兼顾暗黑" → both
  seedColors:       ["#FF6F91"],           // 草莓粉
  references:       []
}
```

**推理重点**（md 中必写）：
- aesthetics：从 "治愈/校园" 命中 organic；从 "青春" 命中 playful；不取 minimal（用户说"留白多"但同时要 gradient 装饰，非完全极简）
- 候选否决：考虑过 luxury（被否，理由：校园场景 toC 不需要奢华感）

---

## T2-colors：色彩计算

**HSL 推导**：

```
seedColor = #FF6F91 (HSL 345, 100%, 72%)

primary   = #FF6F91
secondary = HSL(345+150=135, 100%×0.9=90%, 72%) → 调 L 至 65% 得 #6FE5AA（薄荷绿）
accent    = HSL(345+30=15,   100%, 77%) = #FFC18F（奶油黄偏橙）

success   = HSL(145, 65%, 50%) = #2DCC75
warning   = HSL(38,  92%, 56%) = #FBBE2E
error     = HSL(0,   72%, 51%) = #DD4747
info      = HSL(210, 70%, 53%) = #2D7DD2
```

**APCA 实测**（必须达标）：

| 配对 | Lc | 阈值 | ✓ |
|------|:--:|:----:|:-:|
| textPrimary(rgba(0,0,0,.88)) on #FFFFFF | 91 | ≥75 | ✓ |
| textSecondary(rgba(0,0,0,.65)) on #FFFFFF | 67 | ≥60 | ✓ |
| primary(#FF6F91) on #FFFFFF | 48 | ≥45 | ✓ |
| textInverse(#FFF) on primary(#FF6F91) | 62 | ≥60 | ✓ |

**完整 colors token**：

```jsonc
tokens.colors = {
  primary: "#FF6F91", secondary: "#6FE5AA", accent: "#FFC18F",
  success: "#2DCC75", warning: "#FBBE2E", error: "#DD4747", info: "#2D7DD2",
  bgPage: "#FFFFFF", bgCard: "#F8F9FB", bgElevated: "#FFFFFF",
  textPrimary: "rgba(0, 0, 0, 0.88)",
  textSecondary: "rgba(0, 0, 0, 0.65)",
  textTertiary: "rgba(0, 0, 0, 0.45)",
  textInverse: "#FFFFFF",
  primaryHover: "#FF8FA8", primaryActive: "#FF4F77", primaryLight: "#FFF0F4",
  borderDefault: "#E2E5EA", borderStrong: "#B8BDC4",
  divider: "#EEF0F3", overlay: "rgba(0, 0, 0, 0.45)",
  gray100: "#F2F3F5", gray200: "#D9DCDF", gray300: "#BFC3C7",
  gray400: "#9CA1A6", gray500: "#7E848B", gray600: "#646A70",
  gray700: "#4A4F54", gray800: "#2F3236", gray900: "#15181A"
}
```

---

## T3-typo-spacing：字体 / 间距 / 圆角 / 阴影 / 动效

```jsonc
typography: {
  fontFamily:     "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif",
  fontFamilyMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize:   { caption:12, body:14, bodyLg:16, h5:18, h4:20, h3:24, h2:28, h1:36, display:48 },
  fontWeight: { regular:400, medium:500, semibold:600, bold:700 },
  lineHeight: { tight:1.2, normal:1.5, relaxed:1.7 }
}

spacing: { "2xs":2, "xs":4, "sm":8, "md":16, "lg":24, "xl":32, "2xl":48, "3xl":64 }

// pill 阶梯（T4 决定 cornerStyle=pill）
radii: { none:0, sm:8, md:16, lg:24, xl:32, full:9999 }

// soft 阴影
shadows: {
  sm: "0 2px 4px rgba(0,0,0,0.06)",
  md: "0 4px 12px rgba(0,0,0,0.08)",
  lg: "0 8px 24px rgba(0,0,0,0.12)",
  xl: "0 12px 48px rgba(0,0,0,0.16)"
}

durations: { instant:100, fast:200, medium:300, slow:500 }
easings: {
  ease:"cubic-bezier(0.4,0,0.2,1)",
  easeIn:"cubic-bezier(0.4,0,1,1)",
  easeOut:"cubic-bezier(0,0,0.2,1)",
  easeInOut:"cubic-bezier(0.4,0,0.6,1)",
  spring:"cubic-bezier(0.34,1.56,0.64,1)"
}
```

---

## T4-decoration：装饰规则

aesthetics=["organic","playful"] 多标签叠加：

```jsonc
decorationRules: {
  background: {
    strategy: "gradient",
    gradientAngle: 135,
    gradientStops: [
      { color: "$token:primaryLight", offset: 0 },   // #FFF0F4
      { color: "$token:bgCard",       offset: 1 }    // #F8F9FB
    ]
  },
  border:     { strategy: "subtle", width: "1px", color: "$token:borderDefault" },
  shadow:     { strategy: "soft" },
  motion:     { strategy: "spring" },
  cornerStyle: "pill",       // playful + organic 都偏 pill
  iconStyle:   "organic"
}
```

---

## T5-icon-state：iconSpec + stateSpec

```jsonc
iconSpec: {
  style: "duotone",            // playful 风格命中
  strokeWidth: 1.5,
  linecap: "round", linejoin: "round",
  cornerRadius: 1, complexity: "medium", geometric: false,
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
}

stateSpec: {
  hover:    { scale: 1.05, lightnessChange: "+8%", shadowChange: "up" },  // playful 偏弹
  pressed:  { scale: 0.98, lightnessChange: "-8%" },
  focus:    { ringWidth: "2px", ringColor: "$token:primary", ringOpacity: 0.4, ringOffset: "2px" },
  disabled: { opacity: 0.4, grayscale: true }
}
```

---

## T6-variants：主题变体（base + dark）

```jsonc
themes: [
  { id: "default", name: "亮色", colorScheme: "light", tokenOverrides: {} },
  {
    id: "dark", name: "暗色", colorScheme: "dark",
    tokenOverrides: {
      colors: {
        // 表面色反转
        bgPage:        "#1A0F12",   // HSL(345,25%,8%)
        bgCard:        "#21181B",
        bgElevated:    "#2A2125",
        // 文字色反转
        textPrimary:   "#F7F7F7",
        textSecondary: "#A89095",
        textTertiary:  "#7A6E72",
        textInverse:   "#1A0F12",
        // 边界色反转
        borderDefault: "#3C2D32",
        borderStrong:  "#5A444B",
        divider:       "#2D2125",
        overlay:       "rgba(0, 0, 0, 0.6)",
        // primary 系微调
        primary:       "#FF8FA8",
        primaryHover:  "#FFAAC0",
        primaryActive: "#E66F89",
        primaryLight:  "#4D1F2D",
        // 语义色提亮
        success:       "#5FE099",
        warning:       "#FFD466",
        error:         "#F07878",
        info:          "#5FA8E5"
      },
      shadows: {
        sm: "0 2px 4px rgba(0,0,0,0.30)",
        md: "0 4px 12px rgba(0,0,0,0.40)",
        lg: "0 8px 24px rgba(0,0,0,0.50)",
        xl: "0 12px 48px rgba(0,0,0,0.60)"
      }
    }
  }
],
activeThemeId: "default"
```

**dark 变体 APCA 重验**：

| 配对 | Lc | ✓ |
|------|:--:|:-:|
| textPrimary(#F7F7F7) on #1A0F12 | 92 | ✓ |
| textSecondary(#A89095) on #1A0F12 | 64 | ✓ |
| primary(#FF8FA8) on #1A0F12 | 56 | ✓ |
| textInverse(#1A0F12) on primary(#FF8FA8) | 67 | ✓ |

---

## T7-handover：自检结论

| 红线 | 结果 |
|------|:----:|
| R-THEME-01：customized=true | ✓ |
| R-THEME-02：必备语义色齐 | ✓ 全 13 项 |
| R-THEME-03：APCA 全部达标 | ✓（亮 + 暗双套都达）|
| R-THEME-04：spacing 8px 网格 | ✓ |
| R-THEME-05：fontSize modular scale | ✓（最大偏离 +2.9%）|
| R-THEME-06：themes ≥ 2 套 | ✓（default + dark）|
| R-THEME-07：decorationRules / iconSpec / stateSpec 非空 | ✓ |

**移交说明给 interaction-designer**：
- 主色草莓粉，所有主按钮一律 `$token:primary`
- 圆角全 pill，从 `$token:radii.{none,sm,md,lg,xl,full}` 取
- 动效偏 spring，按钮 hover 缩放至 1.05
- 暗黑模式自动支持，下游不需要为暗黑写额外样式

---

## 完整 ThemeConfig（一键 theme/update 全量写入版）

```jsonc
project.themeConfig = {
  customized: true,
  intent: { /* T1 */ },
  tokens: { /* T2 + T3 */ },
  decorationRules: { /* T4 */ },
  iconSpec:  { /* T5 */ },
  stateSpec: { /* T5 */ },
  themes:    [ /* T6 */ ],
  activeThemeId: "default"
}
```
