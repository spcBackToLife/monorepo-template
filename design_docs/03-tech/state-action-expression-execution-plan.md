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
| **C.2** design-api：迁移层 + 一次性 migration script | ⬜ | C 业务层 | ✅ 恢复 | A.1, B.1, B.2, C.1 | — | — |
| **D.1** design_front：状态面板（state.view + state.data） | ⬜ | D 编辑器 | ✅ | C.2 | — | — |
| **D.2** design_front：事件/动作链面板按新动词 | ⬜ | D 编辑器 | ✅ | C.2, D.1 | — | — |
| **D.3** design_front：数据源面板（endpoint+mock 共存） | ⬜ | D 编辑器 | ✅ | C.2 | — | — |
| **D.4** design_front：表达式编辑器（自动补全 + 校验） | ⬜ | D 编辑器 | ✅ | A.2 | — | — |
| **E.1** design-mcp：工具按新动词重写 | ⬜ | E MCP | ✅ | C.1, C.2 | — | — |
| **E.2** design-mcp：build + 重新连接 IDE | ⬜ | E MCP | ✅ | E.1 | — | — |
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
| 总子项 | 15（重构）+ 2（外部） |
| 已完成 | 6（P.0, P.1, A.1, A.2, A.3, B.1） |
| 进行中 | B.2（待开工） |
| 阻塞中 | — |
| 最新 commit | `f3d62f6` refactor(engine): renderers consume v2 schema with state/expression |

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

- 新增 `components/ExpressionEditor/`：基于 codemirror
- 自动补全 `state.x.y` / `item.x` / `$.length`
- 实时调用 expression `validate()` 显示错误
- 替换面板里所有手写 input 编辑表达式的位置

**commit message**: `feat(editor): expression editor with autocomplete + validation`

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
