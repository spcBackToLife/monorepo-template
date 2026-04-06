# DesignUI Project - Complete Documentation Exploration

**Date:** April 6, 2026  
**Project Type:** Next-generation visual product builder / design tool  
**Repository:** design-ui-monorepo  

---

## 1. PROJECT OVERVIEW

### 1.1 One-Sentence Definition

**"Design is Product"** — A next-generation design tool that transforms the design process from "drawing UI" into "constructing structured Schema." The Schema itself IS the final product's source data, ready to be directly rendered as React/Vue/Flutter or any frontend code.

### 1.2 Core Philosophy (三个根本断裂的解决)

Traditional design tools (Figma/Sketch) use **pixels** as their output, creating three fundamental gaps:

| Gap | Problem | Cost |
|-----|---------|------|
| **Interaction Gap** | Pixels can't express "click → navigate to X or change state Y" | Need flowcharts + extra documentation + alignment meetings |
| **Semantic Gap** | Pixels have no meaning—is this rectangle a Button or a Card? | Design-to-code requires guessing; needs manual translation |
| **State Gap** | Pixels capture one moment; multiple states need N duplicates | Exponential maintenance cost |

**Our Solution:** Build a **UI Schema protocol** that is:
- **Structured data**, not pixels
- **Semantically complete**: component tree + CSS + interactions + state + data
- **Code-ready**: directly consumable by rendering engines
- **AI-friendly**: all mutations are standardized Operations

---

## 2. DIRECTORY STRUCTURE

```
design_docs/
├── README.md                                    ← Navigation hub
│
├── 01-vision/
│   └── first-principles.md                     ← Core principles & Q&A (8 key questions)
│
├── 02-product/                                 ← Product specifications
│   ├── overview.md                             ← Positioning, core features, user flows
│   ├── editor.md                               ← [DEPRECATED - see editor/ folder]
│   ├── editor/                                 ← 11 subsystems for editor design
│   │   ├── README.md                           ← Editor master plan (核心概念 + 子系统)
│   │   ├── 01-canvas/README.md                 ← Dual-layer canvas architecture
│   │   ├── 02-toolbar/README.md                ← Tool system & shortcuts
│   │   ├── 03-property-panel/                  ← Right panel design (5 Tab unified edit)
│   │   ├── 04-state-system/README.md           ← 4-layer state model
│   │   ├── 05-data-driven/README.md            ← Data binding & Mock scenarios
│   │   ├── 06-component-props/README.md        ← Standardized Props exposure
│   │   ├── 07-asset-management/README.md       ← Component asset system
│   │   ├── 08-layer-tree/README.md             ← Element tree & page management
│   │   ├── 09-interaction-bindding/README.md   ← Event binding & navigation
│   │   ├── 10-preview-mode/README.md           ← Preview & testing mode
│   │   ├── 11-collaboration/README.md          ← AI + multi-user collaboration
│   │   ├── 12-page-lifecycle/README.md         ← Page lifecycle hooks
│   │   └── 13-panorama-view/README.md          ← State & data overview (全景视图)
│   └── component-assets.md                    ← Asset ecosystem & flywheel
│
├── 03-tech/                                    ← Technical architecture
│   ├── architecture.md                         ← Monorepo structure, SDK layout, tech choices
│   ├── design-schema.md                        ← UI Schema protocol (types, validation)
│   ├── design-engine.md                        ← Dual-layer rendering engine
│   ├── design-operations.md                    ← Operation collection (core logic)
│   ├── design-codegen.md                       ← Cross-platform code generation
│   ├── design-mcp.md                           ← MCP Server (AI entry point)
│   ├── frontend.md                             ← React frontend (design_front)
│   ├── backend.md                              ← NestJS backend + database
│   ├── event-sourcing.md                       ← Storage: Event Sourcing + snapshots
│   └── editor/                                 ← Technical impl for 11 editor subsystems
│       ├── README.md                           ← Tech master plan (包映射 + 依赖)
│       ├── 01-schema-extensions.md
│       ├── 02-operations-extensions.md
│       ├── 03-engine-rendering.md
│       ├── 04-engine-canvas.md
│       ├── 05-engine-preview.md
│       ├── 06-frontend-layout.md
│       ├── 07-frontend-canvas.md
│       ├── 08-frontend-panels.md
│       ├── 09-backend-extensions.md
│       ├── 10-mcp-extensions.md
│       └── 11-sync-system.md
│
├── 04-roadmap/                                 ← Execution & planning
│   ├── roadmap.md                              ← MVP execution checklist
│   ├── editor-implementation-tasks.md          ← 155 editor tasks, 5 Phase, 12 weeks
│   ├── editor-w1-issues.md ~ editor-w8-issues.md    ← Weekly breakdown
│   ├── panorama-view-implementation.md         ← Technical implementation plan
│   └── [other implementation docs]
│
└── 05-decisions/                               ← Decision log
    └── decision-log.md                         ← All key decisions & rationale

Total: 73 markdown files across 4 core sections + roadmap + decisions
```

---

## 3. CORE PRODUCT CONCEPTS

### 3.1 Four Root Goals (四大根本目标)

```
G1 Design is Code (设计即代码)
   → Design output is complete product code (component structure, routing, state mgmt)
   → No need for design-to-code translation step

G2 AI Incremental Operations (AI增量操作)
   → AI builds UI step-by-step through MCP, each step is undoable
   → AI uses same Operations as human designers, not pixel generation

G3 Designer-Friendly (设计师友好)
   → Component asset accumulation & reuse (no redrawing from scratch)
   → Interactive design (not drawing N frames to explain interaction)
   → Mock data support for designing in context

G4 Product-Friendly (产品友好)
   → Design = product requirements; auto-generate requirement docs
   → Interaction flows, state transitions, data dependencies all clear
   → No deep analysis needed—structure is explicit in Schema
```

### 3.2 Key Differences from Figma

| Dimension | Figma/Sketch | DesignUI |
|-----------|--------------|----------|
| **Design Object** | Isolated page frames | Complete product (pages connected via navigation) |
| **Element Nature** | Semantic-less shapes | Semantic HTML elements + component instances |
| **State Expression** | Draw each state separately | Single element + state context = multiple appearances |
| **Data** | None (or manual placeholder text) | Dataset + binding expressions; data drives UI |
| **Interaction** | Prototype mode with arrows + notes | Events directly bound to elements (part of design process) |
| **Page Relationship** | Independent; manual arrows | Automated navigation graph (from navigate events) |
| **Output** | Static images + annotations | Runnable code + requirement docs |
| **Consistency** | Manual checks | Global state + data binding = single source of truth |

### 3.3 Design Process Flow

```
Step 1: Create Project
  ↓ (select platform: PC/Mobile, choose initial viewport)
  
Step 2: Build Page UI
  ↓ (add elements, adjust styles, live DOM preview)

Step 3: Define Interactions
  ↓ (bind click → navigate: /signup; auto-create signup page; form navigation graph)

Step 4: Connect Data
  ↓ (create datasets: normal/empty/error/VIP; bind expressions {{ data.user.name }})

Step 5: Define State Variants
  ↓ (global: theme=dark/light, role=admin; business: loading/success/error)

Step 6: Preview & Verify
  ↓ (operate like real app; interactions execute; state switches work)

Step 7: Export
  → Code (React project with components, routing, state mgmt)
  → Requirement docs (interactions, state flows, data interfaces)
  → Screenshot matrix (states × data × viewports)
```

---

## 4. UI SCHEMA PROTOCOL (设计 Schema 协议)

Located in: `03-tech/design-schema.md`

### 4.1 Core Types

```typescript
// Atomic Elements (direct HTML tags)
type NodeType = "div" | "span" | "button" | "input" | "img" | ... 
              | `component:${string}`;  // Component references

interface ComponentNode {
  id: string;
  type: NodeType;
  name?: string;
  styles: CSSProperties;        // Direct CSS, not custom syntax
  children?: ComponentNode[];
  props: Record<string, any>;   // Element attributes
  states: ComponentState[];     // All state variants
  activeState: string;          // Current active state
  events: ComponentEvent[];     // Event bindings
  constraints?: LayoutConstraints;
  templateRef?: {
    templateId: string;
    mode: "reference" | "detached";
  };
}

// Component State (styling overrides for different contexts)
interface ComponentState {
  name: string;                 // "default" | "hover" | "disabled" | custom
  styles: Partial<CSSProperties>;
  props?: Partial<Record<string, any>>;
}

// Event & Interaction
interface ComponentEvent {
  trigger: "click" | "hover" | "focus" | "blur" | "longPress";
  action: EventAction;
}

type EventAction =
  | { type: "navigate"; targetScreenId: string; animation?: TransitionAnimation }
  | { type: "setState"; targetId: string; state: string }
  | { type: "openUrl"; url: string }
  | { type: "custom"; handler: string };

// Complete Project
interface DesignProject {
  id: string;
  name: string;
  platform: "pc" | "mobile";
  defaultViewport: Viewport;
  screens: Screen[];                // All pages
  componentAssets: ComponentTemplate[];  // Reusable components
  globalStates: GlobalStateVar[];   // Global state variables
  dataSets: DataSet[];              // Mock data scenarios
}
```

### 4.2 Key Design Decisions

1. **CSS-based Styles**: Not inventing new syntax; use CSS property names as universal language
2. **Semantic HTML Elements**: div, button, img, etc. map directly to production code
3. **Component Instances**: Reference templates from asset library (reference or detached mode)
4. **No Separate State Definition**: States are part of the component, not global enums
5. **Event-driven Navigation**: Page relationships emerge from navigate events, not pre-defined

---

## 5. EDITOR PRODUCT DESIGN (编辑器总纲)

Located in: `02-product/editor/README.md`

### 5.1 Core Concepts

**Product Context** — All UI is a function of:
```
Current UI = f(current_page, global_state, data_scenario, business_state, interaction_state, viewport)
```

**Connected Pages** — Pages auto-connect via navigate events (forms a navigation graph)

**Live Rendering** — Canvas shows real DOM with live data binding, not static pixels

### 5.2 Editor Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Navbar: [Product Name] [Viewport▾] [Zoom] [Undo/Redo] [Preview] [Export▾] │
├──────────┬──────────────────────────┬──────────────────────┤
│          │                          │                      │
│ LEFT     │   CANVAS                 │  RIGHT               │
│ PANEL    │ ┌──────────────────────┐ │  EDIT PANEL          │
│          │ │ Canvas Overlay       │ │                      │
│ [Pages]  │ │ (selection/draggers  │ │  [Context Bar]       │
│ [Elements]│ │ /alignment/snapping) │ │  (state switcher)    │
│ [Data]   │ ├──────────────────────┤ │                      │
│          │ │ React DOM Render     │ │  ▸ Properties        │
│          │ │ (real components)    │ │  ▸ Styles            │
│          │ │ (data binding live)  │ │  ▸ Visibility        │
│          │ └──────────────────────┘ │  ▸ Events            │
│          │                          │  ▸ Code Preview      │
├──────────┴──────────────────────────┴──────────────────────┤
│ Toolbar: [Select] [Pan] [Container] [Box] [Text] [Components] [Comments] │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Left Panel: Product Navigator (三个视图)

**Pages View** — Auto-shows navigation relationships (no manual arrow drawing)
```
● Login Page ←(current)
  └→ Home Page
  └→ Signup Page
○ Home Page
  └→ Settings Page
```

**Elements View** — Shows element tree with behavior indicators
```
⚡ = has events
🔗 = has data binding
🔵 = has state definitions
👁 = has visibility conditions
```

**Data View** — Dataset switching + global state + JSON editor
```
Datasets: [● Normal Data] [○ Empty] [○ Error]
Global States: theme: [light▾] role: [user▾]
```

### 5.4 Right Panel: State-Driven Edit Panel

**No more separate "State Tab"** — Instead:
- Top: State Context Bar (choose interaction state, business state, etc.)
- Below: All properties/styles/visibility/events show values for CURRENT state only
- Edit any value → automatically writes to current state's override

Key insight: **State is context, not a tab.**

### 5.5 Canvas: Real DOM + Data Binding

- Schema → real React components (not canvas pixels)
- Data binding expressions {{ data.user.name }} evaluate in real-time
- Switch datasets → UI re-renders with new data immediately
- Lists auto-expand based on data length
- In editing mode: overlays show selections, handles, alignment lines
- In preview mode: overlays hidden, events execute, behaves like real app

### 5.6 11 Subsystems (编辑器的11个子系统)

| # | Subsystem | Problem Solved | Key Files |
|---|-----------|---|---|
| 01 | Canvas | How to render Schema as editable live UI? | `01-canvas/README.md` |
| 02 | Toolbar | How to make construction tools accessible? | `02-toolbar/README.md` |
| 03 | Property Panel | How to edit all element dimensions in state context? | `03-property-panel/README.md` |
| 04 | State System | How to express all product states in one Schema? | `04-state-system/README.md` |
| 05 | Data-Driven | How to make data binding a first-class design citizen? | `05-data-driven/README.md` |
| 06 | Component Props | How to standardize component configuration? | `06-component-props/README.md` |
| 07 | Asset Management | How to accumulate & reuse design assets? | `07-asset-management/README.md` |
| 08 | Layer Tree & Pages | How to keep product structure navigable? | `08-layer-tree/README.md` |
| 09 | Interaction & Events | How to define real behavior during design? | `09-interaction-bindding/README.md` |
| 10 | Preview & Testing | How to verify interaction flow works? | `10-preview-mode/README.md` |
| 11 | Collaboration | How to enable human + AI co-authoring? | `11-collaboration/README.md` |
| 12 | Page Lifecycle | How to describe page behavior at each stage? | `12-page-lifecycle/README.md` |
| 13 | Panorama View | How to see all states at once? | `13-panorama-view/README.md` |

---

## 6. PANORAMA VIEW (全景视图 V2)

Located in: `02-product/editor/13-panorama-view/README.md`

### 6.1 Two-Feature Design

**V1 Problems:**
- Full-screen panorama mode required leaving edit context
- In edit mode, could only see one state at a time via tabs
- Tried to solve two different needs with one feature → both suffered

**V2 Solution: Split into two complementary features**

#### Feature A: State Preview Thumbnail Strip (右侧面板内)

```
Right Panel → State Context Bar ↓
┌─────────────────────────┐
│ ▾ State Preview         │  ← Toggleable header
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │
│ │ D│ │H │ │P │ │F │   │  ← 80×60px live thumbnails
│ └──┘ └──┘ └──┘ └──┘   │    (horizontal scrollable)
│ ┌──────┐ ┌──────┐      │
│ │ Ok  │ │ Error│      │  ← Custom state thumbnails
│ └──────┘ └──────┘      │
└─────────────────────────┘
```

- In-place, non-blocking state preview
- Thumbnails are live SchemaRenderer at 10% scale
- Hover shows 2× tooltip preview
- Click thumbnail = switch to that state (same as tabs)
- "↗ Panorama Comparison" link → jump to full page

#### Feature B: Panorama Standalone Route

```
Route: /editor/:id/panorama          → Page panorama
Route: /editor/:id/panorama?node=xxx → Component panorama

Full-screen, immersive state viewing:
- Component panorama: All states grid (交互态 + 自定义态)
- Page panorama: Complete pages grid (领域态 × 数据 × 视口)
- URL shareable for team review
- Click grid cell → jump back to edit + apply that state
```

### 6.2 Why This Works

| Factor | V1 | V2 |
|--------|-----|-----|
| **Space** | Limited (inside editor) | Full screen |
| **Edit Flow** | Must leave edit context | Stay in edit mode for quick check |
| **Deep Review** | Cramped, hard to compare | Spacious, true full-screen inspection |
| **URL Shareable** | No | Yes—can share component state review |
| **Maintenance** | Manual screenshot sync | Live Schema projection (auto-updates) |

---

## 7. DATA / STATE / INTERACTION PERVASIVENESS

### 7.1 How Data Permeates the Editor

| Location | Form |
|----------|------|
| Left panel (Data view) | Dataset switcher, JSON editor |
| Right panel (Properties) | 🔗 icon → bind expression |
| Canvas | Real-time data binding rendering |
| Canvas context bar | Shows current dataset, click to switch |
| Element tree | 🔗 icon marks data-bound nodes |
| Preview mode | Data-driven changes execute |

### 7.2 How State Permeates the Editor

| Location | Form |
|----------|------|
| Right panel (Context bar) | State switcher (top of panel) |
| Right panel (Styles) | 🔵 marks overridden values in current state |
| Right panel (Visibility) | Show/hide child elements per state |
| Canvas | Real-time state rendering |
| Canvas context bar | Shows global state values, click to switch |
| Left panel (Data view) | Global state variable management |
| Element tree | 🔵 icon marks state-defined nodes |

### 7.3 How Interaction Permeates the Editor

| Location | Form |
|----------|------|
| Right panel (Events) | Event card list + add button |
| Left panel (Pages view) | Auto-shows page connections |
| Canvas | ⚡ icon marks event-bound elements |
| Element tree | ⚡ icon marks event nodes |
| Preview mode | All events execute |

### 7.4 Why This Matters

```
Traditional tools: Data/state/interaction hidden in menus
  → Designers forget to define them
  → Developers guess
  → Requirement docs incomplete

DesignUI: Data/state/interaction visible everywhere
  → Design process naturally defines complete behavior
  → Export code + docs are inherently complete
  → Achieves all 4 root goals
```

---

## 8. TECHNICAL ARCHITECTURE

Located in: `03-tech/architecture.md`, `design-schema.md`, `design-operations.md`, etc.

### 8.1 Monorepo Structure

```
monorepo-template/
├── apps/
│   ├── design_front           # React frontend (already exists)
│   ├── design-api             # NestJS backend (already exists)
│   └── design-mcp             # 🆕 MCP Server (AI entry point)
│
└── features/
    ├── design-schema          # UI Schema protocol (SDK)
    ├── design-engine          # Dual-layer rendering engine (SDK)
    ├── design-operations      # Operation collection - CORE LOGIC (SDK)
    └── design-codegen         # Cross-platform code generation (SDK)
```

### 8.2 Core SDK Packages

| Package | Purpose | Environment |
|---------|---------|-------------|
| `@globallink/design-schema` | UI Schema types, validation, asset model | Browser |
| `@globallink/design-engine` | React DOM + Canvas rendering | Browser |
| `@globallink/design-operations` | All design operations (core business logic) | Browser |
| `@globallink/design-codegen` | Schema → React/Vue/Flutter/RN code | Node.js |

### 8.3 MCP Server

**Purpose:** Expose design operations to external AI tools (Cursor, Claude Code, etc.)

**Not an SDK** — It's a Node.js application that:
1. Wraps `@globallink/design-operations` as MCP Tools
2. Exposes Schema state as MCP Resources
3. Communicates via stdio or SSE
4. Persists to design-api backend

**External AI Tools connect via:**
```
Cursor / Claude Code / Custom Client
         ↓ (MCP protocol)
    design-mcp Server
         ↓ (REST)
    design-api Backend
```

### 8.4 Data Flow

**Path A: Manual Operations (Frontend Direct)**
```
User edits canvas/panel
  ↓
OperationExecutor.execute(operation)
  ├→ MobX Store updates → Canvas re-renders
  └→ REST API → design-api persists
```

**Path B: AI Operations (via MCP)**
```
Cursor/Claude Code issues Tool Call
  ↓
MCP Server → design-api REST endpoint
  ├→ Persisted
  └→ WebSocket push to frontend
         ↓
      Frontend applies operation → Canvas re-renders
```

Both paths use **identical Operation definitions**.

---

## 9. OPERATION DEFINITION (操作集合)

Located in: `03-tech/design-operations.md`

### 9.1 Operation Structure

```typescript
interface Operation {
  type: string;
  params: Record<string, any>;
  description: string;  // Human-readable (also for AI comprehension)
}
```

### 9.2 Operation Categories

```typescript
// Element Operations
| addElement         | removeElement | moveElement | duplicateElement

// Asset Operations
| instantiateTemplate | saveAsTemplate | detachInstance | syncInstance

// Style Operations
| updateStyle | resetStyle

// State Operations
| addState | removeState | updateState | setActiveState

// Event Operations
| addEvent | removeEvent | addNavigation

// Screen Operations
| addScreen | removeScreen | setActiveScreen

// Viewport Operations
| switchViewport | addViewportPreset

// Data & Binding Operations
| addDataSource | addDataScenario | switchDataScenario | bindData

// Domain State Operations
| addDomainState | removeDomainState | addDomainStateBinding | updateDomainStateBinding
```

### 9.3 Executor Interface

```typescript
class OperationExecutor {
  execute(op: Operation): DesignProject;
  executeBatch(ops: Operation[]): DesignProject;
  undo(): DesignProject;
  redo(): DesignProject;
  getAvailableOperations(): OperationDescription[];  // For AI
}
```

---

## 10. STORAGE & VERSIONING

Located in: `03-tech/event-sourcing.md`

### 10.1 Event Sourcing + Snapshots

```
Design system is naturally Operation-based:
  design-operations = Editor commands
                    = MCP Tool calls
                    = Version history events
  → All four are UNIFIED!
```

**Why Event Sourcing?**

| Benefit | Details |
|---------|---------|
| Incremental storage | Each op ≈ 200 bytes vs. full Schema |
| Precise versions | Rewind to any single operation |
| Natural undo/redo | Execute ops forward/backward |
| Natural audit | Who did what when (including AI ops) |

**Architecture:**
```
Front-end: Local execute → immediate visual feedback
Back-end: Batch write operations to log (async, retryable)
Snapshots: Periodic snapshots every N operations for fast loading
```

---

## 11. ROADMAP & EXECUTION

Located in: `04-roadmap/`

### 11.1 Scale

- **155 editor implementation tasks**
- **5 phases** of development
- **12 weeks** estimated timeline
- Weekly breakdown: `editor-w1-issues.md` through `editor-w8-issues.md`

### 11.2 Phase Structure

(Specific phases documented in roadmap files)

---

## 12. KEY DESIGN DECISIONS & RATIONALE

Located in: `05-decisions/decision-log.md`

Examples of documented decisions:

1. **Why dual-layer canvas?** (DOM + Canvas)
   - DOM for semantic content rendering (real components, CSS 1:1)
   - Canvas for pixel-perfect editing (selections, handles, alignment)

2. **Why are pages auto-created from navigate events?**
   - More intuitive than pre-planning page structure
   - Navigation graph emerges naturally from interaction design

3. **Why store local coordinates instead of absolute screen coordinates?**
   - Preserves semantics when viewport changes
   - Dragable positions export as valid CSS

4. **Why MCP Server over internal AI layer?**
   - Clean separation of concerns
   - Works with Cursor/Claude Code without coupling
   - Open ecosystem (future: any MCP client)

5. **Why Event Sourcing over Git/CRDT?**
   - Simpler for non-collaborative use cases
   - Natural version history without overhead
   - Can add CRDT later if needed

---

## 13. CORE FILES TO START WITH

### Quick Start (30 min)
1. `design_docs/README.md` — Navigation hub
2. `design_docs/01-vision/first-principles.md` — Core thinking

### Product Understanding (1 hour)
3. `design_docs/02-product/overview.md` — What we're building
4. `design_docs/02-product/editor/README.md` — How editor works

### Schema Understanding (30 min)
5. `design_docs/03-tech/design-schema.md` — Schema types & concepts

### Implementation Entry Points
- **Building editor UI:** `03-tech/editor/06-frontend-layout.md`
- **Adding operations:** `03-tech/design-operations.md` + `03-tech/editor/02-operations-extensions.md`
- **Rendering:** `03-tech/design-engine.md` + `03-tech/editor/03-engine-rendering.md`
- **MCP integration:** `03-tech/design-mcp.md`

---

## 14. KEY TERMINOLOGY

| Term | Meaning |
|------|---------|
| **Schema** | Structured data representing complete UI (structure + styles + states + events + data bindings) |
| **Operation** | Atomic design action (add element, update style, bind data, etc.)—unified for human and AI |
| **Component** | Either atomic (div, button, img) or composite (template instance) |
| **Template / Asset** | Reusable Schema fragment (LoginForm, NavBar, etc.) with prop definitions |
| **State** | Context that changes how elements render (hover, pressed, loading, dark mode, etc.) |
| **Binding Expression** | Data reference like `{{ data.user.name }}`; evaluated in real-time |
| **Viewport** | Device dimension preset (iPhone 15, iPad, etc.) for responsive design |
| **Global State** | Project-level variables (theme: light/dark, role: admin/user, etc.) |
| **Domain State** | Business/component-level state (loading, success, error, custom states) |
| **Page** | Screen/Route in product; linked via navigate events |
| **Panorama** | All-states-at-once view (component or page level) |
| **MCP** | Model Context Protocol; bridge between AI tools and design system |

---

## 15. FIRST-PRINCIPLES Q&A (8 Core Questions)

The project answers these from first principles:

1. **Q1:** Canvas rendering (Canvas vs DOM)? → **A:** Dual-layer (DOM for content, Canvas for editing)
2. **Q2:** Cross-platform code generation? → **A:** Yes (CSS as universal language)
3. **Q3:** Screen/viewport selection? → **A:** Choose viewport = choose initial dimensions; can switch later
4. **Q4:** Element hierarchy? → **A:** Dual-layer (atomic + components)
5. **Q5:** AI operation layer? → **A:** MCP Server (separation of concerns, ecosystem openness)
6. **Q6:** Large Schema storage? → **A:** Event Sourcing + snapshots (no CRDT complexity)
7. **Q7:** Why not sync-wait persists?** → **A:** Keep UX responsive; async batch write + retry
8. **Q8:** Why local coordinates for drag?** → **A:** Preserve semantics across viewport changes

Detailed reasoning in `01-vision/first-principles.md`.

---

## Summary

DesignUI is a **Schema-first, Operation-centric design system** that unifies:
- **Design** (visual construction)
- **Development** (code generation from Schema)
- **AI** (operation-based automation via MCP)
- **Documentation** (requirement auto-generation)

All connected by a single source of truth: **the UI Schema protocol**.

The documentation is well-organized, first-principles-driven, and covers both product and technical perspectives. Start with vision docs to understand the "why," then dive into product/editor docs for "what," then tech docs for "how."

