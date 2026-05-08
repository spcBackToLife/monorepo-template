# RFC: State / Action / Expression — 数据驱动 UI 的运行时模型重构

> **状态**：草案，待评审
> **作者**：@pikun
> **日期**：2026-05-08
> **影响范围**：`design-schema` / `design-engine` / `design-operations` / `design-mcp` / `design_front` / `design-api`
> **关联文档**：[design-schema](./design-schema.md) · [design-engine](./design-engine.md) · [design-operations](./design-operations.md) · [event-sourcing](./event-sourcing.md)

---

## 一、问题陈述

### 1.1 真实业务的最低要求

任何"数据驱动 UI 框架"必须支持一类标准业务场景。以聊天页面（Music AI Hub 项目 Chat 屏幕 `sc_bc334cb7178a4905991e6`）为代表：

> 用户进入聊天页 → 自动从 API 拉取历史消息 → 渲染左右分布的对话气泡（按 `role` 字段决定样式和位置）→ 用户在输入框输入 → 点击发送 → 调用 AI 接口 → 返回的回复**追加**到消息列表 → UI 自动响应。

这是一个**最小标准业务**。能不能做这个，是衡量"数据驱动框架"是否真的存在的硬指标。

### 1.2 当前能力实测

实测当前框架在 Chat 页面的能力缺口：

| # | 业务需求 | 当前能力 | 缺口 |
|---|---------|---------|-----|
| 1 | 列表项内根据字段（`item.role`）切分支渲染气泡样式 | `__listData` 模板单一份；`visibilityWhen` 只支持 `equals` 字面量；样式属性不支持运算 | **无法做**——只能给每条 mock 数据预先冗余写入样式字段，或给每条消息显式 4 个气泡 + 4 套 binding |
| 2 | 状态保存数组（消息列表、表单数据） | `setDomainState(name, value: string)` 只能存字符串 | **无法做** |
| 3 | API response 写回数据源/状态 | `apiRequest` 的 response 只能在 onSuccess 内的同步 action 中作为 `{{response.x}}` 模板字符串使用，无法持久化 | **无法做** |
| 4 | 数组追加项（新消息进列表） | 无对应 action | **无法做** |
| 5 | input 受控双向绑定（输入框值同步到状态） | `input` 用 `defaultValue`（uncontrolled） | **无法做** |
| 6 | 表达式运算（三元、比较、函数调用） | `{{path}}` / `{{path \| default}}` 只支持取值 | **无法做** |

**结论**：当前框架不能完整描述上述聊天业务。任何聊天/feed/表单/状态机类业务都会撞同一堵墙。

### 1.3 根本原因（第一性原理）

不是"6 个小坑"。这是症状。

根本原因是**框架缺失业务逻辑层**：当前 schema/runtime 只有 UI 层（节点树+样式）和事件层（trigger→action 链）。中间没有：

- 一个**结构化、可派生、可被多 action 操作**的运行时 State
- 一个**纯函数**（表达式）从 State 派生 View（visible/style/text/...）
- 一个**统一的 Action 协议**对 State 做原子变更
- 一个**Effect 与 State 解耦**的副作用模型（API → State 转换）

`dataSource` 当前只是"静态 mock 选项 + lifecycle 标签"，不承载运行时数据；`domainState` 是字符串字典，本质是几个布尔/枚举开关；`apiRequest` 的 response 是一次性的、不能"留下来"。

补丁式修复（每个能力缺口分别加字段/加 action）会让协议越加越乱、互相拼接困难，**且每个补丁都暴露同一个根因**：缺 State 模型。

> 对应 AGENTS.md §3.1：从根因修复，禁止补丁。
> 对应 AGENTS.md §9.1：新模型确定后，旧 API 必须一次性迁移完，不允许双版本并存。

---

## 二、目标

### 2.1 业务目标

让以下业务场景能在不写代码、纯 schema 的前提下被完整描述：

- **聊天/对话**：消息列表 + 按角色分支渲染 + 输入 + 发送追加
- **Feed/列表**：分页加载 + 下拉刷新 + 单项操作（点赞/删除）回写
- **表单**：多字段双向绑定 + 校验 + 提交 + loading/error 状态
- **Tab/Modal/Drawer**：UI 临时状态切换
- **数据派生**：未读数 = `messages.filter(m => !m.read).length`，红点 = 未读数 > 0

### 2.2 工程目标

- 一次性建好 State/Action/Expression 模型，**不留双版本**（§9.1）
- 旧 schema 通过**迁移层**自动映射到新模型，迁移层在数据库 migration 完成后**删除**
- 编辑器/MCP/codegen 全链路改用新协议
- 公共 API 上没有 `setDomainState` / `setEnvironmentState` / `setGlobalState` / `apiRequest+response` 等历史动词

---

## 三、新模型设计

### 3.1 ScreenState — 运行时状态

```typescript
interface ScreenState {
  /** 数据态：来自 dataSource 加载结果或 API 响应；任意类型 */
  data: Record<string, unknown>;

  /** 视图态：UI 临时状态（输入草稿、当前 tab、modal 开关）；任意类型 */
  view: Record<string, unknown>;

  /** 副作用态：每次 effect.fetch 写入此处供后续 action 引用；不持久化 */
  effects: Record<string, EffectState>;
}

interface EffectState {
  status: 'idle' | 'pending' | 'success' | 'error';
  data?: unknown;
  error?: { code: number; message: string };
  startedAt?: number;
  finishedAt?: number;
}
```

设计要点：

- `data` / `view` / `effects` 三段命名空间清晰：哪些是业务数据、哪些是 UI 临时态、哪些是副作用结果，开发者一眼可分
- 值类型不限：可以存对象、数组、嵌套结构、null、布尔、数字
- ScreenState 是当前屏幕的运行时单例，由编辑器宿主（preview）维护，schema 内不持久化
- 跨屏共享态另设 `ProjectState`（同结构，作用域为整个项目，如登录态、主题）；本 RFC 暂只规定 ScreenState，ProjectState 同形扩展即可

### 3.2 DataSource — State 初始化策略

`dataSource` 重新定位：**不是 mock 数据池，是 `state.data[<key>]` 的初始化和加载策略**。

```typescript
interface DataSource {
  id: string;
  name: string;          // 在 state.data 里的 key，如 "messages" / "user"
  description?: string;
  type: 'static' | 'api';

  /** static：启动时把 initial 注入 state.data[name] */
  initial?: unknown;

  /** api：screenEnter 时自动 effect.fetch；mock 可选 */
  endpoint?: {
    method: string;
    path: string;
    /** 编辑器预览/codegen 默认请求参数 */
    defaultParams?: Record<string, unknown>;
  };

  /** 仅编辑器预览态使用；运行时不读 */
  mock?: {
    scenarios: Array<{
      id: string;
      name: string;
      delay: number;
      statusCode: number;
      responseBody: unknown;
    }>;
    activeScenarioId: string;
  };
}
```

设计要点：

- 没有 `phases` / `activePhase` —— phase 信息归到 `state.effects[<dsId>].status`
- 没有 `lifecycle: 'static' | 'api'` 二元 → 改为 `type` 同样取这两个值，但语义清晰：static = 同步初始化，api = 异步加载
- **mock 与 endpoint 共存**：每个 `type: 'api'` 的数据源同时持有 `endpoint`（真实接口配置）和 `mock`（模拟场景列表）；运行时根据"执行环境"挑一边走，详见 **§3.8 Effect 执行模型**
- mock 配置进 schema 持久化（要在编辑器、Storybook、MCP 工具、协作者机器之间共享），但**生产构建会被 codegen 剥离**，不进打包产物

### 3.3 Expression — 表达式引擎

```typescript
type Expression = string;  // "{{ ... }}" 包裹的表达式
```

求值上下文：

```typescript
interface ExpressionContext {
  state: ScreenState;
  /** 列表项内自动入域 */
  item?: unknown;
  index?: number;
  /** 嵌套列表父层上下文 */
  parent?: ExpressionContext;
  /** 工具命名空间（白名单函数） */
  $: ExpressionStdLib;
}
```

支持的语法（统一一种，废除"路径"和"模板"两种模式的区分）：

- 取值：`{{ state.data.user.name }}` / `{{ item.role }}` / `{{ state.view.inputDraft }}`
- 比较：`{{ item.role === 'user' }}` / `{{ state.data.unreadCount > 0 }}`
- 三元：`{{ item.role === 'user' ? '#667eea' : '#fff' }}`
- 默认值：`{{ state.view.inputDraft || '请输入...' }}`（用 `||` 替代旧 `| default`）
- 模板拼接：`{{ '欢迎, ' + state.data.user.name }}`
- 白名单函数：`{{ $.length(state.data.messages) }}` / `{{ $.formatDate(item.createdAt, 'HH:mm') }}` / `{{ $.filter(state.data.messages, m => !m.read).length }}`

实现：

- 用 mini AST parser（如 `expr-eval` 或自写约 200 行的递归下降）；**不使用 `new Function`**，安全靠白名单
- `$` 命名空间内置约 20 个常用函数：`length` / `slice` / `filter` / `map` / `find` / `formatDate` / `formatNumber` / `concat` / `toUpperCase` 等
- 整字符串是单 `{{...}}` → 返回值保留原类型（数组/对象/数字）
- 含混合文本 → 全部 `String()` 拼接

向后兼容：

- 旧的 `{{path.x}}` 是新语法的合法子集
- 旧的 `{{path | "default"}}` → 自动重写为 `{{path || "default"}}`（迁移层）

### 3.4 Action — 状态变更协议

废除以下命令式 action：
- `setState`（节点视觉状态切换归到 view 态）
- `setGlobalState` / `setDomainState` / `setEnvironmentState`
- `switchDataSourcePhase`
- `apiRequest`（拆分为 `effect.fetch` + onSuccess action）
- `cancelApiRequest`

新协议：所有 action 是对 ScreenState / 副作用 / 导航的**原子操作**。

```typescript
type Action =
  // ===== State 变更（统一前缀 state.*）=====
  | { type: 'state.set';     path: string;  value: Expression }
  | { type: 'state.merge';   path: string;  value: Expression }   // 浅合并对象
  | { type: 'state.append';  path: string;  value: Expression }   // 数组追加
  | { type: 'state.prepend'; path: string;  value: Expression }   // 数组头插
  | { type: 'state.removeAt'; path: string; index: Expression }   // 数组按下标删
  | { type: 'state.removeWhere'; path: string; predicate: Expression } // 数组按条件删
  | { type: 'state.toggle';  path: string }                       // 布尔取反，非布尔报错
  | { type: 'state.increment'; path: string; by?: Expression }    // 数字增加，缺省 +1

  // ===== 副作用 =====
  | { type: 'effect.fetch';  dataSourceId: string; params?: Record<string, Expression>;
      onSuccess?: Action[]; onError?: Action[] }
  | { type: 'effect.cancel'; dataSourceId: string }
  | { type: 'effect.delay';  durationMs: Expression }

  // ===== 导航 =====
  | { type: 'nav.go';        screenId: string; animation?: TransitionAnimation }
  | { type: 'nav.back' }

  // ===== 视觉态（节点级 hover/active 等，不进 ScreenState）=====
  | { type: 'node.setVisualState'; nodeId: string; state: string; autoRevertMs?: number }

  // ===== UI 反馈 =====
  | { type: 'ui.toast'; toastType: 'success'|'error'|'warning'|'info';
      message: Expression; duration?: number }
  | { type: 'ui.openUrl'; url: Expression; openInNewTab?: boolean }
  ;
```

设计要点：

- `path` 用 dotted/bracket 路径串：`'view.inputDraft'` / `'data.messages'` / `'data.user.profile.name'` / `'data.tabs[0].active'`
- `value` 是表达式 → 求值时可引用整个 ExpressionContext（包括 `state.effects[dsId].data`）
- `effect.fetch` 的 onSuccess action 链里可以用 `{{ state.effects.<dsId>.data }}` 引用刚拿到的响应
- 没有 `setState` 这种"按 nodeId 改视觉态"和"改 ScreenState"混用同名 action 的歧义；前者归到 `node.setVisualState`，后者归 `state.*`
- `{{response.x}}` 这种隐式上下文废弃，统一走 `{{state.effects.<dsId>.data.x}}`，定位更清晰

举例 — 完整聊天发送流程：

```json
[
  { "type": "state.append", "path": "data.messages",
    "value": "{{ { id: $.uuid(), role: 'user', text: state.view.inputDraft } }}" },
  { "type": "state.set", "path": "view.inputDraft", "value": "{{ '' }}" },
  { "type": "effect.fetch", "dataSourceId": "ds_chat_send",
    "params": { "text": "{{ state.view.inputDraft }}" },
    "onSuccess": [
      { "type": "state.append", "path": "data.messages",
        "value": "{{ state.effects.ds_chat_send.data }}" }
    ]
  }
]
```

### 3.5 双向绑定 — `bind` 字段

针对 `input` / `textarea` / `select` / 自定义带值组件，新增 `bind` 字段：

```typescript
interface ComponentNode {
  // ... 原有字段
  /** 受控双向绑定。runtime 自动读 state[path] 当值；onChange 时 dispatch state.set(path, e.target.value) */
  bind?: {
    path: string;            // 例 "view.inputDraft"
    /** 可选：写回前的转换表达式，默认是原值 */
    transform?: Expression;
  };
}
```

设计要点：

- 渲染器看到 `bind` 自动走受控模式
- 没有 `bind` 时退化到当前的 uncontrolled 行为，零迁移
- `transform` 用于"输入数字字符串自动转 number"等场景：`{{ Number($event.target.value) }}`

### 3.6 节点字段全面表达式化

- `visibilityWhen` 改为 `visibleWhen: Expression`，求值得 boolean
- `styles` 中每个属性允许是 Expression 或字面量（已部分支持，本 RFC 全面化）
- `props` 中每个属性允许是 Expression 或字面量
- `props.__listData` 已是 Expression，保留语义但 path 名改为 `repeat` 字段（独立字段，不再藏在 props 里）

```typescript
interface ComponentNode {
  // ... 原有字段
  /** 列表渲染：表达式求值需为数组，children 按数组重复渲染 */
  repeat?: Expression;

  /** 显示条件：表达式求值为 boolean */
  visibleWhen?: Expression;
}
```

`globalStateBindings` / `domainStateBindings` / `visibilityWhen` / `__listData` 全部废除，统一走 `visibleWhen` + 字段表达式 + `repeat`。

### 3.7 列表项分支渲染（业务关键场景）

按新模型，Chat 页面的消息列表自然写法：

```
.chat-list (容器)
  repeat: {{ state.data.messages }}
  styles: { display: flex, flexDirection: column, gap: 12 }
  └─ .row (item 容器)
       styles: {
         justifyContent: "{{ item.role === 'user' ? 'flex-end' : 'flex-start' }}"
       }
       └─ .bubble (气泡)
            styles: {
              maxWidth: "75%",
              padding: "12px 16px",
              backgroundColor: "{{ item.role === 'user' ? '#667eea' : 'rgba(255,255,255,0.08)' }}",
              color:           "{{ item.role === 'user' ? '#fff'    : 'rgba(255,255,255,0.85)' }}",
              borderRadius:    "{{ item.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px' }}"
            }
            └─ p { children: "{{ item.text }}" }
```

所有"按角色分支"的差异都在样式表达式里统一表达，DOM 干净（每条消息一个气泡），逻辑清晰。

### 3.8 Effect 执行模型（API mock 接入点）

> 本节回答一个核心问题：**当 schema 写 `effect.fetch` 时，数据到底从哪儿来？编辑器预览的 mock 怎么和真实 API 共存？**

#### 3.8.1 设计原则：onSuccess 不区分数据来源

`effect.fetch` 的 onSuccess 动作链里，schema 用 `{{ state.effects.<dsId>.data.x }}` 引用响应数据。**这段表达式在 mock 模式和真实 API 模式下完全相同**——这是必须保证的不变量，否则"编辑器演示一切正常 → 上线后行为不一致"会成为常见坑。

实现上：mock 与真实 API 都是 `EffectExecutor` 的两个 driver；它们的输出形状完全一致（`MockResponse | ApiResponse` 同构），都被统一写入 `state.effects[dsId]`；schema 看到的永远只是 state，不知道也不需要知道数据从哪来。

#### 3.8.2 运行时执行链路

```
schema 层（持久化，进 DB）
  DataSource = {
    id: 'ds_chat_send',
    type: 'api',
    endpoint: { method: 'POST', path: '/chat/send' },        ← 生产用
    mock:     { scenarios: [{ delay: 1200, statusCode: 200,   ← 编辑器/演示用
                              responseBody: {...} }] }
  }
  
  event.actions = [{
    type: 'effect.fetch',
    dataSourceId: 'ds_chat_send',
    params: { text: '{{ state.view.inputDraft }}' },
    onSuccess: [
      { type: 'state.append', path: 'data.messages',
        value: '{{ state.effects.ds_chat_send.data.userMessage }}' },
      { type: 'state.append', path: 'data.messages',
        value: '{{ state.effects.ds_chat_send.data.aiReply }}' },
    ]
  }]

────────────────────────────────────────────────────────────────

runtime 层
  
  1. Action dispatcher 收到 effect.fetch
  2. → state.effects['ds_chat_send'] = { status: 'pending', startedAt: now }
  3. → EffectExecutor.execute(ds, params)
       ├─ if (env === 'editor-preview' || env === 'storybook')
       │     → MockDriver: 按 ds.mock.scenarios[active] 模拟
       │       (delay → 返回 responseBody，也支持 isTimeout/error 场景)
       │
       ├─ else if (env === 'production' && ds.endpoint)
       │     → HttpDriver: fetch(method, path, params)
       │
       └─ else (api 数据源缺 endpoint，但有 mock，且非编辑器)
             → 报错：上线前必须配 endpoint
  4. 无论哪个 driver，结果统一写入：
       state.effects['ds_chat_send'] = {
         status: 'success' | 'error',
         data: <responseBody>,
         error?: { code, message },
         finishedAt: now
       }
  5. 触发 onSuccess / onError action 链
  6. onSuccess 里 state.append 把消息追加进 state.data.messages
  7. 列表 repeat={{state.data.messages}} 自动重渲染 → 新气泡出现
```

#### 3.8.3 执行环境（env）的判定

由"宿主"在挂载 `EffectExecutor` 时显式传入，schema 不感知：

| 宿主 | env 值 | 选用 driver |
|------|-------|------------|
| 编辑器画布预览（`PreviewRenderer`） | `'editor-preview'` | MockDriver |
| 全景页（`PanoramaPage`） | `'editor-preview'` | MockDriver |
| Storybook / 设计稿分享链接 | `'editor-preview'` | MockDriver |
| 用户在编辑器手动切换"真实接口"模式（调试用） | `'editor-real'` | HttpDriver（命中真实 endpoint）|
| codegen 出的生产 React 代码 | `'production'` | HttpDriver |

**关键**：编辑器画布默认走 mock，但提供一个开关让设计师/前端在调试时切到真实接口（用于跑通端到端联调）。schema 不变，行为切换。

#### 3.8.4 三类典型 DataSource 的运行时表现

| 场景 | type | 配置 | 运行时行为 |
|------|------|------|----------|
| 静态文案/枚举（如标签颜色表） | `static` | `initial: [...]` | 启动同步注入 `state.data[name]`；不发 fetch，无 effects 状态 |
| 真实接口（无 mock） | `api` | `endpoint: {...}` | screenEnter 自动 effect.fetch；mock 缺失时编辑器预览也走 HTTP |
| **接口 + mock**（最常见） | `api` | `endpoint + mock` | 编辑器/演示用 mock，生产用真实 endpoint；schema 不变 |

#### 3.8.5 与今天的 MockExecutor 对比

```
今天                                           新模型
──────────────────────────────────────────────────────────────────
apiRequest action                              effect.fetch action
  → MockExecutor.execute()                       → EffectExecutor (mock driver)
  → response 临时塞 ctx.responseData              → state.effects[id].data 持久态
  → onSuccess 内才能用 {{response.x}}             → 任何时刻、任何节点都能读
  → 动作链结束就丢了                              → 直到下次同 id fetch 才覆盖
  → 没法持久化进数据源                            → 通过 state.append/set 进 state.data
                                                 → 列表自动重渲染
```

新模型保留了 mock 的全部能力（delay/statusCode/scenarios 切换/timeout 模拟），并解决了"响应没法留下来"这个根因。设计稿/演示链路的"无真实接口也能完整跑业务流程"能力**变强**而不是变弱。

#### 3.8.6 编辑器侧的 mock 工具

mock 的 CRUD 由编辑器面板和 MCP 工具承担（不变）：

- 编辑器：保留当前的"数据源 → API 接口 → 场景列表"面板；UI 上加切换"预览用 mock / 真实接口"的开关
- MCP 工具：`data_source` 下的 `add_scenario` / `update_scenario` / `switch_scenario` 全部保留，仅 schema 字段名按 §3.2 调整（`scenarios` 移到 `mock.scenarios`）
- 迁移层：旧 `dataSource.scenarios` → 新 `dataSource.mock.scenarios`，`activeScenarioId` → `mock.activeScenarioId`，旧 `lifecycle` → 新 `type`

---

## 四、迁移设计

### 4.1 总原则（§9.1 无双版本）

- 新模型在 `design-schema` v2 类型中定义，旧模型 v1 类型标记 `@deprecated`，**编译期不能新建**（编辑器 UI / MCP 工具直接用 v2）
- `design-engine` 运行时**只读 v2 模型**
- `design-api` 在 `findOne()` 路径增加**迁移层 `migrateV1toV2(project)`**，把 DB 里的旧 schema 即时翻译为 v2 喂给前端
- 后台周期任务跑一次性 migration script，把 DB 里所有 schema 永久升级为 v2
- 全部数据迁移完毕后（评估 1~2 周），**删除迁移层和 v1 类型**（按 §9.1 红线，不留兼容代码）

### 4.2 字段级映射表

| v1 字段 / 行为 | v2 字段 / 行为 |
|---|---|
| `dataSource.scenarios[active].data` | `state.data[<dsName>]` 初始值（type=static），或 mock 响应（type=api） |
| `dataSource.activePhase` (loading/loaded/empty/error) | `state.effects[<dsId>].status` 派生值 |
| `dataSource.lifecycle` | `dataSource.type`（值不变） |
| `screen.domainStates[*]` 字符串值 | `state.view[<varName>]`（值类型不限，旧字符串照存） |
| `screen.environmentStates[*]` | `projectState.view[<varName>]` |
| `node.globalStateBindings[].styles` | 编译为 styles 字段表达式：`{{ state.view[var] === val ? newStyle : baseStyle }}` |
| `node.domainStateBindings[].visible` | 编译为 `visibleWhen` 表达式 |
| `node.visibilityWhen` | `visibleWhen` 表达式 |
| `node.props.__listData` | `node.repeat` 字段 |
| `node.activeState` + `node.states[]` | 视觉态系统不变，纯 UI 态保留；归到 `node.setVisualState` action 操作 |
| `event.actions[].type === 'setDomainState'` | `state.set` |
| `event.actions[].type === 'setGlobalState'` | `state.set`（同 setDomainState） |
| `event.actions[].type === 'setEnvironmentState'` | `state.set`，path 前缀 `projectState.view.*`（非本 RFC 范围）|
| `event.actions[].type === 'switchDataSourcePhase'` | 弃用（phase 现在是派生态，不可手动切；编辑器预览面板单独提供"切换预览阶段"工具，不走 schema action）|
| `event.actions[].type === 'apiRequest'` | `effect.fetch` |
| `{{response.x}}` 模板（在 onSuccess 内） | `{{ state.effects.<dsId>.data.x }}` |
| `dataSource.scenarios[]` / `activeScenarioId` (api 类型) | `dataSource.mock.scenarios[]` / `dataSource.mock.activeScenarioId`；保持 mock 能力完整 |
| `dataSource.endpoint`（已有） | `dataSource.endpoint`，迁移时校验：缺 endpoint 但有 scenarios → 自动放进 mock |
| `MockExecutor.execute()` 调用点 | `EffectExecutor` 的 `MockDriver`；行为兼容（delay/statusCode/timeout/cancel 全保留）|
| `event.actions[].type === 'setState'` (改节点视觉态) | `node.setVisualState` |
| `event.actions[].type === 'toggleVisible'` | `state.toggle`，path = `view.<flagName>`（节点 visible 改绑 `visibleWhen`）|
| `{{path | "default"}}` | `{{path || "default"}}` |

### 4.3 Migration script（一次性）

放在 `apps/design-api/src/migrations/v1-to-v2-state-model.ts`：

1. 扫描 `design_snapshots`，对每个 `schema` 跑 `migrateV1toV2()`
2. 写入新 snapshot（保留旧 snapshot 备份 7 天）
3. `design_operations` 历史 op 不重写，但新 op executor 只识别 v2 协议；旧 op 在重放时由 executor 内部翻译

### 4.4 删除时间表

| 时点 | 动作 |
|------|-----|
| T0 (RFC 通过) | 启动实施 |
| T0 + 2 周 | 新模型上线，迁移层启用，所有新写入走 v2 |
| T0 + 4 周 | 跑 migration script 升级 DB 历史数据 |
| T0 + 5 周 | 验证完毕，删除迁移层、删除 v1 类型、删除旧 action handler |

时间表写在 `design_docs/03-tech/state-action-expression-rfc.md` 头部 + GitHub issue 跟踪。

---

## 五、改动范围估计

| 模块 | 改动 |
|------|------|
| `features/design-schema` | v2 类型定义（State/Action/Expression/DataSource/ComponentNode）；validators 重写；导出 `migrateV1toV2`；约 +600 / −400 行 |
| `features/design-engine` | 表达式引擎（mini parser ~200 行）；`StateContext` + reducer（~150 行）；所有渲染器路径改用 v2（~300 行修改）；删除 v1 渲染逻辑（~200 行）；约 +650 / −200 行 |
| `features/design-operations` | Operation executor 中 v1 → v2 即时翻译；约 +200 / −150 行 |
| `apps/design-api` | findOne 迁移层；migration script；约 +250 / −50 行 |
| `apps/design_front` | 编辑器面板：State 浏览器、Action 编辑器（替换原 InteractionsTab 的命令式 actions 列表）、表达式编辑器（含 IDE 提示）；约 +800 / −1000 行（净减）|
| `apps/design-mcp` | 所有工具签名改 v2；event 工具的 action 列表完全重写；data_source / domain_state 工具合并为 `state` 工具；约 +300 / −400 行 |
| 文档 | `design-schema.md` / `design-engine.md` / `design-operations.md` 同步更新；新写 `state-model.md` / `expression-language.md` / `action-protocol.md`；约 +1000 行 |

合计约 **+3800 / −2200 行**（净增 1600 行）。**主要工作量在编辑器 UI 重写和文档**，运行时核心反而精简。

---

## 六、风险与替代方案

### 6.1 风险

1. **表达式引擎安全性** — 用 AST 解释器而非 `new Function`，白名单 stdlib，扛得住 schema 注入
2. **迁移层正确性** — 用 833478e8 项目（Music AI Hub）作为黄金 fixture，迁移前后 schema 渲染快照必须一致；上线前用项目库里全部历史 snapshot 做回归
3. **编辑器 UI 学习成本** — 新 Action 编辑器需要更直观的"看可视化、写表达式"双向支持；建议第一版先做"可视化优先 + 表达式只读 fallback"，后续逐步开放表达式编辑

### 6.2 替代方案及为何不选

**方案 A：每个能力缺口分别打补丁**
- 加 `valueExpression` 到 setDomainState；加 `setDataSourceData` action；加 `appendToList` action；让 `visibilityWhen` 支持 `item.*`；……
- ❌ 拒绝：补丁堆积，schema 字段冗余（同一个意思有 5 种写法），违反 §3.1 第一性原理 / §9.1 无双版本

**方案 B：引入第三方状态库（如把 Zustand schema-ize）**
- 把 Zustand store 序列化为 schema 字段
- ❌ 拒绝：增加运行时依赖，且第三方语义不一定贴合"声明式 UI 描述"场景

**方案 C：只做表达式升级，不动 State/Action 模型**
- 让所有字段支持表达式，业务靠表达式硬扛
- ❌ 拒绝：表达式没有"地方放东西"——状态还是字符串字典，照样写不出聊天追加

**方案 D（本 RFC）：State/Action/Expression 三件套同步重构**
- ✅ 选择：根因层面解决，向后能力扩展空间大，符合工程规范

---

## 七、决策与后续

### 7.1 评审项

请评审组就以下问题给出意见：

1. **方向**：State/Action/Expression 三件套是否是正确的根因抽象？
2. **范围**：本 RFC 划的边界是否合理（projectState 跨屏共享态留作另一 RFC；视觉态系统不动）
3. **时间表**：5 周完成是否可接受？资源投入是否到位？
4. **迁移策略**：findOne 即时翻译 + 后台一次性 migration 是否够稳？

### 7.2 RFC 通过后的工作分解

| Issue | 内容 | 估时 |
|------|------|-----|
| #1 | v2 类型定义 + 迁移层 + migration script | 1 周 |
| #2 | 表达式引擎（含 stdlib + 测试） | 4 天 |
| #3 | StateContext + Action dispatcher + 渲染器迁移到 v2 | 1 周 |
| #4 | 编辑器面板重写（State 浏览器、Action 编辑器、表达式编辑器） | 1.5 周 |
| #5 | MCP 工具签名重写 | 4 天 |
| #6 | 文档 + 黄金 fixture 回归测试 | 4 天 |
| #7 | 上线 + 跑 migration script + 验证 + 删除 v1 代码 | 3 天 |

合计 5 周，与时间表一致。

### 7.3 不在本 RFC 范围

- `ProjectState` 跨屏共享态（同形扩展，后续 RFC 单做）
- 表达式引擎的"用户自定义函数注册"（先用白名单 stdlib，后续按需开放）
- Server-Driven UI（后端 push schema 变更）—— 本 RFC 只做客户端运行时
- 离线/本地缓存策略 —— 不在框架职责内，由业务自行通过 effect.fetch 的 mock 模拟

---


> 评审通过后，本文件移到 `design_docs/03-tech/rfcs/` 目录归档；issue #1-#7 创建并 link 回本 RFC。
