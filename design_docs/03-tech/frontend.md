# 前端架构 (design_front)

> 包名：`@globallink/design_front` | 位置：`apps/design_front` | 技术栈：React 18 + Vite + MobX + Tailwind

相关文档：[整体架构](./architecture.md) | [渲染引擎](./design-engine.md) | [操作集合](./design-operations.md) | [编辑器产品设计](../02-product/editor.md)

---

## 目录结构

```
apps/design_front/src/
├── main.tsx                    # 入口
├── router/                     # 路由
│   └── index.tsx               # / → 首页, /editor/:id → 编辑器
├── stores/                     # MobX 状态管理
│   ├── project.store.ts        # 设计项目状态（持有 DesignProject）
│   ├── editor.store.ts         # 编辑器 UI 状态（选中节点、当前屏幕等）
│   └── sync.store.ts           # WebSocket 同步状态（接收 MCP/外部操作推送）
├── views/
│   ├── home/                   # 首页（项目列表 + 新建）
│   │   └── index.tsx
│   └── editor/                 # 编辑器
│       ├── index.tsx           # 编辑器主布局
│       ├── Canvas.tsx          # 左侧画布（调用 design-engine 双层渲染）
│       ├── OperationPanel.tsx  # 右侧操作面板（手动操作）
│       └── ComponentTree.tsx   # 组件层级树（可选）
├── components/                 # 通用 UI 组件
└── services/                   # API 调用层
    ├── api.ts                  # 与 design-api 通信（REST）
    └── ws.ts                   # WebSocket 连接（接收实时操作推送）
```

> **注意：没有 AIChatPanel.tsx 和 ai.store.ts。** 前期 AI 对话完全由 Cursor/Claude Code 通过 MCP 完成，前端不需要自建 AI 对话。

---

## 数据流（两条路径并行）

```
路径 A：手动操作（前端直接）
  用户点击操作面板
       │
       ▼
  OperationExecutor.execute(op)    ← 前端直接调用 SDK
       │
       ├─→ MobX Store 更新 → 画布重新渲染（立即）
       └─→ 异步批量 REST API → design-api 持久化（Operation Log + 快照）

路径 B：AI 操作（通过 MCP）
  Cursor/Claude Code 发出 Tool Call
       │
       ▼
  MCP Server → design-api REST 接口
       │
       ├─→ 持久化（Operation Log + 快照）
       └─→ WebSocket 推送给前端
              │
              ▼
        前端收到变更 → 应用操作 → 画布重新渲染
```

---

## 关键依赖

| 依赖包 | 用途 |
|--------|------|
| `@globallink/design-schema` | Schema 类型定义、校验 |
| `@globallink/design-operations` | 操作执行器（手动操作路径 A） |
| `@globallink/design-engine` | 双层渲染（SchemaRenderer + EditorOverlay） |
