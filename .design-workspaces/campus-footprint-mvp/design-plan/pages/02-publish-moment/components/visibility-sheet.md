# VisibilitySheet — 组件结构+交互

> 消费: visibility-sheet.visual.md 的样式规格

---

## 1. 定位

**职责**: 让用户选择动态的可见性模式（公开/定向/定时），并根据选择展开子面板。

**为什么不抽为通用**: 三种可见性模式及其子流程(用户选择/时间设置)仅在发布页使用，逻辑深度耦合发布业务。

---

## 2. 结构设计

```
[sheet-root] (position:fixed, bottom:0, 毛玻璃)
├── [drag-bar] (居中4×36px短横条, radius-full)
├── [title] (heading-md) "选择谁能看到"
├── [options-list] (flex-col, gap:0)
│   ├── [option-public] (flex-row, h:64px, 可点击)
│   │   ├── [radio] (空心/实心圆 18px)
│   │   ├── [icon-div] (20×20) [素材:I-07]
│   │   └── [text-group] (flex-col)
│   │       ├── [label] (body-md) "公开"
│   │       └── [desc] (body-sm, text-tertiary) "任何人走到这里都能看到"
│   ├── [option-targeted] (同结构) [素材:I-08]
│   └── [option-timed] (同结构) [素材:I-09]
├── [sub-panel] (条件展开: 定向→用户搜索 / 定时→时间选择)
│   └── (内容根据选中模式动态切换)
└── [confirm-btn] [组件:GlowButton, props:{label:"确认",variant:"primary",fullWidth:true}]
```

---

## 3. 视觉变体 × 状态矩阵

### 选项项

| 状态 | background | radio | icon色 | 文字色 |
|------|-----------|-------|--------|--------|
| unselected | transparent | 空心(1.5px border text-tertiary) | text-tertiary | label:text-secondary, desc:text-tertiary |
| selected | rgba(79,140,255,0.1) | 实心填充primary | primary | label:text-primary, desc:text-secondary |
| pressed | rgba(79,140,255,0.05) | (同当前态) | (同当前态) | (同当前态) |

### Sheet整体

| 状态 | transform | opacity |
|------|-----------|---------|
| hidden | translateY(100%) | 0 |
| visible | translateY(0) | 1 |
| expanded | translateY(0), height增大 | 1 |

---

## 4. 状态转换动效

| 从 → 到 | 动画属性 | 时长 | 缓动 |
|---------|---------|------|------|
| hidden → visible | transform(translateY) | 300ms | spring |
| visible → hidden | transform(translateY) | 250ms | ease-in |
| option unselected → selected | background+color | 200ms | ease-default |
| visible → expanded | height(auto) | 300ms | ease-out |

---

## 5. 交互行为

| 交互 | trigger | actions | 说明 |
|------|---------|---------|------|
| 选择选项 | click(option) | [state.set({visibilityMode: value})] | 切换选中 |
| 选择定向 | click(option-targeted) | [state.set + 展开用户搜索子面板] | Sheet扩展 |
| 选择定时 | click(option-timed) | [state.set + 展开时间选择子面板] | Sheet扩展 |
| 确认 | click(confirm-btn) | [state.set({sheetVisible:false})] | 关闭Sheet |
| 下滑关闭 | swipe-down | [state.set({sheetVisible:false})] | 手势关闭 |
