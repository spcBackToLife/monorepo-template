> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T6-variants
> 对应 schema 字段：project.themeConfig.themes

# T6：主题变体推导 — <项目名>

## 1. 变体清单

> 至少 2 套（R-THEME-06）。base 主题为 T2~T5 推导出的版本，本任务派生对侧明暗变体（如 base=light 派生 dark）。

| id | name | colorScheme | 角色 |
|----|------|:----------:|------|
| default | 亮色 | light | base |
| dark | 暗色 | dark | 派生 |
| ... | | | |

## 2. dark 变体推导（base 是 light 时）

> 详细方法见 `methodology/06-variant-derivation.md`。

### 2.1 表面色反转

| Token | base (light) | dark override | 理由 |
|-------|------|--------|------|
| bgPage | #FFFFFF | HSL(345, 25%, 8%) ≈ #1A0F12 | 暗模式深底带主色相 |
| bgCard | #F8F9FB | HSL(345, 20%, 12%) ≈ #21181B | 比 bgPage 高一层 |
| bgElevated | #FFFFFF | HSL(345, 18%, 16%) ≈ #2A2125 | 弹层最高 |

### 2.2 文字色反转

| Token | base (light) | dark override |
|-------|------|--------|
| textPrimary | rgba(0,0,0,.88) | HSL(0, 0%, 97%) ≈ #F7F7F7 |
| textSecondary | rgba(0,0,0,.65) | HSL(345, 10%, 65%) |
| textTertiary | rgba(0,0,0,.45) | HSL(345, 8%, 45%) |
| textInverse | #FFFFFF | HSL(345, 25%, 8%) |

### 2.3 边界色反转

| Token | base | dark override |
|-------|------|--------|
| borderDefault | #E2E5EA | HSL(345, 15%, 22%) |
| borderStrong | #B8BDC4 | HSL(345, 18%, 32%) |
| divider | #EEF0F3 | HSL(345, 12%, 18%) |
| overlay | rgba(0,0,0,0.45) | rgba(0,0,0,0.6) |

### 2.4 语义色明度提升

| Token | base | dark override | ΔL |
|-------|------|--------|:----:|
| success | HSL(145,65%,50%) | HSL(145,65%,65%) | +15% |
| warning | HSL(38,92%,56%) | HSL(38,92%,70%) | +14% |
| error | HSL(0,72%,51%) | HSL(0,72%,65%) | +14% |
| info | HSL(210,70%,53%) | HSL(210,70%,68%) | +15% |

### 2.5 primary 系微调

| Token | base | dark override |
|-------|------|--------|
| primary | #FF6F91 | #FF8FA8（轻微提亮 +6%）|
| primaryHover | ... | +6% L |
| primaryActive | ... | -8% L |
| primaryLight | #FFF0F4 | HSL(345, 50%, 20%) ≈ #4D1F2D（深色但带主色相）|

### 2.6 阴影换 dark 配方

| Token | base | dark override |
|-------|------|--------|
| sm | 0 2px 4px rgba(0,0,0,.06) | 0 2px 4px rgba(0,0,0,.30) |
| md | ... | rgba(0,0,0,.40) |
| lg | ... | rgba(0,0,0,.50) |
| xl | ... | rgba(0,0,0,.60) |

## 3. dark 变体 APCA 重验 ★

> 强制门禁。dark 变体也必须达 R-THEME-03 阈值。

| # | 配对 | fg | bg | Lc 实测 | 阈值 | 通过 |
|:-:|------|----|----|:------:|:----:|:----:|
| 1 | textPrimary on bgPage | #F7F7F7 | #1A0F12 | 92 | ≥75 | ✓ |
| 2 | textSecondary on bgPage | HSL(345,10%,65%) | #1A0F12 | 64 | ≥60 | ✓ |
| 3 | textPrimary on bgCard | #F7F7F7 | #21181B | 87 | ≥75 | ✓ |
| 4 | primary on bgPage | #FF8FA8 | #1A0F12 | 56 | ≥45 | ✓ |
| 5 | textInverse on primary | #1A0F12 | #FF8FA8 | 67 | ≥60 | ✓ |

[全部 ✓ 后才能写入；任一不通过 → 调整对应 token override]

## 4. 不需要 override 的字段

```
typography（fontFamily/fontSize/fontWeight/lineHeight）  → 保留 base
spacing                                                  → 保留 base
radii                                                    → 保留 base
durations + easings                                      → 保留 base
decorationRules                                          → 保留 base（除非用户要求 dark 主题装饰风格不同）
iconSpec                                                 → 保留 base（仅 colors.default 等可能需配色变体）
stateSpec                                                → 保留 base
```

## 5. 替代方案

[如果用户后续要 third 变体（高对比/色弱友好/季节限定），列出预备方案]

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/update（追加 themes[] 字段）
// ⚠️ 先 theme/get 拿完整 themeConfig，再追加 themes 数组，避免覆盖其他字段
{
  projectId: "<projectId>",
  themeConfig: {
    // ... 已有字段保留
    themes: [
      {
        id: "default",
        name: "亮色",
        colorScheme: "light",
        tokenOverrides: {}
      },
      {
        id: "dark",
        name: "暗色",
        colorScheme: "dark",
        tokenOverrides: {
          colors: {
            bgPage:        "#1A0F12",
            bgCard:        "#21181B",
            bgElevated:    "#2A2125",
            textPrimary:   "#F7F7F7",
            textSecondary: "#A89095",
            textTertiary:  "#7A6E72",
            textInverse:   "#1A0F12",
            borderDefault: "#3C2D32",
            borderStrong:  "#5A444B",
            divider:       "#2D2125",
            overlay:       "rgba(0, 0, 0, 0.6)",
            primary:       "#FF8FA8",
            primaryHover:  "#FFAAC0",
            primaryActive: "#E66F89",
            primaryLight:  "#4D1F2D",
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
  }
}
```
