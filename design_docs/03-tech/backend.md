# 后端架构 (design-api)

> 包名：`@globallink/design-api` | 位置：`apps/design-api` | 技术栈：NestJS + PostgreSQL + WebSocket

相关文档：[整体架构](./architecture.md) | [Event Sourcing](./event-sourcing.md) | [MCP Server](./design-mcp.md)

---

## 目录结构

```
apps/design-api/src/
├── main.ts                     # NestJS 入口
├── app.module.ts               # 根模块
├── projects/                   # 设计项目 CRUD
│   ├── projects.controller.ts  # REST API
│   ├── projects.service.ts     # 业务逻辑
│   └── projects.entity.ts      # 数据库实体
├── operations/                 # 操作执行 & 日志
│   ├── operations.controller.ts # 接收操作请求（来自前端 or MCP Server）
│   ├── operations.service.ts    # 执行操作 + 写入日志 + 触发快照
│   └── operations.gateway.ts    # WebSocket 网关（推送操作给前端）
├── assets/                     # 组件资产管理
│   ├── assets.controller.ts
│   └── assets.service.ts
└── codegen/                    # 代码生成服务
    ├── codegen.controller.ts
    └── codegen.service.ts      # 调用 design-codegen
```

> **注意：没有 ai/ 模块。** AI 对话不再由后端负责，而是通过 MCP 协议由外部工具（Cursor/Claude Code）直接处理。

---

## API 设计

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/projects` | 获取项目列表 |
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/:id` | 获取项目详情（从快照+操作日志重建 Schema） |
| DELETE | `/api/projects/:id` | 删除项目 |
| POST | `/api/projects/:id/operations` | 执行操作（写入日志 + 推送 WebSocket） |
| POST | `/api/projects/:id/operations/batch` | 批量执行操作 |
| GET | `/api/projects/:id/operations?since=N` | 获取某个版本后的操作日志 |
| POST | `/api/projects/:id/operations/undo` | 撤销最后一次操作 |
| POST | `/api/projects/:id/export/:target` | 导出目标平台代码 |
| GET | `/api/assets` | 获取组件资产列表 |
| POST | `/api/assets` | 保存组件资产 |
| PUT | `/api/assets/:id` | 更新组件资产 |
| DELETE | `/api/assets/:id` | 删除组件资产 |
| WS | `/ws/projects/:id` | WebSocket：实时操作推送 |

---

## 关键依赖

| 依赖包 | 用途 |
|--------|------|
| `@globallink/design-schema` | Schema 类型定义、校验 |
| `@globallink/design-operations` | 操作执行器 |
| `@globallink/design-codegen` | 代码导出 |
