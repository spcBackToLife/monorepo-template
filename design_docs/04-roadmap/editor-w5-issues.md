# W5 Issue 列表（交互 + 预览 MVP）

> 对应 `editor-product-full-implementation-plan.md` **W5**（09 + 10 MVP）；依赖 W4。

---

## Epic W5-A — 09 交互 MVP

| ID | 标题 | 主要位置 | 状态 |
|----|------|----------|------|
| W5-001 | Schema：`events`、trigger + action；`addEvent` / `removeEvent` | `design-schema`、`design-operations` | done（既有） |
| W5-002 | 右侧 **交互 Tab**：添加/展示/删除事件 | `InteractionsTab` | done（既有） |
| W5-003 | **画布闪电标记**：有事件的节点在 Overlay 上显示角标 | `EditorOverlay`、`Canvas` | done |
| W5-004 | MCP：`add_event` / `remove_event` | `design-mcp` `misc.ts` | done |

---

## Epic W5-B — 10 预览 MVP

| ID | 标题 | 主要位置 | 状态 |
|----|------|----------|------|
| W5-010 | 预览模式进入/退出；`PreviewBar` | `editor/index`、`PreviewBar` | done（既有） |
| W5-011 | **PreviewRenderer**：`{{data.*}}` 使用 **DataContext**（与编辑态一致） | `design-engine` `PreviewRenderer` | done |
| W5-012 | **EventExecutionEngine** 绑定 DOM + `PreviewContext`（导航/打开链接/全局状态） | `design-engine` `PreviewRenderer` | done |
| W5-013 | **CSSPseudoInjector**：交互态伪类注入 | `design-engine` `PreviewRenderer` | done |
| W5-014 | **Esc** 退出预览（不抢输入框焦点） | `useKeyboardShortcuts` | done |
| W5-015 | 预览内表单可输入、滚动（pointer-events + 容器） | `PreviewRenderer` | done（既有行为） |

---

**维护**：与 `editor-product-full-implementation-plan.md` §W5 同步更新进度句。
