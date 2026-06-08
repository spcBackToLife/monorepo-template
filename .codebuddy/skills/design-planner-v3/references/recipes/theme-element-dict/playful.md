# 主题→元素词典：playful（活泼主题）

> 适用 theme.intent：playful / friendly-bold / fun
>
> **核心**：多色 + 大圆角 + 装饰丰富 + spring 微动效。**活泼 ≠ 杂乱**——多色要有主导色 + 装饰要有节奏感。

---

## 1. 主题灵魂

- 多色对比：60-30-10 可放宽到 50-30-20（强调色更突出）
- 圆角全屏柔和（24+ 大圆角）
- 装饰：illustration 插画系 / soft-glow 多色光斑
- 字号张大、字重对比强（400 vs 700）
- spring 微动效（hover 弹动）
- 偶有粒子 / 纸屑等微小装饰元素

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",
  // 可选：linear-gradient（playful 允许 CTA 渐变）
  backgroundImage: "linear-gradient(135deg, $token:colors.primary 0%, $token:colors.secondary 100%)",
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.xl",                  // 16-20（大圆角）
  height: "52px",                                    // 偏大显得活泼
  fontSize: "$token:typography.body-lg.fontSize",
  fontWeight: "700",                                 // 粗字重
  letterSpacing: "0.03em",
  boxShadow: "$token:shadows.md",                    // 中等阴影（轻浮起感）
  transition: "$token:transitions.normal.value"
}
// hover: transform translateY(-2px) + scale(1.02) + boxShadow lg（spring 弹）
// pressed: transform translateY(0) scale(0.98) + boxShadow sm
// focus: 多重彩色光晕 "0 0 0 4px primaryLight"
```

### 2.2 input

```jsonc
{
  border: "2px solid $token:colors.border",          // 2px 粗边（活泼）
  borderRadius: "$token:radius.lg",                  // 12 大圆角
  height: "52px",                                    // 偏大
  fontSize: "$token:typography.body-lg.fontSize",
  backgroundColor: "$token:colors.surfaceElevated",
  caretColor: "$token:colors.primary"
  // focus: borderColor primary + boxShadow "0 0 0 4px primaryLight"（彩色 4px 光晕）
}
```

### 2.3 card

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.2xl",                 // 24 大圆角
  padding: "$token:spacing.lg",
  boxShadow: "$token:shadows.lg",                    // 强阴影（浮起感）
  border: "none"
}
// hover: transform translateY(-4px) + scale(1.02) + boxShadow xl
```

### 2.4 checkbox（wrapper-label）

```jsonc
PolicyCheckVisual: {
  width: "22px",                                     // 偏大
  height: "22px",
  border: "2px solid $token:colors.border",
  borderRadius: "$token:radius.md",                  // 8（圆润方）
  // checked: bg primary + 边色 primary + ::after 大勾（粗笔画 SVG）+ scale 微弹动
  // focus: "0 0 0 4px primaryLight" 4px 彩色光晕
}
```

### 2.5 tab / segment

```jsonc
TabBtn.default: { color: "$token:colors.textSecondary", fontWeight: "500" }
TabBtn.active:  {
  color: "$token:colors.primary",                    // 主色字（活泼直接换色）
  fontWeight: "700",
  transform: "scale(1.05)"                           // 微放大
}
TabIndicator:   {
  height: "3px",                                     // 粗 3px
  bg: "$token:colors.primary",
  borderRadius: "$token:radius.sm",
  transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)"  // spring easing
}
```

### 2.6 装饰

```
装饰系统：illustration（插画系）或 soft-glow 多色光斑
密度：中等到丰富（2-4 处）
色彩：多色（primary + secondary + accent）
位置：hero 区 / 卡片角落 / 装饰边角
```

### 2.7 字号节奏

```
display 32-40 → h2 24-28 → body-lg 16 → body 14 → caption 12
字重：400 / 500 / 600 / 700（4 级，对比强）
letterSpacing：标题 0.02em / 按钮 0.03em
```

### 2.8 动效 (playful 关键)

```
hover：transform translateY + scale + spring easing（cubic-bezier(0.34,1.56,0.64,1)）
spring 弹动 250-350ms
状态切换可加 scale(0.98 ↔ 1.05) 微脉冲
```

---

## 3. 不要做的事（playful anti-pattern）

- ❌ 单色调（与活泼矛盾）
- ❌ 直角（borderRadius < 8）
- ❌ 极简装饰 0 处（活泼不能空）
- ❌ 字重 400 主标题（缺张力）
- ❌ 用 ease-in-out 平淡动效（应用 spring）
- ❌ 错误用纯红 #FF0000（应用 #EF4444 类活泼红）

---

## 4. 自检

- [ ] 多色：≥ 3 个色（primary + secondary + accent）
- [ ] 圆角梯度大（卡 24 / 按钮 16+ / input 12+）
- [ ] 装饰系统选 illustration 或多色 soft-glow
- [ ] 字重梯度对比强（400 vs 700）
- [ ] 动效有 spring easing
