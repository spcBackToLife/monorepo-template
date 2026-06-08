# 主题→元素词典：minimal（极简主题）

> 适用 theme.intent：minimal / clean
>
> **核心**：少而精。每个元素都问"能不能再去掉一个属性"，能去就去。

---

## 1. 主题灵魂

- 留白多 / 信号少 / 字号克制 / 装饰极少
- 视觉权重金字塔 weight 总和偏低（22-26）
- 60-30-10 调色：60 中性白 + 30 纯黑 / 深灰 + 10 单色

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",          // 实色填充，不渐变
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.md",                  // 8px（不要 16+ 大圆角，太"温暖"）
  border: "none",
  fontSize: "$token:typography.body-lg.fontSize",    // 16
  fontWeight: "500",                                 // 不要 700（太重）
  padding: "0 $token:spacing.lg",
  height: "44px",                                    // 不要 48+，紧凑
  boxShadow: "none",                                 // 极简不要阴影
  transition: "$token:transitions.fast.value"
}
// hover: backgroundColor → primaryHover（不要 transform / shadow）
// pressed: backgroundColor → primaryActive
```

### 2.2 button (secondary)

```jsonc
{
  backgroundColor: "transparent",
  color: "$token:colors.textPrimary",
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.md",
  // 其余同 primary
}
// hover: borderColor → textPrimary（不要 backgroundColor 变化）
```

### 2.3 input

```jsonc
{
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.sm",                  // 4 / 6（小圆角）
  padding: "0 $token:spacing.md",
  height: "44px",
  fontSize: "$token:typography.body-lg.fontSize",
  backgroundColor: "$token:colors.surfaceElevated",  // 一般 = 白色
  // focus: borderColor → primary（不要光晕，太"装饰"）
  // error: borderColor → error
}
```

### 2.4 card

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.lg",                  // 12（不要 16+）
  padding: "$token:spacing.lg",                      // 24
  border: "1px solid $token:colors.borderLight",     // 1px 细边（不要阴影）
  boxShadow: "none"
  // hover: borderColor → border（细微 darken）
}
```

### 2.5 checkbox（wrapper-label 模式）

```jsonc
PolicyCheckVisual: {
  width: "16px",                                     // 不要 18+，小一档
  height: "16px",
  border: "1px solid $token:colors.border",          // 1px 细边
  borderRadius: "$token:radius.sm",                  // 4
  backgroundColor: "transparent",
  // checked: bg primary + ::after 勾（极小）
  // focus: 1px outline primary（不要 3px 光晕）
}
```

### 2.6 tab / segment

```jsonc
TabBtn.default: { color: "$token:colors.textTertiary", fontWeight: "400" }
TabBtn.active:  { color: "$token:colors.textPrimary", fontWeight: "500" }   // 不加粗到 700
TabIndicator:   { height: "1px", bg: "$token:colors.textPrimary" }          // 1px 细线（不要 2px+）
```

### 2.7 字号策略

```
display 28 → h2 22 → body-lg 16 → body 14 → caption 12
仅 5 级，跨级 1.4x
字重仅 400 / 500，不用 600+
```

### 2.8 装饰

```
装饰系统：极简下默认 = 0 装饰
若必须有 → soft-glow 极淡（opacity 0.2-0.3）
密度：极少（≤ 1 处）
```

---

## 3. 间距策略

```
紧凑型间距：
  field 间 12-16
  区块间 24-32
  card 内 padding 24
  screen padding 16-24
```

---

## 4. 不要做的事（minimal anti-pattern）

- ❌ 大圆角（borderRadius > 12）
- ❌ 强阴影（box-shadow > sm）
- ❌ 渐变填充（minimal 不要渐变）
- ❌ 多色用法（10% 强调色铺得很多）
- ❌ 大字号（display > 32）
- ❌ 字重 ≥ 700（minimal 字重克制）
- ❌ 微动效 spring / bounce（极简动效用 ease-out）
- ❌ 装饰图形（极简一般 0 装饰）
- ❌ 边框 + 阴影 + 圆角全用（选 1-2 个即可）

---

## 5. 自检（D-X-craft-* 时）

- [ ] 本节点 styles 行数 ≤ 12（minimal 元素属性少）
- [ ] borderRadius ≤ radius.lg（12px）
- [ ] 无 boxShadow 或仅 shadows.sm
- [ ] 无渐变填充
- [ ] 字重 ∈ {400, 500}
