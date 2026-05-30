> 这是【跨阶段回流挑战】md。
> 详细协议：`STAGE-CONTRACT.md` §0.1.9 + `UPSTREAM-FEEDBACK-PROPOSAL.md`。

# C-INT-00-login-001: 把 Root.children 三节点 wrap 为 NormalFormView 容器以承载账号锁定状态机

**本表元数据**：

| 字段 | 值 |
|------|---|
| challengeId | C-INT-00-login-001 |
| raisedBy | I-M1-view-business |
| raisedByScope | screen |
| raisedByScreenId | sc_27ee2293945046b69cc00 |
| targetStage | product |
| 当前 phase | open（首次写时；resolved 后由 service 自动更新） |

---

## 1. 现状（上游产物快照）

### 1.1 节点结构（来自 product 阶段 M1-skeleton 落库）

`screen.rootNode.children` 当前为 3 个直接子节点（不含 v2.3 起逻辑变更）：

| 顺序 | nodeId | name | 角色 |
|-----|--------|------|------|
| 0 | nd_451ec7c1336d478a810d9 | HeaderArea | 品牌区（BrandLogo + BrandSlogan）|
| 1 | nd_e60fb832933f4b86a6638 | FormCard | 核心表单卡片（PhoneField / ModeToggle / CredentialField / PolicyRow / SubmitBtn）|
| 2 | nd_c04451d9d8f243489f1c1 | FooterLinks | 底部链接（RegisterLink / ForgotLink）|

### 1.2 来自上游决策

- **上游 md**：`analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/screens/00-login/skeleton.md`（M1-skeleton 任务的 product 决策）
- **上游决策原文**（M1-skeleton.md）：「Root 三段纵向布局：HeaderArea / FormCard / FooterLinks」——product 阶段没有预见账号锁定状态机会要求"整表单 → LockedView 互斥切换"

### 1.3 下游已落库的相关决策（本任务上游）

- **statemachine.md §5**：「衍生两个视图（在 I-M1-view-business 任务建）：NormalFormView / LockedView」
- **boundaries.md D-B9**：「locked 期间整表单 disabled（含 ModeToggle/GetCodeBtn/Inputs/Submit），仅 LockedView 子树可见 —— I-M1-view-business 建 NormalFormView/LockedView **双子树 visibleWhen 互斥**」

---

## 2. 问题

### 2.1 红线证据

#### 想要的实现（具体到 MCP 调用 / 节点结构）

```
最终 Root.children 期望结构：
Root
├ NormalFormView（新容器，包入原三节点）
│   ├ HeaderArea
│   ├ FormCard
│   └ FooterLinks
└ LockedView（本任务新建）
    ├ LockedIcon
    ├ LockedTitle
    ├ LockedCountdown
    └ LockedHint

实现 MCP：
1. element/wrap [HeaderArea, FormCard, FooterLinks] → NormalFormView 容器
2. element/set_visible_when NormalFormView visibleWhen=
   "{{ !state.view.lockedUntil || state.view.lockedUntil <= Date.now() }}"
3. element/insert_subtree LockedView 子树 + visibleWhen=
   "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}"
```

#### 触发的 forbidden 红线

引用 `forbidden-fields-interaction.md` §"重组上游骨架"：

> 移动 / 删除 / **包裹** product 阶段已建的业务骨架节点 ❌（如发现真有问题，**优先走 SKILL §5.5 UpstreamChallenge 协议**）

`element/wrap` 三节点正是触发"包裹 product 已建节点"——必须挑战上游才能干净实现。

#### 不绕红线的代价（散挂方案）

- **方案 C**：给 FormCard / FooterLinks 各自挂 unlocked 表达式，HeaderArea 始终可见，新建 LockedView 兄弟节点
- 损失清单：
  1. **DRY 维护性**：unlocked 表达式 `{{ !state.view.lockedUntil || state.view.lockedUntil <= Date.now() }}` 在 2 处重复（FormCard 一处 + FooterLinks 一处）；后续若锁定逻辑加新条件（如服务端判定 LOCKED），所有引用点都要同步改
  2. **下游协同损失**：design-planner 阶段对"normal 态视觉"做 visualState 时，必须维护"FormCard 和 FooterLinks 的 disabled 视觉态需要同步联动"——本来一个 NormalFormView 容器搞定，现在要散在 N 个节点
  3. **语义碎片**：账号锁定是一个**整体业务态**（statemachine.md §5 明确归类业务状态机类 5），但散挂方式让"是否锁定"分散在 2 处 visibleWhen + N 处 visualState
  4. **HeaderArea 在 locked 时仍可见**——这其实是合理的（保留信息架构，参考 methodology/07 类 4/5 设计要点），但若以后业务说"locked 时也要换头图"，散挂方案无地方挂这个改动；wrap 方案只需在 NormalFormView/LockedView 上扩展

### 2.2 候选方案（4 个，含"维持现状"对照）

| 方案 | 改动面（具体 MCP 调用） | 优势 | 劣势 |
|------|----------------------|------|------|
| **A. 维持现状（不挑战）+ 散挂** | element/set_visible_when × 2（FormCard / FooterLinks）+ element/insert_subtree LockedView | 上游不动；最小入侵 | DRY 损失 + 语义碎片（详见 §2.1） |
| **B. ★ 推荐：wrap 三节点** | element/wrap × 1（[HeaderArea, FormCard, FooterLinks] → NormalFormView）+ element/set_visible_when × 1 + element/insert_subtree LockedView × 1 | 业务语义对齐；DRY；与 methodology/07 类 5 标准模式一致；下游 visualState 容易做 | 触发上游 forbidden 红线 → 必须走 challenge 协议（一次性成本） |
| **C. 部分 wrap：仅 wrap [FormCard, FooterLinks] 为 InteractiveZone** | element/wrap × 1（含 2 节点）+ ... | HeaderArea 不动；只改"可被禁用"的部分 | "InteractiveZone" 是临时抽象——账号锁定语义并不止"禁用交互"，它有专属布局（图示 + 倒计时）；不如 NormalFormView 干净 |
| **D. 用 modal/overlay 盖 LockedView** | screen/overlays.add LockedModal | 不动 Root 结构 | statemachine.md §4 候选 B 已显式否决：locked 不是叠加态，是互斥态；modal 让用户既看到表单又看到 modal，错误的视觉暗示用户"还可输入" |

---

## 3. 影响面声明

### 3.1 受影响的上游已 done 任务（targetTaskIds）

| taskId | scope | screenId | 受影响原因 | 上游 task 是否需要补声明 expectedArtifacts |
|--------|-------|----------|-----------|--------------------------------------|
| M1-skeleton | screen | sc_27ee2293945046b69cc00 | Root.children 由 [HeaderArea, FormCard, FooterLinks] 变为 [NormalFormView (含三节点), LockedView] | M1-skeleton 当前**没有声明** expectedArtifacts（是 v2.2 之前的老任务）→ accepted 后上游应**追加声明**：`{ kind: 'arrayMin', path: 'rootNode.children', min: 2 }` 防漂移 |

### 3.2 受影响的下游已 done 任务（如有）

| taskId | 影响描述 | 续做时是否需要更新 md / 重落 schema |
|--------|---------|--------------------------------|
| I-M1-events | events 内引用了 `nd_e60fb832933f4b86a6638`（FormCard）— SubmitBtn onError CREDENTIAL 分支 ui.animate.nodeId 字段 | ❌ 不影响——FormCard 节点本身**节点 ID 不变**（wrap 是把它放进新容器，不是删了重建）；ui.animate 仍指向同一 FormCard 节点 |
| I-M1-view-loading | SubmitSpinner / CodeSendSpinner 是 SubmitBtn / GetCodeBtn 的子节点 | ❌ 不影响——这两个 spinner 节点 ID 与父节点关系都不变 |
| I-M1-view-error | PhoneError / CredentialError meta.interaction 已写 | ❌ 不影响——节点 ID 不变 |
| 其他 9 个 done 任务 | 仅 schema.meta 叙事，未引用具体 nodeId | ❌ 不影响 |

### 3.3 expectedArtifacts 是否会被破坏

**结论：不会**。逐项核对：

| 任务 | 现有产物指纹 | wrap 后是否仍满足 |
|------|------------|------------------|
| I-M1-state-vars | `{ kind: 'nonEmpty', path: 'stateInit.view' }` | ✅ stateInit.view 不动 |
| I-M1-datasources | `{ kind: 'arrayMin', path: 'dataSources', min: 1 }` | ✅ dataSources 不动 |
| I-global-state-fill | `{ kind: 'hasKeys', path: 'globalStateInit.view', keys: [...] }` | ✅ globalStateInit 不动 |
| I-global-overlay-events | `{ kind: 'arrayMin', path: 'globalOverlays', min: 1 }` | ✅ globalOverlays 不动 |
| VERIFY-D-globalOverlays-top | `arrayMin globalOverlays + eachItem hasKeys` | ✅ 同上 |

**R-CHALLENGE-03 重对账：通过**——本 challenge 改动是结构性（节点容器层级变化），不破坏任何已声明的产物指纹。

---

## 4. 推荐方案 + 产品级理由

**推荐**：方案 B（wrap [HeaderArea, FormCard, FooterLinks] → NormalFormView 容器）

**多角度理由**：

### 4.1 业务语义对齐（最强理由）

`methodology/07-derivative-views.md` 类 5「业务状态分支视图」明文：

> **每个状态一个独立节点 + visibleWhen 互斥**...避免"一个节点 + 大量条件样式"——不可维护

账号锁定状态机有两个枚举值（unlocked / locked），按方法论应一一映射独立子树。NormalFormView/LockedView 是教科书级标准模式。

### 4.2 用户体验视角

锁定中用户应该看到**专属布局**——不是"被打了灰色蒙版的表单"。LockedView 含图示 + 倒计时 + "请稍后重试"提示 + "去重置密码"出口，是"暂时被惩罚"的安抚 UX，不是"功能不可用"的报错 UX。这种心理差异要求两套独立子树。

### 4.3 可维护性视角

DRY：unlocked 表达式只写一处（NormalFormView.visibleWhen），后续业务规则演进（如加"账号被风控"、"账号待激活"）只需扩展 enum + 增加视图节点。

### 4.4 下游 design-planner / executor 协同视角

- design-planner 对每个独立子树各自 visualState（hover/focus/disabled）；wrap 后 NormalFormView 整体 disabled 一处即可
- design-executor 对 LockedView 做素材应用（图示/装饰）有清晰的目标范围

### 4.5 风险评估

- `element/wrap` op：幂等且有 inverse（element/unwrap 可恢复）；不影响节点 ID
- 不影响下游已落库的 events / state / dataSources（详见 §3.2）
- 唯一一次性成本：上游 product-analyst 接管处理 + 同步 M1-skeleton 任务 notes（约 1-2 分钟工作）

### 4.6 与已有决策的一致性

statemachine.md §5 + boundaries.md D-B9 已经预设了 NormalFormView / LockedView 双子树架构——本 challenge 是把"已经在 md 里达成的下游设计"落到 schema 上，不是引入新设计分歧。

---

## 5. 回流后下游续做计划

- **resumeTaskId**：I-M1-view-business（即本任务）
- **续做时需要的额外步骤**（按顺序）：

```
0. read_file challenge md + decision md
1. element/set_visible_when 给 NormalFormView 容器挂表达式
   visibleWhen = "{{ !state.view.lockedUntil || state.view.lockedUntil <= Date.now() }}"
2. element/insert_subtree 给 Root 末尾插入 LockedView 子树
   {
     id: lockedView, type: div, name: LockedView,
     visibleWhen: "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}",
     children: [
       LockedIcon (div),
       LockedTitle (div, textContent: "账号已锁定"),
       LockedCountdown (div, textContent: "{{ Math.floor(state.view.lockedCountdown/60) }}:{{ state.view.lockedCountdown%60 }} 后可重试"),
       LockedHint (div, textContent: "为保障账号安全，连续 5 次密码错误后锁定 30 分钟"),
       LockedForgotLink (button, textContent: "去重置密码", click→nav.go 00-forgot-password)
     ]
   }
3. meta/set_node 给 NormalFormView / LockedView 及其子节点补 meta.interaction.summary
4. update_plan_task I-M1-view-business → done
   expectedArtifacts: [{ kind: 'arrayMin', path: 'rootNode.children', min: 2 }]
```

- **是否影响下游已 done 任务的 md**：否（下游所有 md 不引用具体的 Root.children 排列方式，只引用节点名/ID）

---

## 6. 写完后下一步

调用 `meta/raise_upstream_challenge` 把本 md 元数据 + targetTaskIds 落 schema，service 端会原子地 add P-revise-C-INT-00-login-001 任务 + 把 I-M1-view-business 置 blocked。

随后切到 product-analyst 技能接管处理。
