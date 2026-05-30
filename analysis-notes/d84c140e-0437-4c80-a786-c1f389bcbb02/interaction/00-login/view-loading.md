> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-view-loading
> 对应 schema 字段：rootNode 子树新增 SubmitSpinner / CodeSendSpinner 节点 + visibleWhen + meta.interaction

# Step I-view-loading: 00-login — 数据加载态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 1。
> 详细 schema 见 `schema-spec/derivative-views.md` §1。
> 上游依赖：loading.md（5 场景全部判定，仅 button 适用）/ events.md（GetCodeBtn / SubmitBtn click event 已落库 + view.submitting / state.effects 已写入）。

## 推理过程

### 1. 适用性判定（穷举 7 类加载态）

> 严格对齐 loading.md 第 1 节"5 场景逐项判断"——本任务只是把已有的语义结论翻译成 schema 节点。

| 加载态种类 | 是否需要 | 节点类型 | visibleWhen | 来源决策 |
|-----------|---------|---------|-------------|---------|
| ① 全屏骨架（initial / cold start）| ❌ | — | — | loading.md initial=N/A：本屏无 autoFetchOnEnter dataSource，进屏内容静态可读 |
| ② 局部骨架（局部 fetch）| ❌ | — | — | 无局部 async 区域 |
| ③ 翻页 loading（pagination）| ❌ | — | — | 无列表节点 |
| ④ 下拉刷新（refresh）| ❌ | — | — | 工具屏 / 表单屏，无主数据列表 |
| ⑤ 全屏 spinner（LoadingOverlay）| ❌ | — | — | loading.md 决策 D1：风格契合 + condition 守卫已足够，不用全屏遮罩 |
| ⑥ 按钮内 spinner（SubmitBtn）| ✅ | `SubmitSpinner`（SubmitBtn 子节点）| `{{ state.view.submitting }}` | loading.md button 场景 + events.md SubmitBtn 已写 view.submitting |
| ⑥ 按钮内 spinner（GetCodeBtn）| ✅ | `CodeSendSpinner`（GetCodeBtn 子节点）| `{{ state.effects['ds-send-code'].status === 'pending' }}` | loading.md button 场景 + 决策 L2 用 effects.status 不重复声明 view |
| ⑦ 静默刷新指示（silent）| ❌ | — | — | 登录页全程主动操作，无后台拉取 |

**结论**：本任务建 **2 个**按钮内 spinner 节点（SubmitSpinner / CodeSendSpinner），其它 6 类视图不建。

### 2. 节点设计

#### 2.1 SubmitSpinner（SubmitBtn 子节点）

```
父节点：SubmitBtn  (nd_5a15fd87f060436295b4f)
位置：作为 SubmitBtn 的 child（按钮内反馈）
type：div
name：SubmitSpinner
label：登录按钮加载指示
visibleWhen：{{ state.view.submitting }}
props：{ "aria-label": "登录中" }
styles：{}（design 阶段补 spinner 旋转动画 / 尺寸 / 颜色）
```

**驱动表达式选 view.submitting 而非 state.effects['ds-login'].status === 'pending' 的理由**：
- loading.md 决策 L2 + state-vars.md 决策 D-S2：view.submitting 在 SubmitBtn click 第 2 步（state.set true）就置位，比 effect.fetch 进入 pending 更早 50~100ms（条件守卫 + hapticFeedback 之后立刻置 true，effect.fetch 调度有延迟）；用户体感"按下立刻看到 spinner"
- view.submitting 还覆盖 onSuccess 末尾 ui.delay 500ms 期间的"登录成功 ✓"展示窗口（决策：但 ✓ 0.5s 期间 visualState='success' 优先级 > spinner，由 design 阶段在 visualState 内做互斥）

#### 2.2 CodeSendSpinner（GetCodeBtn 子节点）

```
父节点：GetCodeBtn  (nd_e6783f85edb3499c9f131)
位置：作为 GetCodeBtn 的 child（按钮内反馈）
type：div
name：CodeSendSpinner
label：获取验证码加载指示
visibleWhen：{{ state.effects['ds-send-code'].status === 'pending' }}
props：{ "aria-label": "发送验证码中" }
styles：{}（design 阶段补）
```

**驱动表达式选 state.effects['ds-send-code'].status === 'pending' 而非 view 派生变量的理由**：
- loading.md 决策 L2 明文不建 view.codeSending，避免与 effect 自动态重复声明（state-completion 红线）
- ds-send-code click event 中 condition.when 已经守卫了 `state.effects['ds-send-code'].status !== 'pending'`，复用同一字段保持表达一致

### 3. 候选与否决（关键决策）

#### 决策 D-VL1：spinner 是 SubmitBtn 的子节点 还是 兄弟节点（独立 LoadingOverlay）？

- **候选 A**：建独立 LoadingOverlay（在 rootNode children 末尾），visibleWhen 同样接 view.submitting
- **候选 B**：作为 SubmitBtn 的 children（按钮内 spinner）
- **决策**：**B**——理由：
  - loading.md 决策 D1 已经否决全屏 LoadingOverlay
  - 按钮内 spinner 与按钮文字"登录中…"协同呈现（按钮文字是动态文案 `{{ state.view.submitting ? '登录中…' : '登录' }}`，本任务不挂——文字切换由 design 阶段在按钮 visualState 或 events.md 的扩展中处理；本期仅落 spinner 节点 + visibleWhen，文字降级方案见决策 D-VL3）
  - 与产品风格"简约 + 校园温度"契合，避免遮罩感

#### 决策 D-VL2：要不要建一个 LoginSpinner 通用模板节点复用？

- **候选 A**：建一个 LoginSpinner 模板，SubmitSpinner / CodeSendSpinner 都引用它
- **候选 B**：建 2 个独立节点（重复但简单）
- **决策**：**B**——理由：
  - 阶段边界：componentAssets 是 design 阶段产物（forbidden-fields-interaction §`componentAssets`）
  - 本阶段先把 schema 的"显隐契约"立稳；spinner 视觉细节（尺寸/颜色/动画）由 design 阶段在 visualState 中补
  - 即使 design 阶段决定抽组件，也是从 2 个节点 detect 模式后抽，不是本阶段强行预言

#### 决策 D-VL3：SubmitBtn 文字"登录中…"在哪里落？

- **现状**：SubmitBtn 当前 props.textContent = "登录"（events.md 落库时未挂动态文案）
- **候选 A**：本任务把 textContent 改为 `{{ state.view.submitting ? '登录中…' : '登录' }}`
- **候选 B**：留到 design-planner 阶段，本期仅落 spinner 节点
- **决策**：**A**——理由：
  - loading.md button 场景明文："SubmitBtn=spinner+文字'登录中…'+全表单 disabled"——文字是 loading 反馈的语义组成部分，不是视觉细节
  - 动态文案是 interaction 阶段职责（forbidden-fields-interaction.md 允许写 props.textContent 表达式）
  - design-planner 阶段只读 contract，不该回填文案
- **落库**：本任务一并 component_prop/update_props 改 SubmitBtn.textContent

  GetCodeBtn 的"发送中…"文案——已存在表达式 `{{ state.view.codeCountdown > 0 ? '重新获取 (Ns)' : '获取验证码' }}`（events.md 落），缺少 sending 态分支。本任务追加为 `{{ state.effects['ds-send-code'].status === 'pending' ? '发送中…' : (state.view.codeCountdown > 0 ? '重新获取 (' + state.view.codeCountdown + 's)' : '获取验证码') }}`，与 spinner visibleWhen 同步。

#### 决策 D-VL4：spinner 节点 visible 字段初值 true 还是 false？

- **决策**：visible=true（节点可见性的"硬开关"），visibleWhen 才是动态表达式
- 理由：visibleWhen 控制运行时显隐；visible:false 会强制隐藏（forbidden-fields-interaction.md 提示 visibleWhen 优先级）
- spinner 静态期通过 visibleWhen 求值得 false 而隐藏，不需要 visible:false

#### 决策 D-VL5：按钮 disabled 状态由谁守？

- **现状**：events.md 已经在 SubmitBtn / GetCodeBtn 的 condition.when 守卫了"提交中 / pending 不再触发"。disabled 视觉态是 design 阶段 visualState 职责
- **决策**：本任务不动 disabled——loading.md button 场景"全表单 disabled"是 design 阶段把 form 容器或所有 input 在 view.submitting=true 时切 visualState=disabled 的行为，不是 interaction 阶段写
- 不违 R-EVENTS-* 因为 condition 守卫已经足够防重入

### 4. 与上游契约对账

| 上游来源 | 本任务承接 | 实现位置 |
|---------|----------|---------|
| loading.md "button" SubmitBtn=spinner+'登录中…' | ✅ SubmitSpinner + textContent 表达式 | element/insert_subtree + component_prop/update_props |
| loading.md "button" GetCodeBtn=spinner+'发送中…' | ✅ CodeSendSpinner + textContent 表达式追加 sending 分支 | 同上 |
| loading.md initial/refresh/pagination/silent="—" 五场景 | ✅ 全部不建节点 | 决策 1.适用性判定表已逐项否决 |
| state-vars.md view.submitting | ✅ 用作 SubmitSpinner visibleWhen | — |
| state-vars.md 决策 D-S2 不建 codeSending | ✅ CodeSendSpinner 用 effects.status | — |
| events.md SubmitBtn click 写 view.submitting | ✅ 已经存在，无需补 | — |
| events.md GetCodeBtn click 用 effect.fetch | ✅ effects['ds-send-code'].status 自动维护 | — |

### 5. 红线自查

| 红线 | 是否触发 | 说明 |
|-----|---------|------|
| R-VIEW-LOAD-01 | ❌ 不触发 | dataSource 缺 pending 视图——本屏 ds-login(button) ds-send-code(button) 都建了 spinner；ds-policy-text(static) 无需 pending 视图 |
| R-VIEW-VISIBLE-01 | ❌ 不触发 | 两个 spinner 节点都写 visibleWhen 表达式 |
| R-EVENTS-01/02 | ❌ 不触发 | spinner 节点本身无 events，纯展示态 |
| 阶段边界 | ✅ 通过 | 不写 styles / visualState / componentAssets，只写 visibleWhen + meta.interaction |

---

## ★ 沉淀到 schema 的结论

本任务共 **5 个 MCP 调用**：

```jsonc
// ① element/add — 在 SubmitBtn 内插入 SubmitSpinner（叶子节点，用 add 而非 insert_subtree）
element/add {
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  parentId: "nd_5a15fd87f060436295b4f",   // SubmitBtn
  name: "SubmitSpinner",
  label: "登录按钮加载指示",
  tag: "div",
  styles: {},
  props: {
    "aria-label": "登录中"
  }
}

// ② element/set_visible_when — SubmitSpinner
element/set_visible_when {
  projectId,
  nodeId: "<#1 返回的新节点 id>",
  visibleWhen: "{{ state.view.submitting }}"
}

// ③ component_prop/update_props — SubmitBtn.textContent 加 submitting 分支
component_prop/update_props {
  projectId,
  nodeId: "nd_5a15fd87f060436295b4f",   // SubmitBtn
  props: {
    textContent: "{{ state.view.submitting ? '登录中…' : '登录' }}"
  }
}

// ④ element/add — 在 GetCodeBtn 内插入 CodeSendSpinner
element/add {
  projectId,
  parentId: "nd_e6783f85edb3499c9f131",   // GetCodeBtn
  name: "CodeSendSpinner",
  label: "获取验证码加载指示",
  tag: "div",
  styles: {},
  props: {
    "aria-label": "发送验证码中"
  }
}

// ⑤ element/set_visible_when — CodeSendSpinner
element/set_visible_when {
  projectId,
  nodeId: "<#4 返回的新节点 id>",
  visibleWhen: "{{ state.effects['ds-send-code'].status === 'pending' }}"
}

// ⑥ component_prop/update_props — GetCodeBtn.textContent 加 sending 优先分支
component_prop/update_props {
  projectId,
  nodeId: "nd_e6783f85edb3499c9f131",   // GetCodeBtn
  props: {
    textContent: "{{ state.effects['ds-send-code'].status === 'pending' ? '发送中…' : (state.view.codeCountdown > 0 ? '重新获取 (' + state.view.codeCountdown + 's)' : '获取验证码') }}"
  }
}

// ⑦ meta/set_node — SubmitSpinner 节点 meta.interaction
meta/set_node {
  projectId, nodeId: "<#1 新节点 id>",
  patch: {
    interaction: {
      summary: "SubmitBtn 提交期间按钮内 spinner（visibleWhen 接 view.submitting；与 SubmitBtn 文字'登录中…'协同；样式细节由 design 阶段补 visualState）",
      states: ["showing", "hidden"]
    }
  }
}

// ⑧ meta/set_node — CodeSendSpinner 节点 meta.interaction
meta/set_node {
  projectId, nodeId: "<#4 新节点 id>",
  patch: {
    interaction: {
      summary: "GetCodeBtn 发送期间按钮内 spinner（visibleWhen 接 state.effects['ds-send-code'].status==='pending'；与文字'发送中…'协同）",
      states: ["showing", "hidden"]
    }
  }
}
```

> **不落库的视图**（loading.md 已否决）：FeedSkeleton / LoadingOverlay / RefreshIndicator / ListLoadingMore / SilentSyncIndicator——本屏全部不适用。在 I-M1-coverage 任务三轴对账时再次显式确认。
