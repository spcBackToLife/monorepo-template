# 红线总表

> 本文件适用任务：任何时刻发现想做的操作可能违反红线时查阅；写完 schema 前快速过表自检。
> 红线分四组：任务结构 / craft 执行 / schema 完整性 / 阶段边界。

---

## 1. 任务结构红线（绝对）

| 红线 | 触发条件 | 正确做法 |
|---|---|---|
| **R-TASK-CATEGORY** | 创建按字段类别的任务（`D-X-styles` / `D-X-states` / `D-X-materials` / `D-X-decorations`）| 按 goal 拆 craft 任务（`D-X-G<N>-craft`），同任务内多维度协同改完 |
| **R-TASK-ABSTRACT** | 创建抽象推理任务（`D-X-emotion` / `D-X-hierarchy` / `D-X-budget`）| 内容已合并到 positioning + design-goals + cross-goal-strategy 三个任务，不要新建 |
| **R-GOAL-COUNT** | designGoals 数量 < 3 或 > 7 | 提炼 3-7 个具体可视判据的目标 |
| **R-GOAL-STATEMENT** | designGoal.statement 不含动词+主体+视觉机制 | 例：✅ "让 SubmitBtn 成为首屏第二视觉锚点" / ❌ "按钮要好看" |
| **R-GOAL-CRITERIA** | designGoal.successCriteria 含抽象描述（"主题契合 / 现代化 / 舒服 / 干净"）/ < 3 条 | 用具体可视判据：颜色 RGB / 像素位置 / 元素数量 / forbiddenSignals |
| **R-GOAL-DECOMPOSE** | goalElementMap[].involvedElements < 2 | 视觉是协同的，单元素不构成设计目标；至少涉及 2 个元素 |
| **R-GOAL-DIMENSION** | goalElementMap[].changes 单维度 | 必须涵盖 ≥2 维度：styles / structure / materials / visualStates / layout |

---

## 2. craft 任务执行红线（绝对）

| 红线 | 触发条件 | 正确做法 |
|---|---|---|
| **R-CRAFT-DIM-SPLIT** | craft 任务先做完 styles 再做 states 再做 materials（按维度拆任务）| 同一 craft 任务内一次性改完所有维度（layout → styles → states → materials 顺序但全在一轮内）|
| **R-CRAFT-NO-REVIEW** | craft 任务跳过截图自审 | 强制截图对账循环（见 SKILL.md Phase 2 Step 6.5）|
| **R-CRAFT-3ROUND** | goalSuccessCriteriaMet 不达 ≥3 轮仍标 done | 3 轮不达必须挂 UpstreamChallenge |
| **R-GOAL-COVERAGE** | goal 涉及元素被 craft 完全没改（changes 全空 / 实际 schema 无变化）| 涉及元素必须真改动；漏改的元素视为 craft 未完成 |
| **R-ORPHAN-DECORATION** | 创建装饰节点没挂 `meta.design.servingGoals: ["G<N>"]` | 装饰节点必挂 `kind: 'decoration'` + `servingGoals` |
| **R-BASELINE-ACCEPT** | 重做语境下把 schema 残留当 baseline | 入场识别重做语境后，Phase A 开始前 reset schema 残留 design 字段 |
| **R-KPI-THINKING** | 预先定数量再凑数（"装饰 ≥N 处 / 改动 ≥M 字段 / SC ≥K 条"）| 数量必须从"为达目标自然需要哪些"反推，不是输入 |
| **R-CRITERIA-ADAPTED** | successCriteria 阈值贴合 schema 残留现状（残留状态自动达标 → 改动空间为零）| 阈值定法见 `schema-spec/goal-success-criteria.md` §阈值定法 |
| **R-CRAFT-INVISIBLE** | 重做语境 craft 截图与 craft 前对比无肉眼可见差异 | "假改动"判定：回头大胆增加 element/add 装饰 / wrap / move / material-painter 调用，改动量翻倍 |

---

## 3. schema 完整性红线（service 端机器对账）

| 红线 | 触发条件 |
|---|---|
| **R-STATUS-02** | ready.styles=true 但 styles 空 |
| **R-STATUS-03** | ready.visualStates=true 但 states[] 空 |
| **R-PHASE-01** | screen.meta.status.phase = "designed" 但 ready 仍有 false |
| **R-PLAN-01** | 任意 done 任务的 expectedArtifacts 当前不再满足 |
| **R-STRUCTURE-02** | 节点 styles 用了硬编码颜色（必须 `$token:` 引用）|
| **R-MATERIAL-01 / 02** | 素材规格红线（详见 `schema-spec/material-spec.md`）|
| **R-VISUALSTATE-01** | 交互节点缺必要状态（按钮缺 disabled / 输入框缺 focus）|
| **R-TOKEN-COVERAGE** | $token: 引用率 < 95% |
| **R-EVENTS-* / R-PHASE-*** | 上游遗留错误（入场前已应该修） |

---

## 4. 产出契约红线（v2 专属）

| 红线 | 触发条件 |
|---|---|
| **R-WRITE-MD** | 在 analysis-notes/<projectId>/design/* 路径下创建任何 .md（UpstreamChallenge md 是唯一例外）|
| **R-NOTES-OVERFLOW** | 单个 plan task.notes 字数 > 200 字 |
| **R-META-NOTES** | 把推理过程塞进 `meta.design.notes` 等自由文本字段 |
| **R-SHALLOW-THINKING** | 跳过心智自检 5 问直接调 MCP（说不清"服务哪个 goal / 涉及哪些元素 / 协同关系 / 怎么自审"）|

---

## 5. 阶段边界红线（design 阶段允许 / 禁止）

### ✅ 允许（六项创作权）

| 字段 / 操作 | 用途 |
|---|---|
| `element/add` 新增**视觉容器节点** | 必挂 `meta.design.kind: 'visual-container' \| 'decoration' \| 'material-frame'` 之一 + `servingGoals: [...]` |
| `element/wrap` 包裹现有兄弟 | 服务于某 goal.changes.layout |
| `element/move` 同父级内调位 | 服务于某 goal.changes.layout |
| 新增**装饰节点**（4 类）| 必挂 `kind: 'decoration'` + `servingGoals` |
| 调用 **material-painter** 子技能 + `applyMaterialDesign` | 写入 `node.materialProjectId` |
| `meta/add_plan_tasks` 自创下游 craft 任务 | Phase E 执行；任务 ID 必形如 `D-X-G<N>-craft` |
| `node.styles` 全量 / `node.states[]` | 标准产物 |
| `screen.backgroundColor` / `screen.meta.design.*` | 标准产物（含 positioning / designGoals / goalElementMap / visualStrategy / summary / palette / layers / componentBudgets）|
| `node.meta.design.{summary, rationale, visualSpec, materialSpec, kind, servingGoals}` | 标准产物 |
| `project.componentAssets` 通用模板 | 标准产物 |
| 在 `screen.overlays` 中**新增** backdrop / loading-mask 等视觉 overlay | 用于 trust/focus 等场景 |

⚠️ **新增节点必须挂 `kind` + `servingGoals`** —— 否则 R-ORPHAN-DECORATION 拒。

### ❌ 禁止

| 字段 / 操作 | 留给 |
|---|---|
| `element/remove` 业务节点 | ⛔ 走 UpstreamChallenge（详见 `upstream-challenge.md`）|
| `node.events[]` / `bind` / `repeat` / `visibleWhen` | ⛔ interaction 已写 |
| `node.props.textContent`（动态表达式部分）| ⛔ interaction 已写；静态文案 design 可写 |
| `screen.dataSources` / `stateInit.view/data` 字段定义 | ⛔ interaction 已写 |
| `project.globalOverlays` 业务结构 + showWhen + events | ⛔ product/interaction 已建 |
| `project.themeConfig` | ⛔ theme-generator 写 |
| 写 .md 到 analysis-notes/<projectId>/design/* | ⛔ R-WRITE-MD |

完整边界表查 `schema-spec/forbidden-fields-design.md`。
