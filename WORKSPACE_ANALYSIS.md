# Design UI Monorepo - Comprehensive Workspace Analysis

## 📁 Project Structure Overview

### Root Level Directories
```
design-ui-monorepo/
├── apps/                          # Applications (monorepo packages)
│   ├── design_front/              # React frontend editor
│   ├── design-api/                # Backend API server
│   └── design-mcp/                # MCP server integration
├── features/                      # Feature modules
│   ├── design-codegen/            # Code generation engine
│   ├── design-engine/             # Canvas rendering & layout engine
│   ├── design-operations/         # Operation/transaction system
│   ├── design-schema/             # Schema definitions & types
│   └── jarvis-tools/              # Tool utilities
├── design_docs/                   # Design documentation
├── design_docs/02-product/        # Product design specs
├── design_docs/03-tech/           # Technical architecture
├── design_docs/04-roadmap/        # Implementation roadmaps
├── generators/                    # Code generators
├── scripts/                       # Build & utility scripts
├── tooling/                       # Development tools
└── node_modules/                  # Dependencies
```

---

## 🎯 Key Design Documentation Files

### 1. **Toast & Overlay Design** 
**File:** `design_docs/04-roadmap/toast-overlay-design.md`

**Key Concepts:**
- **Core Thesis**: Toast, Loading, and confirmation dialogs should NOT be drawn on canvas
- They are "interaction feedback components" - time-based, not layout-based
- Should be configured as "behavioral actions" in event chains, not as canvas nodes

**Design Rationale:**
- Canvas deals with spatial dimension ("where is the element?")
- Toast deals with temporal dimension ("when does it appear?")
- Toast is triggered by events, not by layout position
- **Problem with drawing on canvas**: 3+ Toast overlays clutter the UI, obstruct editing, cause visual pollution

**Product Design - Three Component Categories:**

| Category | Examples | Management |
|----------|----------|------------|
| **Layout Components** | div, button, input, text, image | Paint on canvas + property panel |
| **State Variants** | button hover/pressed/loading states | State panel + per-state styling |
| **Interaction Feedback** | Toast, Loading mask, Confirmation | Event chain "behavioral actions" |

**Toast Configuration Flow (Designer Perspective):**
1. Define API endpoint (Data panel → Interface Definition)
2. Configure event chain on button
   - Trigger: Click
   - Action 1: Set state to loading
   - Action 2: Send request (POST /api/auth/login)
     - ✅ On Success:
       - Show toast: "Login successful"
       - Delay 500ms
       - Navigate to homepage
     - ❌ On Failure:
       - Show toast: "{{response.message}}"
       - Set state to default
3. Preview & verify with Mock scenarios

**Toast Display Logic:**
- Toast visibility = its position in the event chain
- Placing in `apiRequest.onSuccess` = shows on success
- Placing in `apiRequest.onFailure` = shows on failure
- No separate "show when" conditions needed - event chain structure determines timing

**Toast Message Content:**
- Supports `{{}}` expression binding
- `message: "{{response.message}}"` → dynamic API response
- `message: "Welcome back, {{response.data.user.name}}!"` → mixed content
- Expressions resolve at event execution time

**Key UI Components to Build:**
1. **Nested Event Chain Editor** - Support `apiRequest` with `onSuccess`/`onFailure` sub-chains
2. **Interaction Feedback Overview Panel** - Show all Toast/Loading configs on current screen
3. **Preview Mock Scenario Switcher** - Quick toggle between success/failure test scenarios

---

### 2. **API Request + Toast Navigation**
**File:** `design_docs/04-roadmap/api-request-toast-navigation.md` (44KB - partially truncated)

**Core Purpose:**
Let designers describe complete interaction flow: Button click → Send request → Show Toast + Navigate (success/failure paths)

**First Principles Analysis:**

1. **What is a request?**
   - Data exchange with external system
   - `Method + Path + Parameters → Response Data`
   - Data acquisition node in interaction chain

2. **Where should request definition live?**
   - Schema is source of truth
   - Requests are part of Screen-level "interface contracts"
   - Parallel with DataSource but different responsibility

3. **How to handle requests in preview?**
   - Preview ≠ real HTTP requests (no backend)
   - Preview = execute Mock based on request definition
   - Same request path can return different scenarios (success/failure/timeout)
   - Designers switch scenarios to verify different UI paths

4. **What is Toast?**
   - NOT an independent UI component
   - Parallel with `navigate` - an event chain Action
   - Declarative in Schema
   - Exports to `notification.success()` calls in code

5. **How to express conditional branching?**
   - Current: linear `action1 → action2 → action3`
   - Needed: branching `action1 → [success: action2a, action3a] [failure: action2b]`
   - `apiRequest` is only Action that needs branching naturally
   - Branches embed in apiRequest definition (no model change needed)

**Event Chain Extension:**
```typescript
// Current (flat):
click → [navigate] → [showToast]

// Extended (with branching):
click → [apiRequest → success: [showToast, navigate] / failure: [showToast]]
```

---

## 🏗️ Canvas & Pages Architecture

### Canvas Implementation (`apps/design_front/src/views/editor/Canvas/`)

**Files:**
- `Canvas/index.tsx` - Main canvas component (26KB)
- `Canvas/CanvasContextBar.tsx` - Context toolbar
- `Canvas/TextInlineEditor.tsx` - Inline text editing (7KB)
- `Canvas/useEditorCanvasOps.ts` - Canvas operations hook (8KB)

**Key Components Used:**
- `ViewportContainer` - Viewport management from design-engine
- `SchemaRenderer` - Render schema to canvas (design-engine)
- `PreviewRenderer` - Preview mode rendering
- `TransitionAnimator` - Animation support
- `EditorOverlay` - Selection/editing overlays

**Canvas Features:**
- Zoom/pan with viewport tracking
- Grid snapping (8px default)
- Selection box rendering
- Context menu support
- Text inline editing
- Resize observer for viewport changes
- Coordinate mapping (screen → container → editor)

**Key Store Integration:**
```typescript
editorStore.activeScreen        // Current page
editorStore.selectedNodeIds     // Selected elements
editorStore.hoveredNodeId       // Hover state
editorStore.currentViewport     // Pan/zoom state
editorStore.setCanvasViewportSize()
```

---

### Editor Store (`apps/design_front/src/stores/editor/index.ts` - 38KB)

**Core State Management (MobX):**

```typescript
class EditorStore {
  // Project & Screen
  executor: OperationExecutor          // Immutable state holder
  projectState: DesignProject         // Observable snapshot
  activeScreenId: string | null       // Current page
  
  // Selection & Canvas
  selectedNodeIds: string[]           // Multi-select support
  hoveredNodeId: string | null        // Hover state
  canvasScale: number                 // Zoom level
  canvasPanX, canvasPanY: number     // Pan offset
  
  // Tool & Mode
  activeTool: 'select' | 'hand' | 'container' | 'element' | 'text' | 'component' | 'annotation'
  previewMode: boolean                // Preview vs edit
  toolLocked: boolean                 // Tool persistence
  
  // Layout State
  leftPanelWidth: number
  rightPanelWidth: number
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  leftPanelView: 'pages' | 'elements' | 'data'
  
  // State Context (5-layer interaction states)
  stateContext: {
    interactionState: string            // default|hover|active|focus|disabled
    componentStateEditing: string | null // Editing state override
    lockedDomain: { variableName } | null
  }
  
  // Preview Navigation
  previewNavStackIds: string[]        // Navigation history
  previewTransition: string           // Transition animation type
  
  // Global States
  currentGlobalStates: Record<string, string>
}
```

**Key Methods:**
- `loadProject(projectId)` - Fetch and initialize
- `setActiveScreen(screenId)` - Switch page
- `selectNode(nodeId, multi?)` - Selection
- `updateNodeProps(nodeId, props)` - Modify properties
- `undo()` / `redo()` - Operation history
- `setCanvasViewportSize(w, h)` - Resize listener

**Operation Management:**
- Uses `OperationExecutor` from design-operations
- Immutable state with operation log
- Replay capability (undo/redo)
- Persistent operation queue for offline support

---

## 🎨 Existing Toast Implementation

**Current Toast:** `apps/design_front/src/views/editor/AiOperationToast/index.tsx`

```typescript
class AiToastStore {
  toasts: AiToastEntry[] = []
  add(description: string): void
  remove(id: string): void
  clear(): void
}

interface AiToastEntry {
  id: string
  description: string
  timestamp: number
}
```

**Features:**
- MobX observable state
- Max 3 toasts (FIFO eviction)
- Auto-dismiss after 3 seconds
- Undo action support
- Fixed position: bottom-right at z-50
- Tailwind styling with slide-in animation

**Positioning:**
```css
position: fixed;
bottom: 20px;
right: 4px;
z-index: 50;
```

---

## 📋 Design Documentation Structure

### Product Design (`design_docs/02-product/`)
- **editor/01-canvas/** - Canvas interaction model
- **editor/02-toolbar/** - Toolbar design
- **editor/03-property-panel/** - Property panel spec
- **editor/04-state-system/** - Component state management
- **editor/05-data-driven/** - Data binding system
- **editor/09-interaction-binding/** - Event system reference
- **editor/10-preview-mode/** - Preview execution model

### Technical Design (`design_docs/03-tech/`)
- **design-schema.md** - Data structure definitions
- **design-engine.md** - Canvas rendering engine
- **design-operations.md** - Transaction/operation system
- **design-codegen.md** - Code generation pipeline
- **editor/04-engine-canvas.md** - Canvas implementation
- **editor/05-engine-preview.md** - Preview execution engine

### Roadmap (`design_docs/04-roadmap/`)
- **toast-overlay-design.md** ← PRIMARY (1st requirement)
- **api-request-toast-navigation.md** ← PRIMARY (2nd requirement)
- **editor-roadmap-w5-w8-index.md** - Implementation phases
- **editor-implementation-tasks.md** - Task breakdown

---

## 🔗 Package Dependencies

### `design_front` (React App)
```json
{
  "@globallink/design-engine": "workspace:*",         // Canvas rendering
  "@globallink/design-operations": "workspace:*",     // State management
  "@globallink/design-schema": "workspace:*",         // Type definitions
  "mobx": "^6.13.3",                                  // Reactive state
  "mobx-react-lite": "^4.0.7",                       // React integration
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^7.13.2",                     // Navigation
  "antd": "^5.24.1",                                 // UI components
}
```

---

## 📊 Key Findings Summary

### 1. **Toast Design Philosophy**
✅ **Clear directive**: Toast should NOT be drawn on canvas
✅ **Should be**: Behavioral action in event chains
✅ **Prevents**: Visual pollution, condition complexity, code generation confusion

### 2. **Event Chain Model**
- Linear chains: `action1 → action2 → action3`
- `apiRequest` supports nested branching:
  - `apiRequest.onSuccess` - sub-chain on success
  - `apiRequest.onFailure` - sub-chain on failure
- No other action types need branching

### 3. **Project Architecture**
- Monorepo with 3 main apps + 5 feature packages
- MobX for reactive state management
- Operation-based undo/redo system
- Canvas powered by design-engine package

### 4. **Key Integration Points**
- Canvas: `apps/design_front/src/views/editor/Canvas/`
- Store: `apps/design_front/src/stores/editor/`
- Engine: `features/design-engine/` (renders canvas)
- Schema: `features/design-schema/` (types)

### 5. **Existing Toast Component**
- Located in `AiOperationToast/` - for AI operation feedback
- Uses MobX store + auto-dismiss
- Can serve as reference but NOT the dialog system we need

---

## 📍 File Paths Summary

| Component | Path |
|-----------|------|
| **Design Docs - Toast** | `design_docs/04-roadmap/toast-overlay-design.md` |
| **Design Docs - API** | `design_docs/04-roadmap/api-request-toast-navigation.md` |
| **Canvas Component** | `apps/design_front/src/views/editor/Canvas/index.tsx` |
| **Editor Store** | `apps/design_front/src/stores/editor/index.ts` |
| **Canvas Ops** | `apps/design_front/src/views/editor/Canvas/useEditorCanvasOps.ts` |
| **Existing Toast** | `apps/design_front/src/views/editor/AiOperationToast/index.tsx` |
| **Project Config** | `apps/design_front/package.json` |
| **Editor Views** | `apps/design_front/src/views/editor/` |
| **Editor Stores** | `apps/design_front/src/stores/` |
| **Design Engine** | `features/design-engine/` |
| **Design Schema** | `features/design-schema/` |
| **Design Operations** | `features/design-operations/` |

