# 主题→元素词典：warm（温暖主题）

> 适用 theme.intent：warm / friendly / cozy
>
> **核心**：圆角柔和 + 暖色底 + 主色温度感 + 装饰节制有温度。**温暖 ≠ 甜腻**——克制是关键。

---

## 1. 主题灵魂

- 暖白底（#FCFCFD / #FFFBF5），主色可暖可冷（蓝紫=中性温度也行）
- 全屏圆角柔和（卡片 16+）
- 装饰：soft-glow 光斑（中等密度）
- 字重 / 字号克制（避免甜腻）
- 微动效 ease-out（不用 spring 弹动）

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.lg",                  // 12（柔和但不夸张）
  height: "48px",
  fontSize: "$token:typography.body-lg.fontSize",
  fontWeight: "600",
  letterSpacing: "0.02em",
  boxShadow: "$token:shadows.sm",
  transition: "$token:transitions.normal.value"
}
// hover: backgroundColor primaryHover + transform translateY(-1px) + boxShadow md（轻浮出）
// pressed: transform translateY(0) + boxShadow sm
// focus: "0 0 0 3px primaryLight" 光晕
```

### 2.2 input

```jsonc
{
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.md",                  // 8（柔和）
  padding: "0 $token:spacing.md",
  height: "48px",
  fontSize: "$token:typography.body-lg.fontSize",
  backgroundColor: "$token:colors.surfaceElevated",
  caretColor: "$token:colors.primary",
  transition: "$token:transitions.fast.value"
}
// hover: borderColor primaryHover
// focus: borderColor primary + boxShadow "0 0 0 3px primaryLight"（4dp 光晕）
// error: borderColor error + 极淡 errorLight 背景
```

### 2.3 card / FormCard

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.xl",                  // 16（柔和卡片）
  padding: "$token:spacing.lg",                      // 24
  boxShadow: "$token:shadows.sm",                    // 弱阴影
  border: "none"
}
```

### 2.4 checkbox（wrapper-label 模式）

```jsonc
PolicyCheckVisual: {
  width: "18px",
  height: "18px",
  border: "1.5px solid $token:colors.border",
  borderRadius: "$token:radius.sm",                  // 4 软化方角
  backgroundColor: "transparent"
  // checked: bg primary + 边色 primary + ::after 勾（白）
  // focus: "0 0 0 3px primaryLight"
}
```

### 2.5 tab / segment

```jsonc
TabBtn.default: { color: "$token:colors.textSecondary", fontWeight: "500" }
TabBtn.active:  { color: "$token:colors.textPrimary", fontWeight: "700" }
TabIndicator:   {
  height: "2px",
  bg: "$token:colors.primary",
  borderRadius: "1px",
  transition: "transform $token:transitions.normal.value"
}
```

### 2.6 错误 / 成功 / 警告色

```
error  → 暖珊瑚红 #E16A6A（warm error，不要纯红）
success → 暖绿 #4ADE80（不要纯亮绿）
warning → 暖橙 #FBBF24
```

### 2.7 装饰

```
装饰系统：soft-glow（光斑系）
密度：节制（1-2 处）
位置：右上角溢出 + 卡片背后（可选）
opacity：0.4-0.6
颜色：primaryLight（蓝紫淡）或 secondaryLight（暖色淡，按主题）
```

### 2.8 字号节奏

```
display 28-32 → h2 22-24 → h4 18 → body 14-16 → caption 12
字重：400 / 500 / 600 / 700（4 级）
lineHeight：body 1.5 / 标题 1.2 / 按钮 1.2
letterSpacing：0.02em（轻微呼吸）
```

### 2.9 间距（呼吸型）

```
紧密：4-8（label-input、icon-text）
中等：16（字段间、卡片内 gap）
宽松：24（screen padding、card padding）
区块：32-48（HeaderArea 与 FormCard）
```

---

## 3. 不要做的事（warm anti-pattern）

- ❌ 圆角 ≥ 24（变玩具感，不是温暖）
- ❌ 字重 700 + 大字号 + 多色 → 甜腻
- ❌ 装饰用插画 / 多色 → 甜腻
- ❌ 强阴影 boxShadow lg+ → 浮夸
- ❌ spring 弹动微动效 → 甜腻
- ❌ 装饰 opacity > 0.7 → 喧宾夺主
- ❌ 错误用纯红 #FF0000 → 情绪太冲
- ❌ 主 CTA 渐变填充 → 营销感

---

## 4. 自检（D-X-craft-* 时）

- [ ] 圆角梯度统一（卡 16 / 按钮 12 / input 8）
- [ ] 装饰系统单一族（soft-glow）
- [ ] 错误色是 warm error #E16A6A 类
- [ ] focus 有光晕（不只 borderColor 变化）
- [ ] 字重 ≤ 700（不要 800/900）
- [ ] 主 CTA 纯色填充（不渐变）
