# W1 Issue 列表（可导入 GitHub / Linear）

> 对应规划：`editor-product-full-implementation-plan.md` §八 **W1 — 基础编辑闭环（01 + 08 + 03-MVP）**  
> **完成定义**：能完成「建页 → 加节点 → 改样式 → 树与画布一致」，并对照 `02-product/editor` 各章验收。

**状态**：`open` | `done`（随实现更新）

---

## Epic W1-A — 画布与坐标（01-canvas）

| ID | 标题 | 验收（文档） | 主要代码位置 | 状态 |
|----|------|----------------|----------------|------|
| W1-001 | 画布容器层叠与 DOM `pointer-events` 与文档一致 | 01 §2.1 | `design_front/Canvas`, `canvas.css` | done |
| W1-002 | Pan/Zoom 状态与视口联动、缩放中心语义清晰 | 01 §3 | `editorStore`, `useZoomPan`, `Canvas` | done |
| W1-003 | 三套坐标：屏幕→画布→视口在拖拽/resize/落点一致 | 01 §3 | `design-engine` coordinateMap、Canvas | done |
| W1-004 | 单击选中、拖拽移动、框选、8 向 resize | 01 §2 | `EditorOverlay`, `useEditorCanvasOps` | done |
| W1-005 | hitTest：包围盒缓存、父子同面积时优先子节点 | 01 §2.3 | `coordinateMap` hitTest | done |
| W1-006 | 绘制工具（div/容器）落点与父容器坐标一致 | 01 §5 | `Canvas` `handleDrawCreate` | done |
| W1-007 | 从组件库/工具栏拖入元素 | 01 + 02 | `Canvas` onDrop, ComponentLibrary | done |
| W1-008 | Resize 最小尺寸 1×1px（边界表） | 01 §13 | `design-engine` resize.ts | done |
| W1-009 | 选中视觉：蓝框、手柄尺寸随 zoom 合理 | 01 §2.1 | `select.ts` / `resize.ts` + `EditorOverlay` | done |
| W1-010 | 空画布/异常状态提示（无屏、无根等） | 01 §13 | `Canvas` | done |

---

## Epic W1-B — 组件树与页面（08-layer-tree MVP）

| ID | 标题 | 验收 | 主要代码位置 | 状态 |
|----|------|------|----------------|------|
| W1-011 | 左侧面板分区：节点树 + 页面列表布局 | 08 MVP | `LeftPanel` | done |
| W1-012 | 组件树：递归、展开折叠、类型图标、行样式 | 08 MVP | `panels/NodeTree` | done |
| W1-013 | 点击/Shift 多选、与画布选中双向同步 | 08 MVP | `editorStore`, NodeTree, Canvas | done |
| W1-014 | 选中节点滚动入视（scroll into view） | 08 MVP | `NodeTree` `data-node-tree-id` + 展开祖先 + `scrollIntoView` | done |
| W1-015 | 页面列表：切换、新建、删除、重命名 | 08 MVP | `PageList`, operations | done |
| W1-016 | Hover 联动（树 ↔ 画布） | 08 MVP | `hoveredNodeId` | done |
| W1-017 | 节点树右键菜单（复制/副本/删除/包裹/素材占位） | 08 MVP §右键 | `EditorContextMenu` + NodeTree | done |

---

## Epic W1-C — 属性面板样式 MVP（03-property-panel）

| ID | 标题 | 验收 | 主要代码位置 | 状态 |
|----|------|------|----------------|------|
| W1-018 | 右侧面板宽度、Tab 栏、无选/单选态 | 03 MVP | `PropertyPanel` + `editorStore.rightPanelWidth` | done |
| W1-019 | 样式 Tab：布局（display/flex/gap/position/offset） | 03 MVP | `StylesTab` 布局段 | done |
| W1-020 | 样式 Tab：尺寸（width/height/min/max） | 03 MVP | `StylesTab` 尺寸段 | done |
| W1-021 | 盒模型 margin/padding（可视化编辑器） | 03 MVP | `BoxModelEditor` in `StylesTab` | done |
| W1-022 | 背景/边框/文字组与颜色、数值控件行为 | 03 MVP | `StylesTab` + `NumericInput`/`ColorPicker` | done |
| W1-023 | 修改样式走 `updateStyle` + 撤销栈 | 03 MVP | `editorStore.execute` | done |

---

## Epic W1-D — 统一右键与快捷键（总纲 §七 + 01 §十）

| ID | 标题 | 验收 | 主要代码位置 | 状态 |
|----|------|------|----------------|------|
| W1-024 | 画布右键：命中元素菜单 + 空白菜单 | 01 §十 | `Canvas` + `EditorContextMenu` | done |
| W1-025 | 与树共用菜单数据/命令（duplicate/remove/wrap） | 总纲 | `buildEditorContextMenuItems` | done |
| W1-026 | Cmd+D 复制副本；Delete 删除 | 总纲 §七 | `useKeyboardShortcuts` | done（Cmd+D；Delete 已有） |
| W1-027 | Cmd+C/V/X 剪贴板（与 Schema 序列化） | 总纲 | `editorStore`、`insertSubtree`、`useKeyboardShortcuts` | done |

---

## 建议实现顺序（依赖）

1. ~~W1-008、W1-014、W1-018～W1-022、W1-024/025、W1-026~~（已落地）  
2. ~~W1-027（剪贴板）、W1-010（空画布/无屏提示）~~（已落地）  
3. ~~W1-006、W1-003、W1-002、W1-009、W1-011~~（已落地）  

---

**维护**：完成某 issue 后将表中 **状态** 改为 `done`，并在对应产品 README 勾选项上打勾。改 `features/design-operations` 后需执行 `pnpm --filter @globallink/design-operations build`，否则依赖方 `tsc` 可能仍读旧 `dist/*.d.ts`。
