# 主题→元素词典：premium（高端主题）

> 适用 theme.intent：premium / luxury / high-end
>
> **核心**：黑金 / 米白底 + 高对比 + 衬线字 + 大留白 + 精致细节。**高端 ≠ 复杂**——克制是高端的关键。

---

## 1. 主题灵魂

- 色板：米白 / 深色背景 + 金色 / 深蓝强调
- 字体：可用衬线（Serif）大标题
- 装饰：极少 / 微妙纹理 / 金色细线
- 字距张开（letterSpacing 0.05em+ 表达"贵气"）
- 微动效：克制 ease-out（不弹动）

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",          // 深色或金色实色
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.sm",                  // 4（直角偏微圆，高端不要大圆角）
  height: "52px",
  fontSize: "$token:typography.body-lg.fontSize",
  fontWeight: "500",                                 // 不要 700（高端字重克制）
  letterSpacing: "0.05em",                           // 字距张开
  textTransform: "uppercase",                         // 大写英文（如有英文）
  boxShadow: "none",                                 // 不要阴影
  transition: "$token:transitions.normal.value"
}
// hover: backgroundColor primaryHover（不要 transform）
// pressed: backgroundColor primaryActive
// focus: 1px outline primary + offset 4px（高端 focus 极克制）
```

### 2.2 input

```jsonc
{
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.sm",                  // 4 微圆
  height: "52px",
  padding: "0 $token:spacing.md",
  fontSize: "$token:typography.body-lg.fontSize",
  backgroundColor: "transparent",                    // 透明底（融入页面）
  borderColor: "$token:colors.borderLight",
  letterSpacing: "0.02em"
  // focus: borderColor primary（无光晕）
}
```

### 2.3 card

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.md",                  // 8 微圆
  padding: "$token:spacing.xl",                      // 32（大留白）
  border: "1px solid $token:colors.borderLight",
  boxShadow: "none"                                  // 不要阴影
}
```

### 2.4 checkbox（wrapper-label）

```jsonc
PolicyCheckVisual: {
  width: "16px",
  height: "16px",
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.sm",                  // 4
  // checked: bg primary + 细勾（精致）
  // focus: 1px outline primary
}
```

### 2.5 tab

```jsonc
TabBtn.default: { color: "$token:colors.textSecondary", letterSpacing: "0.05em", textTransform: "uppercase" }
TabBtn.active:  { color: "$token:colors.textPrimary", fontWeight: "500" }
TabIndicator:   { height: "1px", bg: "$token:colors.primary", borderRadius: "0" }  // 1px 直线
```

### 2.6 字号节奏

```
display 36-48 → h2 24-30 → body-lg 16 → body 14 → caption 12
字体可用 Serif 系列（如有）：标题 Serif，正文 Sans
字重：300 / 400 / 500（克制，不用 600+）
letterSpacing：标题 0.05em / 按钮 0.05em / 大写
```

### 2.7 装饰

```
装饰系统：texture（极弱 noise）/ geometric-line（金色细线）
密度：极少（0-1 处）
色彩：单色金 / 主色细线
```

### 2.8 间距策略

```
大留白：
  field 间 24
  区块间 48-64
  card padding 32
  screen padding 32+
```

---

## 3. 不要做的事（premium anti-pattern）

- ❌ 大圆角（≥ 12，会显得"温暖"不"高端"）
- ❌ 强阴影（high-end 不要 box-shadow lg+）
- ❌ 多色装饰（高端单色或双色）
- ❌ 字重 700（粗字重显廉价）
- ❌ 渐变填充（暗示营销）
- ❌ spring 动效（不庄重）
- ❌ 装饰丰富（高端贵在克制）

---

## 4. 自检

- [ ] 圆角梯度小（卡 8 / 按钮 4 / input 4）
- [ ] 字重 ≤ 500
- [ ] letterSpacing ≥ 0.02em（呼吸感）
- [ ] 大留白（spacing 用 lg / xl / 2xl）
- [ ] 装饰极少或无
- [ ] 无 spring 动效
