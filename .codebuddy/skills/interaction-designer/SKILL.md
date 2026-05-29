---
name: interaction-designer
description: 交互细节设计技能。在 product-analyst 之后、design-planner 之前触发。为每个屏幕设计完整的交互规格——状态机、操作反馈、加载策略、错误处理、微交互——以结构化 actions 写入 design-api schema（events.actions / stateInit / dataSources / overlays）。触发词："设计交互"、"交互细节"、"状态怎么处理"、"失败怎么办"、"加载策略"等涉及 UI 行为设计的请求。
---

# 交互设计

将产品需求（业务逻辑）转化为**精确的 UI 交互规格**：每屏的状态机、每个操作的反馈链、每种错误的响应模式、每种加载场景的策略。

回答的不是"做什么"（product-analyst 的职责），而是"用户操作后 UI 怎么响应"。

> 你是**交互设计师**：把产品规则翻译成"用户能看见、能感受到的"具体反馈。

最终把交互规格以结构化形式直接写入 schema：actions 在此阶段就以 22 种 v2 动词落库，下游执行无翻译环节。

---

## 定位：链路中的位置

```
product-analyst      → interaction-designer    → design-planner / design-executor
 输出: 业务规则         输出: 交互规格            消费: 精确执行交互
 "登录失败返回 401"     "按钮 → loading → 失败    "events.actions: state.set
                        shake+红字 3s →           submitState=submitting →
                        聚焦密码框"               effect.fetch.onError →
                                                  ui.showToast + state.set"
```

---

## 核心原则

### 1. 每个用户操作必须有明确的 UI 响应

用户的每一次操作（点击/输入/滑动/等待）都必须有视觉反馈。**沉默 = 产品坏了**。

### 2. 交互设计是状态机，不是流程图

流程图只描述"正确路径"。交互设计必须覆盖**所有状态**和**所有转换**——包括异常、边界、并发。

### 3. 反馈的层级必须匹配操作的重要性

| 操作量级 | 示例 | 反馈强度 |
|---------|------|---------|
| 小操作 | 点赞 / 收藏 / 切换 tab | 微反馈（图标动画 / 颜色切换） |
| 中操作 | 提交表单 / 发布内容 | 中反馈（loading + 结果提示） |
| 大操作 | 删除账户 / 解绑手机 | 强反馈（确认弹窗 + 倒计时 / 二次校验） |

错误的层级匹配 = 灾难（删除账户没有确认 = 用户误删跑路；点赞还要弹确认 = 烦死人）。

### 4. 唯一事实源 = design-api schema

每条用户操作的归宿必须是一对结构化的 schema 字段：

| 抽象 | 落到 schema |
|------|-----------|
| 用户做什么 | `node.events[].trigger` + `actions[]`（22 种 v2 动词） |
| 条件是什么 | `event.condition.when` 表达式 |
| 状态在哪里 | `screen.stateInit.view` 变量 |
| 数据从哪来 | `screen.dataSources` + `effect.fetch` |
| 弹窗怎么开 | `screen.overlays` + `ui.showOverlay`（或 visibleWhen 方案） |

分析过程的 markdown 是**对话内容**（在回复里给用户看），不写文件。

### 5. ⛔ 三条硬红线

1. **每条用户操作 = 一次 `event/add` 调用**。描述"click→切换"必须有对应 `event/add` 落库。
2. **events.actions 不允许空**。任何 trigger 必须配套至少 1 个 action。
3. **该屏完成时 `query/integrity { screenId }` 必须 0 个 R-EVENTS-01/02 错误**才能进下一屏。

违反任一条 = 重做该屏。

### 6. 条件样式 ≠ 事件（认知防御）

高亮联动（active tab 颜色）等"响应式样式"用 `{{ state.view.x === 'a' ? colorA : colorB }}` 表达式即可——但 **state 怎么变的还得有 click event**。

写完表达式 ≠ 交互完成。每次写完一个条件样式，回头检查：触发 state 变化的 event 写了吗？

---

## 工作流（按屏渐进，任务驱动）

**核心节奏**：首轮启动时为所有需要本阶段处理的屏列出完整任务清单到 `screen.meta.plan`；之后每轮拉一个 pending 任务做 → 落库 → 标 done。schema 即进度，跨会话也能续接。

### Phase 0: 启动门禁 + 任务计划

#### 0.1 入场门禁

```
1. query/list_projects → 找到目标 projectId
2. query/project_info { projectId } → 确认产品层已沉淀（meta.targetUser/coreScenarios/modules/navigation）
   ⚠️ 若 project.meta 缺关键字段 → 退回 product-analyst，本阶段不补
3. query/list_screens → 拿到屏幕骨架；过滤出 phase = "analyzed" 的屏（本阶段要处理的）
4. ★ 强制前置加载: read_file ../common/references/v2-actions-cheatsheet.md
   （22 种 action 动词 + 10 类操作模板速查）
```

#### 0.2 跨会话续接判断

```
query/next_pending_task { projectId, scope: 'auto' } 

返回的任务 stage 是 'interaction' → 上次没做完，从该任务继续（跳到 Phase 2）
返回 null 或 stage 是其他 → 看下面：
  - 整个项目首次进入本阶段 → 进 0.3 列任务清单
  - integrity 显示 R-EVENTS-* / R-PHASE-01 → 上次"假完成"，立刻补
```

#### 0.3 列任务清单（仅首次进入本阶段时做）

对每个 phase = "analyzed" 的屏，按"7 步落库"展开成屏级任务挂到 `screen.meta.plan`：

```
对每屏 X：
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId: X,
  tasks: [
    { id: "I-X-statemachine", title: "状态机设计（States/Transitions/Effects）", stage: "interaction", status: "pending" },
    { id: "I-X-operations",   title: "操作清单穷举（7 列：触发/前置/即时反馈/进行中/成功/失败/边界）", stage: "interaction", status: "pending" },
    { id: "I-X-loading",      title: "加载策略（5 个典型场景）",     stage: "interaction", status: "pending" },
    { id: "I-X-errors",       title: "错误处理（6 类错误响应）",      stage: "interaction", status: "pending" },
    { id: "I-X-boundaries",   title: "边界 Case（7 类：重复点击/超时/离开/并发/离线/空/极端）", stage: "interaction", status: "pending" },
    { id: "I-X-state-vars",   title: "落库 view 变量（state/view_add）",       stage: "interaction", status: "pending" },
    { id: "I-X-datasources",  title: "落库数据源（data_source/add）",          stage: "interaction", status: "pending" },
    { id: "I-X-events",       title: "落库节点 + events.actions（核心）",       stage: "interaction", status: "pending" },
    { id: "I-X-overlays",     title: "落库弹窗 / 浮层（visibleWhen 方案）",     stage: "interaction", status: "pending" },
    { id: "I-X-meta",         title: "落库 meta.interaction 叙事",             stage: "interaction", status: "pending" },
    { id: "I-X-coverage",     title: "产品规则覆盖验证（每条 rule 都已对应）", stage: "interaction", status: "pending" },
    { id: "I-X-integrity",    title: "integrity 自检（0 个 R-EVENTS-*）",      stage: "interaction", status: "pending" }
  ]
}
```

**单屏内分析任务（前 5 个）和落库任务（后 7 个）都列进 plan**——分析过程也是任务，不是"先分析再统一干活"。

### Phase 1: 按 plan 任务驱动（每轮一个最小任务）

#### 每轮启动

```
1. query/next_pending_task { projectId, scope: 'auto' }
   → 拿到下一个 pending 任务（如 I-00-login-statemachine）
2. meta/update_plan_task { ..., taskId, patch: { status: 'doing' } }
3. 执行任务（见下方各任务的具体方法）
4. 任务产物落到 schema
5. meta/update_plan_task { ..., taskId, patch: { status: 'done', notes: '产物指向 ...' } }
6. 给用户回复进度
```

#### 1.0 单屏分析任务（5 个）的执行方法

> 这 5 个任务（statemachine / operations / loading / errors / boundaries）的产物**先在对话回复里展示**给用户看；产物本身**通过后续 1.6-1.x 的落库任务**写入 schema。分析任务做完即标 done。

#### 1.1 状态机三要素（每屏必做）—— 对应任务 `I-<screenId>-statemachine`

为每屏定义完整状态机：

```
States:       页面可能处于的所有状态
Transitions:  什么操作 / 事件触发状态切换
Effects:      切换时 UI 发生什么变化
```

**示例：登录页状态机**

```
States:
  idle        → 初始态，表单空白，按钮可点
  inputting   → 用户正在输入，实时校验
  validating  → 前端校验中（如手机号格式）
  submitting  → 请求发送中，按钮 loading
  success     → 登录成功，准备跳转
  error       → 登录失败，显示错误
  locked      → 多次失败，账户临时锁定

Transitions:
  idle → inputting:        用户聚焦任意输入框
  inputting → validating:  输入满足提交条件（非空 + 格式合法）
  inputting → idle:        清空所有输入
  validating → submitting: 点击登录按钮
  submitting → success:    API 返回 200
  submitting → error:      API 返回 401/500/timeout
  error → inputting:       用户修改输入
  error → locked:          连续失败 ≥ 5 次

Effects:
  → submitting: 按钮显示 spinner + 禁用 + 文字变"登录中..."
  → success:    按钮变绿 ✓ + 0.5s 后跳转主页
  → error:      按钮恢复 + 表单 shake + 错误文字淡入 + 密码框清空并聚焦
  → locked:     全表单禁用 + 显示"请 X 分钟后再试" + 倒计时
```

#### 1.2 操作清单（穷举该屏所有用户可执行的操作）—— 对应任务 `I-<screenId>-operations`

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 | 进行中 | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|---------|-------|---------|---------|---------|
| 1 | 切换登录方式 | click `mode-toggle` | — | toggle 滑动 200ms | — | 表单切换淡入淡出 | — | 保留已输入手机号 |
| 2 | 输入手机号 | input `phone-input` | — | label 上浮 / 实时校验 | — | 解锁登录按钮 | 红字提示"格式不对" | iOS 短信预填 |
| 3 | 提交登录 | click `submit-btn` | formValid + !submitting | 按钮 loading | 表单禁用 + spinner | ✓+跳转 home | shake + Toast | 800ms 防抖 + 重复点击忽略 |

**5 层反馈链**（每行操作都要展开思考，对应表头 7 列）：

```
触发条件 → 即时反馈(L0) → 进行中(L3) → 成功 → 失败 → 边界
```

L0/L3 是即时性级别——L0 = 立刻视觉响应（按下变色），L3 = 异步操作进行中状态（spinner）。

#### 1.3 加载策略（5 个典型场景）—— 对应任务 `I-<screenId>-loading`

| 场景 | 加载态 | 失败恢复 |
|------|-------|---------|
| 首次进入 | 全屏 skeleton 或 loading | retry 按钮 / 错误页 |
| 下拉刷新 | 顶部 spinner / 弹簧动画 | 顶部 toast，保留旧数据 |
| 加载更多（分页） | 列表底部 spinner | 底部"点击重试" |
| 按钮请求（提交/操作） | 按钮内 spinner + 禁用 | shake + Toast，按钮恢复 |
| 静默刷新（后台同步） | 不打扰用户（顶部细线） | 静默 retry，多次失败再提示 |

#### 1.4 错误处理（6 类错误，每类都要有响应）—— 对应任务 `I-<screenId>-errors`

| 错误类 | 何时出现 | UI 模式 | 用户操作 |
|-------|---------|--------|---------|
| 校验错误 | 字段格式不对 | 字段下方红字 + 红框 | 修改输入 |
| 业务错误 | 4xx 业务约束（如密码错） | 错误带强提示 + 关键字段聚焦 | 重试 / 跳走 |
| 权限错误 | 401/403 | 弹窗 + "去登录" / 退到登录页 | 跳转 |
| 网络错误 | 断网 / 请求 timeout | 顶部网络条 + 重试按钮 | 检查网络 / 重试 |
| 服务错误 | 5xx 后端挂 | 全屏错误页 / Toast + retry | 重试 |
| 未知错误 | 兜底 | Toast + "请稍后重试" | 重试 |

**表单校验 4 个时机**：
- `onChange` — 实时（适合长度限制）
- `onBlur` — 失焦校验（适合格式校验，最常用）
- `onSubmit` — 提交时统一校验（必须有）
- `debounce` — 防抖校验（适合需查询的字段，如用户名查重）

#### 1.5 边界 Case（每屏必想）—— 对应任务 `I-<screenId>-boundaries`

- **重复操作**：连续点击 → 防抖 / 节流 / 第一次后禁用
- **超时**：请求超过 N 秒 → 显示超时态，提供 retry
- **离开页面**：表单未保存就退出 → 二次确认 / 自动保存
- **并发冲突**：两次请求同时返回 → 只取最后一次
- **离线**：网络断 → 显示离线提示，缓存待发
- **数据空**：列表空 → EmptyState（不是空白页！）
- **数据极端**：超长文本 / 超多列表 → 截断 / 虚拟滚动

#### 1.6 微交互 & 转场（视觉化 Effects）—— 不单列任务，依附于 events 任务（写在 actions 内）和 design-planner 阶段的 visualState transition

把状态机的 Effects 翻译成具体的动效参数：
- 转场时长（200ms / 300ms）
- 缓动（ease-out / spring）
- 元素的进出方向（淡入 / 滑入 / 缩放）

这些会在 design-planner 阶段落到 `visualState` 的 transition 字段，但 interaction 阶段先在叙事里写清楚意图。

#### 1.7 产品需求覆盖验证（★ 不可省）—— 对应任务 `I-<screenId>-coverage`

每屏分析完后，回到 product-analyst 阶段沉淀的 `screen.meta.product.rules[]`，逐条检查：

```
对该屏的每条 rule:
  - 数据规则 → 是否对应到 event.condition / state/view_add 的 enum 校验
  - 业务规则 → 是否对应到状态机 + events.actions 的某条分支
  - 安全规则 → 是否落到 condition 防滥用（如倒计时按钮、登录次数限制）
  - 边界 Case → 是否对应到 1.5 的边界处理

不覆盖 → 补充交互设计 → 重新分析
```

**rules 全覆盖才算交互层完成**。

---

### 1.x 落库任务（7 个）的执行方法

> Step 1（读 schema）是每个落库任务执行前的"准备动作"，不是独立任务。Step 2-8 各对应一个 plan 任务。

#### Step 1: 读当前 schema（任务执行前的准备）

```
query/screen_schema { projectId, screenId }
→ 拿到 product-analyst 阶段建好的空白屏幕骨架
```

#### Step 2: 注册 view 状态变量 —— 对应任务 `I-<screenId>-state-vars`

把 1.1 状态机里**所有 state 变量**翻译成 ScreenStateInit.view：

```
state/view_add {
  projectId, screenId,
  variable: {
    name: "loginMode",                            ← 驼峰，schema 里 view.loginMode
    label: "登录方式",                              ← 面板展示名
    defaultValue: "code",
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

#### Step 3: 注册数据源 —— 对应任务 `I-<screenId>-datasources`

```
data_source/add {
  projectId, screenId,
  type: "api",
  name: "loginApi",
  endpoint: { method: "POST", path: "/api/login", body: { phone: "{{ view.phone }}", ... } },
  mock: { scenarios: [...] },                     ← 至少 1 个 mock 场景
  autoFetchOnEnter: false                         ← 显式触发 false；首屏自动拉 true
}
```

⚠️ effect.fetch 引用的 dataSourceId 必须先在此 Step 注册。

#### Step 4: 创建触发节点 + 写 events（★ 核心）—— 对应任务 `I-<screenId>-events`

对操作清单里**每一行**：

##### 4a. 创建触发节点（如不存在）

```
element/add {
  projectId, parentId: <父节点 id>,
  name: "ModeToggle",                  ← PascalCase 代码名
  label: "登录方式切换",                  ← 中文展示名
  tag: "div" | "button" | "input" | ...,
  layoutHint?: ...
}
→ 拿到 nodeId，记录下来
```

⚠️ 此阶段建的是**交互骨架**，几何/视觉留给 design-planner 阶段补全。Step 4a 不写复杂 styles，只写"必要存在"的结构。

##### 4b. 写完整 events.actions 链（★ 根治点）

按 `v2-actions-cheatsheet.md` 把"操作描述"翻译成 actions：

```
event/add {
  projectId, nodeId,
  trigger: "click" | "change" | "submit" | "blur" | "screenEnter" | "scrollReachBottom" | ...,
  condition?: { when: "<前置条件表达式>" },
  actions: [ ...完整动作链... ],
  description: "切换验证码/密码登录方式"            ← 必填
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
| 打开 modal | `[{ type: 'state.set', path: 'view.xxxModalOpen', value: true }]` |
| 列表追加/删除 | `state.append` / `state.remove + predicate` |
| 失败分支 | `effect.fetch.onError: logic.switch { value: $last.error.code, cases: [...] }` |

⛔ **常见错误自查**：
- 写了条件样式表达式（`{{ state.view.x === 'a' ? ... }}`）但**没写 click event 改 view.x** → state 永远不变
- effect.fetch 没写 onError → 用户看不到失败反馈
- 输入框写 `event: change → state.set` 而不是 `set_bind` → 失去受控双向绑定优势

##### 4c. 受控输入框：set_bind（不是 event）

对 `<input>` / `<textarea>` / `<select>`：

```
element/set_bind { projectId, nodeId, path: "view.phone" }
```

实现：value 自动取自 state.view.phone，change 自动 dispatch state.set。比手写 event 简洁且不易错。

#### Step 5: 弹窗 / 浮层（用 visibleWhen 实现）—— 对应任务 `I-<screenId>-overlays`

> ⚠️ schema 类型层已预留 `Screen.overlays[]`，但 op 链路尚未实装。当前阶段统一用 `visibleWhen` 表达式 + view 状态变量实现弹窗：

```
1. 注册控制变量：
   state/view_add { variable: { name: "forgotModalOpen", defaultValue: false } }

2. 创建 modal 容器节点（fixed 定位 + 蒙层）：
   element/add { name: "ForgotPasswordModal", tag: "div", ... }
   → 拿到 modalNodeId

3. 给 modal 节点绑条件可见：
   element/set_visible_when { nodeId: modalNodeId, visibleWhen: "{{ state.view.forgotModalOpen }}" }

4. 触发开/关用 state.set：
   - 打开按钮 event: actions: [{ type: 'state.set', path: 'view.forgotModalOpen', value: true }]
   - 关闭按钮 event: actions: [{ type: 'state.set', path: 'view.forgotModalOpen', value: false }]
   - 点蒙层关闭：在蒙层节点上 event.click 触发 state.set false
```

#### Step 6: 写叙事到 meta（B 类）—— 对应任务 `I-<screenId>-meta`

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

#### Step 7: ⛔ 自检（强制门禁）—— 对应任务 `I-<screenId>-integrity`

```
query/integrity { projectId, screenId }
```

期望：

| 规则 | 期望结果 | 不达标怎么办 |
|------|---------|------------|
| R-EVENTS-01（节点声明交互意图但 events 缺 interactive trigger）| **0 错误** | 立刻补 event/add |
| R-EVENTS-02（event 没 actions）| **0 错误** | 立刻补 actions |
| R-PHASE-01（phase 一致性）| 0 错误 | meta.status.phase 改回 "interaction-defined" |

**0 error 才允许进下一屏**；如有错误，回到 Step 4 补完。

#### Step 8: 通知用户进度（每次任务完成后的回复）

```
✅ 屏幕 00-login 交互层完成：
   - view 变量 X 个，dataSource Y 个，events Z 个，overlays N 个
   - integrity 0 error
   - 产品规则 N 条已 100% 覆盖

➡️ 下一屏：xxx
```

---

## 每轮回复格式

每轮做完一个 plan 任务后：

```
🎯 任务：[I-<screenId>-<task>] [任务标题]
📝 产物：[本任务做了什么，简短 1-3 行]
✅ 已落库：[schema 哪个字段被写了，如 "screen.stateInit.view 增加 loginMode 变量"]

📊 本屏进度：[完成 X/Y 任务]
➡️ 下个任务：[next_pending_task 返回的 ID + 标题]
```

**何时停下问用户**：交互方案有真分歧（如"忘记密码走短信还是邮箱"两种合理路径），把选项说清问一次；其余按专业判断推。

---

## 必须 / 禁止

### 必须

- 每屏分析覆盖全 6 项：状态机 / 操作清单 / 加载策略 / 错误处理 / 边界 Case / 微交互
- 每条产品 rule 都要在交互层有对应（Phase 1.7 必做）
- Phase 0 启动时强制加载 `v2-actions-cheatsheet.md`
- Step 4a + 4b 配对调用（建节点 + 写 events 不分开）
- effect.fetch 必须有 onSuccess + onError 两个分支
- 受控输入框用 `set_bind`，不要 event change
- Step 7 integrity 必须 0 error 才能进下一屏

### 禁止

- 在工作区写任何 `.md` / `.json` 作为信息源
- 描述"click→切换"但 schema 里 events 为空（events 丢失的根因）
- 用条件样式表达式假装"做完了交互"——条件样式只是响应，必须配套触发 event
- events.actions 为空数组
- 跨屏批量改：每屏一轮，全部 7 步走完才进下一屏
- 跳过 Phase 1.5 边界 Case 思考（重复点击 / 超时 / 离开 / 并发 / 离线 / 空数据 / 极端数据）

---

## 与下游技能的衔接

| schema 字段 | 下游消费方 | 消费方式 |
|------------|-----------|---------|
| `events[].actions[]` | design-executor | **零翻译**——已结构化，executor 直接执行 |
| `stateInit.view/data` | design-executor | 直接生效 |
| `dataSources[]` | design-executor / design-planner | mock 场景给 planner 预览态用 |
| `overlays[]` / modal 节点 | design-planner | 在 modal rootNode 上补样式 |
| `meta.interaction` | design-planner | 读流程叙事辅助决定 visualStates / transitions |

---

## 新会话续接

```
1. query/list_projects → 找 projectId
2. query/next_pending_task { projectId, scope: 'auto' }
   → stage='interaction' 的任务直接接续做
   → null 时跑 query/integrity 二检：若有 R-EVENTS-* 错误立刻补；否则准备移交 design-planner
```

schema 自身就是状态。

---

## 详细参考（按需加载）

- `../common/references/v2-actions-cheatsheet.md` — ★ 强制前置（22 动词 + 10 类操作模板）
- `references/interaction-patterns.md` — 反馈层级 / 加载策略 / 错误处理 / 转场（方法论详细版）
- `references/state-machine-examples.md` — 典型页面状态机案例
- `references/error-handling-patterns.md` — 错误处理最佳实践
