# W2 Issue 列表（工具栏 + 状态 MVP + 画布 Phase2）

> 对应 `editor-product-full-implementation-plan.md` **W2**；依赖 W1。

**状态**：`open` | `done`

---

## Epic W2-A — 工具栏 MVP（02-toolbar）

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W2-001 | 底部工具：V/F/R/T 快捷键与 `activeTool` 一致；容器/元素下拉打开时进入对应绘制模式 | 02 MVP | `BottomToolbar` | done |
| W2-002 | 顶栏：缩放滑条与 Cmd+滚轮范围一致（0.1–4）；Cmd+1=100%、Cmd+0=适配画布 | 02 + 总纲 §七 | `Toolbar`、`useKeyboardShortcuts`、`editorStore` | done |
| W2-003 | 栅格吸附开关 + 可选显示栅格；8px 与 snapping 联动 | 01 Phase2 §7.3 | `editorStore`、`Toolbar`、`EditorOverlay` | done |

---

## Epic W2-B — 状态系统 MVP（04-state-system）

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W2-010 | 样式 Tab：非 default 的 `activeState` 下写入 `updateState`；default 写 `updateStyle` | 04 MVP | `StylesTab` | done |
| W2-011 | 状态 Tab 已有业务/交互状态；样式编辑与当前激活状态一致 | 04 MVP | `StatesTab` + StylesTab | done |

---

## Epic W2-C — 画布 Phase2（01-canvas）

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W2-020 | 多选拖拽：框选或 Shift 多选后一次拖拽同步移动 | 01 Phase2 | `drag.ts`、`EditorOverlay`、`useEditorCanvasOps` | done |
| W2-021 | Resize：Shift 等比（角点）、Alt 从中心缩放；结束时 left/top/width/height 与父坐标一致 | 01 Phase2 | `resize.ts`、`useEditorCanvasOps` | done |
| W2-022 | 深层选择：Cmd+点击在叠层间循环命中 | 01 Phase2 | `coordinateMap` `hitTestAll`、`EditorOverlay` | done |
| W2-023 | 粉色 Alt+间距标注 | 01 Phase2 | `spacingHints.ts`、`EditorOverlay` | done |

---

## Epic W2-D — 文本工具（01 Phase2）

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W2-030 | 文本类节点双击进入行内编辑，保存 `updateComponentProps` text | 01 Phase2 | `SchemaRenderer`、`Canvas` | done |

---

## 实现顺序

1. W2-010（样式写入路径）→ W2-011  
2. W2-001 → W2-002 → W2-003  
3. W2-020 → W2-021 → W2-022  
4. W2-030  

---

**维护**：完成后将状态改为 `done`；改 `design-operations` / `design-engine` 后执行对应 `pnpm --filter … build`。
