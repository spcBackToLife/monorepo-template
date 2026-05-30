> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T2-colors
> 对应 schema 字段：project.themeConfig.tokens.colors

# T2：色彩计算（HSL 推导 + APCA 验证）— <项目名>

## 1. 起点：seedColor 与 brightness

- seedColor：`#XXXXXX` → HSL(H, S%, L%)
- brightness：`light` / `dark` / `both` → 本任务先按 `<具体一档>` 推 base，T6 再推变体

## 2. HSL 推导（语义色 7 项）

> 详细方法见 `methodology/02-color-science.md` §二。

| Token | HSL 算式 | HSL 值 | Hex |
|-------|---------|--------|-----|
| primary | seedColor | (345, 100%, 72%) | #FF6F91 |
| secondary | HSL(H+150°, S×0.9, L) | (135, 90%, 72%) | #6FFFAA |
| accent | HSL(H+30°, S, L+5%) | (15, 100%, 77%) | #FFB077 |
| success | HSL(145, 65%, 50%) | (145, 65%, 50%) | #2DCC75 |
| warning | HSL(38, 92%, 56%) | (38, 92%, 56%) | #FBBE2E |
| error | HSL(0, 72%, 51%) | (0, 72%, 51%) | #DD4747 |
| info | HSL(210, 70%, 53%) | (210, 70%, 53%) | #2D7DD2 |

### 推导备注

[每个色派生时的人工微调说明，如"secondary 算出来 #6FFFAA 对比度不够，调整 L 至 65% 得 #..."]

## 3. 表面色 / 文字色推导

> 详细方法见 `methodology/02-color-science.md` §三。

### 3.1 表面色

| Token | HSL 算式 | 值 |
|-------|---------|---|
| bgPage | （亮模式：纯白 / 暗模式：HSL(primaryH, 25%, 8%)）| #FFFFFF |
| bgCard | HSL(primaryH, 5%, 97%) | #F8F9FB |
| bgElevated | （亮：纯白 / 暗：HSL(primaryH, 18%, 16%)）| #FFFFFF |

### 3.2 文字色

| Token | 值 | 理由 |
|-------|---|-----|
| textPrimary | rgba(0,0,0,.88) | 亮模式标准 |
| textSecondary | rgba(0,0,0,.65) | |
| textTertiary | rgba(0,0,0,.45) | |
| textInverse | #FFFFFF | 主色按钮上的反色 |

### 3.3 边界色

| Token | 值 |
|-------|---|
| borderDefault | HSL(primaryH, 10%, 88%) |
| borderStrong | HSL(primaryH, 15%, 75%) |
| divider | HSL(primaryH, 8%, 92%) |
| overlay | rgba(0, 0, 0, 0.45) |

### 3.4 状态色

| Token | 算式 | 值 |
|-------|------|---|
| primaryHover | HSL(H, S, L+6%) | #FF8FA8 |
| primaryActive | HSL(H, S, L-8%) | #FF4F77 |
| primaryLight | HSL(H, S×0.5, 95%) | #FFF0F4 |

### 3.5 中性灰阶

| Token | L 值 | Hex |
|-------|:---:|-----|
| gray100 | 95% | ... |
| gray200 | 85% | ... |
| gray300 | 75% | ... |
| gray400 | 60% | ... |
| gray500 | 50% | ... |
| gray600 | 40% | ... |
| gray700 | 30% | ... |
| gray800 | 20% | ... |
| gray900 | 10% | ... |

## 4. APCA 对比度实测表 ★

> 强制门禁。所有 R-THEME-03 阈值都要达标。

| # | 配对 | fg | bg | Lc 实测 | 阈值 | 通过 |
|:-:|------|----|----|:------:|:----:|:----:|
| 1 | textPrimary on bgPage | rgba(0,0,0,.88) | #FFFFFF | 91 | ≥75 | ✓ |
| 2 | textSecondary on bgPage | rgba(0,0,0,.65) | #FFFFFF | 67 | ≥60 | ✓ |
| 3 | textTertiary on bgPage | rgba(0,0,0,.45) | #FFFFFF | 47 | ≥45 | ✓ |
| 4 | textPrimary on bgCard | rgba(0,0,0,.88) | #F8F9FB | 88 | ≥75 | ✓ |
| 5 | textSecondary on bgCard | rgba(0,0,0,.65) | #F8F9FB | 64 | ≥60 | ✓ |
| 6 | primary on bgPage | #FF6F91 | #FFFFFF | 48 | ≥45 | ✓ |
| 7 | textInverse on primary | #FFFFFF | #FF6F91 | 62 | ≥60 | ✓ |
| 8 | error on bgCard | #DD4747 | #F8F9FB | 49 | ≥45 | ✓ |

### 不达标记录与调整

[如果有任一不通过，写在这里：原始值 → 调整方式 → 最终值]

## 5. 候选色板对比与否决

[如果第一版色板某些色不和谐 / 不达标，列出"试过但否决"的版本]

| 版本 | seed | secondary | 否决理由 |
|------|------|-----------|---------|
| v1 | #FF6F91 | #6FFFAA | secondary 太刺眼，调整为 ... |

## 6. 关键假设与决策

- [HSL 推导 vs 商业色板取舍]
- [当 seedColor 卡 APCA 阈值时是保品牌色还是改色]
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/set_theme_tokens（kind="colors"，写当前 active 主题的 base tokens.colors）
// 别名（bgPage/bgCard/borderDefault/divider）自动映射到真理名
// 裸字符串自动包装成 { value }，无需手动包
{
  projectId: "<projectId>",
  kind: "colors",
  values: {
    // 语义色（14 必备）
    primary:        "#FF6F91",
    secondary:      "#6FFFAA",
    success:        "#2DCC75",
    warning:        "#FBBE2E",
    error:          "#DD4747",
    info:           "#2D7DD2",
    background:     "#FFFFFF",
    surface:        "#F8F9FB",
    textPrimary:    "rgba(0, 0, 0, 0.88)",
    textSecondary:  "rgba(0, 0, 0, 0.65)",
    textTertiary:   "rgba(0, 0, 0, 0.45)",
    border:         "#E2E5EA",
    borderLight:    "#EEF0F3",
    borderFocus:    "#FF6F91",
    // 状态色（推荐）
    primaryHover:   "#FF8FA8",
    primaryActive:  "#FF4F77",
    primaryLight:   "#FFF0F4",
    // 表面 / 文字（推荐）
    surfaceElevated:"#FFFFFF",
    overlay:        "rgba(0, 0, 0, 0.45)",
    textInverse:    "#FFFFFF",
    // 中性灰阶（可选）
    gray100: "#F2F3F5", gray200: "#D9DCDF", gray300: "#BFC3C7",
    gray400: "#9CA1A6", gray500: "#7E848B", gray600: "#646A70",
    gray700: "#4A4F54", gray800: "#2F3236", gray900: "#15181A"
  }
}
```
