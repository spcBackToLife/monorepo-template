> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T3-typo-spacing
> 对应 schema 字段：project.themeConfig.tokens.{typography,spacing,radii,shadows,durations,easings}

# T3：字体 / 间距 / 圆角 / 阴影 / 动效 — <项目名>

## 1. 字体

> 详细方法见 `methodology/03-typography-spacing.md` §二。

### 1.1 字体栈

- 主字体栈：[选用理由 + 具体栈]
- 等宽字体栈：[数字/计时器场景用]

### 1.2 字号阶梯（Modular Scale 1.25）

| 名称 | 值 | scale 算式 | 偏离率 |
|------|:--:|-----------|:------:|
| caption | 12 | base/1.17 ≈ 12 | 0% |
| body | 14 | base | - |
| bodyLg | 16 | base × 1.14 ≈ 16 | 0% |
| h5 | 18 | base × 1.25^1 = 17.5 | +2.9% |
| h4 | 20 | base × 1.25^1.5 ≈ 19.6 | +2.0% |
| h3 | 24 | base × 1.25^2.3 ≈ 24 | 0% |
| h2 | 28 | base × 1.25^2.8 ≈ 28 | 0% |
| h1 | 36 | base × 1.25^3.5 ≈ 36 | 0% |
| display | 48 | base × 1.25^4.5 ≈ 48 | 0% |

**全部偏离率 ≤ ±5%（R-THEME-05）✓**

### 1.3 字重

| 名称 | 值 | 用途 |
|------|:--:|------|
| regular | 400 | 正文 |
| medium | 500 | 强调正文 / 次按钮 |
| semibold | 600 | 标题 / 主按钮 |
| bold | 700 | display / h1 |

### 1.4 行高

| 名称 | 值 | 用于哪些字号 |
|------|:--:|------------|
| tight | 1.2 | display / h1 |
| normal | 1.5 | body / bodyLg |
| relaxed | 1.7 | 长段落（少用）|

## 2. 间距（8px 网格，R-THEME-04）

| 名称 | 值 | 8 倍数 |
|------|:--:|:----:|
| 2xs | 2 | ✓ (0.25)|
| xs | 4 | ✓ (0.5) |
| sm | 8 | ✓ |
| md | 16 | ✓ |
| lg | 24 | ✓ |
| xl | 32 | ✓ |
| 2xl | 48 | ✓ |
| 3xl | 64 | ✓ |

**全部 4 倍数 ✓**

## 3. 圆角（按 cornerStyle 选）

> cornerStyle 由 T4-decoration 决定。本项目 cornerStyle = `<sharp/rounded/pill>`。

| 名称 | 值 |
|------|:--:|
| none | 0 |
| sm | <按 cornerStyle 取> |
| md | <按 cornerStyle 取> |
| lg | <按 cornerStyle 取> |
| xl | <按 cornerStyle 取> |
| full | 9999 |

**注**：T4-decoration 任务尚未开始时，先按 `rounded` 默认填，T4 完成后回头校准。

## 4. 阴影

> 按 shadow strategy 选配方。本项目 shadow = `<soft/glow/hard/none>`。

| 名称 | 值 |
|------|---|
| sm | "..." |
| md | "..." |
| lg | "..." |
| xl | "..." |
| glow（如有）| "..." |

### 配方选择理由

[为什么选这个 shadow strategy；如果是 glow 则给出 primary 的 RGB 拆解算式]

## 5. 动效

### 5.1 durations

| 名称 | 值（ms）|
|------|:------:|
| instant | 100 |
| fast | 200 |
| medium | 300 |
| slow | 500 |

### 5.2 easings

| 名称 | 值 |
|------|---|
| ease | cubic-bezier(0.4, 0, 0.2, 1) |
| easeIn | cubic-bezier(0.4, 0, 1, 1) |
| easeOut | cubic-bezier(0, 0, 0.2, 1) |
| easeInOut | cubic-bezier(0.4, 0, 0.6, 1) |
| spring | cubic-bezier(0.34, 1.56, 0.64, 1) |

### 5.3 风格偏好备注

[本项目主用 ease/spring 等，给下游 design-planner 参考]

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: theme/update_tokens（深合并 typography/spacing/radii/shadows/durations/easings）
{
  projectId: "<projectId>",
  tokens: {
    typography: {
      fontFamily:     "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif",
      fontFamilyMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: {
        caption: 12, body: 14, bodyLg: 16,
        h5: 18, h4: 20, h3: 24, h2: 28, h1: 36, display: 48
      },
      fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 }
    },
    spacing: { "2xs": 2, "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32, "2xl": 48, "3xl": 64 },
    radii:   { none: 0, sm: 8, md: 16, lg: 24, xl: 32, full: 9999 },
    shadows: {
      sm: "0 2px 4px rgba(0,0,0,0.06)",
      md: "0 4px 12px rgba(0,0,0,0.08)",
      lg: "0 8px 24px rgba(0,0,0,0.12)",
      xl: "0 12px 48px rgba(0,0,0,0.16)"
    },
    durations: { instant: 100, fast: 200, medium: 300, slow: 500 },
    easings: {
      ease:      "cubic-bezier(0.4, 0, 0.2, 1)",
      easeIn:    "cubic-bezier(0.4, 0, 1, 1)",
      easeOut:   "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.6, 1)",
      spring:    "cubic-bezier(0.34, 1.56, 0.64, 1)"
    }
  }
}
```
