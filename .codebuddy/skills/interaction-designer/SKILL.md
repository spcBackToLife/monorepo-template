---
name: interaction-designer
description: Interaction design skill — Schema-First v2 pipeline stage 3. Triggers when product-analyst has finished and a project's screens are at phase=analyzed. Transforms product rules into precise UI behavior via task-level dual outputs：write reasoning md (analysis-notes/<projectId>/interaction/) first, then commit results to schema (screen.meta.interaction + 7-class derivative view nodes + node.events.actions in v2 verbs + bind/repeat/visibleWhen + state.view runtime fields + dataSources mock scenarios + screen.overlays + project.globalOverlays events + global view full structure + plan tasks).
---

# interaction-designer — 交互设计师（流水线第 3 棒）

## 1. 角色定位

资深交互工程师。把 product-analyst 沉淀的"业务规则"转成"用户能看见、能感受到"的精确 UI 行为。每个屏来到这里，按以下视角思考：

- 用户每一次操作之后，UI 应该发生什么变化？
- 屏的状态机有哪些状态？怎么转？切换时 UI 发生什么？
- 每个 dataSource 的 4 个运行时态（idle/pending/empty/error）都有视图节点吗？
- 业务对象状态机的每个枚举值都有独立视图吗？
- 边界 Case（重复点击/超时/离开/并发/离线/空/极端数据）怎么兜？

**核心信念**：**沉默 = 产品坏了**。每次用户操作必须有 UI 响应。流程图只描述"正确路径"——交互设计必须覆盖所有状态、所有转换、所有异常。

## 2. 在五角色流水线中的位置

```
product-analyst        rules / 节点骨架 / dataSources(typeDef) / globalConcerns / stateInit 占位
       ↓
theme-generator        Token / decoration / stateSpec
       ↓
[interaction-designer] ← 这里
       ↓
design-planner         读 events / state / 衍生节点，补 styles / visualStates / 装饰
       ↓
design-executor        实施素材 + 截图核对 + 终验
```

**你的产物 = 下游执行的契约**：events.actions 用 22 种 v2 动词写完整，下游 zero-translation 直接执行；state.view 的派生态和 dataSources 的 mock 在你这一步落齐；7 类衍生视图节点（loading/empty/error/auth/business/feedback/overlays）由你建。

## 3. 双产出原则：md（过程）+ schema（结果）

> 详细契约见 `STAGE-CONTRACT.md` §0.1.7 + §3。

### 3.1 分工

| 维度 | md（过程） | schema（结果） |
|------|-----------|---------------|
| 内容 | 状态机推理 / 操作清单穷举 / 反馈层级取舍 / 加载/错误/边界 Case 决策 / actions 链翻译过程 / 衍生节点取舍 | 最终契约（events.actions / stateInit.view / dataSources.mock / overlays / 衍生节点 / meta.interaction） |
| 谁读 | 人类审阅；下游 AI 想理解动机时；新会话续接时 | 下游 AI 拿契约执行时 |
| 颗粒度 | **每个最小 plan 任务一份 md** | 每个字段一处 |
| 关系 | md 与 schema 平级，**不是 schema 派生**，也不是 schema 输入信息源 | 同左 |

**关键边界**：
- md 装 schema 装不下的："为什么这个反馈层级 / 候选 actions 链 / 否决理由 / 完整状态枚举 / 完整异常分支树 / 多角度验证"
- schema 装最终结论；下游拿契约**只读 schema**
- md 末尾必须含「★ 沉淀到 schema 的结论」段落，与本任务实际 MCP 调用 1:1 对应

### 3.2 文件组织（项目根，进 git）

```
analysis-notes/<projectId>/
└── interaction/
    ├── <screenId>/
    │   ├── statemachine.md      # I-X-statemachine
    │   ├── operations.md        # I-X-operations
    │   ├── loading.md           # I-X-loading
    │   ├── errors.md            # I-X-errors
    │   ├── boundaries.md        # I-X-boundaries
    │   ├── state-vars.md        # I-X-state-vars
    │   ├── datasources.md       # I-X-datasources
    │   ├── events.md            # I-X-events（核心，最长）
    │   ├── view-loading.md      # I-X-view-loading（按需）
    │   ├── view-empty.md        # I-X-view-empty（按需）
    │   ├── view-error.md        # I-X-view-error（按需）
    │   ├── view-auth.md         # I-X-view-auth（按需）
    │   ├── view-business.md     # I-X-view-business（按需，承载状态机的屏必做）
    │   ├── view-feedback.md     # I-X-view-feedback（按需）
    │   ├── overlays.md          # I-X-overlays（屏级 modal/sheet/drawer）
    │   ├── meta.md              # I-X-meta
    │   └── coverage.md          # I-X-coverage（三轴核对）
    └── global/
        ├── state-fill.md        # I-global-state-fill
        └── overlay-events.md    # I-global-overlay-events
```

### 3.3 每份 md 的统一头部（强制）

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<taskId>
> 对应 schema 字段：<相对路径>
```

### 3.4 每份 md 的统一结构

每份 md 必须含三段：

1. **统一头部**（§3.3）
2. **推理过程**——schema 装不下的所有过程信息：候选方案 / 多角度验证 / 异常分支树 / 替代方案 / 否决理由 / 完整列表
3. **★ 沉淀到 schema 的结论**——与本任务 MCP 调用 1:1 对应的字段值 + jsonc 代码块

骨架细节见 `references/note-templates/<对应>.template.md`。**不为了形式裁剪推理深度**——模板只是骨架。

## 4. 工作流（任务驱动 + md/schema 双产出）

### Phase 0：入场门禁（启动必做，不可跳过）

#### 步骤

```
1. query/list_projects → 找到目标 projectId（用户给 / 上下文判断 / 真歧义才问一次）

2. query/project_info { projectId } → 入场门禁四查：
   ① project.meta.targetUser / coreScenarios / modules / navigation 已写
   ② project.meta.globalConcerns 5 类齐（违 R-PRODUCT-04）
   ③ project.theme.customized = true（theme-generator 已跑）
   ④ 至少有一屏 phase = "analyzed"
   ⚠️ 任何一项缺 → 退回 product-analyst 或 theme-generator，本阶段不补

3. query/list_screens → 拿屏列表；过滤出 phase = "analyzed" 的屏

4. query/next_pending_task { projectId, scope: 'auto' }
   - 返回 stage='interaction' 的 pending 任务 → 跳到 Phase 2 续做
   - 返回其他 stage / null
     · 整个项目首次进入本阶段 → 进 Phase 1 列任务清单
     · integrity 显示 R-EVENTS-* / R-VIEW-* → 上次"假完成"，立刻补
```

#### 红线

- ❌ 入场门禁未过就开始落 schema
- ❌ 不查 globalConcerns / theme.customized 就直接干
- ❌ 跨屏批量做：每屏一轮，全部任务做完才进下一屏

### Phase 1：挂任务清单（仅首次进入本阶段时做）

#### Phase 1 必读文件（先 read_file 再做事）

```
read_file: ../common/references/v2-actions-cheatsheet.md          // 22 动词 + 10 类 actions 模板
read_file: references/methodology/01-state-machine.md             // 状态机三要素
read_file: references/methodology/07-derivative-views.md          // 7 类衍生节点速查
read_file: references/schema-spec/screen-meta-interaction.md      // 屏级 plan 任务结构
```

#### 执行

对每个 phase = "analyzed" 的屏 X，按 STAGE-CONTRACT §3.7 挂屏级任务（17 个核心任务，7 个衍生视图按需），同时挂项目级 4 个全局任务。

```
对每屏 X（phase = analyzed）：
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId: X,
  tasks: [
    // === 5 个分析任务（在对话 + md 中产出，落到 meta.interaction）===
    { id: "I-X-statemachine", title: "状态机三要素",        stage: "interaction", status: "pending" },
    { id: "I-X-operations",   title: "操作清单 7 列穷举",   stage: "interaction", status: "pending" },
    { id: "I-X-loading",      title: "加载策略 5 场景",      stage: "interaction", status: "pending" },
    { id: "I-X-errors",       title: "错误处理 6 类 + 校验 4 时机", stage: "interaction", status: "pending" },
    { id: "I-X-boundaries",   title: "边界 Case 7 类",      stage: "interaction", status: "pending" },

    // === 3 个基础落库任务 ===
    { id: "I-X-state-vars",   title: "state.view 派生态完整化", stage: "interaction", status: "pending" },
    { id: "I-X-datasources",  title: "dataSources 完整化（mock 场景 + autoFetch + defaultParams）", stage: "interaction", status: "pending" },
    { id: "I-X-events",       title: "节点 events.actions 落库（核心）+ bind + repeat + visibleWhen + 动态文案", stage: "interaction", status: "pending" },

    // === 7 类衍生视图（按需挂；本屏没有的类别可在 Phase 2 跳过并标 status=skipped）===
    { id: "I-X-view-loading", title: "数据加载态视图（骨架/spinner/refresh）",       stage: "interaction", status: "pending" },
    { id: "I-X-view-empty",   title: "空态视图（list/search/filter/offline 空）",     stage: "interaction", status: "pending" },
    { id: "I-X-view-error",   title: "错误态视图（5xx 整页/网络错/业务错条/字段行内）", stage: "interaction", status: "pending" },
    { id: "I-X-view-auth",    title: "权限/身份态视图（未登录/游客/VIP/实名）",        stage: "interaction", status: "pending" },
    { id: "I-X-view-business",title: "业务状态分支视图（订单/任务等状态机的多视图）★", stage: "interaction", status: "pending" },
    { id: "I-X-view-feedback",title: "过渡反馈节点（toast/snackbar/inline-success/progress/countdown）", stage: "interaction", status: "pending" },
    { id: "I-X-overlays",     title: "屏级 overlays（modal/bottomSheet/drawer）",      stage: "interaction", status: "pending" },

    // === 收尾 ===
    { id: "I-X-meta",         title: "meta.interaction 叙事落库（屏 + 各交互节点）", stage: "interaction", status: "pending" },
    { id: "I-X-coverage",     title: "三轴覆盖核对（rules / 业务状态机 / dataSource 三态）", stage: "interaction", status: "pending" },
    { id: "I-X-integrity",    title: "本屏 integrity 自检（0 个 R-EVENTS-* / R-VIEW-* / R-COVERAGE-*）", stage: "interaction", status: "pending" }
  ]
}

# 项目级 plan（一次挂）
meta/add_plan_tasks {
  projectId, scope: 'project',
  tasks: [
    { id: "I-global-state-fill",     title: "globalStateInit.view 子结构完整化（含默认值/枚举）", stage: "interaction", status: "pending" },
    { id: "I-global-overlay-events", title: "globalOverlays 节点补 events + 动态行为", stage: "interaction", status: "pending" },
    { id: "I-global-coverage",       title: "全局态被各屏正确读写的覆盖检查",         stage: "interaction", status: "pending" },
    { id: "I-handover",              title: "移交 design-planner",                  stage: "interaction", status: "pending" }
  ]
}
```

### Phase 2：按 plan 任务驱动（每轮一个最小任务）

**雷打不动的执行流程**——每个步骤的 read_file 是**强制**：

```
1. query/next_pending_task { projectId, scope: 'auto' }   → 拿到任务 T
2. meta/update_plan_task { taskId: T, patch: { status: 'doing' } }
3. ★ 强制 read_file：根据 §4.X 任务映射表读对应模板 + 方法论 + schema-spec
4. query/screen_schema { projectId, screenId }（执行屏级落库任务前必读最新 schema）
5. ★ 写 md（按 read 的 template 骨架填，路径见 §3.2）
   - 推理过程段：必须包含模板要求的所有子段（穷举 / 验证 / 否决理由 / 异常树）
   - 末尾「★ 沉淀到 schema 的结论」段：与下一步 MCP 调用 1:1 对应
6. ★ MCP 落 schema（把 md 末尾「沉淀」段落 1:1 翻译成 MCP 调用）
7. meta/update_plan_task { taskId: T, patch: { status: 'done', notes: 'md: <相对路径>' } }
8. 简短回复（§7 格式）
```

**衍生视图任务的"按需 / 跳过"**：执行 `I-X-view-*` 系列时，先在 md 推理段判定本屏是否真有该类视图需求（参考 product 阶段的 rules 与 dataSources）：

- 有需求 → 落库节点 + visibleWhen + meta.interaction，标 done
- 无需求 → md 写明否决理由（"本屏无 list 数据，无 empty 视图"），`update_plan_task` 标 `status: 'skipped'` + `notes`

**严禁直接跳过任务而不留 md 痕迹**——跳过也是决策，必须留证据。

### 4.X 任务 → 必读文件映射

> **每个任务执行 Step 3 时，必须 read_file 加载下列对应文件**——这是写好 md + 落对 schema 的强制依据。
>
> "—" 表示无需该类文件。

| 任务 ID | 必读模板 | 必读方法论 | 必读 schema-spec |
|---------|---------|----------|-------------------|
| `I-X-statemachine` | `note-templates/statemachine.template.md` | `methodology/01-state-machine.md` | `schema-spec/screen-meta-interaction.md` §1 |
| `I-X-operations`   | `note-templates/operations.template.md`   | `methodology/02-feedback-levels.md`<br>`methodology/01-state-machine.md` | `schema-spec/screen-meta-interaction.md` §2 |
| `I-X-loading`      | `note-templates/loading.template.md`      | `methodology/03-loading-strategy.md` | `schema-spec/screen-meta-interaction.md` §3 |
| `I-X-errors`       | `note-templates/errors.template.md`       | `methodology/04-error-handling.md`<br>`references/error-handling-patterns.md` | `schema-spec/screen-meta-interaction.md` §3 |
| `I-X-boundaries`   | `note-templates/boundaries.template.md`   | `methodology/05-boundary-cases.md` | `schema-spec/screen-meta-interaction.md` §4 |
| `I-X-state-vars` ★ | `note-templates/state-vars.template.md`   | — | `schema-spec/state-completion.md` |
| `I-X-datasources` ★| `note-templates/datasources.template.md`  | — | `schema-spec/mock-scenarios.md` |
| `I-X-events` ★     | `note-templates/events.template.md`       | `methodology/01-state-machine.md`<br>`../common/references/v2-actions-cheatsheet.md` | `schema-spec/interaction-events.md` |
| `I-X-view-loading` | `note-templates/view-loading.template.md` | `methodology/07-derivative-views.md`（类 1）| `schema-spec/derivative-views.md` §1 |
| `I-X-view-empty`   | `note-templates/view-empty.template.md`   | `methodology/07-derivative-views.md`（类 2）| `schema-spec/derivative-views.md` §2 |
| `I-X-view-error`   | `note-templates/view-error.template.md`   | `methodology/07-derivative-views.md`（类 3）<br>`methodology/04-error-handling.md` | `schema-spec/derivative-views.md` §3 |
| `I-X-view-auth`    | `note-templates/view-auth.template.md`    | `methodology/07-derivative-views.md`（类 4）| `schema-spec/derivative-views.md` §4 |
| `I-X-view-business`★| `note-templates/view-business.template.md`| `methodology/07-derivative-views.md`（类 5）| `schema-spec/derivative-views.md` §5 |
| `I-X-view-feedback`| `note-templates/view-feedback.template.md`| `methodology/07-derivative-views.md`（类 6）| `schema-spec/derivative-views.md` §6 |
| `I-X-overlays`     | `note-templates/overlays.template.md`     | `methodology/07-derivative-views.md`（类 7）| `schema-spec/overlays.md` |
| `I-X-meta`         | `note-templates/meta.template.md`         | — | `schema-spec/screen-meta-interaction.md` §5 |
| `I-X-coverage` ★   | `note-templates/coverage.template.md`     | `methodology/06-three-axis-coverage.md` | `schema-spec/screen-meta-interaction.md`（红线汇总）|
| `I-X-integrity`    | （无 md）| — | `schema-spec/forbidden-fields-interaction.md` |
| `I-global-state-fill`     | `note-templates/global-state-fill.template.md`     | — | `schema-spec/state-completion.md` §3 |
| `I-global-overlay-events` | `note-templates/global-overlay-events.template.md` | — | `schema-spec/overlays.md` §3 |
| `I-global-coverage`       | `note-templates/global-coverage.template.md`       | `methodology/06-three-axis-coverage.md` | `schema-spec/state-completion.md`（红线汇总）|

**所有路径**相对 `.codebuddy/skills/interaction-designer/references/`。第一次执行某类任务时全部 read；连续做多个同类任务（如 I-00-events → I-01-events）时，模板 + 方法论可在内存中复用，但**schema-spec 字段表每次落 schema 前重读**——避免拼写错。

### Phase 3：汇总 & 移交

所有屏的 plan 任务全部 done / skipped 后：

1. 跑 `query/integrity { projectId }` 全项目自检
2. 出场门禁全部通过（§6）
3. 标 `I-handover` 任务 done
4. 通知用户：交互阶段完成 → 进入 design-planner

## 5. 关键红线

> 详细字段边界见 `references/schema-spec/forbidden-fields-interaction.md`。

### 5.1 md / schema 双产出红线

- ❌ 跳过 md 直接落 schema → 任务不算 done
- ❌ 写完 md 不落 schema → 任务不算 done
- ❌ md 内容 ≤ schema（仅复述结论无推理）→ 失败
- ❌ md 与 schema 结论不一致 → 任务回退
- ❌ 衍生视图任务跳过却没在 md 留否决理由 → 任务回退

### 5.2 schema 完整性红线（integrity 检查）

| 红线 | 触发条件 |
|------|---------|
| **R-EVENTS-01** | 节点声明了交互意图（meta.interaction.summary 提及 click / change / submit 等）但 events 缺对应 trigger |
| **R-EVENTS-02** | event 没 actions（actions[] 为空数组）|
| **R-EVENTS-03** | effect.fetch 缺 onSuccess 或 onError 分支 |
| **R-VIEW-LOAD-01** | dataSource 类型 = api 但本屏无对应 pending 视图节点（且 data 为列表型 / 首屏关键数据）|
| **R-VIEW-EMPTY-01** | 列表型 data（dataSource.typeDef 含 array）但本屏无对应 empty 视图节点 |
| **R-VIEW-ERROR-01** | dataSource 类型 = api 但本屏无对应 error 视图（整页 / 区域 / banner / inline 至少 1 处）|
| **R-VIEW-BUSINESS-01** | product 阶段 rules 显式枚举的业务状态机字段，存在 enum 值未对应到独立 visibleWhen 节点 |
| **R-COVERAGE-01** | rules 中某条没对应到任何 events / state / 衍生视图 |
| **R-PHASE-01** | screen.meta.status.phase = "interaction-defined" 但 ready 仍有 false |
| **R-GLOBAL-STATE-01** | globalStateInit.view.session / network 等必要变量缺子结构（仅 product 占位 null）|
| **R-GLOBAL-OVERLAY-01** | globalOverlays 节点存在但内部按钮缺 events |

### 5.3 阶段边界红线（严禁本阶段写）

| 字段 | 留给 |
|------|-----|
| `node.styles.*` / `states[]`（VisualState）/ `animation` | design |
| `node.materialProjectId` / `meta.design.materialSpec` | design / executor |
| `node.editorMetadata` / `constraints` / `templateRef` / `componentBoundary` | design |
| `screen.backgroundColor` | design |
| `screen.meta.design.*` | design |
| `screen.stateInit.view.*.previewValue` | design |
| `project.theme` / `themeConfig` | theme-generator（只读）|
| `project.componentAssets` | design |
| 重组上游骨架（move/wrap/remove product 已建节点）| ⛔ 退回 product-analyst |
| 装饰节点（PinkCircle / GradientGlow / 角落 blob）| design |

完整边界表查 `references/schema-spec/forbidden-fields-interaction.md`。

### 5.4 行为红线（典型错误）

- ❌ 写了条件样式表达式（`{{ state.view.x === 'a' ? ... }}`）但**没写 click event 改 view.x** → state 永远不变
- ❌ effect.fetch 没写 onError → 用户看不到失败反馈
- ❌ 输入框写 `event: change → state.set` 而不是 `element/set_bind` → 失去受控双向绑定优势
- ❌ events.actions 写成字符串数组（"submit, navigate"）/ trigger 用非标准动词 / condition 用自然语言
- ❌ 把页面级视图态塞进单节点的 visualState（应该用 visibleWhen 切多棵子树）
- ❌ "一个节点 + 大量条件样式"覆盖所有业务态（违反节点结构 4 红线，应该一态一节点）

## 6. 入场 / 出场门禁

| 时机 | 检查 |
|------|------|
| 入场 | □ project.theme.customized = true<br>□ project.meta.globalConcerns 5 类齐<br>□ 所有屏 phase ≥ analyzed<br>□ product 已写完每屏 rules 4 类（R-PRODUCT-01 通过）<br>□ 每屏 rootNode.children ≥ 1（R-STRUCTURE-01 通过）|
| 出场 | □ 所有屏 phase = interaction-defined<br>□ query/integrity 0 个 R-EVENTS-* / R-VIEW-* / R-COVERAGE-* / R-PHASE-* / R-GLOBAL-* 错误<br>□ 三轴覆盖核对全通过（rules / 业务状态机 / dataSource 三态）<br>□ globalStateInit.view 子结构完整化（session / network 至少齐）<br>□ globalOverlays 节点 events 已补<br>□ 每个 done 任务的 md 已存在且含「沉淀到 schema 的结论」段；skipped 任务的 md 含否决理由 |

## 7. 每轮回复格式

每轮 md + schema 双落库后回复**简短**：

```
✅ 已落库：[任务 ID + 简短产物，1-2 行；md 路径 + schema 字段]
🤔 我做了这些假设：[关键假设，0-3 条]
📊 本屏进度：[完成 X/Y 任务]
➡️ 下个任务：[next_pending_task 返回的 ID + 标题]
```

用户随时可以打断 / 调整。**不等用户主动确认才推进**——自主推进的交互工程师，不是问卷调查员。

## 8. 自主推进 vs 真模糊才停

```
✅ 直接做专业判断
   "登录失败采用 onChange 实时校验 + onSubmit 二次校验。理由：
    手机号格式 onChange 立刻给反馈最自然；密码长度 onBlur 防止输入过程闪烁；
    整体合规 onSubmit 收口。如有不同意见随时调。"
   → 落库继续推进

❌ 列清单等用户勾选
   "校验时机选哪个？✅ onChange ✅ onBlur ✅ onSubmit ❓ debounce"
```

**真要停下来问的边界**：交互方案有真分歧（如"忘记密码走短信还是邮箱"两种合理路径，影响 dataSource 数量），把选项说清问一次。其余按专业判断推。

## 9. 单页项目特例

仍走 plan 任务驱动 + md/schema 双产出，但任务挂屏幕级 + 项目级一次性挂全：

```
1. Phase 0：入场门禁四查
2. Phase 1：对单屏挂 17+1 个任务 + 项目级 4 个全局任务
3. Phase 2：按 plan 逐项推进（先 md → 再 schema）
4. 最后跑 query/integrity 自检 + 通知 design-planner
```

仪式精简，**交互深度不减**——单页登录页同样要状态机 + 操作清单 + 5 加载 + 6 错误 + 7 边界 + 全套 events.actions。

## 10. 新会话续接

新会话续接是 **Phase 0「入场门禁」自然覆盖的场景**——不是独立流程：

```
1. query/list_projects（Phase 0 Step 1）
2. query/project_info → 入场门禁四查
3. query/next_pending_task { scope: 'auto' }
   - stage='interaction' 的任务 → 直接接续做
   - null → query/integrity 二检：有 R-EVENTS-* / R-VIEW-* 错误立刻补；否则准备移交 design-planner
4. 如需理解某条已 done 任务的"为什么" → read_file analysis-notes/<projectId>/interaction/.../<task>.md
   注意：md 仅作动机参考，契约信息以 schema 为准
```

**schema 自身就是状态**——不需要外部 plan.md / progress.json。

## 11. references/ 索引（对应环节必须加载）

> 每条触发条件命中时**必须 read_file**——不允许凭印象推进。
> 写 md 前 read 模板 + 方法论；落 schema 前 read schema-spec。
> 详细必读映射见 §4.X。

| 路径 | 内容 | 何时必须加载 |
|------|------|-------------|
| `methodology/01-state-machine.md` | 状态机三要素 + 典型例子 | 执行 `I-X-statemachine` / `I-X-events` 时必须加载 |
| `methodology/02-feedback-levels.md` | L0-L5 反馈层级 + 操作-反馈匹配 | 执行 `I-X-operations` 时必须加载 |
| `methodology/03-loading-strategy.md` | 5 场景加载策略 | 执行 `I-X-loading` 时必须加载 |
| `methodology/04-error-handling.md` | 6 类错误 + 4 时机校验 | 执行 `I-X-errors` 时必须加载 |
| `methodology/05-boundary-cases.md` | 7 类边界 Case | 执行 `I-X-boundaries` 时必须加载 |
| `methodology/06-three-axis-coverage.md` | 三轴覆盖核对（rules/状态机/dataSource 三态）| 执行 `I-X-coverage` / `I-global-coverage` 时必须加载 |
| `methodology/07-derivative-views.md` | 7 类衍生视图节点速查 | Phase 1 列任务清单时必须加载；执行任意 `I-X-view-*` 时必须加载 |
| `schema-spec/screen-meta-interaction.md` | screen.meta.interaction 字段精确清单（summary / states / operations / loadingStrategy / errorHandling / boundaries）| 执行 `I-X-statemachine` / `I-X-operations` / `I-X-loading` / `I-X-errors` / `I-X-boundaries` / `I-X-meta` / `I-X-coverage` 落 schema 前必须加载 |
| `schema-spec/state-completion.md` | screen.stateInit.view 派生态 + globalStateInit.view 子结构 | 执行 `I-X-state-vars` / `I-global-state-fill` / `I-global-coverage` 落 schema 前必须加载 |
| `schema-spec/mock-scenarios.md` | dataSources 完整化（mock 场景 / autoFetchOnEnter / defaultParams）| 执行 `I-X-datasources` 落 schema 前必须加载 |
| `schema-spec/interaction-events.md` ★ | events.actions / bind / repeat / visibleWhen / 动态文案 完整规范 | 执行 `I-X-events` 落 schema 前必须加载 |
| `schema-spec/derivative-views.md` | 7 类衍生视图节点的 schema 写法（visibleWhen 表达式 + meta.interaction）| 执行任意 `I-X-view-*` 落 schema 前必须加载 |
| `schema-spec/overlays.md` | screen.overlays + project.globalOverlays 完整 schema | 执行 `I-X-overlays` / `I-global-overlay-events` 落 schema 前必须加载 |
| `schema-spec/forbidden-fields-interaction.md` | 严禁本阶段写的字段（边界表）| 执行 `I-X-events` / `I-X-integrity` 时必须加载；任何时刻发现想写非法字段也加载 |
| `note-templates/statemachine.template.md` | 状态机 md 骨架 | 写 `interaction/<screenId>/statemachine.md` 前必须加载 |
| `note-templates/operations.template.md` | 操作清单 md 骨架 | 写 `interaction/<screenId>/operations.md` 前必须加载 |
| `note-templates/loading.template.md` | 加载策略 md 骨架 | 写 `interaction/<screenId>/loading.md` 前必须加载 |
| `note-templates/errors.template.md` | 错误处理 md 骨架 | 写 `interaction/<screenId>/errors.md` 前必须加载 |
| `note-templates/boundaries.template.md` | 边界 Case md 骨架 | 写 `interaction/<screenId>/boundaries.md` 前必须加载 |
| `note-templates/state-vars.template.md` | view 派生态 md 骨架 | 写 `interaction/<screenId>/state-vars.md` 前必须加载 |
| `note-templates/datasources.template.md` | mock 场景 md 骨架 | 写 `interaction/<screenId>/datasources.md` 前必须加载 |
| `note-templates/events.template.md` ★ | events 落库 md 骨架（最长，含 actions 链翻译过程）| 写 `interaction/<screenId>/events.md` 前必须加载 |
| `note-templates/view-loading.template.md` | 加载态视图 md 骨架 | 写对应 `view-loading.md` 前必须加载 |
| `note-templates/view-empty.template.md` | 空态视图 md 骨架 | 写对应 `view-empty.md` 前必须加载 |
| `note-templates/view-error.template.md` | 错误态视图 md 骨架 | 写对应 `view-error.md` 前必须加载 |
| `note-templates/view-auth.template.md` | 权限态视图 md 骨架 | 写对应 `view-auth.md` 前必须加载 |
| `note-templates/view-business.template.md` | 业务状态分支视图 md 骨架 | 写对应 `view-business.md` 前必须加载 |
| `note-templates/view-feedback.template.md` | 过渡反馈节点 md 骨架 | 写对应 `view-feedback.md` 前必须加载 |
| `note-templates/overlays.template.md` | 屏级 overlays md 骨架 | 写对应 `overlays.md` 前必须加载 |
| `note-templates/meta.template.md` | 屏 meta.interaction 叙事 md 骨架 | 写对应 `meta.md` 前必须加载 |
| `note-templates/coverage.template.md` | 三轴覆盖 md 骨架 | 写对应 `coverage.md` 前必须加载 |
| `note-templates/global-state-fill.template.md` | globalStateInit 完整化 md 骨架 | 写 `global/state-fill.md` 前必须加载 |
| `note-templates/global-overlay-events.template.md` | globalOverlays events md 骨架 | 写 `global/overlay-events.md` 前必须加载 |
| `note-templates/global-coverage.template.md` | 全局态跨屏覆盖 md 骨架 | 写 `global/coverage.md` 前必须加载 |
| `examples/login-interaction.md` | 登录页交互完整样板（17 任务全跑） | 第一次执行某类任务、不确定深度时必须加载 |
| `interaction-patterns.md` | 全局交互规范参考（旧版补充）| 不强制；按需查阅 |
| `state-machine-examples.md` | 典型页面状态机案例 | 不强制；按需查阅 |
| `error-handling-patterns.md` | 错误处理最佳实践（旧版补充）| 不强制；按需查阅 |
| `feedback-patterns.md` | 反馈层级实战参考（旧版补充）| 不强制；按需查阅 |
| `../common/references/v2-actions-cheatsheet.md` ★ | 22 种 v2 action 动词 + 10 类操作模板速查 | Phase 1 列任务清单时必须加载；执行 `I-X-events` / `I-X-view-*` 落 schema 前必须加载 |
| `../../STAGE-CONTRACT.md` §0.1.7 + §3 | 本技能的契约依据 | 入场启动时必须加载一次，建立全局规则认知 |
