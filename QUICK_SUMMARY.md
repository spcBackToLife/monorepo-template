# Design UI - Quick Architecture Summary

## What You Asked For

1. **Preview System** ✅
2. **Toast Components** ✅  
3. **Event Execution** ✅
4. **Editor Layout** ✅
5. **Interactions UI** ✅

---

## Key Findings

### 1. Preview System
**Main Component:** `PreviewRenderer` (features/design-engine/src/preview/PreviewRenderer.tsx)

- Wraps interactive preview inside `PreviewInteractiveShell`
- Manages 4 internal states: `runtimeGlobals`, `runtimeNodeStates`, `previewHiddenIds`, `toasts`
- Mounts `EventExecutionEngine` (DOM event listening), `CSSPseudoInjector`, `MockExecutor`
- Renders real interactive DOM (not canvas like edit mode)
- Sits inside `ViewportContainer` (which constrains to device size)

**Embedded in Canvas:** Uses `embedded={true}` prop to hide gray background, fit 100% parent

### 2. Toast System (TWO SEPARATE SYSTEMS)

**Preview Toast** (`ToastRenderer`)
- Inside preview viewport at top-center
- Positioned absolute, `z-index: 10000`
- Max 3 visible, stacks vertically
- Triggered by `showToast` action in event

**AI Toast** (`AiOperationToast`)
- Outside canvas, bottom-right corner
- Positioned fixed, `z-index: 50`
- Shows AI-generated changes with undo button
- Separate from preview toast

### 3. Event Execution

**Engine:** `EventExecutionEngine` (features/design-engine/src/preview/EventExecutionEngine.ts)

**How it works:**
1. Walks `ComponentNode` tree → builds `nodeId → node` map
2. Queries DOM for `[data-node-id]` elements
3. Attaches DOM event listeners (click, hover, focus, etc.)
4. On trigger: evaluates condition → executes action chain
5. Actions call context callbacks (setState, showToast, navigate, etc.)

**12 action types:** navigate, setState, setGlobalState, setDomainState, setEnvironmentState, switchDataSourcePhase, toggleVisible, openUrl, showToast, apiRequest, delay, custom

**Supports conditions:** globalState/nodeState/prop/expression with operators (equals, notEquals, contains, greaterThan, lessThan)

### 4. Editor Layout

**Structure:**
```
Toolbar (top fixed)
  ↓
PreviewBar (only in preview mode)
  ↓
.editor-body (flex: 1)
  ├─ Left Panel (optional, resizable)
  ├─ .editor-canvas-area (flex: 1, gray #f0f2f5)
  │   └─ Canvas (toggles between SchemaRenderer/PreviewRenderer)
  └─ Right Panel (optional, resizable)
```

**Canvas Modes:**
- **Edit:** SchemaRenderer (non-interactive) + EditorOverlay (selection/handles)
- **Preview:** PreviewRenderer (interactive) + no overlay

**Switching:** `editorStore.previewMode` boolean toggle

### 5. Interactions Tab

**File:** `apps/design_front/src/views/editor/panels/tabs/InteractionsTab/index.tsx`

**UI Flow:**
1. Show list of events on selected node
2. Each event: trigger (click/hover/etc) → action chain (navigate/setState/etc)
3. Edit inline, delete, disable individual events
4. Multi-step form to add new event

**Calls:** `editorStore.execute()` with `addEvent/updateEvent/removeEvent` commands

---

## Spatial Layout (Most Important!)

### Edit Mode
```
EditorOverlay (z:1000+, canvas element)
    ↓ (on top)
SchemaRenderer (pointer-events: none)
    ↓ (underneath)
ViewportContainer (centered, 24px padding)
```

### Preview Mode
```
ToastRenderer (z:10000, absolute top-center)
    ↓ (on top)
PreviewNodeRenderer tree (pointer-events: auto, INTERACTIVE)
    ↓ (underneath)
ViewportContainer (centered, 24px padding)
    ↓ (no EditorOverlay!)
```

### Toast Overlay in Preview
```
[data-preview-root] (position: relative, is stacking context)
  ├─ [data-screen-id] (position: relative, interactive content)
  └─ ToastRenderer (position: absolute, z-index: 10000, top:16px, left:50%)
```

---

## Files to Know

| Task | File |
|------|------|
| Modify toast appearance | `features/design-engine/src/preview/ToastRenderer.tsx` |
| Change event execution logic | `features/design-engine/src/preview/EventExecutionEngine.ts` |
| Update event UI form | `apps/design_front/src/views/editor/panels/tabs/InteractionsTab/index.tsx` |
| Edit canvas layout | `apps/design_front/src/views/editor/editor.css` |
| Toggle preview mode | `apps/design_front/src/views/editor/Canvas/index.tsx` |
| Preview controls (device/state) | `apps/design_front/src/views/editor/PreviewBar/index.tsx` |
| AI toast notifications | `apps/design_front/src/views/editor/AiOperationToast/index.tsx` |
| Main preview component | `features/design-engine/src/preview/PreviewRenderer.tsx` |
| Device viewport container | `features/design-engine/src/viewport/ViewportContainer.tsx` |

---

## State Flow in Preview

```
User clicks element
    ↓
EventExecutionEngine.handler()
    ↓
Evaluates condition (if present)
    ↓
Executes action (e.g., showToast, setState, navigate)
    ↓
Calls PreviewContext callback (e.g., onShowToast)
    ↓
PreviewInteractiveShell.setState()
    ├─ setRuntimeGlobals() → triggers re-render
    ├─ setRuntimeNodeStates() → updates node.activeState
    ├─ setToasts() → adds to queue
    ↓
Re-render triggered
    ↓
PreviewNodeRenderer uses new state
    ↓
ToastRenderer shows new toast
```

---

## Quick Reference: Toast Position Details

**Preview Toast (Inside preview area):**
- Parent element: `[data-preview-root]`
- Position: `absolute`
- Top: `16px`
- Left: `50%` with `transform: translateX(-50%)` (centered horizontally)
- Z-index: `10000`
- Stacking: flex-column with 8px gap
- Max visible: 3 toasts

**AI Toast (Outside canvas, in editor):**
- Parent: Document body
- Position: `fixed`
- Bottom: `80px` (bottom-20 in tailwind)
- Right: `16px` (right-4 in tailwind)
- Z-index: `50`
- Stacking: flex-column with 2px gap

---

## Integration Points

1. **Preview enters:** Canvas toggles from SchemaRenderer to PreviewRenderer
2. **Events trigger:** EventExecutionEngine queries [data-node-id] in real DOM
3. **Toast shows:** onShowToast callback adds to PreviewInteractiveShell state
4. **UI edits:** InteractionsTab calls editorStore.execute() to update node.events
5. **PreviewBar:** Controls globalStates, data source phase/scenario, viewport preset

---

## Data Structures

**ToastItem:**
```typescript
{
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number; // ms
  position: 'top-center'; // currently hardcoded
}
```

**Event (on ComponentNode):**
```typescript
{
  trigger: 'click' | 'hover' | 'focus' | 'blur' | 'doubleClick' | 'longPress';
  actions: [{
    type: 'navigate' | 'setState' | 'showToast' | ... ;
    // type-specific fields
  }];
  condition?: {
    type: 'globalState' | 'nodeState' | 'prop' | 'expression';
    variableName?: string;
    value?: string;
    operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  };
  disabled?: boolean;
}
```

**PreviewContext (passed to EventExecutionEngine):**
```typescript
{
  currentScreenId: string;
  globalStates: Record<string, string>;
  onNavigate: (screenId, animation?) => void;
  onSetState: (nodeId, stateName) => void;
  onSetGlobalState: (name, value) => void;
  onShowToast: (type, message, duration, position?) => void;
  onToggleVisible: (nodeId) => void;
  // ... more callbacks
}
```

---

## Critical Insights

1. **Two Toast Systems:** Don't confuse preview toasts (inside viewport) with AI toasts (outside)
2. **Preview is Interactive:** No EditorOverlay in preview mode; real DOM events fire directly
3. **EventExecutionEngine is Ref-based:** Mounted once in useEffect, listens to all events
4. **State Management:** EventExecutionEngine → callbacks → PreviewInteractiveShell.setState → re-render
5. **Z-Index:** ToastRenderer at z:10000 sits above everything in preview
6. **Canvas Switching:** Same ViewportContainer, different children (SchemaRenderer vs PreviewRenderer)
7. **Embedded Preview:** Uses `embedded={true}` to hide gray background and fit parent
8. **Viewport Constraining:** ViewportContainer centers content with padding, applies scale, defines positioning context

---

## Next Steps (If Needed)

- To add a new action type: modify `EventExecutionEngine.executeAction()`
- To change toast animation: update `toastRenderer.tsx` keyframes
- To add preview condition type: update `EventExecutionEngine.evaluateCondition()`
- To modify UI event form: edit `InteractionsTab/index.tsx` (ACTION_TYPES, step 3 config)
- To change canvas background: modify `editor.css` .editor-canvas-area

