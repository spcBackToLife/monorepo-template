# Design UI - Spatial Layout Diagram

## 1. Editor Layout (High Level)

```
┌─────────────────────────────────────────────────────────────────┐
│                          TOOLBAR (Fixed top)                    │
├─────────────────────────────────────────────────────────────────┤
│                     PreviewBar (Only in preview mode)           │
├──────────────┬─────────────────────────────────────┬─────────────┤
│              │                                     │             │
│ LEFT PANEL   │ CANVAS AREA (flex: 1)              │ RIGHT PANEL │
│ (Optional)   │ ┌─────────────────────────────────┐│ (Optional)  │
│              │ │ Edit: SchemaRenderer +          ││             │
│ - NodeTree   │ │ EditorOverlay (Canvas layer)    ││ - Styles    │
│ - PageList   │ │                                 ││ - Events    │
│ - Data       │ │ Preview: PreviewRenderer        ││ - States    │
│              │ │ (Interactive, ToastRenderer)    ││ - Properties│
│              │ │                                 ││             │
│              │ └─────────────────────────────────┘│             │
│              │ BottomToolbar (Only in edit mode) │             │
│              │ (Optional CodeSplitPane)          │             │
│              │                                   │             │
└──────────────┴─────────────────────────────────────┴─────────────┘
       ↑                         ↑                         ↑
    collapse           contains ViewportContainer    collapse
    edge               which constrains screen       edge
```

## 2. Canvas Area - Edit Mode

```
.editor-canvas-area (gray bg #f0f2f5, overflow: auto)
  │
  └─ Canvas
      │
      └─ .editor-canvas-root (position: relative)
          │
          ├─ .editor-canvas-transform (transform: scale + translate)
          │   │
          │   └─ .editor-canvas-stack (transform: translateZ(0) for composite layer)
          │       │
          │       ├─ .editor-canvas-dom-layer (pointer-events: none, width: 100%)
          │       │   │
          │       │   └─ ViewportContainer (centered, padding: 24px)
          │       │       │
          │       │       └─ [data-viewport] (fixed width/height, shadow)
          │       │           │
          │       │           └─ SchemaRenderer
          │       │               │
          │       │               └─ PrimitiveRenderer tree (text, box, etc.)
          │       │
          │       └─ EditorOverlay (canvas element, z-index: 1000+)
          │           (Selection box, resize handles, guides, measurement info)
          │
          ├─ TextInlineEditor (portal, position: fixed, z-index: 100)
          │   (Float above for text editing)
          │
          └─ EditorContextMenu (portal)
              (Right-click menu)
```

## 3. Canvas Area - Preview Mode

```
.editor-canvas-area--preview (dark bg #2c2c2c, overflow: auto)
  │
  └─ Canvas
      │
      └─ .editor-canvas-root
          │
          └─ .editor-canvas-transform
              │
              └─ .editor-canvas-stack
                  │
                  ├─ .editor-canvas-dom-layer--preview (pointer-events: auto)
                  │   │
                  │   └─ ViewportContainer (centered, padding: 24px)
                  │       │
                  │       └─ [data-viewport]
                  │           │
                  │           ├─ DeviceFrame (optional bezel around screen)
                  │           │   │
                  │           │   └─ (phone/tablet/pc bezels 54px/36px/28px)
                  │           │
                  │           └─ PreviewRenderer (embedded=true)
                  │               │
                  │               └─ [data-preview-root] (transparent if embedded)
                  │                   │
                  │                   ├─ [data-screen-id] (position: relative)
                  │                   │   │
                  │                   │   └─ PreviewNodeRenderer
                  │                   │       │
                  │                   │       └─ PrimitiveRenderer tree
                  │                   │           (INTERACTIVE: click/hover/etc)
                  │                   │
                  │                   └─ ToastRenderer (absolute overlay)
                  │                       │
                  │                       ├─ position: absolute
                  │                       ├─ top: 16px
                  │                       ├─ left: 50%
                  │                       ├─ transform: translateX(-50%)
                  │                       ├─ z-index: 10000
                  │                       │
                  │                       └─ SingleToast[] (flex column, gap 8px)
                  │                           (Max 3 visible, stacked down)
                  │
                  └─ (no EditorOverlay in preview)

Note: All interactions go directly to real DOM in preview mode.
```

## 4. Z-Index Stacking (Edit Mode)

```
z-10000+  ┌─────────────────────────────────────────┐
          │ Toast/Notifications                     │
          │ - ToastRenderer (preview inside canvas)│
          │ - AiOperationToast (fixed bottom-right)│
          └─────────────────────────────────────────┘

z-1000+   ┌─────────────────────────────────────────┐
          │ EditorOverlay                           │
          │ (selection, handles, guides, canvas)   │
          └─────────────────────────────────────────┘

z-500     ┌─────────────────────────────────────────┐
          │ EditorContextMenu (portal)              │
          └─────────────────────────────────────────┘

z-100     ┌─────────────────────────────────────────┐
          │ TextInlineEditor (portal)               │
          └─────────────────────────────────────────┘

z-auto    ┌─────────────────────────────────────────┐
          │ Canvas transform/stack                  │
          │ (ViewportContainer → SchemaRenderer)   │
          └─────────────────────────────────────────┘

z-0       ┌─────────────────────────────────────────┐
          │ Canvas root, Layout root                │
          └─────────────────────────────────────────┘
```

## 5. Z-Index Stacking (Preview Mode)

```
z-10000   ┌─────────────────────────────────────────┐
          │ ToastRenderer (inside preview root)     │
          │ - absolute positioned                   │
          │ - top: 16px, left: 50%                 │
          │ - stacks toasts vertically             │
          └─────────────────────────────────────────┘

z-auto    ┌─────────────────────────────────────────┐
          │ PreviewNodeRenderer tree                │
          │ (Real interactive DOM elements)         │
          │ (pointerEvents: auto)                   │
          └─────────────────────────────────────────┘

z-0       ┌─────────────────────────────────────────┐
          │ Preview root viewport (gray or trans)   │
          │ ViewportContainer (centered)            │
          └─────────────────────────────────────────┘
```

## 6. Toast Positioning (Two Systems)

### Preview Toast (ToastRenderer)
```
┌─────────────────────────────────────────┐
│ [data-preview-root]  (relative context)  │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ ToastRenderer (absolute overlay) │   │
│  │ z-index: 10000                   │   │
│  │ top: 16px; left: 50%            │   │
│  │ transform: translateX(-50%)      │   │
│  │                                  │   │
│  │  [Toast 1] ✅ Success msg       │   │
│  │  [Toast 2] ❌ Error msg         │   │
│  │  [Toast 3] ⚠️  Warning msg      │   │
│  │  (gap: 8px, flex-column)        │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                          │
│   [Interactive content below]            │
│                                          │
└─────────────────────────────────────────┘
```

### AI Operation Toast (AiOperationToast)
```
┌────────────────────────────────────────────────────────┐
│ EDITOR PAGE / BODY (fixed positioning context)        │
│                                                        │
│                                                        │
│                                     ┌─────────────┐   │
│                                     │ [AI Toast]  │   │
│                                     │ z-index: 50 │   │
│                                     │ 🤖 AI 修改了│   │
│                                     │ ┌────┐     │   │
│                                     │ │撤销│     │   │
│                                     │ └────┘     │   │
│                                     │ (fixed)    │   │
│                                     │ bottom-20  │   │
│                                     │ right-4    │   │
│                                     │            │   │
│                                     │            │   │
│                                     └─────────────┘   │
│                                                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 7. Event Execution Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Preview DOM (Real interactive HTML)                          │
│                                                              │
│  <button data-node-id="btn-1">Click Me</button>             │
│         ↑                                                    │
│         │ User clicks                                       │
│         └───────────────────────────────────────────────┐   │
│                                                         ↓   │
│  EventExecutionEngine.bind() [useEffect]           Listener│
│  - Walks ComponentNode tree                          mounted│
│  - Builds nodeId → node map                                │
│  - Queries [data-node-id] in DOM                          │
│  - Attaches event handlers (click, hover, etc)            │
│                                                            │
│  On event fire:                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 1. handler(event)                                 │   │
│  │    - event.stopPropagation()                      │   │
│  │    - evaluateCondition(event.condition, context) │   │
│  │                                                   │   │
│  │ 2. For each action in event.actions:             │   │
│  │    - if action.type === 'delay':                 │   │
│  │      await setTimeout(duration)                  │   │
│  │    - if action.type === 'apiRequest':            │   │
│  │      await context.onApiRequest(...)             │   │
│  │    - else: executeAction(action, context)        │   │
│  │                                                   │   │
│  │ 3. executeAction() calls context methods:        │   │
│  │    - onSetState(nodeId, stateName)               │   │
│  │    - onSetGlobalState(name, value)               │   │
│  │    - onNavigate(screenId, animation)             │   │
│  │    - onToggleVisible(nodeId)                      │   │
│  │    - onShowToast(type, msg, duration)            │   │
│  │    - ... etc                                      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  PreviewContext callbacks:                                 │
│  ↓                                                         │
│  PreviewInteractiveShell.setState()                        │
│  - setRuntimeGlobals()     → triggers re-render            │
│  - setRuntimeNodeStates()  → updates node.activeState      │
│  - setPreviewHiddenIds()   → toggles visibility            │
│  - setToasts()             → adds to queue                 │
│                                                            │
│  ↓ Re-render                                               │
│                                                            │
│  PreviewNodeRenderer walks tree with new state             │
│  → PrimitiveRenderer uses updated styles                   │
│  → ToastRenderer shows new toast at top-center             │
│                                                            │
└──────────────────────────────────────────────────────────────┘
```

## 8. State Update Cascade

```
USER ACTION (click on preview)
        ↓
EventExecutionEngine.handler()
        ↓
evaluateCondition()
        ↓
for each action in chain:
  ├─ executeAction() or executeApiRequestAction()
  │  ↓
  │  Calls PreviewContext callback
  │  ├─ onSetState(nodeId, stateName)
  │  ├─ onSetGlobalState(name, value)
  │  ├─ onShowToast(type, msg, duration)
  │  └─ onNavigate(screenId, animation)
  │
  └─ Returns (may be async for delay/apiRequest)
        ↓
PreviewInteractiveShell.setState()
        ├─ setRuntimeGlobals({ ...prev, [name]: value })
        ├─ setRuntimeNodeStates({ ...prev, [nodeId]: stateName })
        ├─ setPreviewHiddenIds(new Set)
        └─ setToasts([...prev, { id, type, msg, duration, position }])
        ↓
Re-render triggered
        ↓
PreviewNodeRenderer (with new state)
        ├─ Uses new runtimeGlobals for style/props resolution
        ├─ Uses new runtimeNodeStates for activeState overrides
        ├─ Skips nodes in previewHiddenIds
        └─ Renders PrimitiveRenderer tree
        ↓
ToastRenderer (with new toasts array)
        ├─ Shows max 3 toasts
        ├─ Auto-dismisses after duration
        └─ Manual dismiss on click
```

## 9. Event Conditions & Operators

```
CONDITION evaluation:
├─ Type: globalState/domainState/environmentState
│   └─ Check: globalStates[variableName] operator expectedValue
│      ├─ operator: equals, notEquals, contains, greaterThan, lessThan
│      └─ Result: true/false → execute action or skip
│
├─ Type: nodeState
│   └─ Check: nodeMap[nodeId].activeState operator expectedValue
│
├─ Type: prop
│   └─ Check: nodeMap[nodeId].props[propName] operator expectedValue
│
└─ Type: expression
    └─ Check: new Function('globalStates', `return Boolean(${expr})`)(globalStates)
       └─ Evaluates custom JS expression
```

## 10. Component Tree (Full Preview Mode)

```
EditorPage (observer)
  ├─ Toolbar
  ├─ PreviewBar (if previewMode)
  │   └─ Device selector, domain state controls, data source controls
  └─ .editor-body
      ├─ .editor-left-panel (optional)
      ├─ .editor-center
      │   └─ .editor-canvas-area--preview
      │       └─ Canvas
      │           └─ .editor-canvas-root
      │               └─ .editor-canvas-transform
      │                   └─ .editor-canvas-stack
      │                       ├─ .editor-canvas-dom-layer--preview
      │                       │   └─ ViewportContainer
      │                       │       └─ PreviewRenderer
      │                       │           └─ PreviewInteractiveShell
      │                       │               ├─ EventExecutionEngine (useRef)
      │                       │               ├─ CSSPseudoInjector (useRef)
      │                       │               ├─ MockExecutor (useRef)
      │                       │               └─ [data-preview-root]
      │                       │                   ├─ [data-screen-id]
      │                       │                   │   └─ PreviewNodeRenderer
      │                       │                   │       └─ PrimitiveRenderer
      │                       │                   │           └─ Children recursively
      │                       │                   │
      │                       │                   └─ ToastRenderer
      │                       │                       └─ SingleToast[] (visible <= 3)
      │                       │
      │                       └─ (no EditorOverlay)
      │
      ├─ .editor-right-panel (optional, but not visible in full preview)
      │
      └─ AiOperationToast (fixed bottom-right, above canvas)
```

---

## Key Measurements

| Element | Dimension | Notes |
|---------|-----------|-------|
| Toolbar | Full width, fixed height | Top bar |
| PreviewBar | Full width, min-h-10 px-3 py-1.5 | Only in preview mode |
| Left Panel | Default 280px (resizable) | Optional |
| Right Panel | Default 300px (resizable) | Optional |
| Canvas Area | Flex: 1 | Remaining space |
| ViewportContainer Padding | 24px | Outer spacing around device |
| ViewportContainer Content | Variable (375×812 etc) | Based on Viewport preset |
| Toast Stacking Gap | 8px | Between toasts |
| Toast Width | 200-320px | Min 200, max 320 |
| AI Toast Margin | bottom-20 (80px), right-4 (16px) | Fixed positioning offset |
| ToastRenderer Top | 16px from top | Inside preview root |

