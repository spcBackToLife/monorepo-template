# 视觉效果配方：高端感 (Premium)

> 适用：奢侈品 / 金融 / 高端服务 / VIP / Pro 订阅
>
> **核心**：克制 + 精致 + 大留白 + 细节考究。整屏视觉策略级配方，与 playful 互斥。

---

## 1. 视觉目标

让用户感受到"这不是普通产品"——通过克制和精致传达"贵气 / 专业 / 值得信赖"。

整屏视觉策略，与 `recipes/theme-element-dict/premium.md` 配套。

---

## 2. 视觉准则（5 条）

### 2.1 色板克制
- 米白 / 黑色 / 深蓝 / 金色（任 1-2 个）
- 60-30-10 严格遵守，accent 仅在 CTA / 关键标识出现
- 不用高饱和

### 2.2 形状直角微圆
- card / button ≤ radius.md（8）
- input ≤ radius.sm（4）
- 不要大圆角（≥ 12 显得"温暖"，破坏高端感）

### 2.3 字号大对比 + 字距张开
- display 36-48 / h2 24-30 / body 14-16
- 字重 300 / 400 / 500（克制，不用 600+）
- letterSpacing 标题 / 按钮 0.05em-0.1em（呼吸感 / 贵气）
- 英文大写（textTransform: uppercase）
- 可用 Serif 字体大标题

### 2.4 装饰极少
- 装饰系统：texture 极弱 noise / geometric-line 金色细线
- 密度：极少（0-1 处）
- 装饰色：单色金 / 深蓝细线
- 不要光斑 / 插画 / blob

### 2.5 微动效平稳
- hover：纯色变化（不要 transform）
- 不用 spring（不庄重）
- transition 250-350ms ease-out

---

## 3. 大留白策略

```
spacing 统一用大档位：
  field 间 ≥ 24
  区块间 ≥ 48-64
  card padding ≥ 32
  screen padding ≥ 32-48

行高松：
  body lineHeight 1.6+
  标题 lineHeight 1.2-1.3（紧）
```

---

## 4. CSS 配方示例

```jsonc
// CTA button（高端版）
{
  backgroundColor: "$token:colors.primary",            // 实色（无渐变）
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.sm",                    // 4 微圆
  height: "56px",                                      // 偏大显贵
  fontSize: "$token:typography.body.fontSize",
  fontWeight: "500",                                   // 不要 700
  letterSpacing: "0.08em",
  textTransform: "uppercase",                           // 英文大写
  boxShadow: "none",                                   // 不要阴影
  border: "none",
  transition: "background-color 250ms ease-out"
}
// hover: backgroundColor primaryHover（仅色变化，不动）
// focus: outline 1px primary + offset 4px（极克制）

// 装饰：金色细线
{
  borderTop: "1px solid #C9A961",                      // 金色（如 theme 提供）
  width: "60px",
  margin: "0 auto"
}
```

---

## 5. 与 playful 对比

| 维度 | playful | premium |
|---|---|---|
| 色 | 多色 | 单色 / 双色克制 |
| CTA 填充 | 可渐变 | 纯色 |
| 圆角 | 大（≥16）| 小（≤8）|
| 装饰 | 丰富 | 极少 / 无 |
| 动效 | spring 弹 | ease-out 平稳 |
| 字距 | 0.03em | 0.05-0.1em |
| 字重 | 700 | ≤ 500 |
| 留白 | 中等 | 大 |
| 字体 | Sans | Sans + Serif（大标题）|

---

## 6. 适用 / 不适用

| 场景 | 适用 |
|---|:---:|
| 奢侈品电商 | ✅ |
| 金融 / 投资 | ✅ |
| 私人银行 / VIP 会员 | ✅ |
| Pro 订阅 / 高端订阅 | ✅ |
| 教育 / 社交 / 娱乐 | ❌（应用 playful）|
| 数据工具 | ❌（应用 clean）|

---

## 7. 红线

- ❌ 大圆角（≥ 12）破坏高端感
- ❌ 装饰丰富（高端贵在克制）
- ❌ 多色（≥ 3 主色）
- ❌ 字重 700（粗显廉价）
- ❌ 渐变填充（暗示营销）
- ❌ spring 动效（不庄重）
- ❌ 紧凑间距（高端要呼吸）
- ❌ 强阴影（high-end 不要 shadow lg+）
