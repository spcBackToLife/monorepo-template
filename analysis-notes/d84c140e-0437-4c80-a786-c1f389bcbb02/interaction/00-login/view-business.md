> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-view-business
> 对应 schema 字段：rootNode.children 末尾追加 LockedView 子树 + NormalFormView 挂 visibleWhen + 双视图节点 meta.interaction
> 上游决策：[C-INT-00-login-001-decision.md](../../challenges/C-INT-00-login-001-decision.md)（accepted）

# Step I-M1-view-business: 00-login — 业务状态分支视图（账号锁定状态机）★ 重要

> 详细方法见 `methodology/07-derivative-views.md` 类 5。
> 详细 schema 见 `schema-spec/derivative-views.md` §5。
> 三轴覆盖见 `methodology/06-three-axis-coverage.md` 轴 2。

## 1. 适用性判定

✅ **适用** —— 本屏承载**账号锁定**业务对象状态机。

依据：
- product rules 第 3 条：连续 ≥5 次失败触发 `view.lockedUntil = now()+30min` 进入锁定，30 分钟后解锁
- statemachine.md §5：locked 是 9 状态主线之外的**副状态机**，与 unlocked 互斥，影响整屏可见性
- boundaries D-B9：锁定期间「整表单 disabled + LockedView 显示」是 product 已锁定的边界决策

→ 本任务必须建独立 LockedView 子树 + NormalFormView 挂 visibleWhen 双互斥。

## 2. 状态枚举值 → 节点对应表

业务状态字段：`view.lockedUntil`（运行时数值或 null）+ 派生 `view.lockedCountdown`（秒）。

| 业务状态 | 判定表达式 | 视图节点 | UI 主题 |
|---------|----------|---------|---------|
| unlocked（正常态）| `!state.view.lockedUntil \|\| state.view.lockedUntil <= Date.now()` | NormalFormView ★（已建）| 品牌区 + 表单卡片 + 底部链接（4 个子节点 + 全部输入交互） |
| locked（锁定态）| `state.view.lockedUntil && state.view.lockedUntil > Date.now()` | LockedView ★（本任务建）| 锁图标 + 标题 + 倒计时 + 提示文案 + 重置密码出口 |

**红线 R-VIEW-BUSINESS-01 自检**：两个枚举值各对应一个独立节点 ✓。

**边界一致性核对**：
- `view.lockedUntil = null`（首次进屏 / 失败 < 5 次）→ unlocked 表达式 = true → NormalFormView 显示
- `view.lockedUntil = 1735000000000` 且 `Date.now() < lockedUntil` → locked = true → LockedView 显示
- `view.lockedUntil = 1735000000000` 但 `Date.now() >= lockedUntil`（30 分到期）→ unlocked = true → NormalFormView 重现
  - 注意：lockedUntil 不会自动清空；由 events.md PhoneInput.blur 等下次失败时**有条件重置**——见 events.md 第 5 处第 3 条 D-EV5

## 3. 状态间的转换 actions（已在 events.md 落库，本任务不重落）

| 转换 | 触发 | 落库位置 |
|------|------|---------|
| unlocked → locked | SubmitBtn.click → ds-login.onError → CREDENTIAL 第 5 次 | events.md SubmitBtn 第 5 case |
| locked → unlocked（自动）| Date.now() ≥ lockedUntil | NormalFormView.visibleWhen 表达式自动判定（无需 action） |
| locked → unlocked（用户）| LockedForgotLink.click → nav.go("00-forgot-password") | 本任务建 |

## 4. LockedView 子节点设计

按 decision md §4.2 实施清单 + view-business 模板四要素（图示 + 标题 + 描述 + 行动按钮），LockedView 含 5 个子节点：

| name | tag | textContent / props | interaction summary |
|------|-----|--------------------|---------------------|
| LockedIcon | div | aria-label: "锁定" | 锁图标占位（svg 由 design-planner 阶段补） |
| LockedTitle | div | "账号已锁定" | 状态标题 |
| LockedCountdown | div | `"{{ Math.floor(state.view.lockedCountdown/60) }}:{{ String(state.view.lockedCountdown%60).padStart(2,'0') }} 后可重试"` | 实时倒计时（绑 view.lockedCountdown，由 Root.screenEnter 计时器驱动）|
| LockedHint | div | "为保障账号安全，连续 5 次密码错误后锁定 30 分钟" | 解释性安抚文案 |
| LockedForgotLink | button | "去重置密码" | click → nav.go("00-forgot-password") 出口 |

**为什么是这 5 个子节点**：

- 图示（LockedIcon）：v-business 模板要求"必含图示"——传达视觉锚定，不是冷冰冰报错
- 标题（LockedTitle）：用户秒懂当前态
- 倒计时（LockedCountdown）：核心信息，用户最关心"还要等多久"，且 view.lockedCountdown 已在 state-vars.md 落库（每秒 -1 由 setInterval 驱动）
- 提示（LockedHint）：解释规则——「不是我账号被盗，是触发了风控」的安抚 UX（与决策 md §2.2 一致）
- 行动按钮（LockedForgotLink）：给用户一条出路——「等不及就去改密码」，不让用户卡死

**为什么不放：**
- ❌ 联系客服按钮 → product rules 没声明客服 dataSource；MVP 无客服系统
- ❌ 重新尝试按钮 → 锁定期间禁止尝试，多个出口反而误导
- ❌ 显示 phone 字段 → 隐私敏感（万一是别人盯着用户屏幕）

## 5. 候选方案与否决

- **候选 A**：用一个 FormCard 节点 + visualState（locked / unlocked）切换
  - ❌ 否决：violates "节点结构 4 红线 / 一态一节点"；FormCard 子树与 LockedView 子树**完全不同的 DOM 结构**，visualState 无法跨结构切换
- **候选 B**：locked 时整屏显示 Toast/弹窗，表单仍在背后
  - ❌ 否决：违 D-B9 决策（"整表单 disabled + LockedView 显示"）；UX 让用户疑惑表单是否还能点；且 Toast 自动消失后用户无法回看倒计时
- **候选 C**（已采纳）：NormalFormView ↔ LockedView 双子树 visibleWhen 互斥
  - ✓ 选择：方法论 07 类 5 标准模式；与 product rules / statemachine.md / boundaries D-B9 全部一致

## 6. 决策记录

- **D-VB1**：互斥表达式以 `state.view.lockedUntil` 数值时间戳为准（不是 boolean 标志），避免 lockedUntil 重置不及时引发的二态错位
- **D-VB2**：NormalFormView.visibleWhen 用 `!lockedUntil || lockedUntil <= Date.now()` 而非 `!locked` 派生 boolean——理由：state.view 现状无 `locked` 字段，复用 lockedUntil 既最少入侵又表达力强
- **D-VB3**：LockedCountdown 文本表达式直接由 `view.lockedCountdown` 派生 mm:ss 而不是再加一个 view.lockedCountdownDisplay——避免重复 state，formatter 简单足够
- **D-VB4**：LockedForgotLink 用 button 而不是 link，因为 nav.go action 与按钮交互期望一致
- **D-VB5**：本任务**只新建 LockedView**，**不删 / 不动 NormalFormView 的子节点结构**——这一边界尊重 product 已建骨架（NormalFormView 由 challenge accepted 后 wrap 而成，子节点 product.summary 已写）

---

## ★ 沉淀到 schema 的结论

```jsonc
// === Step 1: 给 NormalFormView 挂 visibleWhen（unlocked 表达式）===
element/set_visible_when {
  projectId,
  nodeId: "<NormalFormView 实际 id 由 query/screen_schema 取>",
  visibleWhen: "{{ !state.view.lockedUntil || state.view.lockedUntil <= Date.now() }}"
}

// === Step 2: 在 Root 末尾插入 LockedView 子树 ===
element/insert_subtree {
  projectId,
  parentId: "<Root id = nd_6a7f2492b59b4e7eab7e1>",
  subtree: {
    name: "LockedView",
    label: "锁定态视图",
    type: "div",
    visibleWhen: "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}",
    styles: {},
    props: {},
    children: [
      { name: "LockedIcon", label: "锁定图标", type: "div",
        styles: {}, props: { "aria-label": "锁定" },
        children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { name: "LockedTitle", label: "锁定标题", type: "div",
        styles: {}, props: { textContent: "账号已锁定" },
        children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { name: "LockedCountdown", label: "锁定倒计时", type: "div",
        styles: {},
        props: { textContent: "{{ Math.floor(state.view.lockedCountdown/60) }}:{{ String(state.view.lockedCountdown%60).padStart(2,'0') }} 后可重试" },
        children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { name: "LockedHint", label: "锁定提示", type: "div",
        styles: {}, props: { textContent: "为保障账号安全，连续 5 次密码错误后锁定 30 分钟" },
        children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { name: "LockedForgotLink", label: "去重置密码", type: "button",
        styles: {}, props: { textContent: "去重置密码" },
        events: [{
          trigger: "click",
          description: "锁定态用户的逃生路径——跳到忘记密码页",
          actions: [{ type: "nav.go", targetScreenId: "00-forgot-password" }]
        }],
        children: [], states: [], activeState: "default", locked: false, visible: true }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// === Step 3: meta/set_node 补 6 个节点的 interaction summary ===

meta/set_node { projectId, nodeId: "<NormalFormView id>", patch: {
  interaction: {
    summary: "正常态业务子树容器（unlocked 表达式：!lockedUntil || lockedUntil <= now()）；包含品牌/表单/底部三段，与 LockedView 互斥；locked 时整体隐藏",
    states: ["showing","hidden"]
  }
}}

meta/set_node { projectId, nodeId: "<LockedView id>", patch: {
  interaction: {
    summary: "锁定态业务子树容器（locked 表达式：lockedUntil && lockedUntil > now()）；展示锁图示 + 标题 + 倒计时 + 提示 + 重置密码出口；与 NormalFormView 互斥",
    states: ["showing","hidden"]
  }
}}

meta/set_node { projectId, nodeId: "<LockedIcon id>", patch: {
  interaction: { summary: "锁图标占位（design-planner 阶段补 svg/icon 素材；本阶段仅占位 div）" }
}}

meta/set_node { projectId, nodeId: "<LockedTitle id>", patch: {
  interaction: { summary: "锁定状态固定标题（静态文本）" }
}}

meta/set_node { projectId, nodeId: "<LockedCountdown id>", patch: {
  interaction: {
    summary: "锁定倒计时实时文案；绑 state.view.lockedCountdown（每秒由 Root.screenEnter 设的 setInterval -1 驱动；归零时 Root 上的 condition 自动清 lockedUntil 让 NormalFormView 重现——见 events.md screenEnter 副效果）；mm:ss 由内联表达式格式化",
    states: ["counting"]
  }
}}

meta/set_node { projectId, nodeId: "<LockedHint id>", patch: {
  interaction: { summary: "锁定规则解释文案（静态），传达\"是触发风控不是账号被盗\"的安抚 UX" }
}}

meta/set_node { projectId, nodeId: "<LockedForgotLink id>", patch: {
  interaction: {
    summary: "锁定态用户的逃生路径按钮——click → nav.go(\"00-forgot-password\")，让用户不必干等 30 分钟",
    states: ["enabled"]
  }
}}
```

> ⚠️ 提交 update_plan_task done 时建议 expectedArtifacts: `[{ kind: 'arrayMin', path: 'rootNode.children', min: 2 }]`（Root 至少有 NormalFormView + LockedView 两子树）。
