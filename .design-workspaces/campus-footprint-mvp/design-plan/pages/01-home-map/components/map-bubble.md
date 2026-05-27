# MapBubble — 组件结构+交互

> 消费: map-bubble.visual.md 的样式规格

---

## 1. 定位

**职责**: 在地图上标识某个位置的动态内容入口，是用户发现内容的第一触点。

**为什么不抽为通用组件**: 仅在足迹地图页面使用，与地图坐标系统深度耦合（position由地图SDK控制），其他页面无此需求。

---

## 2. 结构设计

```
[bubble-root] (position:absolute, 由地图SDK定位)
├── [glow-ring] (position:absolute, inset:-4px, 仅定向态)
└── [bubble-body] (圆形容器)
    └── [content] (数字/头像缩略图/图标)
```

### 子元素职责

| 子元素 | 存在条件 | 职责 | 布局 |
|--------|---------|------|------|
| glow-ring | type=targeted | 额外glow装饰层 | absolute扩展+动画 |
| bubble-body | 始终 | 主体圆形 | flex居中 |
| content | 始终 | 展示内容(数字/图标) | 居中 |

---

## 3. 视觉变体 × 状态矩阵

### public (公开动态)

| 状态 | background | box-shadow | transform | opacity | animation | cursor |
|------|-----------|-----------|-----------|---------|-----------|--------|
| default(未读) | #4F8CFF | 0 0 8px rgba(79,140,255,0.3) | none | 1 | float 2.5s ease-in-out infinite | pointer |
| read(已读) | rgba(107,107,123,0.4) | none | none | 0.6 | none | pointer |
| pressed | #4F8CFF | 0 0 12px rgba(79,140,255,0.5) | scale(1.2) | 1 | paused | pointer |

### targeted (定向动态)

| 状态 | background | box-shadow | transform | opacity | animation | cursor |
|------|-----------|-----------|-----------|---------|-----------|--------|
| default(未读) | #FFB830 | 0 0 12px rgba(255,184,48,0.4) | none | 1 | pulse 2s ease-in-out infinite | pointer |
| read(已读) | rgba(255,184,48,0.4) | none | none | 0.6 | none | pointer |
| pressed | #FFB830 | 0 0 16px rgba(255,184,48,0.6) | scale(1.2) | 1 | paused | pointer |

### aggregated (聚合多条)

| 状态 | background | box-shadow | 内容 | 尺寸 |
|------|-----------|-----------|------|------|
| default | #4F8CFF | 0 0 8px rgba(79,140,255,0.3) | 白色数字(caption字号) | 44px(比标准大) |

---

## 4. 状态转换动效

| 从 → 到 | 动画属性 | 时长 | 缓动 | 说明 |
|---------|---------|------|------|------|
| 不存在 → default | transform(scale 0→1.05→1), opacity(0→1) | 400ms | spring | 入场弹跳 |
| default → pressed | transform(scale→1.2), box-shadow(增强) | 200ms | ease-out | 点击反馈 |
| pressed → default | transform(scale→1), box-shadow(恢复) | 150ms | ease-default | 释放 |
| default → read | opacity(1→0.6), background(→灰), animation(→none) | 300ms | ease-default | 已读弱化 |

---

## 5. 交互行为

| 交互 | trigger | actions | 说明 |
|------|---------|---------|------|
| 点击气泡 | click | [state.set({selectedBubbleId: item.id}), node.setVisualState('pressed'→恢复'default')] | 选中气泡+弹出预览卡 |
| 气泡入场 | screenEnter+数据到达 | [依次渐入,stagger:50ms] | 由近到远入场 |
