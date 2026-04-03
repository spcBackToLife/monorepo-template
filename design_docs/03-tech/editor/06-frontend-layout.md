# 06 - Frontend Layout Framework

> design_front 编辑器布局框架技术设计

---

## 1. 第一性原理 / First Principle

Layout framework answers: **"How to organize the editor's visual territory?"**

A 4-zone layout maximizes canvas area while providing immediate tool access. Every pixel of screen real estate must serve the designer's workflow.

布局框架的核心目标：在保证工具可达性的前提下，最大化画布面积。

---

## 2. 来自产品需求 / Product Requirements

| PRD | 关联内容 |
|-----|---------|
| `01-canvas` | Central canvas area — 中央画布区域 |
| `02-toolbar` | Top + bottom toolbars — 顶部和底部工具栏 |
| `03-property-panel` | Right panel — 右侧属性面板 |
| `08-layer-tree` | Left panel — 左侧图层树 |

---

## 3. EditorLayout 组件 / Component

**四区域布局 / 4-Zone Layout:**

```
┌────────────────────────────────────────────────┐
│ TopToolbar (48px fixed)                        │
├──────────┬───────────────────────┬─────────────┤
│ LeftPanel│   CentralCanvas      │ RightPanel   │
│ (可调宽) │   (flex: 1)          │ (可调宽)     │
│ 240-400px│                      │ 280-400px    │
│          │                      │              │
│          │                      │              │
├──────────┴───────────────────────┴─────────────┤
│            BottomToolbar (浮动胶囊)              │
└────────────────────────────────────────────────┘
```

**实现方案：CSS Grid**

```css
.editor-layout {
  display: grid;
  grid-template-areas:
    "toolbar  toolbar  toolbar"
    "left     canvas   right";
  grid-template-rows: 48px 1fr;
  grid-template-columns: var(--left-width) 1fr var(--right-width);
  height: 100vh;
}
```

BottomToolbar 使用 `position: absolute` 浮动于 canvas 区域底部居中，不参与 grid 布局。

---

## 4. TopToolbar

顶部工具栏 — 48px 固定高度，横跨全宽。

**4 个功能区 / 4 Zones:**

```
┌──────────────┬────────────────┬─────────────────┬───────────────────────┐
│ Project Info │ Edit Controls  │ Viewport Control│ State/Data + Export   │
│ 项目信息      │ Undo/Redo 等   │ 缩放/视图       │ 状态/数据切换 + 导出   │
└──────────────┴────────────────┴─────────────────┴───────────────────────┘
```

| Zone | 内容 |
|------|------|
| Project Info | 项目名称、返回按钮 |
| Edit Controls | Undo / Redo 按钮 |
| Viewport Control | 缩放百分比、适应画布、网格开关 |
| State/Data + Export | 状态面板切换、数据面板切换、导出/预览按钮 |

---

## 5. BottomToolbar

底部浮动工具胶囊 — absolutely positioned, bottom-center of canvas.

**布局：8 个工具，3 组，分隔线分隔**

```
┌────────────────────────────────────────────────────┐
│ [Select][Hand] │ [Container▾][Element▾][Text▾] │ [Component][Annotation] │
│   选择/抓手     │     容器/元素/文本 (下拉)      │     组件/标注             │
└────────────────────────────────────────────────────┘
```

- **Group 1:** Select (V), Hand (H) — 选择与导航
- **Group 2:** Container (F) ▾, Element (R) ▾, Text (T) ▾ — 创建工具，带下拉菜单
  - Container dropdown: flex-row, flex-col, grid, scroll
  - Element dropdown: rectangle, ellipse, image, icon, line
  - Text dropdown: heading, paragraph, label, link
- **Group 3:** Component (C), Annotation (A) — 组件与标注

各组之间以竖线分隔符隔开。

---

## 6. LeftPanel 框架 / Left Panel Structure

左侧面板分为上下两部分，中间可拖拽分割。

```
┌──────────────┐
│ Component    │
│ Tree         │  ← 上半部分 (flex: 1)
│ 组件树        │
│              │
├──────────────┤  ← Draggable splitter / 可拖拽分割线
│ Page List    │
│ 页面列表      │  ← 下半部分 (flex: 1)
│              │
└──────────────┘
```

- **Component Tree (top, flex: 1):** 当前页面的节点层级树
- **Page List (bottom, flex: 1):** 项目中所有页面的列表
- **Draggable Splitter:** 可上下拖拽调整两部分比例

---

## 7. Editor Store 扩展 / Store Extension

在 EditorStore (MobX) 中新增 UI 状态字段：

```typescript
// New fields in EditorStore (MobX)
interface EditorUIState {
  /** 当前激活的工具 */
  activeTool: ToolType;

  /** 是否处于预览模式 */
  previewMode: boolean;

  /** 左侧面板宽度 (px) */
  leftPanelWidth: number;

  /** 右侧面板宽度 (px) */
  rightPanelWidth: number;

  /** 左侧面板是否折叠 */
  leftPanelCollapsed: boolean;

  /** 右侧面板是否折叠 */
  rightPanelCollapsed: boolean;

  /** 底部工具栏是否可见 */
  bottomToolbarVisible: boolean;

  /** 右侧面板当前激活的 tab */
  activeRightTab: 'styles' | 'props' | 'interactions' | 'states' | 'data';
}
```

All UI state is observable (MobX `observable`), components react automatically via `observer()`.

---

## 8. 响应式行为 / Responsive Behavior

| 条件 | 行为 |
|------|------|
| Viewport < **1200px** | Auto-collapse left panel — 自动折叠左侧面板 |
| Viewport < **900px** | Auto-collapse both panels — 自动折叠左右面板 |
| Drag handle | Panel resize with min/max constraints — 拖拽调整宽度 |
| Double-click drag handle | Toggle collapse — 双击折叠/展开 |

**面板宽度约束 / Panel Width Constraints:**

| Panel | Min | Max | Default |
|-------|-----|-----|---------|
| LeftPanel | 240px | 400px | 280px |
| RightPanel | 280px | 400px | 320px |

**折叠动画：** `width` transition, 200ms ease-out.

---

## 9. 影响的文件路径 / Affected File Paths

```
apps/design_front/src/
├── views/
│   └── editor/
│       ├── EditorLayout.tsx       ← 🆕 或扩展 — 4-zone grid layout
│       ├── TopToolbar.tsx         ← 🆕 — 顶部工具栏
│       ├── BottomToolbar.tsx      ← 🆕 — 底部浮动胶囊
│       └── panels/
│           └── PanelResizer.tsx   ← 🆕 — 面板拖拽调整组件
├── stores/
│   └── editorStore.ts            ← 扩展 UI state fields
```

---

## 10. 依赖关系 / Dependencies

- **依赖 (Depends on):** 无 — 纯 UI 结构，不依赖其他技术模块
- **被依赖 (Depended by):** `07-frontend-canvas`, `08-frontend-panels`

---

## 11. MVP vs 后期 / Phasing

| Phase | 内容 |
|-------|------|
| **Phase 1** | 全部内容 — EditorLayout, TopToolbar, BottomToolbar, PanelResizer, responsive behavior. 这是整个编辑器的基础骨架。 |

---

## 12. 技术决策 / Decision Record

### CSS Grid vs Flexbox for 4-Zone Layout

**Decision: CSS Grid**

| 方案 | 优点 | 缺点 |
|------|------|------|
| CSS Grid | Clean area naming (`grid-template-areas`), 2D layout natural fit, column sizing via CSS variables | Slightly more complex syntax |
| Flexbox | Simpler mental model, wide familiarity | Nested flex containers needed, harder to name areas, awkward for 2D layout |

**理由：** 4-zone 布局本质上是二维的，CSS Grid 的 `grid-template-areas` 提供了最清晰的语义化布局定义。配合 CSS variables 控制面板宽度，代码简洁直观。
