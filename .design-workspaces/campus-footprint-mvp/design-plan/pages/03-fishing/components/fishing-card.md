# FishingCard — 组件结构+交互

---

## 1. 定位

### 核心职责

展示捞到的用户卡片，承载用户信息展示+操作决策(打招呼/感兴趣/跳过)。

### 为什么不抽为通用

- 仅在捞人页result态使用
- 含独特的"从水面浮出"入场动效
- 滑动操作(左跳/右喜)深度耦合捞人流程
- 与GreetingSheet有直接交互链路

---

## 2. 结构设计

### 内部层次

```
[fishing-card-root] (320px, radius-lg, 毛玻璃)
├── [header-row] (flex, gap:12, align:center)
│   ├── [avatar] (48×48, radius-full, object-fit:cover)
│   └── [info-col] (flex-col, gap:2)
│       ├── [nickname] (body-lg, 600, text-primary)
│       └── [signature] (body-sm, text-secondary, 单行ellipsis)
├── [details-section] (flex-col, gap:8, mt:16)
│   ├── [dept-row] (flex, gap:6, align:center)
│   │   ├── [dept-emoji] 🎓
│   │   └── [dept-text] (body-sm, text-secondary) "计算机 · 大三"
│   ├── [tags-row] (flex, gap:6, flex-wrap)
│   │   └── [tag] × N (body-sm, padding:4px 8px, radius-xs, bg:primary at 10%)
│   └── [distance-row] (flex, gap:6, align:center)
│       ├── [dist-emoji] 📍
│       └── [dist-text] (caption, text-tertiary) "约120米"
└── [actions-row] (flex, gap:12, justify:space-between, mt:20)
    ├── [greet-btn] (GlowButton, primary, sm) "👋 打招呼"
    ├── [interest-btn] (GlowButton, ghost, sm) "→ 感兴趣"
    └── [skip-hint] (caption, text-tertiary, align:center) "跳过 ↓"
```

---

## 3. 视觉变体 × 状态矩阵

### 单卡片状态

| 状态 | 背景 | 阴影 | transform | opacity | 说明 |
|------|------|------|-----------|---------|------|
| entering | 同default | shadow-lg | translateY(80)+scale(0.9) | 0 | 浮入中(动画起始) |
| default | Layer1 at 85% 毛玻璃 | shadow-lg | none | 1 | 正常展示 |
| swiping-left | 同上 | 减弱 | translateX(-N)+rotate(-5deg) | 1→0 | 左滑进行中 |
| swiping-right | 同上 | 减弱 | translateX(+N)+rotate(5deg) | 1→0 | 右滑进行中 |
| exiting-left | — | — | translateX(-120%)+rotate(-5deg) | 0 | 已滑出(跳过) |
| exiting-right | — | — | translateX(120%)+rotate(5deg) | 0 | 已滑出(喜欢) |

---

## 4. 状态转换动效

| 从 → 到 | 动画属性 | 时长 | 缓动 |
|---------|---------|------|------|
| entering → default | translateY, scale, opacity | 400ms | spring |
| default → exiting-left | translateX, rotate, opacity | 200ms | ease-in |
| default → exiting-right | translateX, rotate, opacity | 200ms | ease-in |
| (下一张)entering → default | translateY(40→0), opacity(0→1) | 300ms | ease-out, delay:100ms |

---

## 5. 交互行为设计

| 交互 | trigger | condition | actions | 说明 |
|------|---------|-----------|---------|------|
| 左滑 | swipeLeft | — | [state.set({currentCardIndex:+1})] | 跳过当前用户 |
| 右滑 | swipeRight | — | [state.set({currentCardIndex:+1}), effect.fetch('DS-interest')] | 标记感兴趣 |
| 点击打招呼 | click(greet-btn) | — | [state.set({isGreetingOpen:true, greetTarget:user})] | 打开GreetingSheet |
| 点击感兴趣 | click(interest-btn) | — | 同右滑 | 备选操作方式 |

**组件自身管理的行为**:
- 滑动手势监听(拖动距离>阈值触发exiting)
- 拖动中: 实时跟随手指位置(translateX+rotate成正比)
- 松手: 超阈值→exiting动效, 未超→spring回弹到default

---

## 6. 数据绑定

| 子元素 | 绑定 | 表达式 |
|--------|------|--------|
| avatar | props.src | `{{item.avatar}}` |
| nickname | textContent | `{{item.nickname}}` |
| signature | textContent | `"「{{item.signature}}」"` |
| dept-text | textContent | `"{{item.department}} · {{item.grade}}"` |
| tags(repeat) | repeat | `{{item.tags}}` |
| tag | textContent | `{{tag}}` |
| dist-text | textContent | `"约{{item.distance}}米"` |
