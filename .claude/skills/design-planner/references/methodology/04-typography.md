# 方法论 4：字号节奏 (Typography Strategy)（v3 新增）

> 适用任务：`D-X-strategy`、`D-X-craft-*`（涉及文字节点时）
>
> **核心**：字号梯度 + 字重对比 + 行高字距 三件套统一全屏，避免"杂乱字"。

---

## 1. 字号梯度（来自 theme.tokens.typography）

标准 7 级梯度：

| token | px | 用途 |
|---|---|---|
| `display.fontSize` | 28-36 | Hero 大标题、引导页主标 |
| `h1.fontSize` | 24-28 | 屏内最大标题 |
| `h2.fontSize` | 20-24 | 区块标题 |
| `h3.fontSize` | 18-20 | 卡片标题 |
| `h4.fontSize` | 16-18 | 字段 label / 列表项标题 |
| `body-lg.fontSize` | 16 | input fontSize（避免 iOS 自动放大）|
| `body.fontSize` | 14 | 正文 / 多数文字 |
| `caption.fontSize` | 12 | 辅助 / error 提示 / footer |

**比例约束**：相邻级 1.2x ~ 1.5x（黄金比例附近）；跨级 ≥ 1.5x。

---

## 2. 字号策略与 visualConcept 联动

| visualConcept 风格 | 字号梯度策略 |
|---|---|
| 极简 | 收紧（28→22→14→12，3 级）|
| 活泼 | 张大（36→24→14→12，4 级，对比强）|
| 专业 | 中等（24→20→16→14→12，5 级，等宽数字）|
| 高端 | 大对比（48→24→14→12）|

---

## 3. 字重梯度

```
轻：300-400  → 大段正文（body 默认 400）
中：500     → label / Tab inactive / 列表标题
半粗：600   → 主 CTA / Tab active / h2 标题
粗：700+    → 极简风的 active / 强调
```

**约束**：
- 全屏字重 ≤ 4 级（如 400 / 500 / 600 / 700）
- 不要混 ≥ 5 级字重（视觉疲劳）

---

## 4. 行高（lineHeight）

| 用途 | lineHeight |
|---|---|
| body 正文 | 1.5（呼吸）|
| 标题 | 1.2-1.3（紧凑）|
| 按钮文字 | 1.2 |
| 多行文本（FAQ 答案）| 1.6 |
| 数字（价格 / 倒计时）| 1.0 |

不要直接写 px lineHeight（除非 typography token 指定）；用倍率值。

---

## 5. 字距 (letterSpacing)

```
正文：默认 0 或 0.01em（轻微紧凑）
按钮：0.02em（CTA 文字呼吸）
标题：-0.01em ~ 0.02em（按主题）
英文 / 数字：根据视觉权重微调
```

**禁止**：≥ 0.1em 的"广告字距"——除非 visualConcept 明确指定。

---

## 6. 字体族（fontFamily）

```
zh-CN 默认：
  -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB",
  "Microsoft YaHei", sans-serif

数字（特殊节点如倒计时 / 价格）：
  "SF Mono", "Menlo", "Monaco", monospace（等宽）

英文标题（如有）：
  Inter / system-ui
```

---

## 7. 自检（D-X-strategy 用）

- [ ] 字号梯度 ≥ 3 级 ≤ 7 级
- [ ] 字重梯度 ≤ 4 级
- [ ] 全部用 `$token:typography.X.{fontSize, fontWeight, lineHeight, fontFamily}` 引用
- [ ] iOS 输入字段 fontSize ≥ 16px（防自动放大）
- [ ] 与 visualConcept 风格契合（极简收紧 / 活泼张大 / 专业等宽 / 高端大对比）

---

## 8. 红线

- ❌ 字号硬编码（如 `fontSize: '14px'`）→ 必须 token 引用
- ❌ 全屏字号梯度 < 3 级 → 信息层级不清
- ❌ 全屏字重梯度 ≥ 5 级 → 视觉疲劳
- ❌ input 字段 fontSize < 16 → iOS 自动放大破坏布局
- ❌ 字重 700 用在 body 正文 → 阅读疲劳
- ❌ letterSpacing 写 px 不写 em → 不响应字号变化
