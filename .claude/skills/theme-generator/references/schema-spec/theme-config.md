# ThemeConfig 完整字段规范（V1.0）

> 真理之源：`features/design-schema/src/types/theme.ts`。
> 本文档与 schema 类型 1:1 对齐，**所有 MCP 调用样例都已用真实 inputSchema 验证**。

## §0. 心智模型（必读）

```
ThemeConfig
├─ schemaVersion: "1.0"
├─ themes: ThemeDefinition[]                ← 多主题（品牌/节日/营销）
│   └─ ThemeDefinition
│       ├─ intent / tokens                  ← 主题级
│       ├─ decorationRules / iconSpec       ← 主题级
│       ├─ stateSpec                        ← 主题级
│       └─ colorSchemes[]                   ← 色彩方案（明暗/可访问性，变体级）
├─ activeThemeId
└─ customized
```

**两个维度正交**：主题（theme）= 风格切换；色彩方案（scheme）= 明暗切换。

## §1. ThemeConfig 顶层

```jsonc
{
  schemaVersion: "1.0",                     // 必填，迁移识别用
  themes: ThemeDefinition[],                // ≥ 1 套
  activeThemeId: "default",                 // 必须命中 themes[].id（R-THEME-08）
  customized: true                          // R-THEME-01
}
```

## §2. ThemeDefinition（一套完整主题）

```jsonc
{
  id:          "default",
  name:        "品牌默认",
  description: "...",
  createdAt, updatedAt,

  intent:           IntentSpec,             // §3
  tokens:           DesignTokenSet,         // §4（base tokens）
  decorationRules:  DecorationRules,        // §5
  iconSpec:         IconSpec,                // §6
  stateSpec:        ComponentStateSpec,      // §7
  colorSchemes:     ColorScheme[],           // §8（至少 2 套）
  activeColorSchemeId: "light"               // 必须命中 colorSchemes[].id
}
```

## §3. intent（风格意图）

```jsonc
intent: {
  summary:          "≤30 字一句话定性",
  aesthetics:       string[],               // 1~3 个标签
  decoration:       "minimal" | "moderate" | "rich",
  colorTemperature: "warm" | "neutral" | "cool",
  brightness:       "light" | "dark" | "both",
  seedColors:       string[],               // 1~2 个 hex 种子色
  audience?:        string,                 // 可选
  scenario?:        string,                 // 可选
  references?:      string[]                 // 可选
}
```

**MCP**：`theme/set_theme_intent { projectId, summary?, aesthetics?, decoration?, colorTemperature?, brightness?, seedColors?, ... }`（深合并；不传 themeId = active）

## §4. tokens（base tokens 集）

### §4.1 colors（14+ 必备）

```jsonc
tokens.colors = {
  // 语义色（14 必备）
  primary, secondary, success, warning, error, info,
  background, surface,
  textPrimary, textSecondary, textTertiary,
  border, borderLight, borderFocus,
  // 状态色（推荐）
  primaryHover, primaryActive, primaryLight,
  secondaryHover, secondaryActive,
  // 表面 / 文字（推荐）
  surfaceElevated, overlay, textInverse,
  // 中性灰阶（可选）
  gray100, gray200, ..., gray900
}
```

每个 token 的形态：`{ value: string, description?: string }`

**MCP 写入**：`theme/set_theme_tokens { projectId, kind:"colors", values:{ primary:"#5B6CFF", ... } }`

- 别名自动映射（bgPage→background 等，见 token-naming.md）
- 裸字符串自动包装成 `{ value }`
- 深合并，不传不删

### §4.2 spacing（8px 网格，R-THEME-04）

```jsonc
tokens.spacing = {
  "2xs": { value:"2px",  px:2 },
  "xs":  { value:"4px",  px:4 },
  "sm":  { value:"8px",  px:8 },
  "md":  { value:"16px", px:16 },
  "lg":  { value:"24px", px:24 },
  "xl":  { value:"32px", px:32 },
  "2xl": { value:"48px", px:48 },
  "3xl": { value:"64px", px:64 }
}
```

**MCP**：`theme/set_theme_tokens { kind:"spacing", values:{ md:16, lg:24 } }`（数值自动转 `{value:"16px", px:16}`）

### §4.3 radius

```jsonc
tokens.radius = {
  none: { value:"0" },
  sm:   { value:"4px" },
  md:   { value:"8px" },
  lg:   { value:"12px" },
  xl:   { value:"16px" },
  full: { value:"9999px" }
}
```

阶梯由 `decorationRules.cornerStyle` 决定（sharp/rounded/pill）。

**MCP**：`theme/set_theme_tokens { kind:"radius", values:{ md:"8px", lg:"12px" } }`

### §4.4 typography（modular scale 1.25，R-THEME-05）

```jsonc
tokens.typography = {
  caption: { fontFamily, fontSize:"12px", lineHeight:"1.4", fontWeight:"400" },
  body:    { ..., fontSize:"14px" },
  "body-lg":{ ..., fontSize:"16px" },
  h5:      { ..., fontSize:"18px" },
  h4:      { ..., fontSize:"20px" },
  h3:      { ..., fontSize:"24px" },
  h2:      { ..., fontSize:"28px" },
  h1:      { ..., fontSize:"36px" },
  display: { ..., fontSize:"48px" }
}
```

**MCP**：`theme/set_theme_tokens { kind:"typography", values:{ body:{ fontFamily:"...", fontSize:"14px", lineHeight:"1.5", fontWeight:"400" } } }`

注意：传 `bodyLg` 自动映射到 `body-lg`。

### §4.5 shadows

```jsonc
tokens.shadows = {
  sm: { value:"0 2px 4px rgba(0,0,0,0.06)" },
  md, lg, xl
}
```

**MCP**：`theme/set_theme_tokens { kind:"shadows", values:{ sm:"0 1px 3px rgba(0,0,0,0.04)" } }`

### §4.6 transitions

```jsonc
tokens.transitions = {
  fast:   { value:"all 150ms ease",     durationMs:150 },
  normal: { value:"all 300ms ease",     durationMs:300 },
  slow:   { value:"all 500ms ease-out", durationMs:500 }
}
```

**MCP**：`theme/set_theme_tokens { kind:"transitions", values:{ fast:"all 150ms ease" } }`（自动解析 durationMs）

## §5. decorationRules

```jsonc
decorationRules = {
  background:  { strategy:"solid"|"gradient"|"glassmorphism", gradient?, glassmorphism? },
  border:      { strategy:"none"|"subtle"|"accent"|"glow", width?:"1px" },
  shadow:      { strategy:"none"|"soft"|"hard"|"glow"|"layered" },
  motion:      { strategy:"minimal"|"smooth"|"spring"|"dramatic", easing? },
  iconStyle:   "outline"|"solid"|"duotone"|"colorful",
  cornerStyle: "sharp"|"rounded"|"pill"|"mixed"
}
```

**MCP**：`theme/set_theme_decoration { projectId, decorationRules:{...} }`（深合并）

## §6. iconSpec

```jsonc
iconSpec = {
  style:        "outline"|"solid"|"duotone"|"glyph"|"two-tone",
  stroke:       { width, linecap, linejoin, cornerRadius },
  colors:       { default, active, inactive, secondary?, palette? },
  sizing:       { containerRatio, minPadding, strokeCompensation },
  variants:     { inactive, active, hover?, disabled? },
  consistency:  { targetComplexity, uniformStrokeWidth, geometricOnly }
}
```

**MCP**：`theme/set_theme_icon_spec { projectId, iconSpec:{...} }`

## §7. stateSpec（ComponentStateSpec）

```jsonc
stateSpec = {
  hover:    { backgroundLightnessShift, shadowLevel, scale, transition },
  active:   { backgroundLightnessShift, shadowLevel, scale, transition },
  focus:    { ringColor, ringWidth, ringOffset, animated },
  disabled: { opacity, removeShadow, cursor, grayscale },
  loading:  { opacity, spinnerColor, skeleton }
}
```

**MCP**：`theme/set_theme_state_spec { projectId, stateSpec:{...} }`

## §8. colorSchemes（明暗变体，≥ 2 套，R-THEME-06）

```jsonc
colorSchemes = [
  { id:"light", name:"light", label:"浅色模式", overrides:{} },
  { id:"dark",  name:"dark",  label:"深色模式", overrides:{
      colors: {
        background:"#0F1218",
        surface:"#181B22",
        textPrimary:"rgba(255,255,255,0.92)",
        ...   // 只写差异，不写完整 token 集
      },
      shadows: { sm:"0 2px 4px rgba(0,0,0,0.4)", ... }
  }}
]
activeColorSchemeId = "light"
```

**MCP**：
- 添加：`theme/add_color_scheme { projectId, schemeId:"dark", kind:"dark" }`（kind=dark 自动派生 overrides 骨架，AI 再细化）
- 更新：`theme/update_color_scheme_overrides { projectId, schemeId:"dark", kind:"colors", values:{ background:"#0F1218" } }`
- 切换：`theme/switch_color_scheme { projectId, schemeId:"dark" }`

## §9. MCP Action 完整速查表（v1.0）

| Action | 写入位置 | 用途 |
|--------|--------|------|
| `theme/check { projectId }` | 只读 | 入场门禁查 customized |
| `theme/get { projectId }` | 只读 | 取完整 ThemeConfig |
| `theme/validate { projectId }` | 只读 | 跑 R-THEME-01~10，出场门禁 |
| `theme/scaffold_theme { projectId, themeId, name, copyFrom?, activate? }` | themes[].push | T0 创建新主题（节日红/品牌切换）|
| `theme/delete_theme { projectId, themeId }` | themes[].splice | 删除非 active 主题 |
| `theme/switch_theme { projectId, themeId }` | activeThemeId | 切换主题（多主题切换）|
| `theme/set_theme_intent { projectId, summary?, ..., themeId? }` | themes[active].intent | T1 |
| `theme/set_theme_tokens { projectId, kind, values, themeId? }` | themes[active].tokens.<kind> | T2 / T3 |
| `theme/set_theme_decoration { projectId, decorationRules, themeId? }` | themes[active].decorationRules | T4 |
| `theme/set_theme_icon_spec { projectId, iconSpec, themeId? }` | themes[active].iconSpec | T5 |
| `theme/set_theme_state_spec { projectId, stateSpec, themeId? }` | themes[active].stateSpec | T5 |
| `theme/add_color_scheme { projectId, schemeId, kind, overrides?, themeId? }` | themes[active].colorSchemes.push | T6 |
| `theme/update_color_scheme_overrides { projectId, schemeId, kind, values, themeId? }` | colorSchemes[i].overrides.<kind> | T6 |
| `theme/switch_color_scheme { projectId, schemeId, themeId? }` | activeColorSchemeId | 切明暗 |
| `theme/remove_color_scheme { projectId, schemeId, themeId? }` | colorSchemes[].splice | 删变体（≥2 套硬约束）|

## §10. 字段命名一致性

所有 token 名都按 `features/design-schema/src/types/theme.ts` 的 `ColorTokenGroup` 走。
认知友好的别名（bgPage/bgCard/borderDefault/divider/accent/bodyLg）由 MCP 自动映射，详见 `token-naming.md`。

## §11. R-THEME-* 红线对账

参见 `STAGE-CONTRACT.md §2.10` 完整 10 条红线。validate action 全部覆盖。
