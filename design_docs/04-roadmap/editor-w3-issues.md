# W3 Issue 列表（数据驱动 MVP）

> 对应 `editor-product-full-implementation-plan.md` **W3**；依赖 W2。

**状态**：`open` | `done`

---

## Epic W3-A — Schema / Operations / API

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W3-001 | Screen `dataSets`、`activeDataSetId` 与 Operation：`addDataSet` / `removeDataSet` / `updateDataSet` / `switchDataSet` | 05 MVP | `design-schema`、`design-operations` | done（既有） |
| W3-002 | 持久化走 operations 批量，无类型白名单拦截 | 05 MVP | `design-api` `operations.service` | done（JSONB 通用） |

---

## Epic W3-B — 引擎与表达式

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W3-010 | `{{data.xxx}}` 解析与 `DataContext` | 05 MVP | `design-engine` `resolveExpression`、SchemaRenderer | done（既有） |
| W3-011 | 属性面板表达式输入与路径自动补全 | 05 MVP | `ExpressionInput` | done（既有） |

---

## Epic W3-C — 前端壳

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W3-020 | 顶栏 **编辑态** 数据集切换（与预览条一致） | 05 MVP | `Toolbar` | done |
| W3-021 | 右侧 **数据 Tab**：数据集 CRUD、JSON、树编辑 | 05 MVP | `panels/tabs/DataTab` | done（既有） |
| W3-022 | 预览条数据集切换（保留） | 05 MVP | `PreviewBar` | done（既有） |
| W3-023 | PropsTab 绑定识别与 `bindData` 一致（`__bind:` 或 props 值含 `{{}}`） | 05 MVP | `PropsTab`、`PropertyPanel` | done |
| W3-024 | `updateDataSet` 支持 name/description；Data Tab 中文、重命名、JSON 同步 | 05 MVP | `design-operations`、`DataTab` | done |
| W3-025 | MCP：`remove_dataset`；`update_dataset` 可选 data/name/description | 05 MVP | `design-mcp` | done |

---

## 建议顺序

1. 核对 schema/operations/API → 2. 顶栏数据集 → 3. Data Tab 文案与空态（可选）

---

**维护**：改 `design-engine` 后 `pnpm --filter @globallink/design-engine build`。
