# 执行规则集（Execution Rules）

> 本文档由 design-executor 在 Phase 1 执行前按需加载。包含决策逻辑和参考表格。

---

## R1: 元素类型映射（从 interaction.trigger 推断 HTML 类型）

| interaction.trigger | 正确的 type | 为什么 | 附加要求 |
|--------------------|----|---------|---------|
| `input` / `change` | `input` 或 `textarea` | div 不可输入 | 必须设 `backgroundColor: "#FFFFFF"` |
| `click`（操作类，如"登录/提交"） | `button` | 语义正确 | — |
| `click`（导航/切换类） | `div` 或 `button` | 均可 | — |
| `submit` | `button` type="submit" | form 语义 | — |
| `hover` / `focus` / `blur` | 保持已有类型 | 辅助事件 | — |
| 无 trigger | `div` | 纯展示 | — |

**判断优先级**: 交互行为 > 视觉外观。即使视觉上看起来像"6个格子"（div），只要 trigger=input，就必须用 input。

---

## R2: 素材应用决策树

```
node.materials[] 存在？
├── 否 → 无素材任务
└── 是 → 逐个检查 materials[i]:
      │
      ├── materials[i].condition 存在？
      │   ├── 是（有条件）→ ⚠️ 不可 apply 到默认态！
      │   │   执行步骤:
      │   │     1. 委托 material-painter 绘制（设 transparent 背景）
      │   │     2. 只 export，不 apply → 获得素材 URL
      │   │     3. 解析 condition 确定对应的 visualState 名称
      │   │        例: "submitState==='success'" → visualState: "success"
      │   │     4. 将 URL 写入该 visualState 的 styleOverrides:
      │   │        visual_state/update → stateName:"success",
      │   │          styleOverrides:{ backgroundImage: "url(...)", backgroundSize: "contain", ... }
      │   │
      │   └── 否（无条件）→ 正常应用
      │       执行步骤:
      │         1. 委托 material-painter 绘制 + export_and_apply
      │         2. material-painter 内部会处理透明背景和 Step 7 清理
      │
      └── 素材类型判断:
            ├── type=Decoration 且形状简单（纯色圆/矩形+opacity）
            │   → 考虑用 CSS 实现（backgroundColor + borderRadius + opacity）
            │   → 优点: 省一个素材工程，渲染更快
            │   → 缺点: 无法表达复杂渐变/路径
            │
            └── 其他 → 走 material-painter 素材工程
```

**关键教训**: 上次测试中 I-04 checkmark 的 condition 是 `"{{state.view.submitState === 'success'}}"`，但 executor 直接 export_and_apply 到按钮默认态，覆盖了按钮的背景色和文字，导致登录按钮完全消失。

---

## R3: 防御性样式规则

### 必须显式设置 backgroundColor 的元素

| 元素类型 | 必须设置的值 | 原因 |
|---------|------------|------|
| `input` | `backgroundColor: "#FFFFFF"` | 平台默认可能是深色 |
| `textarea` | `backgroundColor: "#FFFFFF"` | 同上 |
| `select` | `backgroundColor: "#FFFFFF"` | 同上 |
| `button`（有背景色设计时） | 设计稿指定的色值 | 确保按钮可见 |

### 禁止依赖默认值的属性

- `backgroundColor` — 平台 UA 默认值与浏览器不同
- `color` — 同上，需显式设置
- `display` — visibleWhen 管理显隐时，不要额外设 `display:none`

---

## R4: CSS 层叠上下文陷阱清单

### 何时 z-index:-1 会导致不可见？

当父元素**创建了新的层叠上下文**时，z-index:-1 的子元素会渲染在父元素背景之后。

**以下父级属性会创建新上下文**：
- `position: relative/absolute/fixed` + `z-index` 非 auto
- `overflow: hidden/auto/scroll`（某些渲染器）
- `opacity < 1`
- `transform` / `filter` / `backdrop-filter`
- `isolation: isolate`

### 装饰层的正确实现方式

```
❌ 错误（上次测试的做法）:
Root (position:relative, overflow:hidden, background:gradient)
└── decoration-layer (position:absolute, z-index:-1)  ← 在 gradient 背后，不可见！

✅ 正确方案 A（推荐）:
Root (position:relative, overflow:hidden, background:gradient)
├── decoration-layer (position:absolute, z-index:0, pointer-events:none)
├── content-layer (position:relative, z-index:1)
└── ...

✅ 正确方案 B:
Root (position:relative, overflow:visible(!), background:gradient)  ← 不 hidden
└── decoration-layer (position:absolute, z-index:-1)  ← 可见，因为不在新上下文中

✅ 正确方案 C（最简单）:
Root
├── decoration-layer (pointer-events:none, opacity:0.15)  ← 靠 DOM 顺序在底
├── top-area
├── form-card
└── ...
```

### overflow:hidden 对绝对定位子元素的影响

如果父级有 `overflow:hidden`，绝对定位子元素超出父级边界的部分会被裁切。

**上次测试的 pink-circle 设了 `top:-20px, right:-20px`（溢出 20px），被 overflow:hidden 裁切后完全不可见。**

修复: 装饰元素不应溢出 overflow:hidden 容器，或容器不设 overflow:hidden。

---

## R5: state.set 必须伴随视觉联动

### 规则

每次写 `state.set` action 时，必须回答：**"哪些节点的视觉会因此 state 变化而改变？"**

对每个受影响节点，在同一 event.actions 中追加 `node.setVisualState`。

### 示例: mode-toggle 切换

```json
// code-tab 的 click 事件:
{
  "trigger": "click",
  "actions": [
    {"type": "state.set", "path": "view.loginMode", "value": "code"},
    // ↓ 视觉联动: code-tab 变 active，password-tab 变 default
    {"type": "node.setVisualState", "nodeId": "<code-tab-id>", "stateName": "active"},
    {"type": "node.setVisualState", "nodeId": "<password-tab-id>", "stateName": "default"}
  ]
}

// password-tab 的 click 事件:
{
  "trigger": "click",
  "actions": [
    {"type": "state.set", "path": "view.loginMode", "value": "password"},
    {"type": "node.setVisualState", "nodeId": "<password-tab-id>", "stateName": "active"},
    {"type": "node.setVisualState", "nodeId": "<code-tab-id>", "stateName": "default"}
  ]
}
```

**前提**: 两个 tab 都需要先通过 `visual_state/add` 创建 "active" 状态。

### 示例: 获取验证码按钮

```json
// send-code-btn 的 click 事件:
{
  "trigger": "click",
  "actions": [
    {"type": "state.set", "path": "view.codeSending", "value": true},
    // ↓ 视觉联动: 按钮变为 disabled 态（文案变化需平台支持条件文案）
    {"type": "node.setVisualState", "stateName": "disabled"}
  ]
}
```

---

## R6: visibleWhen 与 display 样式的关系

### 规则

当节点设置了 `visibleWhen` 条件表达式后，**不要**在 styles 中额外设置 `display: none`。

`visibleWhen` 完全接管节点的显隐逻辑。如果同时设了 `display:none`，可能导致：
- 即使 visibleWhen 为 true，节点仍因 display:none 而不可见
- 或者需要 visibleWhen 同时管理 display 值，逻辑混乱

### 正确做法

```json
// ✅ 正确: visibleWhen 管理显隐，styles 中不设 display
{
  "visibleWhen": "{{ state.view.loginMode === 'password' }}",
  "styles": {
    "display": "flex",       // 当可见时的布局方式
    "flexDirection": "column",
    "marginTop": "12px"
  }
}

// ❌ 错误: display:none 会与 visibleWhen 冲突
{
  "visibleWhen": "{{ state.view.loginMode === 'password' }}",
  "styles": {
    "display": "none"        // ← 冲突！
  }
}
```

---

## 平台能力清单（经源码验证 + 本次实现，2026-05-29）

**全部 ✅ — 平台现已具备完整的交互原型能力，无结构性缺口。**

| 能力 | 用法 | 源码位置 |
|------|------|---------|
| **条件样式** | 样式值写 `{{ }}` 表达式即可响应式更新 | resolveStyles.ts |
| **条件文案** | `textContent: "{{ state.view.countdown }}s"` | resolveProps.ts |
| **autoVisualState** | visualState 加 `activeWhen: "{{ expr }}"` 自动激活 | resolveStyles.ts |
| **素材应用到 visualState** | `export_and_apply` 传 `targetState: "success"` | canvas.ts + material.ts |
| **input 默认白背景** | 自动注入，无需显式设置 | resolveStyles.ts |
| **定时器** | `ui.startTimer` / `ui.stopTimer` / `ui.resetTimer` | Dispatcher TimerManager |
| **条件逻辑** | `logic.if` (when/then/else) + `logic.switch` (cases/default) | Dispatcher |
| **CSS 动画** | visualState `animation: {name:'shake'}` 或 action `ui.animate` | presetAnimations.ts |
| **SVG 内联** | 元素 `type:"svg"` + `props.svgContent` | PrimitiveRenderer |
| **全局覆盖层** | `Screen.overlays[]` + `ui.showOverlay` / `ui.hideOverlay` | screen.ts + Dispatcher |
| **OTP 表单** | input `maxLength:1` + `autoFocusNext:"nextNodeId"` + `inputMode:"numeric"` | PrimitiveRenderer |
| **延迟执行** | `ui.delay: { duration: 500 }` | Dispatcher |
| **事件条件** | `event.condition: { when: "{{ expr }}" }` | PreviewRenderer |
| **跨节点视觉切换** | `node.setVisualState` + `nodeId` + `autoRevertMs` | Dispatcher |
| **visibleWhen** | `node.visibleWhen: "{{ expr }}"` | resolveProps |
| **双向绑定** | `set_bind` | PreviewRenderer |
| **API 调用** | `effect.fetch` + mock scenarios | EffectExecutor |

### 预置动画 (10 个)

`shake` · `fadeIn` · `fadeOut` · `scaleIn` · `scaleOut` · `slideUp` · `slideDown` · `bounce` · `pulse` · `spin`

### ⚠️ 关键发现：「条件样式」一直存在但未被使用

Executor 上次测试中以为平台不支持"tab 切换高亮"，实际上完全可以：

```json
// code-tab 的 styles 中直接写条件表达式：
{
  "backgroundColor": "{{ state.view.loginMode === 'code' ? '#FF6F91' : 'transparent' }}",
  "color": "{{ state.view.loginMode === 'code' ? '#FFFFFF' : 'rgba(45,36,56,0.65)' }}"
}
```

这比 `node.setVisualState` workaround 更优雅，且支持初始化时根据默认值自动应用正确样式。

### 实现策略选择指南

| 场景 | 推荐方案 | 为什么 |
|------|---------|--------|
| Tab 切换高亮 | 样式表达式 `{{ }}` | 自动响应 state 变化，无需手动 setVisualState |
| 按钮 hover/pressed | visualState + event 联动 | CSS 交互态，与 state 无关 |
| 条件素材（success 态 icon） | `export_and_apply` + `targetState` | 新能力，一步到位 |
| 动态倒计时文案 | `textContent: "{{ state.view.countdown }}s"` | 已支持！只是递减逻辑需外部触发 |
| 表单校验红字显隐 | `visibleWhen: "{{ state.view.errorMsg !== '' }}"` | 已支持 |
| 校验红字内容 | `textContent: "{{ state.view.errorMsg }}"` | 已支持！ |
