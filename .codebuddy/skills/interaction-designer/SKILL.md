---
name: interaction-designer
description: 交互细节设计技能。在 product-analyst 之后、design-planner 之前触发。为每个屏幕设计完整的交互规格——状态机、操作反馈、加载策略、错误处理——并**直接以结构化 actions 写入 design-api schema**（events.actions / stateInit / dataSources / overlays），从源头杜绝 events 丢失。触发词："设计交互"、"交互细节"、"状态怎么处理"、"失败怎么办"、"加载策略"等涉及 UI 行为设计的请求。
---

# 交互设计 Skill (Schema-First)

将产品需求（业务逻辑）转化为**精确的 schema 结构**：每屏的 `stateInit`、`dataSources`、`overlays`、以及每个交互节点的 `events[].actions[]`。

> 架构契约见 `SCHEMA-FIRST-REFACTOR.md`。本 SKILL 是 §5.2.2 的具体执行。
> 这是**根治 events 丢失**的关键技能——actions 在此阶段就以 22 种 v2 动词结构化落库，下游 executor 无翻译环节。

---

## 0. 核心契约（红线）

### 0.1 唯一事实源 = design-api schema

> **不再写 `interaction-design/*.md` 或 `design-registry/*.json` 作为信息源。**
>
> 每条用户操作的归宿必须是一对结构化的 schema 字段：
> - "用户做什么" → `node.events[].trigger` + `actions[]`（用 22 种 v2 动词）
> - "条件是什么" → `event.condition.when` 表达式
> - "状态在哪里" → `screen.stateInit.view` 变量
> - "数据从哪来" → `screen.dataSources` + `effect.fetch`
> - "弹窗怎么开" → `screen.overlays` + `ui.showOverlay`
>
> Phase 1（状态机/反馈分析）期间的 markdown 是**对话内容**（在回复里给用户看），不是文件。

### 0.2 ⛔ 三条硬红线

1. **每条用户操作 = 一次 `event/add` 调用**。md 描述"click→切换"，schema 必须有对应 `event/add` 落库，**不允许只描述不落库**。
2. **events.actions 不允许空**。任何 trigger 必须配套至少 1 个 action；空 actions = 没意义的事件。
3. **该屏分析完毕，`query/integrity { screenId }` 必须 0 个 R-EVENTS-01/02 错误**才能进下一屏。

违反任一条 = 重新做该屏。

### 0.3 条件样式 ≠ 事件（认知防御）

> 高亮联动（active tab 颜色）等"响应式样式"用 `{{ state.view.x === 'a' ? colorA : colorB }}` 表达式即可——但 **state 怎么变的还得有 click event**。
>
> 写完表达式 ≠ 交互完成。每次写完一个条件样式，回头检查：触发 state 变化的 event 写了吗？

---

## 1. 工作流

### Phase 0: 启动门禁

```
1. query/list_projects → 找到目标 projectId
2. query/project_info { projectId } → 确认产品层已沉淀（meta.targetUser/coreScenarios/modules/navigation 都存在）
   ⚠️ 若 project.meta 缺关键字段 → 退回 product-analyst，不允许在本阶段补
3. query/list_screens → 拿到 product-analyst 创建的屏幕骨架
4. ★ 强制前置加载: read_file ../common/references/v2-actions-cheatsheet.md
   （22 种 action 动词 + 10 类操作模板速查；不靠记忆，靠对照）
```

---

### 节奏：按屏渐进，单屏内分析即落库

> **不存在"先分析所有屏 → 再批量落库"，也不存在"单屏 Phase 1 分析 → 暂停 → Phase 2 落库"两段式**。
>
> 单屏的处理节奏：**心里先想清楚状态机/操作清单/反馈策略（在回复里简短展示），然后立刻按 Step 1-7 落库**。落完一屏跑该屏 integrity，0 error 进下一屏。

每轮回复的结构（每屏一轮）：

```
🧠 本屏交互分析（简短）：
   - 状态机：state.view.{loginMode, submitting, ...}
   - 关键操作：① 切换 mode  ② 输入  ③ 提交
   - 反馈/错误/边界：[关键策略 2-3 行]

🔧 落库进度：
   [Step 2 ✓] view 变量 X 个
   [Step 3 ✓] dataSource Y 个
   [Step 4 ✓] events Z 个（核心）
   [Step 6 ✓] meta 叙事
   [Step 7 ✓] integrity 0 error

➡️ 下一屏：xxx
```

**何时停下问用户**：交互方案有真分歧（如"忘记密码走短信还是邮箱"两种合理路径），把选项说清问一次；其余按专业判断推。

---

### Phase 1: 单屏分析（在回复里简短展示，不暂停）

#### 1.1 状态机三要素

每屏定义：
- **States**：所有可能状态
- **Transitions**：什么操作触发切换
- **Effects**：切换时 UI 发生什么

#### 1.2 操作清单（穷举）

把页面上所有用户可执行的操作列成表：

| 操作 | 触发 | 前置条件 | 即时反馈 | 进行中 | 成功 | 失败 | 边界 |
|------|------|---------|---------|-------|------|------|------|
| 切换登录方式 | click `mode-toggle` | — | toggle 滑动 | — | 表单切换 | — | 保留手机号 |
| 输入手机号 | input `phone-input` | — | label 上浮 | — | 解锁按钮 | 红字提示 | iOS 短信预填 |
| 提交登录 | click `submit-btn` | formValid + !submitting | spinner | 表单禁用 | ✓+跳转 | shake+Toast | 800ms 防抖 |

#### 1.3 加载 / 错误 / 边界

- **加载**：首次/刷新/分页/按钮请求 各自的 loading 表现
- **错误**：6 类错误（校验/业务/权限/网络/服务/未知）的 UI 响应
- **边界**：重复点击/超时/离开页面/并发/离线

详细方法论见 `references/interaction-patterns.md`。

> Phase 1 的输出**写在对话回复里**给用户看（简短摘要即可），**不暂停征询**——直接进 Phase 2 落库。用户随时可以打断调整。

---

### Phase 2: 落库到 schema（MCP，紧跟 Phase 1）

对齐后的每个屏幕，按以下顺序调 MCP。**严格串行，不可跳步**。

#### Step 1: 读当前 schema

```
query/screen_schema { projectId, screenId }
→ 拿到 product-analyst 阶段建好的空白屏幕骨架
```

#### Step 2: 注册 view 状态变量

把 Phase 1 状态机里**所有 state 变量**翻译成 ScreenStateInit.view：

```
对每个状态变量（按状态机推导）:

state/view_add {
  projectId, screenId,
  variable: {
    name: "loginMode",                            ← 驼峰，schema 里 view.loginMode
    label: "登录方式",                              ← 面板展示名
    defaultValue: "code",                          ← 运行时初值
    enum: [
      { value: "code", label: "验证码登录" },
      { value: "password", label: "密码登录" }
    ]
  }
}
```

**典型 view 变量**：
- 模式切换：`loginMode` / `feedView` (map|list)
- 表单值（受控）：`phone` / `password` / `commentDraft`
- 错误信息：`phoneError` / `submitError`
- 提交态：`submitState` ('idle'|'submitting'|'success'|'error')
- 显隐切换：`passwordVisible` / `forgotModalOpen`
- 倒计时数字：`codeCountdown`

#### Step 3: 注册数据源

每个需要拉接口/读静态数据的场景：

```
data_source/add {
  projectId, screenId,
  type: "api",
  name: "loginApi",
  endpoint: { method: "POST", path: "/api/login", body: { phone: "{{ view.phone }}", ... } },
  mock: { scenarios: [...] },                     ← 至少一个 mock 场景
  autoFetchOnEnter: false                         ← 显式触发用 false；首屏自动拉用 true
}
```

⚠️ effect.fetch 引用的 dataSourceId 必须先在此 Step 注册。

#### Step 4: 创建触发节点 + 写 events（★ 根治点）

对操作清单里**每一行**：

##### 4a. 创建触发节点（如不存在）

```
element/add {
  projectId, parentId: <父节点 id>,    ← 屏幕 rootNode 或父容器
  name: "ModeToggle",                  ← PascalCase 代码名
  label: "登录方式切换",                  ← 中文展示名
  tag: "div" | "button" | "input" | ...,
  layoutHint?: ...
}
→ 拿到 nodeId，记录下来
```

⚠️ 此阶段建的是**交互骨架**，几何/视觉留给 design-planner 阶段补全。Step 4a 不写复杂 styles，只写"必要存在"的结构。

##### 4b. 写完整 events.actions 链（核心）

按 `v2-actions-cheatsheet.md` 把"操作描述"翻译成 actions：

```
event/add {
  projectId, nodeId,
  trigger: "click" | "change" | "submit" | "blur" | "screenEnter" | "scrollReachBottom" | ...,

  condition?: { when: "<前置条件表达式>" },         ← 用 condition，不要塞 actions 第一个 logic.if

  actions: [ ...完整动作链... ],

  description: "切换验证码/密码登录方式"            ← 必填，schema→md 派生用
}
```

**翻译模板速查**（详见 `../common/references/v2-actions-cheatsheet.md §2`）：

| 操作描述 | actions 链骨架 |
|---------|--------------|
| 双状态切换 | `[{ type: 'state.toggle', path: 'view.x' }]` 或 `state.set` 三元 |
| 受控输入 | **不是 event，用 `element/set_bind { path: 'view.x' }`**；blur 校验仍用 event |
| 提交表单 | `state.set submitState=submitting` → `effect.fetch { onSuccess: [...], onError: [...] }` |
| 倒计时按钮 | `effect.fetch onSuccess: ui.startTimer { interval, onTick: state.set, onComplete: ... }` |
| 跳页 | `[{ type: 'nav.go', targetScreenId }]` |
| 打开 modal | `[{ type: 'ui.showOverlay', overlayId }]` |
| 列表追加/删除 | `state.append` / `state.remove + predicate` |
| 失败分支 | `effect.fetch.onError: logic.switch { value: $last.error.code, cases: [...] }` |

⛔ **常见错误自查**：
- 写了条件样式表达式（`{{ state.view.x === 'a' ? ... }}`）但**没写 click event 改 view.x** → state 永远不变，UI 不会切
- effect.fetch 没写 onError → 用户看不到失败反馈
- 输入框写 `event: change → state.set` 而不是 `set_bind` → 失去受控双向绑定优势

##### 4c. 受控输入框：set_bind（不是 event）

对 `<input>` / `<textarea>` / `<select>`：

```
element/set_bind { projectId, nodeId, path: "view.phone" }
```

实现：value 自动取自 state.view.phone，change 自动 dispatch state.set。比手写 event 简洁且不易错。

#### Step 5: 弹窗 / 浮层（用 visibleWhen 实现）

> ⚠️ schema 类型层已预留 `Screen.overlays[]` 字段，但 op 链路（`screen.addOverlay` 等）尚未实现。当前阶段统一用 **`visibleWhen` 表达式 + view 状态变量**实现弹窗：

```
1. 注册控制变量：
   state/view_add { variable: { name: "forgotModalOpen", defaultValue: false } }

2. 在屏幕 rootNode 下创建 modal 容器节点（fixed 定位 + 蒙层）：
   element/add { name: "ForgotPasswordModal", tag: "div", ... }
   → 拿到 modalNodeId

3. 给 modal 节点绑条件可见：
   element/set_visible_when { nodeId: modalNodeId, visibleWhen: "{{ state.view.forgotModalOpen }}" }

4. 触发开/关用 state.set 而非 ui.showOverlay/hideOverlay：
   - 打开按钮 event: actions: [{ type: 'state.set', path: 'view.forgotModalOpen', value: true }]
   - 关闭按钮 event: actions: [{ type: 'state.set', path: 'view.forgotModalOpen', value: false }]
   - 点蒙层关闭：在蒙层节点上 event.click 触发 state.set false
```

> 待 `screen.addOverlay` op 实装后，本节会改为推荐 `screen/add_overlay` 流程。

#### Step 6: 写叙事到 meta（B 类）

每个写过 events 的节点 + 屏幕本身：

```
对每个交互节点:
meta/set_node {
  projectId, nodeId,
  patch: {
    interaction: {
      summary: "click→切换验证码/密码 mode",
      states: ["code-mode", "password-mode"],
      flows: {
        success: "toggle 滑块 spring 移动 + 对应表单淡入 200ms",
        boundary: "切换时保留手机号"
      }
    }
  }
}

对屏幕本身:
meta/set_screen {
  projectId, screenId,
  patch: {
    interaction: {
      summary: "双登录方式 + 错误状态机 + 跳注册/找回",
      states: ["idle:code-mode", "idle:password-mode", "submitting", "error:credential", ...]
    },
    status: { phase: "interaction-defined" }
  }
}
```

#### Step 7: ⛔ 自检（强制门禁）

```
query/integrity { projectId, screenId }
```

期望：

| 规则 | 期望结果 | 不达标怎么办 |
|------|---------|------------|
| R-EVENTS-01（节点声明交互意图但 events 缺 interactive trigger）| **0 错误** | 立刻补 event/add |
| R-EVENTS-02（event 没 actions）| **0 错误** | 立刻补 actions |
| R-STATUS-01（ready.events=true 但事件空）| 不应触发（本阶段不自报 ready）| — |
| R-PHASE-01（phase 一致性）| 0 错误 | meta.status.phase 改回 "interaction-defined" |

**0 error 才允许进下一屏**；如有错误，回到 Step 4 补完。

#### Step 8: 通知用户进度

> 屏幕 `00-login` 交互层完成：3 个 view 变量、2 个 dataSource、8 个事件、1 个 overlay、integrity 0 error。
> 下一屏 `00-register`?

---

## 2. 必须 / 禁止清单

### 必须

- ✅ Phase 0 启动时强制加载 `v2-actions-cheatsheet.md`（不许凭记忆）
- ✅ 每屏 Phase 1 与用户对齐后才进 Phase 2
- ✅ Step 4a + 4b 配对调用（建节点 + 写 events 不分开）
- ✅ effect.fetch 必须有 onSuccess + onError 两个分支
- ✅ 受控输入框用 `set_bind`，不要 event change
- ✅ Step 7 integrity 必须 0 error 才能进下一屏

### 禁止

- ❌ 写 `interaction-design/*.md` 文件作为信息源
- ❌ 写 `_page.json` / `<node>.json` 等 registry 文件
- ❌ 调用 `create-node.ts` / `write-node.ts` / `task-gen.ts` 等老脚本
- ❌ md 中写"click→切换"但 schema 里 events 为空（这就是 events 丢失的根因）
- ❌ 用条件样式表达式假装"做完了交互"——条件样式只是响应，必须配套触发 event
- ❌ events.actions 为空数组
- ❌ 跨屏批量改：每屏一轮，全部 7 步走完才进下一屏

---

## 3. 与下游技能的衔接

| 当前产出（schema） | 下游消费 | 消费方式 |
|------------------|---------|---------|
| `events[].actions[]` | design-executor | **零翻译**，已结构化，executor 不再处理 |
| `stateInit.view/data` | design-executor | 直接生效 |
| `dataSources[]` | design-executor / design-planner | mock 场景给 planner 预览态用 |
| `overlays[]` | design-planner | 在 modal rootNode 上补样式 |
| `meta.interaction` | design-planner | 读流程叙事辅助决定 visualStates |

---

## 4. 详细参考（按需加载）

- `../common/references/v2-actions-cheatsheet.md` — ★ 强制前置加载（22 动词速查 + 10 类操作模板）
- `references/interaction-patterns.md` — 反馈层级 / 加载策略 / 错误处理 / 转场（方法论）
- `references/state-machine-examples.md` — 典型页面状态机案例
- `references/error-handling-patterns.md` — 错误处理最佳实践
- `SCHEMA-FIRST-REFACTOR.md` §5.2.2 — 阶段产出协议（根目录）

---

## 5. 新会话续接

进入新会话：

```
1. query/list_projects → 找 projectId
2. query/list_screens → 看哪些屏幕已有 phase: "interaction-defined"
3. 跳到第一个 phase: "analyzed" 的屏幕，从 Phase 1 开始
4. 已 interaction-defined 的屏幕跑 query/integrity 二检：若有 R-EVENTS-* 错误，是上次"假完成"，立刻补
```

不再读 `STATUS.md` / `PLAN.md`——schema 自身就是状态。
