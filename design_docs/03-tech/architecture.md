# 整体技术架构

> 本文档描述 DesignUI 的整体技术架构，包括 monorepo 结构、SDK 划分、MCP 集成及技术选型。
>
> 相关文档：[design-schema](./design-schema.md) | [design-engine](./design-engine.md) | [design-operations](./design-operations.md) | [design-codegen](./design-codegen.md)

---

## 1. 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                      monorepo-template                       │
│                                                              │
│  apps/                                                       │
│  ├── design_front        ← React 前端（已有）                 │
│  ├── design-api          ← NestJS 后端（已有）                │
│  └── design-mcp          ← 🆕 MCP Server（AI 操控入口）      │
│                                                              │
│  features/                                                   │
│  ├── jarvis-tools        ← 工具库（已有）                     │
│  ├── design-schema       ← 🆕 UI Schema 协议（类型+校验+资产）│
│  ├── design-engine       ← 🆕 双层渲染引擎（DOM+Canvas）      │
│  ├── design-operations   ← 🆕 设计操作集合（核心逻辑）        │
│  └── design-codegen      ← 🆕 跨平台代码生成（插件化）        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

外部 AI 工具通过 MCP 协议连接:
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Cursor      │  │  Claude Code  │  │  自建 Client  │
│   (MCP Client)│  │  (MCP Client) │  │  (后期建设)   │
└──────┬────────┘  └──────┬────────┘  └──────┬────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │ MCP 协议 (stdio / SSE)
                          ▼
              ┌───────────────────────┐
              │   design-mcp Server   │
              │   (暴露 Tools +       │
              │    Resources)         │
              └───────────┬───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        operations    schema      codegen
        (执行操作)    (读取状态)   (导出代码)
```

---

## 2. SDK 列表 + MCP Server

### 4 个 features（内部 SDK）

| SDK 包名 | 模板 | 运行环境 | 职责 |
|----------|------|---------|------|
| `@globallink/design-schema` | `features/lib-sdk` | browser | UI Schema 协议：类型定义、校验、组件资产模型、序列化 |
| `@globallink/design-engine` | `features/ui-sdk` | browser | 双层渲染引擎：React DOM 内容层 + Canvas 编辑层 |
| `@globallink/design-operations` | `features/lib-sdk` | browser | 操作集合：所有设计操作的标准化定义与执行（核心逻辑） |
| `@globallink/design-codegen` | `features/lib-sdk` | node | 跨平台代码生成：Schema → React/Vue/Flutter/RN |

### 1 个 apps（MCP Server 应用）

| 包名 | 位置 | 职责 |
|------|------|------|
| `@globallink/design-mcp` | `apps/design-mcp` | MCP Server：将 design-operations 包装成 MCP Tools，供 Cursor/Claude Code 等调用 |

> **design-mcp 不是 SDK 模板能直接创建的（它不是 lib-sdk 也不是 ui-sdk），需要手动在 apps/ 下创建一个 Node.js 应用。**

---

## 3. 为什么放在 features 而不是 packages？

- 这些 SDK 目前仅在 monorepo 内部使用（design_front 和 design-api 消费）
- 不需要发布到 npm
- 如果未来需要开源/发布，可以迁移到 packages

## 4. 为什么必须拆成独立 SDK 而不是写在 design_front 里？

1. **design-schema** 前后端共用（前端渲染 + 后端存储/校验都需要）
2. **design-engine** 未来要支持多渲染目标（React、Canvas、Vue），必须独立
3. **design-operations** 要被 AI 模块和手动操作面板共同调用，必须独立
4. 关注点分离，每个包独立构建、独立测试

---

## 5. 包依赖关系

```
design-schema              ← 无依赖，最底层（类型 + 校验 + 资产模型）
      ↑
design-operations          ← 依赖 design-schema
      ↑
design-engine              ← 依赖 design-schema（渲染 Schema 为 DOM + Canvas）
design-codegen             ← 依赖 design-schema（翻译 Schema 为代码）
design-mcp                 ← 依赖 design-schema + design-operations（MCP 壳）
      ↑
design_front               ← 依赖 schema + operations + engine
design-api                 ← 依赖 schema + operations + codegen
```

---

## 6. 技术选型总结

| 层 | 技术 | 理由 |
|----|------|------|
| 前端框架 | React 18 + Vite | monorepo 已有，生态成熟 |
| 状态管理 | MobX | monorepo 已有，响应式更新适合编辑器场景 |
| UI 组件库 | Ant Design | monorepo 已有 |
| 样式 | Tailwind CSS + CSS-in-JS | Tailwind 做编辑器 UI，CSS-in-JS 做画布渲染 |
| 画布渲染 | 双层：React DOM + Canvas 覆盖层 | DOM 层所见即所得（CSS 1:1），Canvas 层做选区/拖拽/对齐线 |
| AI 集成 | MCP Server + 外部 AI Client | 前期用 Cursor/Claude Code，零成本；后期自建 Client |
| MCP SDK | @modelcontextprotocol/sdk | 官方标准实现，TypeScript 原生支持 |
| 后端 | NestJS | 已有，TypeScript 全栈一致 |
| 数据库 | PostgreSQL | 已有 |
| 存储模型 | Event Sourcing + 周期快照 | 增量存储、精确版本、天然 undo/redo、审计日志 |
| 实时同步 | WebSocket (NestJS Gateway) | MCP 操作实时推送到前端画布 |
| 构建 | tsup (SDK) + Vite (App) | monorepo 标准配置 |

---

## 7. 包导出与模块兼容规范（重要）

> 目标：避免 `ERR_PACKAGE_PATH_NOT_EXPORTED`、`ERR_REQUIRE_ESM` 这类跨模块系统问题反复出现。

### 7.1 适用范围

- 所有会被 `apps/design-api`（NestJS/Node 侧）直接依赖的内部 SDK：
  - `@globallink/design-schema`
  - `@globallink/design-operations`
  - 以及后续任何被后端直接 import/require 的 `features/*` 包

### 7.2 强制要求

1. **SDK 必须同时产出 ESM + CJS**
   - `tsup` 配置使用：`format: ['esm', 'cjs']`
2. **package.json 必须提供 import/require 双入口**
   - `main` 指向 CJS：`dist/index.cjs`
   - `module` 指向 ESM：`dist/index.js`
   - `exports` 至少包含：
     - `types`
     - `import`
     - `require`
3. **被 CJS 使用的 SDK，不得引入 ESM-only 运行时依赖**
   - 典型风险：在 CJS 产物中出现 `require('some-esm-only-package')`
   - 若确需使用，必须改为：
     - 内置实现替代，或
     - 仅在 ESM 路径动态加载，且不影响 CJS 入口

### 7.3 常见报错与对应处理

- **`ERR_PACKAGE_PATH_NOT_EXPORTED`**
  - 含义：包未提供 `require` 导出路径
  - 处理：补齐 `exports.require`，并确保存在 CJS 产物
- **`ERR_REQUIRE_ESM`**
  - 含义：CJS 在 `require()` ESM-only 依赖
  - 处理：替换依赖或改加载方式，保证 CJS 路径可执行

### 7.4 新增/修改 SDK 时检查清单

- [ ] `tsup.config.ts` 是否为 `esm + cjs`
- [ ] `package.json` 是否有 `main/module/exports(import+require+types)`
- [ ] Node 侧是否做过 `pnpm --filter <pkg> build` 验证
- [ ] 依赖里是否包含 ESM-only 包（若有，确认 CJS 路径安全）
