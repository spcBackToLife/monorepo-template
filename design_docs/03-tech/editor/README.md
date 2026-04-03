# 编辑器技术方案 — 总纲

> **范围：** 编辑器全部子系统的技术实现方案 · **涉及包：** 全部 7 个 · **产品来源：** `02-product/editor/`（11 个子系统）

> 相关文档：[整体架构](../architecture.md) | [产品总纲](../../02-product/editor/README.md) | [排期](../../04-roadmap/roadmap.md)

---

## 1. 为什么需要这组文档

产品方案按**用户功能**组织（画布、工具栏、属性面板……），技术方案按**代码包 / 技术关注点**组织（Schema 扩展、Operations 扩展、渲染管线……）。多个产品子系统共享同一个技术包，映射关系是多对多。本目录将产品需求"翻译"为可执行的技术设计，覆盖类型定义、核心算法、组件签名和包边界规则。

---

## 2. 现有 7 个包 → 11 个技术模块

### 2.1 包列表

| # | 包名 | 路径 | 职责 | 运行环境 |
|---|------|------|------|---------|
| 1 | `@globallink/design-schema` | `features/design-schema` | 类型定义、校验、视口预设、资产工具 | browser + node |
| 2 | `@globallink/design-operations` | `features/design-operations` | 21+ 操作、undo/redo、OperationExecutor | browser + node |
| 3 | `@globallink/design-engine` | `features/design-engine` | SchemaRenderer、EditorOverlay、ViewportContainer、样式解析 | browser |
| 4 | `@globallink/design-codegen` | `features/design-codegen` | 代码生成（仅 stub） | node |
| 5 | `design_front` | `apps/design_front` | React + MobX 编辑器 UI（stores/views/services） | browser |
| 6 | `@globallink/design-api` | `apps/design-api` | NestJS 后端（projects/operations/assets/WebSocket） | node |
| 7 | `@globallink/design-mcp` | `apps/design-mcp` | MCP Server（tools/resources/api-client） | node |

### 2.2 包 → 技术模块映射

| 包 | 技术模块 | 文档 |
|----|---------|------|
| design-schema | Schema 扩展 | [01-schema-extensions](./01-schema-extensions.md) |
| design-operations | Operations 扩展 | [02-operations-extensions](./02-operations-extensions.md) |
| design-engine | 渲染管线 | [03-engine-rendering](./03-engine-rendering.md) |
| design-engine | 画布交互 | [04-engine-canvas](./04-engine-canvas.md) |
| design-engine | 预览模式 | [05-engine-preview](./05-engine-preview.md) |
| design_front | 布局框架 | [06-frontend-layout](./06-frontend-layout.md) |
| design_front | 画布组件 | [07-frontend-canvas](./07-frontend-canvas.md) |
| design_front | 面板系统 | [08-frontend-panels](./08-frontend-panels.md) |
| design-api | 后端扩展 | [09-backend-extensions](./09-backend-extensions.md) |
| design-mcp | MCP 扩展 | [10-mcp-extensions](./10-mcp-extensions.md) |
| design-api + design_front | 同步系统 | [11-sync-system](./11-sync-system.md) |

> **注意：** design-engine 拆为 3 个模块（渲染、画布、预览），design_front 拆为 3 个模块（布局、画布、面板），因为各自的关注点差异大于相似性。

---

## 3. 产品子系统 → 技术模块交叉引用

| 产品子系统 | 01 Schema | 02 Ops | 03 渲染 | 04 画布 | 05 预览 | 06 布局 | 07 画布组件 | 08 面板 | 09 后端 | 10 MCP | 11 同步 |
|-----------|:---------:|:------:|:------:|:------:|:------:|:------:|:----------:|:------:|:------:|:------:|:------:|
| 01 中央画布 | | | ● | ● | | | ● | | | | |
| 02 工具栏 | | | | | | ● | ● | | | | |
| 03 属性面板 | ● | ● | ● | | | | | ● | | | |
| 04 状态系统 | ● | ● | ● | | ● | | | ● | | ● | |
| 05 数据驱动 | ● | ● | ● | | | | | ● | ● | ● | |
| 06 组件 Props | ● | ● | ● | | | | | ● | | ● | |
| 07 资产管理 | ● | ● | | | | | | ● | ● | ● | |
| 08 组件树 | | ● | | | | ● | | ● | | | |
| 09 交互事件 | ● | ● | | | ● | | | ● | | | |
| 10 预览模式 | | | ● | | ● | ● | | | | | |
| 11 协作同步 | ● | | | | | | | | ● | | ● |

---

## 4. 包依赖关系图（扩展后）

```
                    ┌──────────────────┐
                    │  design-schema   │   ← 最底层，零依赖
                    │  (01-schema-ext) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
    │  design-ops │  │design-engine│  │design-codegen│
    │ (02-ops-ext)│  │(03 渲染管线) │  │  (Phase 5)   │
    └──────┬──────┘  │(04 画布交互) │  └──────────────┘
           │         │(05 预览模式) │
           │         └──────┬──────┘
           │                │
           └────────┬───────┘
                    │
                    ▼
           ┌───────────────┐
           │  design_front │
           │ (06 布局框架)  │
           │ (07 画布组件)  │
           │ (08 面板系统)  │
           └───────┬───────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
  ┌──────────┐ ┌────────┐ ┌────────┐
  │design-api│ │  同步   │ │design- │
  │(09 后端)  │ │(11-sync)│ │  mcp   │
  └──────────┘ └────────┘ │(10 MCP)│
        │                  └────┬───┘
        └───────────────────────┘
         （MCP 通过 HTTP 调用 API）
```

---

## 5. 包边界规则

| 规则 | 说明 |
|------|------|
| **Schema 零依赖** | `design-schema` 不依赖任何其他包，只定义类型、校验器和工具函数 |
| **Operations 只依赖 Schema** | `design-operations` 只 import `design-schema` 的类型，纯函数实现 |
| **Engine 只依赖 Schema** | `design-engine` 只 import `design-schema` 的类型，提供 React 组件 |
| **Engine 无状态管理** | Engine 不持有 MobX store，通过 props/context 接收数据 |
| **Frontend 组装层** | `design_front` 是唯一知道所有包的组装层，负责 MobX store + 布线 |
| **API 不知道 Engine** | 后端不依赖渲染引擎，只依赖 Schema 类型 + Operations |
| **MCP 不知道前端** | MCP Server 通过 HTTP 调用 API，不直接访问前端 |
| **所有修改经过 Operation** | 任何对 Schema 的修改必须通过 Operation，不允许直接修改 |

---

## 6. 状态流不变量

```
┌────────────────────────────────────────────────────────┐
│  不变量：Schema 的所有修改必须经过 Operation            │
│                                                        │
│  手动路径: UI → OperationExecutor.execute(op)          │
│           → MobX Store 更新 → Canvas 重新渲染           │
│           → Async Queue → REST API → WS 广播           │
│                                                        │
│  AI 路径:  MCP Tool → REST API → 持久化               │
│           → WS 推送 → Frontend apply(op) → 重新渲染    │
│                                                        │
│  结果：两条路径最终收敛到同一个 Schema 状态              │
└────────────────────────────────────────────────────────┘
```

**推论：**
- 任何新功能都必须先定义 Operation，再实现 UI
- Undo/Redo 是 Operation 的逆操作，不是 Schema 快照
- AI 和人类操作使用完全相同的 Operation 定义
- 冲突解决在 Operation 层面（LWW），不在 Schema 层面

---

## 7. 实现阶段总览

与产品 Phase 对齐的 5 个技术 Phase：

### Phase 1：基础编辑（3 周）
**目标：** 能用鼠标创建、选择、移动、调整元素，有基本的属性编辑

| 模块 | 交付内容 |
|------|---------|
| 01 Schema | ComponentNode 新增 `locked`、`visible` 字段 |
| 02 Operations | `wrapInContainer`、`unwrapContainer`、`reorderElement`、`batchUpdateStyle`、`changeElementType` |
| 04 画布 | 坐标系统、hitTest、BoundingBoxCache、对齐线、吸附 |
| 06 布局 | EditorLayout 4 区框架、TopToolbar、BottomToolbar |
| 07 画布组件 | ToolStateMachine、快捷键系统、右键菜单、缩放平移 |
| 08 面板 | PropertyPanel 框架 + StylesTab（8 个折叠组）、NodeTree（虚拟滚动）、PageList |

### Phase 2：状态 + 属性（2 周）
**目标：** 支持三层状态系统和组件 Props

| 模块 | 交付内容 |
|------|---------|
| 01 Schema | `GlobalStateVariable`、`GlobalStateBinding`、`ComponentPropDefinition`、`PropBinding` |
| 02 Operations | 全局状态操作（set/add/remove binding）、Props 操作（add/remove/update definition） |
| 03 渲染 | `resolveNodeStyles()` 4 层叠加、`resolveNodeProps()` |
| 08 面板 | StatesTab（三层状态卡片）、PropsTab（属性注册表渲染） |

### Phase 3：数据驱动（2 周）
**目标：** 数据集绑定、表达式解析、列表渲染、截图矩阵

| 模块 | 交付内容 |
|------|---------|
| 01 Schema | `DataSet`、Screen 新增 `dataSets[]`、`activeDataSetId`、`globalStates[]` |
| 02 Operations | 数据操作（addDataSet、removeDataSet、updateDataSet、switchDataSet、bindData） |
| 03 渲染 | `resolveExpression()`、DataContext、ListRenderer |
| 08 面板 | DataTab（数据集管理 + JSON 编辑器 + 绑定面板） |
| 09 后端 | DataSet CRUD 端点 |
| 10 MCP | 数据集 Tools（list/switch/update/add/bind_data） |

### Phase 4：高级编辑（3 周）
**目标：** 预览模式、交互事件执行、高级资产管理、截图生成

| 模块 | 交付内容 |
|------|---------|
| 04 画布 | EditorOverlay 高级功能（栅格、等距检测） |
| 05 预览 | PreviewRenderer、EventExecutionEngine、CSSPseudoInjector、NavigationStack |
| 07 画布组件 | 预览模式切换 |
| 08 面板 | InteractionsTab、ComponentLibrary |
| 09 后端 | Asset 文件上传、截图生成（Puppeteer） |
| 10 MCP | 全局状态 Tools、组件 Props Tools、截图 Tool |

### Phase 5：协作（2 周）
**目标：** 实时同步、回声去重、断线重连

| 模块 | 交付内容 |
|------|---------|
| 11 同步 | OperationEnvelope 协议、EchoDeduplicator、断线重连、保存状态指示器 |
| 09 后端 | WebSocket 广播增强（fingerprint、author）、OperationEnvelope 持久化 |

---

## 8. 测试策略

| 层级 | 范围 | 工具 | 覆盖率目标 |
|------|------|------|-----------|
| 单元测试 | Schema 校验、Operation execute/inverse、表达式解析、坐标转换 | Vitest | ≥ 90% |
| 组件测试 | React 组件渲染、面板交互 | Vitest + Testing Library | ≥ 80% |
| 集成测试 | Operation → Store → Render 全链路 | Vitest | 关键路径 100% |
| E2E 测试 | 用户工作流（创建元素→编辑样式→预览）| Playwright | 核心 Happy Path |
| 快照测试 | 截图矩阵对比（视觉回归） | Playwright screenshot | 每次 PR |

**测试原则：**
- 每个 Operation 必须有 execute + inverse 的对称测试
- 渲染测试使用确定性数据集，避免随机性
- 画布坐标测试覆盖所有缩放/平移场景
- 状态解析测试覆盖所有 4 层叠加组合

---

## 9. 阅读导航

### 按开发顺序读（推荐新成员）

1. [01-schema-extensions](./01-schema-extensions.md) — 理解所有新增类型
2. [02-operations-extensions](./02-operations-extensions.md) — 理解所有新增操作
3. [03-engine-rendering](./03-engine-rendering.md) — 理解渲染管线
4. [04-engine-canvas](./04-engine-canvas.md) — 理解画布交互
5. [06-frontend-layout](./06-frontend-layout.md) → [07-frontend-canvas](./07-frontend-canvas.md) → [08-frontend-panels](./08-frontend-panels.md) — 理解前端组装
6. [05-engine-preview](./05-engine-preview.md) — 预览模式
7. [09-backend-extensions](./09-backend-extensions.md) → [10-mcp-extensions](./10-mcp-extensions.md) — 后端与 AI
8. [11-sync-system](./11-sync-system.md) — 同步协作

### 按包阅读（推荐模块负责人）

- **design-schema 负责人：** [01](./01-schema-extensions.md)
- **design-operations 负责人：** [02](./02-operations-extensions.md)
- **design-engine 负责人：** [03](./03-engine-rendering.md) → [04](./04-engine-canvas.md) → [05](./05-engine-preview.md)
- **design_front 负责人：** [06](./06-frontend-layout.md) → [07](./07-frontend-canvas.md) → [08](./08-frontend-panels.md)
- **design-api 负责人：** [09](./09-backend-extensions.md) → [11](./11-sync-system.md)
- **design-mcp 负责人：** [10](./10-mcp-extensions.md)

### 按产品功能阅读（推荐产品经理）

- **"我想看画布怎么实现"** → [04](./04-engine-canvas.md) + [07](./07-frontend-canvas.md)
- **"我想看状态系统怎么实现"** → [01 §状态类型](./01-schema-extensions.md) + [03 §状态叠加](./03-engine-rendering.md) + [08 §StatesTab](./08-frontend-panels.md)
- **"我想看数据驱动怎么实现"** → [01 §数据类型](./01-schema-extensions.md) + [03 §数据绑定](./03-engine-rendering.md) + [08 §DataTab](./08-frontend-panels.md)
- **"我想看协作怎么实现"** → [11](./11-sync-system.md) + [09 §WebSocket](./09-backend-extensions.md)
