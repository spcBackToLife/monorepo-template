# GreetingSheet — 组件结构+交互

---

## 1. 定位

### 核心职责

底部弹出面板,提供"打招呼"操作入口: 快捷模板选择 + 自定义消息输入 + 发送。

### 为什么不抽为通用

- 仅在捞人流程中使用
- 模板文案深度耦合校园社交场景
- 与FishingCard的结果状态直接关联
- 发送后的信封飞出动效是捞人品牌化体验

---

## 2. 结构设计

### 内部层次

```
[greeting-sheet-root] (Sheet容器, radius-xl top, 毛玻璃)
├── [drag-handle] (36×4, 居中, bg:rgba(255,255,255,0.2), radius-full)
├── [title-section] (mt:16)
│   └── [title] (heading-md, text-primary) "向 {{target.nickname}} 打招呼"
├── [template-section] (mt:20)
│   ├── [section-label] (body-sm, text-tertiary) "快捷模板："
│   └── [template-list] (flex-col, gap:8, mt:8)
│       ├── [template-item] × 4 (可选中)
│       │   └── [template-text] (body-md, text-primary) "Hi~ 很高兴认识你"
│       └── ...
├── [custom-section] (mt:20)
│   ├── [section-label] (body-sm, text-tertiary) "或自定义："
│   └── [custom-input] (textarea, mt:8, min-h:80px)
└── [send-section] (mt:24)
    └── [send-btn] (GlowButton, primary, lg, fullWidth) "发送打招呼"
```

---

## 3. 视觉变体 × 状态矩阵

| 状态 | Sheet位置 | 发送按钮 | 模板区 | 说明 |
|------|---------|---------|--------|------|
| hidden | translateY(100%) | — | — | 不可见 |
| visible-empty | translateY(0) | disabled(opacity:0.5) | 无选中 | 刚打开 |
| visible-selected | translateY(0) | active(full opacity+glow) | 一项高亮 | 选了模板 |
| visible-custom | translateY(0) | active | 无选中,输入框有内容 | 自定义 |
| sending | translateY(0) | loading(spinner) | 禁用交互 | 发送中 |

---

## 4. 状态转换动效

| 从 → 到 | 动画属性 | 时长 | 缓动 |
|---------|---------|------|------|
| hidden → visible | translateY(100%→0) | 300ms | spring |
| visible → hidden | translateY(0→100%) | 200ms | ease-in |
| unselected → selected | template-item.background | 150ms | ease-default |
| visible → sending | btn内容crossfade(text→spinner) | 200ms | ease-default |
| sending → hidden(成功) | translateY + 信封飞出 | 400ms | ease-in |

---

## 5. 交互行为设计

| 交互 | trigger | condition | actions | 说明 |
|------|---------|-----------|---------|------|
| 点击模板 | click(template-item) | — | [state.set({selectedTemplate:text, customText:''})] | 选中模板,清空自定义 |
| 输入自定义 | change(custom-input) | — | [state.set({customText:value, selectedTemplate:null})] | 输入自定义,取消模板选中 |
| 点击发送 | click(send-btn) | content非空 | [effect.fetch('DS-fishing-greet',{content,type}), state.set({isSending:true})] | 发送打招呼 |
| 发送成功 | fetch.success | — | [state.set({isGreetingOpen:false}), ui.showToast('打招呼已发送')] | 关闭Sheet+Toast |
| 发送失败 | fetch.error | — | [state.set({isSending:false}), ui.showToast('发送失败，请重试')] | Sheet保持,可重试 |
| 下拉关闭 | dragDown | 下拉距离>阈值 | [state.set({isGreetingOpen:false})] | 手势关闭 |

---

## 6. 模板数据

```typescript
const greetingTemplates = [
  { id: 1, text: "Hi~ 很高兴认识你" },
  { id: 2, text: "同校的缘分~" },
  { id: 3, text: "约一局游戏？🎮" },
  { id: 4, text: "一起去食堂吗？🍜" }
]
```

---

## 7. 数据绑定

| 子元素 | 绑定 | 表达式 |
|--------|------|--------|
| title | textContent | `"向 {{state.view.greetTarget.nickname}} 打招呼"` |
| template-list | repeat | `{{greetingTemplates}}` (static数据源) |
| template-item | class:selected | `{{state.view.selectedTemplate === item.text}}` |
| custom-input | bind | `state.view.customText` |
| send-btn | disabled | `{{!state.view.selectedTemplate && !state.view.customText}}` |
| send-btn | loading | `{{state.view.isSending}}` |
