# 主题→元素词典：natural（自然主题）

> 适用 theme.intent：natural / earthy / organic / eco
>
> **核心**：暖米黄 / 绿 / 棕 + 有机曲线 + 纹理 + 圆角柔和。常用于户外 / 食品 / 健康 / 环保。

---

## 1. 主题灵魂

- 色板：米白底 + 自然色（绿 / 棕 / 暖黄）
- 形状：圆角柔和 / 有机曲线 blob
- 装饰：texture 纸纹纹理 + organic-curve 自由 blob + 偶尔插画
- 字体：可用 Serif（手写感字体）大标题
- 微动效：自然柔和 ease-out

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",          // 自然绿（如 #4ADE80）或棕色
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.lg",                  // 12-16（柔和）
  height: "48px",
  fontSize: "$token:typography.body-lg.fontSize",
  fontWeight: "500",                                 // 不要 700（自然不强势）
  letterSpacing: "0.02em",
  boxShadow: "$token:shadows.sm",
  transition: "$token:transitions.normal.value"
}
// hover: backgroundColor primaryHover + transform translateY(-1px)（轻浮）
// focus: "0 0 0 3px primaryLight" 自然光晕
```

### 2.2 input

```jsonc
{
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.md",                  // 8-12
  height: "48px",
  fontSize: "$token:typography.body-lg.fontSize",
  backgroundColor: "$token:colors.surfaceElevated",
  // focus: borderColor primary + 极淡 primaryLight 背景填充
}
```

### 2.3 card

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.xl",                  // 16-20（自然圆润）
  padding: "$token:spacing.lg",
  boxShadow: "$token:shadows.sm",
  border: "none"
  // 可选：noiseOverlay 纸纹叠加
}
```

### 2.4 字号节奏

```
display 32-36 → h2 24 → body-lg 16 → body 14 → caption 12
字重：400 / 500 / 600
fontFamily（如有）：Serif 标题 + Sans 正文（自然手写感）
letterSpacing：自然不要张开（≤ 0.02em）
```

### 2.5 装饰

```
装饰系统：texture（纸纹 / 木纹）+ organic-curve（blob）
密度：节制到中等（2-3 处）
色彩：自然色（绿 / 棕 / 米黄）
```

### 2.6 错误 / 成功色

```
error → 暖红 #DC2626 但不要纯
success → 自然绿 #16A34A
warning → 暖橙 #F97316
```

---

## 3. 不要做的事（natural anti-pattern）

- ❌ 直角（borderRadius < 8，与"自然"冲突）
- ❌ 蓝紫强调色（不自然）
- ❌ 强阴影 / 锐利形状
- ❌ 高饱和荧光色
- ❌ 字距张开 > 0.05em（bold/premium 风格）
- ❌ 完全 0 装饰（自然需要纹理）

---

## 4. 自检

- [ ] 自然色板（绿 / 棕 / 暖黄）
- [ ] 圆角柔和（≥ 8）
- [ ] 装饰用 texture / organic-curve
- [ ] 字重克制（≤ 600）
- [ ] 自然色板的错误 / 成功用色
