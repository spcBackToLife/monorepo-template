# 主题→元素词典：bold（强烈主题）

> 适用 theme.intent：bold / impactful / sport / energetic
>
> **核心**：高饱和 + 强对比 + 大字号 + 锐利形状 + 动感视觉。常用于运动 / 营销 / 潮流。

---

## 1. 主题灵魂

- 色板：高饱和原色对比（红黑 / 蓝橙 / 黑黄）
- 形状：直角 / 切角 / 几何切割
- 字号张大、字重重（700-900）
- 装饰：geometric-line 锐利 / illustration 多色
- 强对比阴影 / 强动效

---

## 2. 元素表达词典

### 2.1 button (主 CTA)

```jsonc
{
  backgroundColor: "$token:colors.primary",          // 高饱和
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.sm",                  // 2-4（锐利）
  height: "52px",
  fontSize: "$token:typography.body-lg.fontSize",
  fontWeight: "700",                                 // 重字重
  letterSpacing: "0.05em",
  textTransform: "uppercase",                         // 大写（如英文）
  border: "none",
  boxShadow: "$token:shadows.md",
  transition: "$token:transitions.fast.value"
}
// hover: transform translateY(-2px) + boxShadow lg（强浮起）
// pressed: transform translateY(0) + boxShadow sm
// focus: 4px solid primaryLight outline
```

### 2.2 input

```jsonc
{
  border: "2px solid $token:colors.border",          // 2px 粗边
  borderRadius: "$token:radius.sm",                  // 2-4
  height: "52px",
  fontSize: "$token:typography.body-lg.fontSize",
  fontWeight: "500",
  backgroundColor: "$token:colors.surfaceElevated"
  // focus: borderColor primary + boxShadow "0 0 0 4px primaryLight"
  // error: borderColor error（强红 #DC2626）+ 抖动微动效
}
```

### 2.3 card

```jsonc
{
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.sm",                  // 2-4
  padding: "$token:spacing.lg",
  border: "2px solid $token:colors.border",          // 2px 粗边（强烈）
  boxShadow: "$token:shadows.md"
}
```

### 2.4 字号节奏

```
display 48-64 → h1 36-40 → h2 28-32 → body-lg 18 → body 16 → caption 14
字重：500 / 700 / 900（强对比）
letterSpacing：标题 0.05em / 按钮 0.08em / uppercase
```

### 2.5 装饰

```
装饰系统：geometric-line 锐利几何 / illustration 多色拼贴
密度：丰富（3-5 处）
色彩：高饱和对比色
```

### 2.6 错误色 / 成功色

```
error → #DC2626 强红
success → #16A34A 强绿
warning → #F59E0B 强橙
```

---

## 3. 不要做的事（bold anti-pattern）

- ❌ 大圆角（≥ 12，温暖与 bold 冲突）
- ❌ 极简装饰 0 处（bold 需要张力）
- ❌ 字重 < 500（缺力量感）
- ❌ 弱阴影 sm 或无（bold 需要重阴影）
- ❌ 中性灰强调色（高饱和才 bold）
- ❌ 字号小（display < 36）

---

## 4. 自检

- [ ] 高饱和强对比色板
- [ ] 圆角小（卡 / 按钮 / input ≤ 4）
- [ ] 字重 ≥ 700（关键文字）
- [ ] 大字号（display ≥ 48）
- [ ] 装饰丰富（≥ 3 处）
