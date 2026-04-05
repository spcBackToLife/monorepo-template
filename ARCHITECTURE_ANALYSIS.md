# Design UI Monorepo - Architecture Analysis

**Analysis Date:** April 5, 2026  
**Focus:** Preview system, toast components, event execution, editor layout, and interactions UI

---

## 1. Preview System Overview

### Entry Point: `PreviewRenderer`
- **File:** `features/design-engine/src/preview/PreviewRenderer.tsx`
- **Purpose:** Main wrapper for preview mode - no edit overlay, DOM is interactive
- **Key Props:**
  - `screen: Screen` — The page/screen to render
  - `assets?: ComponentTemplate[]` — Component library for resolving instances
  - `globalStates?: Record<string, string>` — Runtime global state values
  - `currentDataSet?: string` — Optional: only use specific data source
  - `onNavigate?: (screenId, animation?) => void` — Handle screen navigation
  - `onSwitchDataSourcePhase?: (dataSourceId, phase) => void` — Data source lifecycle
  - `embedded?: boolean` — Whether preview is embedded (transparent bg vs gray)

### Core Component: `PreviewInteractiveShell`
- **Inner component** that wraps the actual render tree
- **Creates state for:**
  - `runtimeGlobals` — Merged global/domain/environment states at runtime
  - `runtimeNodeStates` — Node `activeState` overrides (from `setState` actions)
  - `previewHiddenIds` — Nodes toggled invisible via `toggleVisible` action
  - `toasts` — Toast queue for display
- **Mounts:**
  - `EventExecutionEngine` (ref-based, no unmount) — Listens to DOM events
  - `CSSPseudoInjector` — Injects `:hover` and other pseudo-class styles
  - `MockExecutor` — Executes mock API responses

### Rendering Hierarchy
```
PreviewRenderer (DataContextProvider wrapper)
  └─ PreviewInteractiveShell
      └─ [data-preview-root] (gray bg #2C2C2C if not embedded)
          └─ [ref=rootRef, data-screen-id] (screen bg color, position:relative)
              ├─ PreviewNodeRenderer (recursive tree walk)
              │   └─ PrimitiveRenderer (actual DOM elements)
              └─ ToastRenderer (fixed overlay at top)
```

### Spatial Layout (Embedded in Editor)
When `embedded={true}` (used in Canvas):
- **Background:** Transparent (not gray)
- **Container:** Takes 100% of parent (Canvas area)
- **Overflow:** Hidden (clips content)
- **Position:** Relative (becomes stacking context)
- **Z-index:** ToastRenderer at `z-index: 10000` (absolute, positioned at top center)

---

## 2. Toast System

### Frontend Toast Display: `ToastRenderer`
- **File:** `features/design-engine/src/preview/ToastRenderer.tsx`
- **Purpose:** Render toast notifications triggered by `showToast` actions
- **Positioning:** Fixed overlay at top-center, max 3 visible toasts stacked vertically

**Interface:**
```typescript
interface ToastItem {
  id: string;
  type: ToastType; // 'success' | 'error' | 'warning' | 'info'
  message: string;
  duration: number; // milliseconds
  position: ToastPosition; // 'top-center' | etc (currently hardcoded to 'top-center')
}

interface ToastRendererProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}
```

**Features:**
- **Slide-in animation:** `@keyframes toast-slide-in` (200ms)
- **Auto-dismiss:** On timeout (configurable duration, default 3000ms)
- **Manual dismiss:** Click toast to remove
- **Icons:** Unicode emoji (✅ success, ❌ error, ⚠️ warning, ℹ️ info)
- **Styling:** Tailwind-like inline styles (conditional colors by type)
- **Max visible:** 3 toasts (scrolls queue if more added)

**Styling Colors:**
| Type | BG | Border | Text |
|------|-----|--------|------|
| success | #f0fdf4 | #bbf7d0 | #166534 |
| error | #fef2f2 | #fecaca | #991b1b |
| warning | #fffbeb | #fde68a | #92400e |
| info | #eff6ff | #bfdbfe | #1e40af |

### AI Operation Toast: `AiOperationToast`
- **File:** `apps/design_front/src/views/editor/AiOperationToast/index.tsx`
- **Purpose:** Notify user of AI-generated changes with undo capability
- **Positioning:** Fixed bottom-right (`bottom-20 right-4`), outside canvas
- **Z-index:** `z-50` (above most UI)
- **Styling:** White card with border, shadow, truncated text, undo button
- **Auto-dismiss:** 3000ms after show
- **Undo:** Calls `editorStore.undo()` when clicked

**Note:** AI Toast and Preview Toast are **separate systems**:
- AI Toast appears in the editor UI (bottom-right, outside canvas)
- Preview Toast appears in preview viewport (top-center, inside preview)

---

## 3. Event Execution Engine

### EventExecutionEngine Class
- **File:** `features/design-engine/src/preview/EventExecutionEngine.ts`
- **Purpose:** Bridge between DOM events and schema actions

**Lifecycle:**
1. **Bind Phase:** Called in `useEffect` when screen or rootNode changes
   - Builds nodeId → ComponentNode map by walking tree
   - Queries DOM for all `[data-node-id]` elements
   - For each element with events, attaches DOM listeners

2. **Event Firing:** When DOM event occurs (click, hover, focus, etc.)
   - Stops propagation
   - Evaluates condition (if present)
   - Executes action sequence (can include async delays/API calls)

3. **Unbind Phase:** Removes all listeners when unmounting

**Supported Triggers:**
```
click      → click
doubleClick → dblclick
hover      → mouseenter (+ mouseleave for setState reset)
focus      → focus
blur       → blur
longPress  → pointerdown
```

**Supported Actions:**
| Action | Params | Effect |
|--------|--------|--------|
| navigate | targetScreenId, animation | Call onNavigate(screenId, animation) |
| setState | nodeId, stateName | Update node.activeState at runtime |
| setGlobalState | variableName, value | Merge into runtimeGlobals |
| setDomainState | variableName, value | Same as setGlobalState (alias) |
| setEnvironmentState | variableName, value | Same as setGlobalState (alias) |
| switchDataSourcePhase | dataSourceId, phase | Update data source lifecycle phase |
| toggleVisible | nodeId | Add/remove from previewHiddenIds set |
| openUrl | url | window.open(url, '_blank') |
| showToast | toastType, message, duration, position | Call onShowToast(…) |
| apiRequest | requestId, onSuccess[], onFailure[] | Async: execute mock, then branch |
| delay | duration | Async: setTimeout |
| custom | handler | Dispatch CustomEvent('design-custom-action') |

**Conditions:**
- Type: `'globalState' | 'domainState' | 'environmentState' | 'nodeState' | 'prop' | 'expression'`
- Operator: `'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan'`
- Expression: Custom JS expression evaluated in Function scope

**PreviewContext (passed to engine):**
```typescript
interface PreviewContext {
  currentScreenId: string;
  globalStates: Record<string, string>;
  onNavigate: (screenId, animation?) => void;
  onSetState: (nodeId, stateName) => void;
  onSetGlobalState: (name, value) => void;
  onSetDomainState?: (name, value) => void;
  onSetEnvironmentState?: (name, value) => void;
  onSwitchDataSourcePhase?: (dataSourceId, phase) => void;
  onToggleVisible: (nodeId) => void;
  onShowToast?: (type, message, duration, position?) => void;
  onApiRequest?: (requestId, paramOverrides?) => Promise<MockResponse>;
  responseData?: unknown; // Injected by apiRequest for {{response.xxx}}
}
```

---

## 4. Editor Layout

### Main Layout Structure: `EditorPage`
- **File:** `apps/design_front/src/views/editor/index.tsx`

**CSS Layout:**
```
.editor-layout (flex column, 100vh)
  ├─ Toolbar (top fixed bar)
  ├─ PreviewBar (conditional: only in previewMode)
  └─ .editor-body (flex, flex: 1)
      ├─ .editor-left-panel (optional, resizable, white bg)
      ├─ PanelResizer (6px grab handle)
      ├─ .editor-center (flex: 1, flex-column)
      │   ├─ .editor-canvas-area (flex: 1, gray bg #f0f2f5, overflow: auto)
      │   │   └─ Canvas (main content)
      │   ├─ BottomToolbar (hidden in previewMode)
      │   └─ CodeSplitPane (optional, 380px code viewer)
      ├─ PanelResizer (6px grab handle)
      └─ .editor-right-panel (optional, resizable, white bg)
```

**Key CSS:**
- `.editor-layout`: `display: flex; flex-direction: column; height: 100vh; overflow: hidden;`
- `.editor-body`: `display: flex; flex: 1; overflow: hidden;`
- `.editor-canvas-area`: `flex: 1; position: relative; background: #f0f2f5; overflow: auto;`

### Canvas Container: `Canvas`
- **File:** `apps/design_front/src/views/editor/Canvas/index.tsx`
- **Purpose:** Renders either editing UI or preview, handles interactions

**Canvas Modes:**

1. **Edit Mode** (default)
   - Shows `SchemaRenderer` (non-interactive editing canvas)
   - Shows `EditorOverlay` (selection, handles, guides)
   - Shows inline text editor `TextInlineEditor`
   - Context menu support

2. **Preview Mode** (`editorStore.previewMode === true`)
   - Shows `PreviewRenderer` (interactive, no editing)
   - Toggles class `editor-canvas-area--preview` (dark bg #2c2c2c)
   - PreviewBar shown above canvas (device selector, global state controls)

**Canvas Composition (Edit Mode):**
```
.editor-canvas-root
  ├─ .editor-canvas-transform (applied zoom/pan transform)
  │   └─ .editor-canvas-stack
  │       ├─ .editor-canvas-dom-layer (pointer-events: none)
  │       │   └─ ViewportContainer
  │       │       └─ SchemaRenderer
  │       │           └─ PrimitiveRenderer tree
  │       └─ EditorOverlay (canvas element on top)
  ├─ TextInlineEditor (portal, float above)
  └─ EditorContextMenuPortal
```

**Canvas Composition (Preview Mode):**
```
.editor-canvas-root
  ├─ .editor-canvas-transform
  │   └─ .editor-canvas-stack
  │       ├─ .editor-canvas-dom-layer--preview (pointer-events: auto)
  │       │   └─ ViewportContainer
  │       │       └─ PreviewRenderer
  │       │           ├─ PreviewNodeRenderer tree
  │       │           │   └─ PrimitiveRenderer
  │       │           └─ ToastRenderer (inside preview root)
  │       └─ (no EditorOverlay)
```

### ViewportContainer
- **File:** `features/design-engine/src/viewport/ViewportContainer.tsx`
- **Purpose:** Simulates device viewport with fixed dimensions and scale
- **Props:**
  - `viewport: { width, height, name, platform }`
  - `scale?: number` (default 1)
  - `backgroundColor?: string` (default #fff)
  - `clipDeviceFrame?: boolean` (default true, set false in edit to show handles)

**Layout:**
- Outer: `display: flex; justify-content: center; align-items: flex-start; overflow: auto; padding: 24px;`
- Viewport: Fixed width/height, centered, `transform-origin: top center`, shadow, flex-shrink: 0
- Transform: `scale(${scale})` applied

### DeviceFrame (Optional)
- **File:** `features/design-engine/src/preview/DeviceFrame.tsx`
- **Purpose:** CSS-based device bezel (phone/tablet/PC)
- **Used in:** Preview mode (when `previewShowDeviceFrame === true`)
- **Platform Bezels:**
  - Mobile: 54px top, 34px bottom, 14px sides, 44px radius
  - Tablet: 36px top, 28px bottom, 12px sides, 28px radius
  - PC: 28px top, 8px bottom, 2px sides, 8px radius

---

## 5. Interactions Tab (Event Binding UI)

### InteractionsTab Component
- **File:** `apps/design_front/src/views/editor/panels/tabs/InteractionsTab/index.tsx`
- **Purpose:** UI for viewing, editing, adding node events and actions
- **Location:** Right panel tab (when node selected)

**UI Structure:**
```
InteractionsTab
  ├─ Empty state (if no node selected)
  ├─ EventCard[] (list of existing events)
  │   ├─ Display mode (compact event summary)
  │   │   ├─ Trigger badge (blue bg)
  │   │   ├─ Action badges (action type + summary)
  │   │   ├─ Description (if present)
  │   │   ├─ Edit button (pencil icon)
  │   │   ├─ Disable toggle (eye icon)
  │   │   └─ Delete button (X icon)
  │   └─ Edit mode (inline form)
  │       ├─ Trigger dropdown
  │       ├─ Action chain editor
  │       │   ├─ Action type dropdowns
  │       │   ├─ Move up/down buttons
  │       │   └─ Delete action button
  │       └─ Add action, Save, Cancel buttons
  └─ AddEventForm (collapsed button or multi-step form)
      ├─ Step 1: Select trigger (click, hover, etc.)
      ├─ Step 2: Select action type (navigate, setState, etc.)
      ├─ Step 3: Configure action params
      │   ├─ Dynamic fields based on action type
      │   ├─ "使用当前选中" (use current selection) button
      │   └─ "在画布点选" (pick from canvas) mode
      └─ Condition (optional: domain state or expression)
          └─ Save, Cancel buttons
```

**Trigger Options:**
- 点击 (click)
- 双击 (doubleClick)
- 悬停 (hover)
- 聚焦 (focus)
- 失焦 (blur)
- 长按 (longPress)

**Action Types:**
- 跳转页面 (navigate)
- 设置状态 (setState)
- 设置全局状态 (setDomainState)
- 切换可见性 (toggleVisible)
- 打开链接 (openUrl)
- 展示提示 (showToast)
- 发送请求 (apiRequest)
- 延时 (delay)
- 自定义 (custom)

**Action Configuration Fields:**
- **navigate:** Target screen dropdown
- **setState:** State name input, target node (current selection or pick from canvas)
- **setDomainState:** Variable name dropdown, value dropdown/input
- **toggleVisible:** Target node ID
- **openUrl:** URL input, new tab checkbox
- **delay:** Duration (ms) input
- **showToast:** Type (success/error/warning/info), message (supports {{response.xxx}}), duration
- **apiRequest:** Interface dropdown, success/failure branches auto-execute
- **custom:** Handler identifier

**Conditions:**
- Type: Global state match or custom expression
- Operator: equals, notEquals, contains, greaterThan, lessThan
- Expression: JavaScript evaluated with `globalStates` in scope

**State Management:**
- Uses `editorStore.execute()` to dispatch:
  - `addEvent` — Add new event to node
  - `updateEvent` — Modify event (trigger, actions, etc.)
  - `removeEvent` — Delete event

---

## 6. Spatial Layout & Stacking Context

### Z-Index Hierarchy (Edit Mode)
```
z-index: 10000+ — Toast/notifications (both types)
z-index: 1000+  — EditorOverlay (selection, handles, guides)
z-index: 500    — EditorContextMenu (portaled)
z-index: 100    — TextInlineEditor (portaled)
z-index: auto   — Canvas transform/stack (viewport + schema render)
z-index: 0      — Canvas root
```

### Z-Index Hierarchy (Preview Mode)
```
z-index: 10000  — ToastRenderer (inside preview root, fixed absolute)
z-index: auto   — PreviewNodeRenderer tree (real interactive DOM)
z-index: 0      — Preview root (gray bg viewport)
```

### Canvas Area Overlay Order
**Edit Mode:**
1. **DOM Layer** (pointer-events: none)
   - ViewportContainer
   - SchemaRenderer (non-interactive visual only)
2. **EditorOverlay** (canvas element on top, captures all interactions)

**Preview Mode:**
1. **DOM Layer** (pointer-events: auto)
   - ViewportContainer
   - PreviewRenderer (interactive, ToastRenderer inside)
2. **No EditorOverlay** (interact directly with real DOM)

### Toast Positioning

**Preview Toast (`ToastRenderer`):**
- Parent: `[data-preview-root]` (relative positioning context)
- Position: `absolute`
- Placement: `top: 16px; left: 50%; transform: translateX(-50%);`
- Z-index: 10000
- Stacking: Flex column, gap 8px (stack vertically)

**AI Toast (`AiOperationToast`):**
- Parent: Body/page (fixed positioning context)
- Position: `fixed`
- Placement: `bottom-20 right-4` (tailwind, ~80px from bottom, 16px from right)
- Z-index: 50 (actually z-50 in tailwind = z-index: 50)
- Stacking: Flex column, gap 2px

---

## 7. Data Flow & State Management

### Global State Sources
1. **Domain States** — App-level state (e.g., theme, language)
2. **Environment States** — Deployment/runtime config
3. **Runtime Globals** — Merged at preview start, updated by actions
4. **Node States** — Per-node activeState (visual state) overridden at runtime
5. **Data Sources** — API lifecycle (loading/loaded), scenarios, active phase

### State Update Paths

**Preview State Updates:**
```
User Action (click, hover)
  ↓
EventExecutionEngine.bind()
  ↓
Event handler fires
  ↓
Evaluates condition
  ↓
Executes action chain
  ↓
Calls PreviewContext callback (onSetState, onSetGlobalState, etc.)
  ↓
PreviewInteractiveShell setState
  ↓
Re-render with new state
```

**Editor State Updates:**
```
User edits event in InteractionsTab
  ↓
Calls editorStore.execute({ type: 'addEvent|updateEvent|removeEvent', params: ... })
  ↓
Updates Screen.nodes[nodeId].events[]
  ↓
Re-render InteractionsTab + Canvas (schema changes)
```

---

## 8. Key Integration Points

### Canvas ↔ Preview System
- Canvas renders either `SchemaRenderer` (edit) or `PreviewRenderer` (preview)
- Toggle via `editorStore.previewMode` boolean
- Same `ViewportContainer` for both (preserves viewport size/scale)
- Preview mode hides EditorOverlay, shows PreviewBar

### Preview ↔ Toast System
- `PreviewInteractiveShell` manages toast state
- `EventExecutionEngine` calls `context.onShowToast()` on action
- `ToastRenderer` displays queue inside preview root

### Events ↔ Editor Store
- InteractionsTab reads `node.events` from current node
- User adds/edits events via form
- Dispatches to `editorStore.execute()` (MobX store)
- Changes persist to `screen.nodes[nodeId].events[]`

### PreviewBar ↔ Data/Global States
- Shows domain state, environment state, data source selectors
- Updates `editorStore.currentGlobalStates`
- Reflects in preview render via `globalStates` prop
- Data source phase/scenario switches update `screen.dataSources[]` activePhase/activeScenarioId

---

## 9. Summary: Where Things Are Rendered

| Component | Location | Z-Index | Mode | Purpose |
|-----------|----------|---------|------|---------|
| **Canvas Area** | Center panel | 0 | Both | Container |
| **ViewportContainer** | Inside canvas | auto | Both | Device frame size |
| **SchemaRenderer** | Inside viewport | auto | Edit | Non-interactive render |
| **PreviewRenderer** | Inside viewport | auto | Preview | Interactive render |
| **EditorOverlay** | On top of canvas | 1000+ | Edit | Selection/handles/guides |
| **PreviewNodeRenderer** | Inside preview | auto | Preview | DOM tree (interactive) |
| **ToastRenderer** | Inside preview root | 10000 | Preview | Toast queue |
| **AiOperationToast** | Bottom-right corner | 50 | Edit | AI change notification |
| **PreviewBar** | Above canvas | auto | Preview | State/device controls |
| **TextInlineEditor** | Float above | 100 | Edit | Inline text editing |
| **EditorContextMenu** | Portal | 500 | Both | Right-click menu |

---

## 10. Files Reference

### Preview System
- `features/design-engine/src/preview/PreviewRenderer.tsx` — Main preview component
- `features/design-engine/src/preview/EventExecutionEngine.ts` — Event binding & execution
- `features/design-engine/src/preview/PreviewController.ts` — (Additional controller if needed)
- `features/design-engine/src/preview/MockExecutor.ts` — Mock API execution
- `features/design-engine/src/preview/CSSPseudoInjector.ts` — Pseudo-class style injection
- `features/design-engine/src/preview/TransitionAnimator.tsx` — Page transition animations
- `features/design-engine/src/preview/DeviceFrame.tsx` — Device bezel CSS

### Toast Components
- `features/design-engine/src/preview/ToastRenderer.tsx` — Preview toast display
- `apps/design_front/src/views/editor/AiOperationToast/index.tsx` — AI operation toast

### Editor Layout
- `apps/design_front/src/views/editor/index.tsx` — Main editor page layout
- `apps/design_front/src/views/editor/editor.css` — Layout styles
- `apps/design_front/src/views/editor/Canvas/index.tsx` — Canvas component (edit/preview toggle)
- `apps/design_front/src/views/editor/Canvas/canvas.css` — Canvas styles
- `apps/design_front/src/views/editor/PreviewBar/index.tsx` — Preview control bar

### Viewport & Rendering
- `features/design-engine/src/viewport/ViewportContainer.tsx` — Device viewport simulator
- `features/design-engine/src/renderer/SchemaRenderer.tsx` — Edit mode renderer
- `features/design-engine/src/renderers/PrimitiveRenderer.tsx` — Primitive elements

### Interactions UI
- `apps/design_front/src/views/editor/panels/tabs/InteractionsTab/index.tsx` — Event editor
- `apps/design_front/src/views/editor/panels/EventEditor/index.tsx` — Additional event UI

### Supporting
- `features/design-engine/src/data/DataContext.tsx` — Data binding context
- `features/design-engine/src/data/resolveExpression.ts` — Expression resolution
- `features/design-engine/src/overlay/EditorOverlay.tsx` — Edit mode overlay
- `features/design-engine/src/overlay/coordinateMap.ts` — Hit testing & coordinate mapping

---

## 11. Quick Access Reference

**Need to modify:**
- **Toast appearance?** → `ToastRenderer.tsx` (colors, positioning, animations)
- **Toast dismiss behavior?** → `PreviewRenderer.tsx` (state management in PreviewInteractiveShell)
- **Event execution logic?** → `EventExecutionEngine.ts` (executeAction, triggerToDomEvent)
- **Event UI fields?** → `InteractionsTab/index.tsx` (ACTION_TYPES, TRIGGER_OPTIONS, form fields)
- **Canvas layout?** → `editor.css` or `Canvas/index.tsx`
- **Preview entry?** → `apps/design_front/src/views/editor/Canvas/index.tsx` (previewMode toggle)
- **Preview bar (device/state selectors)?** → `PreviewBar/index.tsx`

