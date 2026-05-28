# footer · 底部链接 · 视觉设计分析

> **层级**: L2 组件深钻
> **页面预算**: 角色=工具-导航 | 权重=3/10 | 允许手段=文字链接色 | 装饰上限=无

---

## 1. 情感与氛围目标

| 维度 | 回答 |
|------|------|
| 用户此刻心理 | 需要注册或忘记密码时才关注 |
| 目标感受 | **低调可见、不干扰** — 需要时能找到，不需要时不抢注意力 |
| 页面给的视觉预算 | 工具-导航，权重 3，仅文字链接色，无装饰 |

---

## 2. 视觉层级设计

| 元素 | 权重(1-10) | 手段 |
|------|:----------:|------|
| register-link | 3 | 主色文字 body 14px |
| forgot-link | 3 | 主色文字 body 14px |
| 分隔符 | 1 | textTertiary "|" |

---

## 3. 样式规格

| 元素 | CSS属性 | 值 | 为什么 |
|------|---------|------|--------|
| footer 容器 | display | flex, row, center, gap:16px | 水平居中排列 |
| footer 容器 | margin-top | 24px (lg) | 与按钮的间距 |
| links | color | #FF6F91 | primary 色表示可点击 |
| links | font-size | 14px | body 级 |
| links | font-weight | 400 | 不加粗，低调 |
| links :active | color | #FB406F | primaryActive 按下反馈 |
| links :active | transform | scale(0.98) | 微缩 |
| 分隔符 | color | textTertiary | 极低存在感 |
| 分隔符 | font-size | 14px | 与链接对齐 |

---

## 4. 与全局一致性

✅ 全部使用 Token 色值，无装饰，符合权重 3 预算。
