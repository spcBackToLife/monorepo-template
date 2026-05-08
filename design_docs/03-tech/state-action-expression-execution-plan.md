# 执行计划 — State/Action/Expression 重构落地

> **状态**：进行中
> **关联 RFC**：[state-action-expression-rfc.md](./state-action-expression-rfc.md)
> **决策**：B 路线（不留 v1/v2 双版本，一次性反转 + 中间窗口主干 build 不通可接受）
> **开工日期**：2026-05-08
> **维护者**：@pikun + AI 助手

---

## 一、目的

本文档是对 RFC §7 "迁移路径"的**精确执行追踪**：每一个子项一个 commit，有验收条件、commit 哈希、完成时间。

**为什么需要本文档**：
1. 重构窗口期长（多次会话），AI 助手不会跨会话记住进度
2. 中间会有"主干 build 不通"的若干 commit，需要明确每步的状态
3. 完成状态可视化，避免某子项被遗漏

**使用约定**：
- AI 助手开始任何子项前，**必须**先 read 本文档查最新状态
- 每完成一个子项，sequence 是：**改完代码 → 更新本文档（勾 ✅、写 commit hash + 完成日期）→ git commit**
- 计划要调整时，**先改本文档**再动代码
- 每个子项的"工作内容"详情见 §四

---

## 二、子项总览

> 状态：`⬜` 未开始 · `🟡` 进行中 · `✅` 已完成（已 commit）
> 主干可 build：阶段 A→B→C 期间 ❌ 不通；C.2 完成后恢复 ✅

| 子项 | 状态 | 阶段 | 主干 build | 依赖 | 完成日期 | commit |
|------|:---:|------|:---:|------|----------|--------|
| **A.1** design-schema：v2 类型反转 | ✅ | A 底层契约 | ❌ | — | 2026-05-08 | `8486948` |
| **A.2** design-engine：表达式引擎 | ✅ | A 底层契约 | ❌ | A.1 | 2026-05-08 | `1e188bc` |
| **A.3** design-engine：State store + Action dispatcher + EffectExecutor | ✅ | A 底层契约 | ❌ | A.1, A.2 | 2026-05-08 | `101f5c4` |
| **B.1** design-engine：渲染器接入新模型 | ✅ | B 渲染器 | ❌ | A.1, A.2, A.3 | 2026-05-08 | `f3d62f6` |
| **B.2** design-engine：清理 v1 残留 | ✅ | B 渲染器 | ❌ | B.1 | 2026-05-08 | `7b5bf36` |
| **C.1** design-operations：所有 op 重写 | ✅ | C 业务层 | ❌ | A.1 | 2026-05-08 | `b59bc00` |
| **C.2** design-api：迁移层 + 一次性 migration script | ✅ | C 业务层 | ✅ 恢复 | A.1, B.1, B.2, C.1 | 2026-05-08 | `81698ca` |
| **D.1** design_front：状态面板（state.view + state.data） | ✅ | D 编辑器 | ✅ | C.2 | 2026-05-08 | `04dec67` |
| **D.2** design_front：事件/动作链面板按新动词 | ✅ | D 编辑器 | ✅ | C.2, D.1 | 2026-05-08 | `2ccdbb9` |
| **D.3** design_front：数据源面板（endpoint+mock 共存） | ✅ | D 编辑器 | ✅ | C.2 | 2026-05-08 | `0b8b4e1` |
| **D.4** design_front：表达式编辑器（自动补全 + 校验） | ✅ | D 编辑器 | ✅ | A.2 | 2026-05-08 | （随本次提交） |
| **D.5** design_front：v1 残留全量清除（typecheck 归零） | ✅ | D 编辑器 | ✅ | C.2 | 2026-05-08 | （随本次提交） |
| **D.6** design_front：删除的 v1 概念面板按 v2 重写恢复（Blueprint / StatesTab / PreviewBar） | ⬜ | D 编辑器 | ✅ | D.5 | — | — |
| **E.1** design-mcp：工具按新动词重写 | ✅ | E MCP | ✅ | C.1, C.2 | 2026-05-08 | （随本次提交） |
| **E.2** design-mcp：build + 重新连接 IDE | 🟡 | E MCP | ✅ | E.1 | — | — |
| **F.1** 用 MCP 重做 Chat 页面 | ⬜ | F 业务验收 | ✅ | E.2 | — | — |
| **F.2** 收尾：删迁移层 + 更新 RFC + AGENTS.md | ⬜ | F 业务验收 | ✅ | F.1 | — | — |

> **附加项**（外部依赖，非 RFC 本身）：
>
> | 子项 | 状态 | 完成日期 | commit | 说明 |
> |------|:---:|----------|--------|------|
> | **P.0** 修复预存 lint 错误（33 个） | ✅ | 2026-05-08 | `0464954` | pre-commit hook 不再阻塞 |
> | **P.1** RFC + 执行计划 落档 | ✅ | 2026-05-08 | （随本子项） | RFC + 执行追踪表格化 |

---

## 三、当前状态总览

| 指标 | 值 |
|------|---|
| 总子项 | 17（重构）+ 2（外部） |
| 已完成 | 15（P.0, P.1, A.1, A.2, A.3, B.1, B.2, C.1, C.2, D.1, D.2, D.3, D.4, D.5, E.1） |
| 进行中 | E.2（build + IDE 重连，待用户操作）/ D.6（v1 概念面板按 v2 重建，可与业务并行推进） |
| 阻塞中 | — |
| 最新 commit | E.1 + D.5（design_front typecheck 312→0，monorepo lint 0 errors） |

---

## 四、子项详情（工作内容 / 验收条件）

### 阶段 A：底层契约（schema + 表达式 + state）

#### A.1 design-schema：v2 类型反转

> **详细设计稿**：[state-action-expression-A1-design.md](./state-action-expression-A1-design.md)
> 实施时直接照设计稿走即可，不需重新推导。

**工作内容（摘要）**

- 删除 v1 类型文件
- 新建：`expression.ts` / `state.ts`(v2) / `visualState.ts` / `action.ts` / `dataSource.ts`(v2)
- 重写：`node.ts` / `screen.ts` / `project.ts` / `types/index.ts` / `validators/*` / `src/index.ts`
- 详细字段定义、实施顺序、验收清单见设计稿

**验收**

- `pnpm --filter @globallink/design-schema typecheck` 通过
- `pnpm --filter @globallink/design-schema build` 通过
- export 面**没有**任何 v1 名字（`DomainStateVariable` / `SetDomainStateAction` / `visibilityWhen` 等）
- 下游包编译会全断 → 预期，非回归

**commit message**: `refactor(schema): v2 type system — replace v1 (state/action/expression model)`

---

#### A.2 design-engine：表达式引擎

**工作内容**

- 新增 `features/design-engine/src/expression/`：
  - `Parser.ts` — 把 `{{ ... }}` 解析成 AST（用 `expr-eval` 库或自实现 mini parser）
  - `Evaluator.ts` — 受限作用域 `{ state, item, index, parent, $ }` 下求值
  - `BuiltinFunctions.ts` — 白名单约 15 个：`$.length` / `$.format` / `$.upper` / `$.lower` / `$.includes` / `$.first` / `$.last` 等
  - `index.ts` — export `evaluateExpression(expr, ctx)` / `extractDeps(expr)` / `compileExpression(expr)`
- 删除 `src/data/resolveExpression.ts`（v1 路径取值）
- 添加 `tests/expression/` 单元测试

**验收**

- `pnpm --filter @globallink/design-engine test -- expression` 全过
- 跑通 case：`item.text`、`item.role === 'user'`、`item.role === 'user' ? '#667eea' : '#fff'`、`$.length(state.data.messages) > 0`、`item.text || "无内容"`
- 安全：禁访问 `globalThis` / `window` / `Function`

**commit message**: `feat(engine): expression engine v2 with sandboxed evaluator`

---

#### A.3 design-engine：State store + Reducer + Action dispatcher

**工作内容**

- 新增 `features/design-engine/src/state/`：
  - `Store.ts` — `createStore(initialState)` 返回 `{ getState, dispatch, subscribe }`
  - `Reducer.ts` — 处理所有 `state.*` 动词
  - `EffectExecutor.ts` — `effect.fetch` / `effect.cancel`，含 `MockDriver` + `HttpDriver`，按 env 路由
  - `Dispatcher.ts` — 串行执行 action 链（含 onSuccess/onError 嵌套展开）
  - `index.ts` — export 入口
- 删除 `src/preview/EventExecutionEngine.ts`、`src/preview/MockExecutor.ts`
- 添加单测覆盖每个动词

**验收**

- `pnpm --filter @globallink/design-engine test -- state` 全过
- 单测覆盖：state.set/append/remove/merge 路径、effect.fetch (mock + http) 全流程、错误路径走 onError

**commit message**: `feat(engine): state store + action dispatcher + effect executor`

---

### 阶段 B：渲染器迁移

#### B.1 design-engine：渲染器接入新模型

**工作内容**

- `SchemaRenderer.tsx` / `PreviewRenderer.tsx` 持有 Store，每个节点 dataContext 含 `state`
- `resolveProps.ts` / `resolveStyles.ts` 在所有字符串字段上走 `evaluateExpression`
- `visibleWhen` 求值得 boolean，决定节点是否渲染
- 节点 `bind.path` 字段使 input/textarea/select 走受控模式，`onChange` dispatch `state.set(path, e.target.value)`
- 列表渲染：`repeat: Expression`（之前 `__listData` 字段名废弃）
- 删除 `ListRenderer.tsx` 中走旧 `__listData` 的代码
- 节点视觉态（hover/pressed/disabled/custom）保留，与 state 系统**正交**

**验收**

- `pnpm --filter @globallink/design-engine typecheck` 通过
- `pnpm --filter @globallink/design-engine build` 通过

**commit message**: `refactor(engine): renderers consume v2 schema with state/expression`

---

#### B.2 design-engine：清理 v1 残留

**工作内容**

- 删除 `src/preview/domainState.ts`（→ state.view）
- 删除 `src/preview/environmentState.ts`（→ state.view 全局视图态）
- 删除 `src/data/dataSourcePhases.ts`（→ state.effects.<id>.status）
- 删除所有 `globalStateBinding` / `domainStateBinding` 相关代码
- 全文 grep 清理 v1 名词：`domainState` / `environmentState` / `activePhase` / `visibilityWhen` / `globalStateBinding`

**验收**

- `grep -r "domainState\|environmentState\|visibilityWhen\|globalStateBinding\|__listData\|MockExecutor" features/design-engine/src` 应零匹配（或仅迁移层匹配）

**commit message**: `refactor(engine): drop v1 residue (domainState/environmentState/binding/MockExecutor)`

---

### 阶段 C：业务层

#### C.1 design-operations：所有 op 重写

**工作内容**

- `element.ts` / `style.ts` / `event.ts` / `data.ts` / `domain-state.ts`(改名 `state.ts`) / `screen.ts` 全部按 v2 schema 重写
- 删除旧动词 op handler（`setDomainState` / `switchDataSourcePhase` 等）
- 新增 op：`state.set` / `state.append` / `state.remove` / `state.merge`
- findOne/findAll 函数改用 v2 类型
- 全部 zod schemas 同步

**验收**

- `pnpm --filter @globallink/design-operations typecheck` 通过
- operation snapshot 测试全过

**commit message**: `refactor(operations): rewrite all ops for v2 schema`

---

#### C.2 design-api：迁移层 + 一次性 migration script

**工作内容**

- 新增 `apps/design-api/scripts/migrate-v1-to-v2.ts`：读全部项目 schema → 按 RFC §4.2 字段映射规则全量重写 → 写回数据库 → 同步备份原 DB 到 `apps/design-api/data/migrations/v1-backup-<date>.db`
- API 路由层临时迁移：上传 v1 schema 自动转换（防旧客户端覆盖新数据）；标记 TODO 为"F.2 完成后删除"
- 跑一次 migration script 验证 833478e8 项目数据正确转换
- 删除 `materializeLegacyInstances` 等 v1 兼容代码

**验收**

- migration script 跑过，DB 备份存在
- 833478e8 项目用新前端打开能正确渲染（不报 schema 类型错）
- 主干 `pnpm typecheck && pnpm build` 全过

**commit message**: `feat(api): v1→v2 migration script + transitional API guard`

---

### 阶段 D：编辑器面板

#### D.1 design_front：状态面板（state.view + state.data 编辑）

**工作内容**

- 删除 `views/editor/panels/DomainStatePanel/`、`views/editor/panels/EnvironmentStatePanel/`
- 新增 `views/editor/panels/StatePanel/`：
  - `view` 编辑器：UI 临时状态，可建变量、设默认值（任意 JSON 类型）
  - `data` 编辑器：屏幕级 state.data 的初始值

**commit message**: `feat(editor): state panel replaces domain/environment panels`

---

#### D.2 design_front：事件/动作链面板按新动词

**工作内容**

- 改造 `InteractionsTab/index.tsx` 中 `ActionChainEditor`
- 每种新动词对应一个参数表单
- 删除旧动词表单（setDomainState / switchDataSourcePhase / apiRequest 等）

**commit message**: `refactor(editor): action chain editor uses v2 verbs`

---

#### D.3 design_front：数据源面板（endpoint+mock 共存模型）

**工作内容**

- 改造 `DataPanel/`：每个 api 数据源同时编辑 endpoint 与 mock
- 顶部加全局开关：「预览用 mock / 预览用真实接口」
- static 数据源编辑器简化：只 initial 数据

**commit message**: `refactor(editor): data source panel with endpoint+mock coexistence`

---

#### D.4 design_front：表达式编辑器

**工作内容**

- 新增 `components/ExpressionEditor/`：
  - `index.tsx` — 主组件：受控 input / textarea + 轻量补全浮层 + 下方单行错误提示
  - `suggestions.ts` — 前缀匹配：state / state.view.* / state.data.* / state.effects.<id>.* / $.length ... / $last.* / item / index / parent
  - `useExpressionScope.ts` — 从 `editorStore.activeScreen.stateInit` + `dataSources` 派生作用域
  - `validate.ts` — 调 design-engine 的 `parseExpression` / `parseTemplate` / `parseSingleExpression` 做实时解析校验
- 替换面板里所有手写 input 编辑表达式的位置：
  - InteractionsTab: StateForms（state.set/append/merge/remove 的 value、predicate）
  - InteractionsTab: MiscForms（ui.showToast.message、ui.openUrl.url）
  - InteractionsTab: ActionChainEditor（effect.fetch.params — multiline）
  - InteractionsTab: EventCard（condition.when）
  - DataTab: ApiEditor（endpoint.path、endpoint.body — multiline）
- 两种模式：`mode='expression'`（裸表达式或单段 `{{...}}`）vs `mode='template'`（允许文本混合多个 `{{...}}`）

**为什么不用 codemirror（RFC §7 原计划）**

codemirror v6 需要引入 `@codemirror/state/view/language/autocomplete/lint` 等 6+ 包、~200KB 产物；
此处需求较轻（前缀补全 + parse 错误），用原生 input + 浮层即可覆盖 90% 场景。
若后续需要语法高亮 / 括号匹配，再做增量升级，不阻塞 D.4 收官。

**commit message**: `feat(editor): expression editor with autocomplete + validation`

---

#### D.5 design_front：v1 残留全量清除（typecheck 归零）

**背景**

D.1～D.4 期间为快速推进，把 design_front 中"非本次面板范围内的 v1 残留"
（如 stores/editor、Toolbar、PreviewBar、RightPanel、Blueprint、MaterialEditor、Canvas
等约 50 个文件、312 处 typecheck 错误）暂时绕过，使主干 typecheck 红着进入 E。
进入 E 阶段后必须先把这些清干净，否则 pre-commit hook 卡住，且这些文件里继续藏着
v1 名词，违反 AGENTS.md §九「无双版本」红线。

**工作内容**

按文件批次（每批 1～3 个文件）走"读 → 改 → typecheck → 下一批"循环，
全部按 RFC §4 的 v1→v2 字段映射修，禁止"加 if 兼容旧格式"或 `as any` 绕过。

主要修复模式：

1. **op 名升级**（dot-namespace）：
   - `addElement / removeElement / moveElement / duplicateElement` → `element.add / .remove / .move / .duplicate`
   - `updateStyle / resetStyle / batchUpdateStyle` → `style.update / .reset / .batchUpdate`
   - `addState / removeState / updateState / setActiveState / resetStateStyle / setChildVisibility` → `visualState.*`
   - `addEvent / removeEvent / updateEvent / addNavigation` → `event.*`
   - `addScreen / removeScreen / setActiveScreen / renameScreen / reorderScreen` → `screen.*`
   - `addDataSource / removeDataSource / addDataScenario / switchDataScenario / switchDataSourcePhase` → `dataSource.*`（含场景挪到 mock）
   - `setNodeLocked / setNodeVisible / setNodeVisibilityWhen / changeElementType / renameNode / wrapInContainer / unwrapContainer / reorderElement / insertSubtree` → `element.*`
   - `applyMaterialDesign` → `material.applyDesign`
   - `updateComponentProps / addPropDefinition / removePropDefinition` → `componentProps.*`
   - `instantiateTemplate / saveAsTemplate / detachInstance / syncInstance / updateTemplate / deleteTemplate / duplicateTemplate` → `asset.* / template.*`
   - `switchViewport / addViewportPreset` → `viewport.*`
   - `addAnnotation / removeAnnotation` → `annotation.*`
   - `addDomainState* / setDomainStatePreview / addDomainStateBinding / updateDomainStateBinding / removeDomainStateBinding` → `screenState.* / globalState.*`（无 binding 概念，删该面板/UI）
   - `addEnvironmentState / setEnvironmentPreview / addEnvironmentBinding` → `globalState.*`

2. **schema 字段升级**：
   - `Screen.domainStates` → `Screen.stateInit.view`
   - `node.domainStates` → 删（节点级运行态由全屏 state.data 表达）
   - `node.domainStateBindings / environmentBindings` → 删（用 styles/props/visibleWhen 表达式取代）
   - `node.visibilityWhen` → `node.visibleWhen`（Expression<boolean> 字符串）
   - `node.__listData` → `node.repeat`（Expression<unknown[]>）
   - `DesignProject.environmentStates` → `DesignProject.globalStateInit.view`
   - `DataSource.scenarios / activeScenarioId / activePhase / phases` → `ApiDataSource.mock.{scenarios, activeScenarioId}` + `endpoint`（StaticDataSource 无 mock）

3. **API 升级**：
   - `hasExpression(...)` → `parseExpression(...)`（design-engine 已重命名）
   - `materializeLegacyInstances` 清理（已在 C.2 删过，前端入口残留同步删）

4. **删除整段死代码**：
   - `DomainStateResponseSection` / `NodeVisibilityCondition`（v1 binding UI）：直接删除文件，不再渲染
   - `ChildrenStateBindings` 改名/重写为 `ChildrenVisualStateMapping`（visualState 子映射，非 binding）
   - editorStore 中 `_legacyInstanceIndex` / 旧 selector 全量删

**禁用做法（红线）**

- ❌ 任何 `as any` / `// @ts-expect-error` / `// @ts-ignore`（除非有 issue 链接 + 删除时间表）
- ❌ 任何 `if (oldFmt) { /* 兼容 v1 */ }` 分支
- ❌ 把 `domainStates` 改成 `(node as any).domainStates` 这种"骗过 ts"的写法

**验收**

- `pnpm --filter @globallink/design_front typecheck` 错误数 = 0
- `pnpm --filter @globallink/design_front lint` 0 个 `no-explicit-any` 报错
- grep `domainState\|environmentState\|visibilityWhen\|__listData\|globalStateBinding\|environmentBindings` 在 apps/design_front/src 下零匹配
- pre-commit hook 通过

**commit message**: `refactor(editor): drop all v1 residue from design_front (typecheck → 0)`

---

#### D.6 design_front：删除的 v1 概念面板按 v2 重写恢复

**背景**

D.5 为快速归零，把以下"完全 v1 概念"的面板/视图整段删除，等独立子项按 v2
模型重新设计：

1. **Blueprint 模块**（`apps/design_front/src/views/editor/Blueprint/`）：
   原"产品全景 PRD + 流图"分析器，按 v1 schema（domainStates / environmentStates /
   apiEndpoints）写。v2 应基于 stateInit + dataSources（endpoint+mock）重新
   分析。Toolbar 的「产品全景 PRD」按钮一并撤掉。

2. **PreviewBar**（`apps/design_front/src/views/editor/PreviewBar/`）：
   原预览模式顶栏，提供 phase / scenario / domainState / environmentState
   切换。v2 应改为：环境切换（mock/http）+ view 变量预览 + mock 场景切换；
   且大部分能力已被 PreviewRenderer 内 Store + EffectExecutor 接管，预览顶栏的
   职责需要重新定义。

3. **StatesTab**（`apps/design_front/src/views/editor/panels/tabs/StatesTab/`）：
   原"状态绑定矩阵 + 组合预览"面板。v2 已无 binding 模型；视觉态由
   StylesTab + StateContextBar 承担，view 变量由 StatePanel + ExpressionEditor 承担，
   组合预览交给 Panorama 矩阵全景。原 StatesTab 的"产品状态描述"价值需要
   通过新设计回收。

4. **RightPanel 三个 v1 子组件**（已删，不需要恢复）：
   - DomainStateResponseSection（按 domainState 值的样式 binding）
   - NodeVisibilityCondition（按 domainState 值判可见）
   - ChildrenStateBindings（子元素状态绑定）

   它们的功能在 v2 通过表达式 + InteractionsTab + visualState.setChildVisibility
   已自然覆盖，不需要单独面板。

**工作内容**

- 重写 Blueprint：v2 SchemaAnalyzer 按 stateInit / dataSources / events.actions
  重新生成 PRD 数据；FlowView 按 nav.go / state.set 等 v2 动词构图；导出 markdown
  同步。Toolbar 按钮恢复。
- 重写 PreviewBar：极简顶栏，含
  「mock / http 环境切换」+「mock 场景切换（多 api 数据源时）」+ 「view 变量
  enum 预览切换」三组件。
- 重写 StatesTab（或决定不恢复）：评估"按 view 变量值矩阵 × 节点视觉态"组合
  预览是否仍有价值；若有，新设计走 stateInit + visualState 模型。

**禁止做法**：直接复活 D.5 删除的代码（违反 §九「无双版本」）。新版本在
重新规划 schema 后用新文件名写。

**验收**

- typecheck / lint 全过
- 主流程功能（数据源 mock 切换、view 变量预览）等价于 D.5 前
- 新模块全部使用 v2 schema 字段（grep `domainState\|environmentState` 在新代码中零匹配）

**commit message**: `feat(editor): rebuild blueprint / preview-bar / states-panel on v2 schema`

---

### 阶段 E：MCP 工具

#### E.1 design-mcp：工具按新动词重写

**工作内容**

- `data_source` 工具：`add` 接 endpoint+mock 共存形态，删除 phase 相关 action
- `domain_state` 工具改名为 `state`，action：`view_set` / `data_set` / `data_append` / `add_view_var`
- `event` 工具：动作链按新动词构造
- 全部 schema/zod 同步

**commit message**: `refactor(mcp): tools use v2 verbs and schema`

---

#### E.2 design-mcp：build + 重新连接 IDE

**工作内容**

- `pnpm --filter @globallink/design-mcp build`
- 提示用户在 IDE 中 reload window
- 跑通端到端：用 MCP 给空白屏幕加 dataSource(api+mock) → 加列表节点 → 加发送按钮 → 验证完整链路

**commit message**: `chore(mcp): rebuild dist for v2 tools`

---

### 阶段 F：业务验收

#### F.1 用 MCP 重做 Chat 页面

**工作内容**

- 数据源：`chat-list`(mock GET /chat/list) + `chat-send`(mock POST /chat/send，1.2s delay)
- state.view：`inputDraft`
- screenEnter 事件：`effect.fetch chat-list` → onSuccess: `state.set('data.messages', $last.data)`
- 输入框：`bind.path = view.inputDraft`
- 发送按钮 click：`effect.fetch chat-send` (params: `{ text: state.view.inputDraft }`) → onSuccess: append userMessage + append aiReply + 清空 inputDraft
- 列表容器：`repeat = state.data.messages`
- 气泡：`visibleWhen = item.role === 'user'/'assistant'`，样式表达式按 role 切对齐+背景

**验收**

- 浏览器打开 Chat 页：自动加载历史消息、输入框可打字、发送按钮按下后用户气泡立即出现 + 1.2s 后 AI 回复出现
- 切到"真实接口"模式后请求发出 → 进 onError

**commit message**: `feat(chat): rebuild chat page with v2 state-driven model`

---

#### F.2 收尾：删迁移层 + 更新 RFC + 更新 AGENTS.md

**工作内容**

- 删除 C.2 中临时的 API 路由迁移层
- RFC 末尾加 §9 "落地结果"小节，记录实际工程量、踩坑、与原估计的差距
- AGENTS.md §8 红线加："所有数据驱动 UI 一律走 state/action/expression 模型，禁止再出现 domainState/environmentState 等 v1 名词"
- AGENTS.md 顶部"最后更新"日期更新

**commit message**: `chore: finalize state-action-expression refactor (close RFC)`

---

## 五、变更日志

| 日期 | 修改 | 修改者 |
|------|------|-------|
| 2026-05-08 | 创建本文档 | AI 助手 |
| 2026-05-08 | 改为表格化呈现，新增 P.0/P.1 外部子项 | AI 助手 |
| 2026-05-08 | P.0 完成（commit `0464954`），P.1 一并完成 | AI 助手 |
| 2026-05-08 | A.1 设计稿 [state-action-expression-A1-design.md](./state-action-expression-A1-design.md) 落档，待实施 | AI 助手 |
| 2026-05-08 | A.1 完成（commit `8486948`）— design-schema v2 类型反转，typecheck + build 通过，下游包按预期全断 | AI 助手 |
| 2026-05-08 | A.2 完成（commit `1e188bc`）— expression 引擎落地：自实现 Parser/Evaluator/BuiltinFunctions，40 条 bun:test 全绿，含安全沙箱（禁 globalThis/Function/原型链/任意方法调用） | AI 助手 |
| 2026-05-08 | A.3 完成（commit `101f5c4`）— Store + Reducer + EffectExecutor（Mock+Http Driver）+ Dispatcher；删除 EventExecutionEngine + MockExecutor；39 条 bun:test 全绿 | AI 助手 |
| 2026-05-08 | B.1 完成（commit `f3d62f6`）— design-engine 全套渲染器迁到 v2：data/dataContext + 重写 ListRenderer/SchemaRenderer/PreviewRenderer/styles/codegen/schemaLayoutMap；typecheck + build 全过；79 条单测仍绿 | AI 助手 |
| 2026-05-08 | B.2 完成（commit `7b5bf36`）— 全文清理 v1 注释残留；删空 migration 目录；grep 零匹配 | AI 助手 |
| 2026-05-08 | C.1 完成（commit `b59bc00`）— design-operations 重写：types 按域拆分、op 名 dot-namespace 化、删除 domain-state/environment/api-endpoint；新增 data-source/screen-state/global-state；executor 拆 dispatch/inverse；pnpm build 全过；grep 零匹配 | AI 助手 |
| 2026-05-08 | C.2 完成 — `migrations/v1-to-v2-state-model.ts` 纯函数迁移层 + `run-migration.ts` 一次性脚本（含备份表 `design_snapshots_v1_backup`、幂等 + dry-run）；`projects.service.findOne` 接入迁移层并删 `materializeLegacyInstances`；`operations.service` ensureDeterministicIds 升级到 v2 op 名（`element.add` / `element.duplicate` / `asset.instantiateTemplate` / `screen.add` / `event.addNavigation`）；`datasources` 模块精简为 v2 形态（删除 scenarios/phase 路由）；DB 30 行快照中 17 行 v1→v2 迁移成功，第二次重跑 0 migrated（幂等）；design-api typecheck + build 通过；三大 feature 包仍 build 通 | AI 助手 |
| 2026-05-08 | D.1 完成 — 新增 `views/editor/panels/StatePanel/`：view 变量编辑器（增删改 + 预览值切换，走 `screenState.addViewVariable` / `removeViewVariable` / `updateViewVariable` / `setViewPreview`）+ data 初始值编辑器（走 `screenState.setDataInit` / `removeDataInit`），表单含 JSON 解析 + 字段校验；挂在 RightPanel「高级」区块"页面状态"位置；StatePanel 自身 typecheck 干净（design_front 整包 typecheck 仍受其他 v1 残留阻塞，待 D.2/D.3） | AI 助手 |
| 2026-05-08 | D.2 完成（commit `2ccdbb9`）— InteractionsTab 全面按 v2 动词重写，op 名升级到 `event.add/remove/update`，ACTION_TYPES 全部 dot-namespace（state.* / effect.* / nav.* / node.* / ui.* / custom），condition 统一为 `{ when: Expression<boolean> }`，TRIGGER_OPTIONS 新增 change/submit；按 AGENTS.md §四.4.2 拆为 8 个 ≤300 行子文件（constants/formCommon/StateForms/MiscForms/ActionBadge/ActionChainEditor/EventCard/AddEventForm/index）；effect.fetch 子链禁止再嵌 fetch；切动词保留共享字段；子目录自身 typecheck + lint 全干净，主干仍受 design-mcp v1 残留阻塞 | AI 助手 |
| 2026-05-08 | D.3 完成（commit `0b8b4e1`）— DataTab 全面重写为 endpoint+mock 共存模型：每个数据源一张卡片，static → StaticEditor（仅 initial），api → ApiEditor（endpoint + autoFetchOnEnter + defaultParams + MockScenariosSection，场景 CRUD + 激活切换）；顶部 PreviewEnvSwitcher 写入 editorStore.previewEffectEnv，待 PreviewRenderer 接入 EffectExecutor 消费；新建表单 NewDataSourceForm 校验 name 合法性与唯一性；op 名全部升级为 v2 dot-namespace（dataSource.add/remove/update/setEndpoint/setDefaultParams/setStaticInitial/addMockScenario/updateMockScenario/removeMockScenario/switchMockScenario）；按 AGENTS.md §四.4.2 拆为 7 个 ≤300 行子文件（index 147 / helpers 143 / DataSourceCard 134 / StaticEditor 116 / ApiEditor 205 / MockScenarios 271 / NewDataSourceForm 138）；editorStore 新增 previewEffectEnv 状态 + setter；helpers.parseEndpointBody 用 expr() 把非对象输入包成 Expression 字符串；DataTab 子目录 typecheck + lint 全干净，主干仍受 design-mcp v1 残留阻塞 | AI 助手 |
| 2026-05-08 | D.4 完成 — 新增 `components/ExpressionEditor/`（index 250 / suggestions 201 / useExpressionScope 58 / validate 64，全部 ≤300 行）：原生 input+textarea 受控实现，前缀补全（state.view/data/effects.<id>.status|data|error / $ builtins / $last / item/index/parent / true/false/null/undefined），↑↓ 选候、Enter/Tab 插入、Esc 关闭；mode 分 template（允许混合文本）/ expression（裸表达式或单段 `{{...}}`）；实时调用 design-engine 的 `parseExpression` / `parseTemplate` / `parseSingleExpression` 做解析校验，错误下方单行展示；替换 InteractionsTab（StateForms.value/predicate、MiscForms.message/url、ActionChainEditor.params、EventCard.condition.when）与 DataTab（ApiEditor.path/body）的手写 input；决策放弃 codemirror v6 依赖（~200KB / 6+ 包），原生实现覆盖 90% 场景；相关子目录 typecheck + lint 全干净，主干 typecheck 错误全部是 D.4 前就存在的 editorStore v1 残留 | AI 助手 |
| 2026-05-08 | E.1 完成 — design-mcp 全套工具按 v2 op 名 + 新动词重写：① 删除 `tools/domain/domain-state.ts`、`tools/domain/environment-state.ts`、`resources/domain-state-resources.ts`、`resources/environment-state-resources.ts`（v1 概念消除）；② 新增 `tools/domain/state.ts`（10 个 action：list / view_add/remove/update/set_preview / data_set_init/remove_init / global_view_add/remove/update/set_preview，分别走 `screenState.*` 与 `globalState.*` op）和 `resources/state-resources.ts`（state://screen + state://project，对齐项目级 globalStateInit + 屏幕级 stateInit）；③ 重写 `tools/domain/data-source.ts` 为 endpoint+mock 共存模型（list / add / remove / update / set_endpoint / set_default_params / set_static_initial / add_mock_scenario / update_mock_scenario / remove_mock_scenario / switch_mock_scenario，type 枚举 static / api，MockScenario 字段对齐 schema：statusCode / delay / responseBody / isTimeout）；④ element/style/asset/component-prop/canvas/misc-grouped/component-recipes 全文升级到 v2 op 名（`element.*` / `style.*` / `asset.*` / `template.*` / `componentProps.*` / `material.applyDesign` / `visualState.*` / `event.*` / `screen.*` / `viewport.*` / `annotation.*`），并补 element 工具新 action：set_visible_when（表达式 string，替代 v1 visibilityWhen）/ set_repeat（列表绑定）/ set_bind（受控双向绑定）/ set_role；⑤ component-recipes 的主按钮配方动作链改为 v2 动词 `node.setVisualState` + 操作改为 `element.add` / `visualState.add` / `event.add` 组合；⑥ 主入口 `index.ts` 注册改造（version 0.2.0 → 0.3.0），删除 v1 的 `registerDomainStateTools` / `registerEnvironmentTools` 与对应 resources，新增 `registerStateTools` + `registerStateResources`；⑦ design-mcp typecheck + build（dist/index.js 163KB）+ lint 全过；grep `addElement|removeState|updateStyle|...` 等 v1 op 名零匹配 | AI 助手 |
| 2026-05-08 | D.5 完成 — design_front v1 残留全量清除（typecheck 312→0）：① editorStore 重写（`DomainStateVariable` 引用删除、`resolvedInheritedDomainStates` getter 改为 `resolvedViewVariables`、`DOMAIN_STATE_SCHEMA_OPS` set 改为 `STATE_PREVIEW_RESYNC_OPS` 含 v2 `screenState.*` / `globalState.*` op、`initGlobalStatesForScreen` 按 `screen.stateInit.view` + `project.globalStateInit.view` 派生预览值、execute 中 `setActiveScreen` op 名升级、`criticalOperationTypes` 改 v2、`copyStyles` 过滤 ExpressionStyles 中的表达式串、`stateContext.lockedDomain` 字段连同 lock/unlockDomainState 删除）；② 删除 v1 概念组件 `RightPanel/DomainStateResponseSection.tsx` / `NodeVisibilityCondition.tsx` / `ChildrenStateBindings.tsx`，从 RightPanel/index.tsx 摘除（v2 由表达式 + InteractionsTab + visualState.setChildVisibility 承担）；③ 删除 v1 `Blueprint/` 整目录（37+11+3+3+1+2 个错误，按 v1 schema 写的 PRD 分析器，待 D.6 重写）+ 删 Toolbar 「产品全景 PRD」按钮 + app/index.tsx 路由；④ 删除 v1 `PreviewBar/`（390 行，按 phase/scenario/domainState/environmentState 顶栏切换条，v2 待 D.6 重写）+ editor/index.tsx 摘除引用；⑤ 删除 v1 `panels/tabs/StatesTab/`（含 StateCombinationPreview，整段按 v1 binding 矩阵写）；⑥ Panorama/useCombinations.ts 重写：page 模式按"屏幕级 view 变量带 enum 的"做笛卡尔积取代 v1 domainStates 矩阵；⑦ Panorama/PanoramaCell.tsx：用 `EvalContext` 构造 dataContext 注入 SchemaRenderer，替代 v1 globalStates props；⑧ 在 design-engine `index.tsx` 公开 `buildScreenDataContext` / `buildEditorPreviewState` / `hasExpression` / `resolveExpressionValue` / `resolvePropsExpressions` + DataContext 类型，supplant v1 `hasExpression` 引用；⑨ 一次性脚本 `/tmp/rename-ops.mjs` 把 90 处 v1 op 名 (`type: 'addElement'` 等 56 个动词)按 dot-namespace 升级到 v2，覆盖 29 个文件；⑩ 删除遗留 `RightPanel/index.tsx.orig` 备份文件（违反 §九）；⑪ NodeTree / collectNodeIdsWithListBinding / PropsTab.ListBindingSection：v1 `props.__listData` 全量改为 v2 `node.repeat` + `element.setRepeat` op，PropsTab 中 `findAncestorWithListData` 改名 `findAncestorWithRepeat`；⑫ ExpressionInput / PropsTab.getMergedScreenData：v1 `ds.activePhase / scenarios` 改为 v2 `static.initial` / `api.mock.activeScenarioId` 取数；⑬ ExpressionStyles 类型：StyleEditor / EditorContextMenu / MaterialEditorModal 三处 styles 转 StyleOverrides 时增加表达式过滤（typeof v === 'string' && v.includes('{{') 跳过）；⑭ Toolbar / CanvasContextBar 全量重写为 v2：mock 场景切换 + 屏幕/项目级 view 变量 enum 预览切换；⑮ Canvas/index.tsx：handleSelect 把 v1 `setDomainState` actions 等价为 v2 `state.set path: 'view.xxx'`，删除 `handlePreviewSwitchDataSourcePhase` callback 与 PreviewRenderer 的 `globalStates / currentDataSet / onSwitchDataSourcePhase` props（v2 PreviewRenderer 内部 store 接管），SchemaRenderer globalStates → dataContext，新增 `editorDataContext` useMemo 复用，`TransitionAnimation` 类型 → `NavTransitionAnimation`；⑯ ChildrenVisibilitySection：`ComponentState` 类型 → `VisualState`；⑰ 顺手修 `design-operations/executor/description.ts` 的 `\$` 不必要转义、`design-engine/preview/PreviewRenderer.tsx` 与 `state/Dispatcher.ts` 的 lint 残留、`StatePanel/index.tsx` 与 `useExpressionScope.ts` 的 D.4/D.1 lint 残留；⑱ 全 monorepo typecheck + lint + build 通过，pre-commit hook 解锁；最终 grep `domainState\|environmentState\|visibilityWhen\|__listData\|globalStateBinding\|environmentBindings` 在 apps/design_front/src 下零代码匹配（仅余 4 处迁移说明注释） | AI 助手 |
