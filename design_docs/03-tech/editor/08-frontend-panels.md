# 08-frontend-panels — 面板系统技术设计

> Technical design for design_front panel system.

---

## 1. 第一性原理 / First Principles

Panels answer: **"How to give users precise control over every aspect of a node?"**

The 5-tab property panel + left sidebar provide complementary views:
- **Property Panel (right)**: visual control — styles, props, interactions, states, data
- **Left Sidebar**: structural control — node tree, page list

Together they ensure every node attribute is discoverable and editable.

---

## 2. 来自产品需求 / Product Requirements Traceability

| 产品文档 | 对应面板 |
|---------|---------|
| 03-property-panel | 5 tabs (Styles, Props, Interactions, States, Data) |
| 04-state-system | StatesTab |
| 05-data-driven | DataTab |
| 06-component-props | PropsTab |
| 08-layer-tree | NodeTree (left panel) |
| 09-interaction-binding | InteractionsTab |

---

## 3. PropertyPanel 框架 / PropertyPanel Framework

```typescript
interface PropertyPanelProps {
  selectedNode: ComponentNode | null;
  multiSelection: ComponentNode[];
}
```

### Element Info Bar (顶部信息栏)

Displayed at the top of the panel when a node is selected:
- **Type icon** — colored 16×16 icon matching the node type
- **Node name** — editable inline (double-click to rename)
- **Node ID** — copyable monospace label (e.g. `#node_3fa2`)

### 5-Tab System

Each tab shows a **blue dot indicator** when it contains meaningful content (e.g. styles overridden, props bound, events attached).

**Tab order:**

| # | Tab | Blue Dot Condition |
|---|-----|--------------------|
| 1 | **Styles** | Any style property overridden from defaults |
| 2 | **Props** | Any prop value set or data-bound |
| 3 | **Interactions** | Any event handler attached |
| 4 | **States** | Any custom state or state override defined |
| 5 | **Data** | Any data binding or dataset active |

---

## 4. StylesTab — 样式面板

8 collapsible groups, each collapsed by default unless values differ from defaults:

### 4.1 Layout 布局
- `display`, `flexDirection`, `flexWrap`, `justifyContent`, `alignItems`, `gap`
- Visual flex controls (icon-based selectors for direction/alignment)

### 4.2 Size 尺寸
- `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `overflow`
- Aspect-ratio lock toggle

### 4.3 Spacing 间距
- `margin` (top/right/bottom/left)
- `padding` (top/right/bottom/left)
- **Box model visualization** — interactive diagram, click a zone to edit

### 4.4 Position 定位
- `position` (static/relative/absolute/fixed/sticky)
- `top`, `right`, `bottom`, `left`
- `zIndex`

### 4.5 Background 背景
- `backgroundColor`, `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`
- Gradient editor (linear/radial)

### 4.6 Border 边框
- `borderWidth`, `borderStyle`, `borderColor`
- `borderRadius` (4-corner independent or linked)

### 4.7 Typography 文字
- `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`
- `color`, `textAlign`, `textDecoration`, `textTransform`

### 4.8 Effects 效果
- `opacity`, `boxShadow`, `transform`, `transition`, `cursor`
- Shadow editor (multi-shadow support)

### Key Components 关键控件

| Component | Description |
|-----------|-------------|
| **NumericInput** | Drag-to-adjust (hold + drag up/down), unit selector (`px` / `rem` / `%`), keyboard arrows with Shift=×10 |
| **ColorPicker** | Hex / RGB / HSL input modes + opacity slider, eyedropper tool, recent colors |
| **BoxModelEditor** | Interactive margin/padding diagram, click zones to edit values directly |
| **Multi-selection** | When multiple nodes selected: show shared value, or display **"mixed"** placeholder |

---

## 5. PropsTab — 属性面板

### HTML Element Props
- Loaded from `ElementPropRegistry` per element type
- e.g. `<img>`: `src`, `alt`; `<a>`: `href`, `target`; `<input>`: `type`, `placeholder`, `value`

### Component Instance Props
- Loaded from `propDefinitions` of the parent template
- Each prop rendered by its declared type (string → text input, number → numeric input, boolean → toggle, enum → select)

### Data Binding Toggle
- Each prop input has a **binding icon** (chain link)
- Click to switch from **literal mode** → **expression mode** `{{data.xxx}}`
- Expression mode shows `ExpressionInput` with auto-complete

### Auto-Complete for Data Paths
- Sources: current active dataset fields, global state variables
- Dot-notation traversal: typing `data.user.` shows `name`, `email`, `avatar`, etc.

---

## 6. InteractionsTab — 交互面板

### Event Card List
Each existing event is rendered as a card showing:
- **Trigger** badge (e.g. `onClick`)
- **Action summary** (e.g. "Navigate to Screen B")
- Edit / Delete buttons

### Add Event Flow
"+ Add Event" button opens a configuration panel:

1. **Trigger selector** — dropdown: `click`, `hover`, `focus`, `blur`, `longPress`
2. **Action type selector** — dropdown per category:
   - Navigation: navigate to screen
   - State: setState on target element
   - Data: update global state
   - Custom: execute expression
3. **Per-action config**:
   - Navigate → target screen selector
   - setState → target element selector + state name
   - Update global state → variable picker + expression
4. **Element selector modal** — opens tree view + click-to-select on canvas (for selecting target elements)

---

## 7. StatesTab — 状态面板

### Three-Layer State Display

| Layer | Description | Actions |
|-------|-------------|---------|
| **Interaction states** | `hover`, `active`, `focus`, `disabled` | Toggle to preview on canvas |
| **Business states** | Custom named states (e.g. `loading`, `error`, `empty`) | CRUD — create, rename, delete |
| **Global state bindings** | Link node appearance to global state variables | Bind / unbind |

### State Editing Workflow

1. Select a state from the list (e.g. `hover`)
2. **StylesTab** switches to **override mode** — shows only properties that differ from default
3. **Blue dot** appears on modified properties
4. Changes are stored as style overrides in `stateStyles` map
5. "Reset" button clears overrides for the selected state

---

## 8. DataTab — 数据面板

### Dataset Selector
- Dropdown showing all datasets for the current screen
- "Active" badge on the currently active dataset
- "+ New Dataset" button

### Dual Editor
- **JSON raw editor** — Monaco editor with JSON validation
- **Visual tree editor** — collapsible tree view, inline value editing
- Toggle between modes; changes sync bidirectionally

### Data Binding Panel
- Select a prop → bind to data expression
- Expression input with auto-complete
- Preview of resolved value from active dataset

### Global State Variables Manager
- CRUD for global state variables
- Each variable: name, type, defaultValue
- Usage indicators (which nodes reference this variable)

### List Data Binding Config
- Mark a node as "list renderer" (`dataBinding.listData` expression)
- Configure `dataBinding.listItemAlias`
- Child nodes can reference `{{item.xxx}}`

---

## 9. NodeTree (Left Panel - Top) — 节点树

```typescript
interface NodeTreeProps {
  rootNode: ComponentNode;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}
```

### Features

| Feature | Implementation |
|---------|---------------|
| **Virtual scrolling** | `react-window` for large trees (1000+ nodes) |
| **Drag reorder** | 3 drop zones per item: above, into (as child), below |
| **Auto-expand on hover** | During drag, hovering over a collapsed node expands it after 500ms |
| **Search** | Filter by name with path-preservation (show matching nodes + their ancestors) |
| **Icon system** | 16×16 icons, colored by node type (blue=container, green=text, purple=component, etc.) |
| **Inline rename** | Double-click node name to edit |
| **Lock / Visibility** | Toggle buttons on hover: 🔒 lock (prevent selection on canvas), 👁 visibility |
| **Data binding indicator** | Chain icon (🔗) when node has data bindings |
| **Multi-select** | Ctrl+click for discrete selection, Shift+click for range |

---

## 10. PageList (Left Panel - Bottom) — 页面列表

- **Thumbnail preview** — mini `SchemaRenderer` or cached screenshot (64×48px)
- **CRUD operations**: add, delete, duplicate, rename
- **Drag reorder** — reorder pages within the project
- **Active page highlight** — blue border + bold name
- **Context menu** — right-click for duplicate, delete, rename

---

## 11. ComponentLibrary (Floating Panel) — 组件库

- **Trigger**: toolbar button or keyboard shortcut (e.g. `Cmd+Shift+K`)
- **Search** + category filter (Layout, Input, Display, Custom, etc.)
- **Grid card view**: thumbnail (120×80) + component name
- **Drag to canvas**: drag a card onto the canvas to instantiate
- **PropDefinitions badge**: shows count of configurable props (e.g. "5 props")
- **Resizable panel**: floating, can be pinned to side

---

## 12. 影响的文件路径 / Affected File Paths

```
apps/design_front/src/
├── views/
│   └── editor/
│       ├── panels/
│       │   ├── PropertyPanel.tsx          ← 🆕
│       │   ├── tabs/
│       │   │   ├── StylesTab.tsx          ← 🆕
│       │   │   ├── PropsTab.tsx           ← 🆕
│       │   │   ├── InteractionsTab.tsx    ← 🆕
│       │   │   ├── StatesTab.tsx          ← 🆕
│       │   │   └── DataTab.tsx            ← 🆕
│       │   ├── NodeTree.tsx               ← 🆕
│       │   ├── PageList.tsx               ← 🆕
│       │   └── ComponentLibrary.tsx       ← 🆕
│       └── controls/
│           ├── NumericInput.tsx            ← 🆕
│           ├── ColorPicker.tsx             ← 🆕
│           ├── BoxModelEditor.tsx          ← 🆕
│           └── ExpressionInput.tsx         ← 🆕
```

---

## 13. 依赖关系 / Dependencies

- **依赖 (depends on):** 01-schema, 02-operations, 03-rendering
- **被依赖 (depended by):** none

---

## 14. MVP vs 后期 / Phased Delivery

| Phase | Scope |
|-------|-------|
| **Phase 1** | PropertyPanel framework + StylesTab + NodeTree + PageList |
| **Phase 2** | StatesTab, PropsTab |
| **Phase 3** | DataTab |
| **Phase 4** | InteractionsTab, ComponentLibrary |
