# PreviewCard — 组件结构+交互

> 消费: preview-card.visual.md 的样式规格

---

## 1. 定位

**职责**: 点击气泡后从底部弹出的简要预览面板，让用户快速获取动态概要并决定是否深入查看。

**为什么不抽为通用组件**: 仅在地图页底部弹出使用，与气泡选中状态深度耦合，展示内容(动态快照)特殊于本页面。

---

## 2. 结构设计

```
[card-root] (position:fixed, bottom:0, width:100%)
├── [drag-bar] (居中短横条,暗示可拖拽)
├── [header] (flex-row, align:center)
│   ├── [avatar] (36px圆形)
│   ├── [user-info] (flex-col)
│   │   ├── [nickname] (body-md, text-primary)
│   │   └── [time-ago] (caption, text-tertiary)
│   └── [distance-badge] (caption, 胶囊标签)
├── [body] (flex-col)
│   ├── [text-content] (body-lg, text-primary, max-3行)
│   └── [image-row] (flex-row, gap:8px, 条件:有图片)
│       ├── [thumb-1] (64×64, radius-sm)
│       └── [thumb-2] (64×64, radius-sm)
└── [footer] (flex-row, justify:space-between)
    ├── [interactions] (flex-row, gap:16px)
    │   ├── [like-btn] (❤️ + count)
    │   └── [comment-btn] (💬 + count)
    └── [detail-btn] (flex-row, primary色)
        ├── [label] "查看详情"
        └── [arrow-icon] (I-04, 16×16)
```

---

## 3. 视觉变体 × 状态矩阵

### 卡片整体

| 状态 | background | backdrop-filter | border-radius | box-shadow | transform |
|------|-----------|----------------|---------------|-----------|-----------|
| hidden | rgba(20,20,32,0.85) | blur(20px) saturate(1.2) | 24px 24px 0 0 | 0 -8px 32px rgba(0,0,0,0.5) | translateY(100%) |
| visible | 同上 | 同上 | 同上 | 同上 | translateY(0) |
| expanded | 同上 | 同上 | 同上 | 同上 | translateY(0) |

### 查看详情按钮

| 状态 | color | transform |
|------|-------|-----------|
| default | #4F8CFF | none |
| pressed | #7C5CFC | scale(0.96) |

### 点赞按钮

| 状态 | color | transform |
|------|-------|-----------|
| not-liked | text-tertiary | none |
| liked | #FF6B6B | scale(1.2→1) 心跳 |
| pressing | — | scale(0.9) |

---

## 4. 状态转换动效

| 从 → 到 | 动画属性 | 时长 | 缓动 | 说明 |
|---------|---------|------|------|------|
| hidden → visible | transform(translateY) | 300ms | ease-out | 底部弹出 |
| visible → hidden | transform(translateY) | 250ms | ease-in | 滑出消失 |
| visible → expanded | height(30vh→60vh) | 300ms | ease-out | 上滑展开 |
| expanded → visible | height(60vh→30vh) | 250ms | ease-in | 下滑收回 |
| not-liked → liked | color+transform(心跳弹跳) | 300ms | spring | 点赞反馈 |

---

## 5. 交互行为

| 交互 | trigger | condition | actions | 说明 |
|------|---------|-----------|---------|------|
| 点击查看详情 | click(detail-btn) | — | [nav.go('moment-detail', {id: state.view.selectedBubbleId})] | 跳转详情页 |
| 点赞 | click(like-btn) | — | [effect.fetch('DS-like',{momentId:item.id}), state.set({isLiked:true})] | 乐观更新 |
| 下滑关闭 | swipe-down | velocity > threshold | [state.set({previewVisible:false})] | 手势关闭 |
| 上滑展开 | swipe-up | !expanded | [state.set({previewExpanded:true})] | 展开更多 |
| 左右滑切换 | swipe-left/right | 聚合气泡多条 | [state.set({previewIndex: ±1})] | 切换不同动态 |
| 点击空白关闭 | click(地图区域) | previewVisible | [state.set({previewVisible:false})] | 取消预览 |
