# 主题变体推导（base + dark/light）

T6-variants 任务的方法论。在 base ThemeConfig 上派生至少 1 套对侧明暗变体。

## 一、为什么必须有 ≥ 2 套变体（R-THEME-06）

1. **可访问性兜底**：用户的系统/浏览器可能强制深/浅色，没变体 = 体验崩
2. **设计阶段切换预览**：design-planner 可能需要切换变体核对
3. **未来扩展接口**：以后加"高对比"/"色弱"/"季节限定"变体走同一接口

## 二、ThemeConfig.themes 数组结构

```jsonc
themeConfig.themes = [
  { id: "default",  name: "亮色",  colorScheme: "light",  tokenOverrides: {} },     // base，不 override
  { id: "dark",     name: "暗色",  colorScheme: "dark",   tokenOverrides: {        // 仅写需 override 的字段
      colors: { bgPage: "...", bgCard: "...", textPrimary: "...", ... }
  } },
  // 可选 third 变体
  { id: "high-contrast", name: "高对比", colorScheme: "light", tokenOverrides: { ... } }
]
themeConfig.activeThemeId = "default"
```

**核心原则**：base 主题是完整的，**变体只写差异（override）**——避免重复维护。

## 三、light → dark 变体推导（如 base 是 light）

如果 T2-colors 阶段是按 brightness=light 推的（默认情况），T6 推 dark 变体：

### Step 1：表面色三层全部反转

```
原 light：
  bgPage     = #FFFFFF
  bgCard     = HSL(primaryH, 5%, 97%)  ≈ #F8F9FB
  bgElevated = #FFFFFF

派生 dark：
  bgPage     = HSL(primaryH, 25%, 8%)   ≈ #0F1218
  bgCard     = HSL(primaryH, 20%, 12%)  ≈ #181B22
  bgElevated = HSL(primaryH, 18%, 16%)  ≈ #21252D
```

### Step 2：文字色反转

```
原 light：
  textPrimary   = rgba(0, 0, 0, 0.88)
  textSecondary = rgba(0, 0, 0, 0.65)
  textTertiary  = rgba(0, 0, 0, 0.45)
  textInverse   = #FFFFFF

派生 dark：
  textPrimary   = HSL(0, 0%, 97%)              ≈ #F7F7F7
  textSecondary = HSL(primaryH, 10%, 65%)
  textTertiary  = HSL(primaryH, 8%, 45%)
  textInverse   = HSL(primaryH, 25%, 8%)       // 浅按钮上的暗字
```

### Step 3：边界色反转

```
原 light：
  borderDefault = HSL(primaryH, 10%, 88%)
  borderStrong  = HSL(primaryH, 15%, 75%)
  divider       = HSL(primaryH, 8%, 92%)
  overlay       = rgba(0, 0, 0, 0.45)

派生 dark：
  borderDefault = HSL(primaryH, 15%, 22%)
  borderStrong  = HSL(primaryH, 18%, 32%)
  divider       = HSL(primaryH, 12%, 18%)
  overlay       = rgba(0, 0, 0, 0.6)            // 暗模式遮罩稍重
```

### Step 4：语义色明度提升（在暗底上需更亮）

```
亮模式语义色 L 取 45%~55%
暗模式语义色 L 取 60%~70%（提升 ~15%）

success: HSL(145, 65%, 50%) → HSL(145, 65%, 65%)
warning: HSL(38,  92%, 56%) → HSL(38,  92%, 70%)
error:   HSL(0,   72%, 51%) → HSL(0,   72%, 65%)
info:    HSL(210, 70%, 53%) → HSL(210, 70%, 68%)
```

### Step 5：primary 系明度调整

```
亮模式 primary L 偏中（如 60%~72%）
暗模式 primary 一般保留色相但 L 提升 5%~10%（暗底反差不够时）

primary       = HSL(345, 100%, 72%) → HSL(345, 100%, 76%)（轻微提亮）
primaryHover  = +6% L
primaryActive = -8% L
primaryLight  = HSL(primaryH, 50%, 18%~22%)（暗模式：深色但带主色相）
```

### Step 6：APCA 重新验证（强制）

变体的对比度也必须达 R-THEME-03 阈值。md 中必须给两套独立的 APCA 实测表。

### Step 7：阴影换 dark 配方

shadows 用 `02-color-science.md` 的 dark 配方（rgba 0.30~0.60）。

## 四、dark → light 派生（如 base 是 dark）

镜像反向操作：表面色变白、文字变黑（或带透明度）、语义色明度降到 45%~55%。

## 五、override 写法（关键：只写差异，不写完整 token）

❌ 错误（重复维护）：
```jsonc
{ id: "dark", tokenOverrides: {
    colors: { primary: "...", secondary: "...", success: "...", ... 全部写一遍 }
}}
```

✅ 正确（仅差异）：
```jsonc
{ id: "dark", tokenOverrides: {
    colors: {
      // 仅写"和 base 不同"的：
      bgPage:        "#0F1218",
      bgCard:        "#181B22",
      bgElevated:    "#21252D",
      textPrimary:   "#F7F7F7",
      textSecondary: "...",
      textTertiary:  "...",
      borderDefault: "...",
      borderStrong:  "...",
      divider:       "...",
      overlay:       "rgba(0,0,0,0.6)",
      // 语义色提亮
      success:       "...",
      warning:       "...",
      error:         "...",
      info:          "...",
      // primary 系如有调整也写
      primary:       "...",
      primaryHover:  "...",
      primaryActive: "...",
      primaryLight:  "..."
    },
    shadows: { sm: "...", md: "...", lg: "...", xl: "..." }   // shadow 配方变了
  }
}
```

**典型 dark override 仅 ~20 个字段**——其他（spacing/radii/typography/durations/easings/decorationRules）base 已定义不需重复。

## 六、md 必填内容

T6-variants.md 必须含：

1. **变体列表**：决定生成哪几个变体（id / name / colorScheme）+ 决策理由
2. **每变体的 override 字段清单**：哪些字段被覆盖、为什么
3. **每变体独立的 APCA 实测表**：所有 R-THEME-03 阈值都要重验
4. **★ 沉淀段落**：theme/update 的完整 themes[] 数组

## 沉淀到 schema

```jsonc
// MCP: theme/update（追加 themes[] 字段）
theme/update {
  projectId,
  themeConfig: {
    // ... 保留已有 intent/tokens/decorationRules/iconSpec/stateSpec
    themes: [
      { id: "default", name: "亮色", colorScheme: "light", tokenOverrides: {} },
      { id: "dark", name: "暗色", colorScheme: "dark", tokenOverrides: {
          colors: { /* 仅差异 */ },
          shadows: { /* dark 配方 */ }
      } }
    ],
    activeThemeId: "default"
  }
}
```

完整字段映射见 `../schema-spec/theme-config.md` §6。
