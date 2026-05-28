# top-area · 品牌头部 · 组件结构设计

> **视觉来源**: `top-area.visual.md`
> **Registry**: `pages/00-login/top-area/_component.json`

---

## 1. 组件定位

品牌头部区域，展示 Logo + Slogan。纯展示组件，无交互触发。仅在登录页使用（页面专属）。

---

## 2. 结构设计

```
[top-area] ─── flex column center
├── [logo] ─── img 64×64，src=B-01 brand-logo
└── [slogan] ─── text "遇见同校的你"，h3
```

### 子元素内部属性（固定值）

| 子元素 | HTML tag | 固定属性 | 说明 |
|--------|---------|---------|------|
| logo | div | 背景由素材 B-01 通过 export_and_apply 填充 | 无 img src，通过素材槽位机制渲染 |
| slogan | div | `textContent="遇见同校的你"` | 品牌 slogan 固定文案 |
| top-area (root) | div | — | 纯布局容器 |

---

## 3. 状态

仅 `idle` 一种状态，无状态切换。

---

## 4. 样式规格

| 元素 | 属性 | 值 | Token |
|------|------|------|-------|
| 容器 | display | flex | — |
| 容器 | flex-direction | column | — |
| 容器 | align-items | center | — |
| 容器 | padding-top | 80px | 59(safe)+21 |
| 容器 | padding-bottom | 32px | spacing-xl |
| logo | width | 64px | — |
| logo | height | 64px | — |
| logo | margin-bottom | 16px | spacing-md |
| slogan | font-size | 22px | h3 |
| slogan | font-weight | 600 | h3 |
| slogan | color | rgba(45,36,56,0.92) | textPrimary |
| slogan | text-align | center | — |
