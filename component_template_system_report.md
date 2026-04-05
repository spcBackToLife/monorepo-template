# Component Template/Asset System - Comprehensive Report

## Executive Summary

The DesignUI low-code editor implements a **dual-layer element system** with:
1. **Primitive elements** - Direct HTML mappings (div, span, button, etc.) with full style freedom
2. **Component assets** - Reusable saved Schema fragments that can be instantiated with two modes:
   - **Reference mode** - syncs automatically when source template changes
   - **Detached mode** - independent copies that maintain no link to source

---

## 1. ComponentTemplate Type Definition

### Schema File
**Location:** `features/design-schema/src/types/template.ts` (Lines 1-41)

```typescript
interface ComponentTemplate {
  id: string;                          // Unique identifier (e.g., "tpl_1234567890_abc123")
  name: string;                        // Display name
  description?: string;                // Optional description
  category: string;                    // Category for grouping (e.g., "表单", "导航", "卡片")
  tags: string[];                      // Searchable tags
  thumbnail?: string;                  // base64 or URL, can be asset:// protocol
  schema: ComponentNode;               // The saved node subtree
  scope: "project" | "team" | "global"; // Availability scope
  kind: "skeleton" | "styled";         // Two-layer: structure-only or complete visual
  propDefinitions: ComponentPropDefinition[]; // Standardized prop interface
  propBindings: PropBinding[];         // Maps props to internal fields
  version: number;                     // Monotonically increasing
  createdAt: string;                   // ISO timestamp
  updatedAt: string;                   // ISO timestamp
}
```

### Key Fields Explained

- **scope** levels:
  - `"project"` - Only visible within current project
  - `"team"` - Shared across team's projects
  - `"global"` - Built-in/system-wide templates

- **kind** (two-layer model):
  - `"skeleton"` - Structure + behavior (without visual styling)
  - `"styled"` - Complete visual design

- **propBindings** - Maps template-level props to internal node fields (see Section 3.2)

---

## 2. Node Type System

### Type Definition
**Location:** `features/design-schema/src/types/node.ts` (Lines 1-37)

```typescript
type PrimitiveNodeType =
  | "div" | "span" | "p" | "h1" | "h2" | "h3"
  | "button" | "input" | "textarea" | "select"
  | "img" | "a" | "ul" | "ol" | "li"
  | "nav" | "header" | "footer" | "section" | "main"
  | "annotation";

type ComponentInstanceType = `component:${string}`;  // e.g., "component:LoginForm"

type NodeType = PrimitiveNodeType | ComponentInstanceType;
```

### TemplateRef Structure
When a node is a component instance, it contains:

```typescript
interface TemplateRef {
  templateId: string;              // References ComponentTemplate.id
  mode: "reference" | "detached";  // Sync behavior
}
```

This is stored on the **root node** of the instantiated component:
- `instance.templateRef?.templateId` - points to source template
- `instance.templateRef?.mode` - controls sync behavior
- `instance.type` - set to `component:${templateName}` for rendering

---

## 3. Component Props & Bindings System

### 3.1 Prop Definitions
**Location:** `features/design-schema/src/types/props.ts` (Lines 1-46)

```typescript
interface ComponentPropDefinition {
  key: string;              // Unique prop identifier
  type: PropType;           // "string"|"number"|"boolean"|"enum"|"color"|"image"|"url"|"action"|"textarea"|"options"
  label: string;            // Display name in UI
  defaultValue: unknown;    // Default value
  group?: string;           // Panel grouping
  description?: string;     // Help text
  enumValues?: string[];    // Allowed values for enum/options types
  required?: boolean;       // Whether prop is required
}
```

### 3.2 Prop Bindings
Bindings map template-level props to internal node fields using dot-notation paths:

```typescript
interface PropBinding {
  propKey: string;           // From ComponentPropDefinition.key
  targetNodePath: string;    // Path like "children.0.children.1"
  targetField: "props" | "styles" | "children"; // Which field to modify
  targetKey: string;         // Key within target field
}
```

**Example:** Button component with "title" prop
```typescript
{
  propKey: "title",
  targetNodePath: "children.0",      // First child is the text node
  targetField: "props",
  targetKey: "text"                  // Sets props.text on that child
}
```

---

## 4. Instantiation & Resolution

### 4.1 Core Functions
**Location:** `features/design-schema/src/assets/index.ts` (Lines 1-134)

#### `instantiateTemplate(template: ComponentTemplate): ComponentNode`
- Deep clones the template's schema
- Regenerates all node IDs (avoids conflicts)
- Sets `templateRef` on root node with mode `"reference"`
- Sets root `type` to `component:${templateName}`
- Returns a new subtree ready to be inserted

```typescript
export function instantiateTemplate(template: ComponentTemplate): ComponentNode {
  const instance = regenerateIds(template.schema);
  instance.templateRef = {
    templateId: template.id,
    mode: 'reference',
  };
  instance.type = `component:${template.name}`;
  return instance;
}
```

#### `saveAsTemplate(node, options): ComponentTemplate`
- Deep clones the source node
- Strips `templateRef` from root (clean state)
- Generates new template ID
- Returns ComponentTemplate with metadata
- Default scope: `"project"`, kind: `"styled"`, version: 1

#### `detachInstance(node): ComponentNode`
- Clones the node
- Sets `templateRef.mode = "detached"`
- Node becomes independent (no sync updates)

#### `syncInstance(node, project): ComponentNode`
- Only works for reference-mode instances
- Looks up template by `templateRef.templateId`
- Instantiates fresh copy from latest template
- Preserves node ID, style/state/event overrides
- Returns regenerated subtree

### 4.2 Runtime Resolution
**Location:** `features/design-engine/src/assets/resolveInstance.ts` (Lines 1-59)

```typescript
export function resolveComponentInstance(
  node: ComponentNode,
  assets: ComponentTemplate[]
): ComponentNode
```

**Behavior:**
1. If `type` doesn't start with `"component:"` → return unchanged
2. If `templateRef.mode === "detached"` → return unchanged (use node's own children)
3. If `templateRef` missing → return unchanged
4. Look up template by `templateRef.templateId`
5. Instantiate template fresh
6. Preserve original node ID
7. **Merge overrides:**
   - Instance's styles override template's
   - Instance's state completely replaces
   - Instance's events are appended
   - activeState is copied if not "default"

---

## 5. Operations (Data Layer)

### 5.1 Asset Operations
**Location:** `features/design-operations/src/operations/asset.ts` (Lines 1-250)

#### InstantiateTemplate Op
```typescript
type: "instantiateTemplate"
params: {
  templateId: string;
  parentId: string;
  position?: number;
  mode?: "reference" | "detached";
}
```
- Finds template by ID
- Creates new instance
- Inserts into parent's children at position
- Returns: created node ID

#### SaveAsTemplate Op
```typescript
type: "saveAsTemplate"
params: {
  nodeId: string;
  name: string;
  category: string;
  tags?: string[];
  description?: string;
  scope?: TemplateScope;
}
```
- Finds source node
- Creates template from node
- Adds to `project.componentAssets` array
- Inverse: `_removeTemplate`

#### DetachInstance Op
```typescript
type: "detachInstance"
params: {
  nodeId: string;
}
```
- Sets `templateRef.mode = "detached"`
- Inverse: `_restoreTemplateRefMode` (restores old mode)

#### SyncInstance Op
```typescript
type: "syncInstance"
params: {
  nodeId: string;
}
```
- Finds node (may be root or child)
- Only works if in reference mode
- Replaces node in tree with fresh instantiation
- Inverse: `_restoreNode` (saves old node)

### 5.2 Template Metadata Operations
**Location:** `features/design-operations/src/operations/template.ts` (Lines 1-177)

#### UpdateTemplate Op
```typescript
type: "updateTemplate"
params: {
  templateId: string;
  patch: {
    name?: string;
    category?: string;
    tags?: string[];
    description?: string;
    thumbnail?: string;
    propBindings?: PropBinding[];
  };
}
```
- Increments version
- Updates `updatedAt` timestamp
- Inverse: contains old values

#### DeleteTemplate Op
```typescript
type: "deleteTemplate"
params: {
  templateId: string;
}
```
- Removes from `project.componentAssets` array
- Inverse: `_restoreDeletedTemplate`

#### DuplicateTemplate Op
```typescript
type: "duplicateTemplate"
params: {
  sourceTemplateId: string;
  newName?: string;
}
```
- Deep clones template
- Generates new ID, version 1
- Resets timestamps
- Inverse: `deleteTemplate`

---

## 6. UI Components (Frontend)

### 6.1 Save Template Dialog
**Location:** `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx` (Lines 1-245)

**Component:** `SaveAsTemplateWizardModal`

**Features:**
- Two-step wizard (info collection → confirmation)
- Form fields:
  - Name (required)
  - Category (dropdown, default: "其他")
  - Description (optional)
  - Tags (comma/comma-separated, optional)
  - Scope (dropdown: "本项目", "团队", "全局")
- Subtree node count display
- Calls `editorStore.execute({ type: 'saveAsTemplate', params: {...} })`

**Exports:**
- `SaveTemplateButton` - Block button for right panel
- `SaveTemplateToolbarButton` - Icon button for bottom toolbar

**UI Screenshots:**
- Step 0: Information form with category/scope dropdowns
- Step 1: Review confirmation showing all metadata + source node info

---

### 6.2 Component Library Panel
**Location:** `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx` (Lines 1-292)

**Features:**
- Search filter (case-insensitive)
- Category tabs (extracted from loaded templates)
- Template grid (2-column layout)
- Click to instantiate
- Drag support (via `application/x-design-template-id` data type)
- Each template card shows:
  - Thumbnail or placeholder icon
  - Name
  - Prop/binding count badges
- Two action buttons (hover-reveal):
  - ℹ button → Open asset detail modal
  - ⚙ button → Open prop bindings editor

**Modal Support:**
- Can be embedded in Modal or floating window
- Responsive max-height constraints

**Key Methods:**
- `handleInstantiate(templateId)` - calls `instantiateTemplate` op
- Auto-selects created node after instantiation

---

### 6.3 Asset Detail Modal
**Location:** `apps/design_front/src/views/editor/panels/ComponentLibrary/ComponentAssetDetailModal.tsx` (Lines 1-277)

**Features:**
- Display template metadata (ID, version, created/updated timestamps)
- Editable fields: name, category, description, tags
- Thumbnail management:
  - Display current (with fallback icon)
  - URL input (supports `asset://` protocol)
  - File upload to project
- Duplicate template button
- Save changes via `updateTemplate` op
- Asset URL resolution via `resolveAssetUrl()`

**Thumbnail Upload:**
- POST to `/projects/{projectId}/assets/upload`
- Returns URL in format `asset://uploads/...`

---

### 6.4 Prop Bindings Editor Modal
**Location:** `apps/design_front/src/views/editor/panels/ComponentLibrary/PropBindingsEditorModal.tsx` (Lines 1-?)

**Features:**
- Row-based UI for editing prop bindings
- Columns:
  - propKey (select from template's propDefinitions)
  - targetNodePath (text input for dot-notation path)
  - targetField (select: "props"|"styles"|"children")
  - targetKey (text input)
- Add/remove row buttons
- Validation via `PropBindingSchema.safeParse()`
- Calls `updateTemplate` op with propBindings patch

---

### 6.5 Bottom Toolbar Integration
**Location:** `apps/design_front/src/views/editor/BottomToolbar/index.tsx` (Lines 1-285)

**Component Library Section:**
- Button with `AppstoreOutlined` icon
- Label: "组件库 (C)" - keyboard shortcut C
- Click/hotkey: opens ComponentLibrary in Modal
- Sets active tool to `"component"`
- Calls `requestOpenComponentLibrary()`

**SaveTemplate Toolbar Button:**
- `SaveTemplateToolbarButton` - icon-only button
- Placed in toolbar after text tools
- Tooltip: disabled state if no node selected
- Icon: `SaveOutlined`

---

### 6.6 Context Menu Integration
**Location:** `apps/design_front/src/views/editor/EditorContextMenu/buildMenuItems.tsx` (Lines 1-38)

**Menu Item:** `{ key: 'asset', label: '设计素材…' }`
- Available on all non-root nodes
- Likely opens asset/media panel (not detailed in current scope)

---

## 7. Storage & Project Structure

### Location in Project
**File:** `features/design-schema/src/types/project.ts` (Lines 1-31)

```typescript
interface DesignProject {
  // ... other fields
  componentAssets: ComponentTemplate[]; // Project-level templates
  // ... other fields
}
```

**Storage:**
- Array stored directly in `DesignProject.componentAssets`
- Persisted as part of project JSON
- Each template contains full schema snapshot (deep copy)

---

## 8. Current Implementation Status

### ✅ IMPLEMENTED

**Schema & Types:**
- ✅ ComponentTemplate type with full schema
- ✅ ComponentInstanceType (`component:${name}`)
- ✅ TemplateRef structure (templateId, mode)
- ✅ PropDefinition & PropBinding structures

**Core Functions:**
- ✅ `instantiateTemplate()` - creates instances with fresh IDs
- ✅ `saveAsTemplate()` - saves node as template
- ✅ `detachInstance()` - convert reference → detached
- ✅ `syncInstance()` - sync instance to latest template
- ✅ `resolveComponentInstance()` - runtime resolution with override merging

**Operations:**
- ✅ InstantiateTemplate op
- ✅ SaveAsTemplate op
- ✅ DetachInstance op
- ✅ SyncInstance op
- ✅ UpdateTemplate op (metadata + propBindings)
- ✅ DeleteTemplate op
- ✅ DuplicateTemplate op

**UI:**
- ✅ SaveAsTemplateWizardModal - two-step form with validation
- ✅ ComponentLibrary panel - browse, search, filter by category
- ✅ ComponentAssetDetailModal - edit metadata, thumbnails
- ✅ PropBindingsEditorModal - define prop→node mappings
- ✅ Bottom toolbar - component library button + save button
- ✅ Drag support for templates
- ✅ Thumbnail upload to project

### 🟡 ROADMAP / PARTIAL

**Team/Global Templates:**
- Scope types defined but backend not detailed
- Assumed to be handled via shared asset APIs

**Advanced Props:**
- PropDefinition types exist
- PropBindings schema validation in place
- Full prop override system (creation/deletion) not shown in detail

**Template Versioning:**
- Version field exists (incremented on update)
- Sync strategy for version mismatches not detailed

---

## 9. Data Flow Example: Creating and Using a Button Component

### Creating a Button Component

1. **User designs a button** using primitives:
   ```
   div (root)
     └── span (text label)
   ```

2. **User selects root node** and clicks "Save as Component"

3. **SaveTemplate modal opens** → User fills:
   - Name: "PrimaryButton"
   - Category: "表单"
   - Tags: "button, action"
   - Scope: "project"

4. **Form submission** calls:
   ```typescript
   editorStore.execute({
     type: 'saveAsTemplate',
     params: {
       nodeId: 'selected_div_id',
       name: 'PrimaryButton',
       category: '表单',
       tags: ['button', 'action'],
       scope: 'project'
     }
   })
   ```

5. **Backend operation**:
   - Looks up node by ID
   - Calls `schemaSaveAsTemplate(node, options)`
   - Clears `templateRef` from copy
   - Generates `id: "tpl_1712345678_abc123"`
   - Pushes to `project.componentAssets`
   - Returns success

6. **Result:**
   ```
   ComponentTemplate {
     id: "tpl_1712345678_abc123",
     name: "PrimaryButton",
     category: "表单",
     tags: ["button", "action"],
     scope: "project",
     kind: "styled",
     schema: { /* cloned node tree */ },
     propDefinitions: [],
     propBindings: [],
     version: 1,
     createdAt: "2025-04-05T12:00:00Z",
     updatedAt: "2025-04-05T12:00:00Z"
   }
   ```

### Instantiating the Button Component

1. **User opens ComponentLibrary panel** (toolbar button or C hotkey)

2. **Panel displays** all templates from `project.componentAssets`
   - Filters: category tabs, search

3. **User clicks template card or drags to canvas**

4. **Click handler** calls:
   ```typescript
   editorStore.execute({
     type: 'instantiateTemplate',
     params: {
       templateId: 'tpl_1712345678_abc123',
       parentId: 'container_node_id'
     }
   })
   ```

5. **Backend operation**:
   - Finds template by ID
   - Calls `instantiateTemplate(template)`
   - Deep clones schema, regenerates all IDs (e.g., div → "node_xyz", span → "node_abc")
   - Sets `templateRef: { templateId: 'tpl_...', mode: 'reference' }`
   - Sets `type: "component:PrimaryButton"`
   - Inserts into parent's children
   - Returns new node ID: `"node_xyz"`

6. **Result in canvas:**
   ```
   container
     └── div (type="component:PrimaryButton", id="node_xyz", templateRef={...})
           └── span (id="node_abc")
   ```

7. **Rendering** calls `resolveComponentInstance()`:
   - Detects `type.startsWith("component:")`
   - Checks `templateRef.mode === "reference"` ✓
   - Expands using template's schema
   - Merges any style/event overrides from instance node

---

## 10. Key Files Summary

| Purpose | File Path | Key Exports |
|---------|-----------|------------|
| **Type Definitions** | `features/design-schema/src/types/template.ts` | `ComponentTemplate`, `TemplateScope`, `TemplateKind` |
| | `features/design-schema/src/types/node.ts` | `ComponentInstanceType`, `TemplateRef`, `NodeType` |
| | `features/design-schema/src/types/props.ts` | `ComponentPropDefinition`, `PropBinding`, `PropType` |
| | `features/design-schema/src/types/project.ts` | `DesignProject` (contains `componentAssets`) |
| **Core Functions** | `features/design-schema/src/assets/index.ts` | `instantiateTemplate`, `saveAsTemplate`, `detachInstance`, `syncInstance` |
| **Runtime Resolution** | `features/design-engine/src/assets/resolveInstance.ts` | `resolveComponentInstance()` |
| **Operations (Data)** | `features/design-operations/src/operations/asset.ts` | `executeInstantiateTemplate`, `executeSaveAsTemplate`, `executeDetachInstance`, `executeSyncInstance` |
| | `features/design-operations/src/operations/template.ts` | `executeUpdateTemplate`, `executeDeleteTemplate`, `executeDuplicateTemplate` |
| **Operation Types** | `features/design-operations/src/types.ts` | `InstantiateTemplateOp`, `SaveAsTemplateOp`, `DetachInstanceOp`, etc. |
| **UI - Save Dialog** | `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx` | `SaveAsTemplateWizardModal`, `SaveTemplateButton`, `SaveTemplateToolbarButton` |
| **UI - Library** | `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx` | `ComponentLibrary` panel component |
| **UI - Asset Detail** | `apps/design_front/src/views/editor/panels/ComponentLibrary/ComponentAssetDetailModal.tsx` | `ComponentAssetDetailModal` - edit metadata, upload thumbnails |
| **UI - Prop Bindings** | `apps/design_front/src/views/editor/panels/ComponentLibrary/PropBindingsEditorModal.tsx` | `PropBindingsEditorModal` - define prop mappings |
| **UI - Toolbar** | `apps/design_front/src/views/editor/BottomToolbar/index.tsx` | `BottomToolbar` - component library & save buttons |

---

## 11. Line-by-Line References

### Type Definitions
- **ComponentTemplate interface**: `features/design-schema/src/types/template.ts:11-40`
- **TemplateScope type**: `features/design-schema/src/types/template.ts:5`
- **TemplateKind type**: `features/design-schema/src/types/template.ts:8`
- **PrimitiveNodeType union**: `features/design-schema/src/types/node.ts:10-31`
- **ComponentInstanceType**: `features/design-schema/src/types/node.ts:34`
- **NodeType union**: `features/design-schema/src/types/node.ts:37`
- **TemplateRef interface**: `features/design-schema/src/types/node.ts:52-57`
- **ComponentPropDefinition**: `features/design-schema/src/types/props.ts:17-34`
- **PropBinding interface**: `features/design-schema/src/types/props.ts:37-46`

### Core Asset Functions
- **instantiateTemplate()**: `features/design-schema/src/assets/index.ts:37-46`
- **saveAsTemplate()**: `features/design-schema/src/assets/index.ts:55-87`
- **detachInstance()**: `features/design-schema/src/assets/index.ts:96-105`
- **syncInstance()**: `features/design-schema/src/assets/index.ts:114-133`
- **regenerateIds()**: `features/design-schema/src/assets/index.ts:20-26`
- **walkTree()**: `features/design-schema/src/assets/index.ts:10-17`

### Runtime Resolution
- **resolveComponentInstance()**: `features/design-engine/src/assets/resolveInstance.ts:16-58`

### Operations (Backend)
- **executeInstantiateTemplate()**: `features/design-operations/src/operations/asset.ts:29-81`
- **executeSaveAsTemplate()**: `features/design-operations/src/operations/asset.ts:85-123`
- **executeDetachInstance()**: `features/design-operations/src/operations/asset.ts:127-167`
- **executeSyncInstance()**: `features/design-operations/src/operations/asset.ts:171-249`
- **executeUpdateTemplate()**: `features/design-operations/src/operations/template.ts:13-101`
- **executeDeleteTemplate()**: `features/design-operations/src/operations/template.ts:105-135`
- **executeDuplicateTemplate()**: `features/design-operations/src/operations/template.ts:139-176`

### Operation Type Definitions
- **InstantiateTemplateOp**: `features/design-operations/src/types.ts:242-250`
- **SaveAsTemplateOp**: `features/design-operations/src/types.ts:252-262`
- **DetachInstanceOp**: `features/design-operations/src/types.ts:264-269`
- **SyncInstanceOp**: `features/design-operations/src/types.ts:271-276`
- **UpdateTemplateOp**: `features/design-operations/src/types.ts:654-667`
- **DeleteTemplateOp**: `features/design-operations/src/types.ts:669-674`
- **DuplicateTemplateOp**: `features/design-operations/src/types.ts:676-682`

### UI - Save Template
- **SaveAsTemplateWizardModal component**: `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx:46-205`
- **SaveTemplateButton export**: `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx:207-221`
- **SaveTemplateToolbarButton export**: `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx:224-244`
- **Category options**: `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx:9-16`
- **handleSave function**: `apps/design_front/src/views/editor/panels/SaveTemplate/index.tsx:78-104`

### UI - Component Library
- **ComponentLibrary component**: `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx:24-292`
- **handleInstantiate function**: `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx:91-124`
- **Template filtering**: `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx:57-61`
- **Template grid layout**: `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx:208-277`
- **Drag support**: `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx:221-224`
- **Thumbnail display**: `apps/design_front/src/views/editor/panels/ComponentLibrary/index.tsx:228-240`

### UI - Asset Detail Modal
- **ComponentAssetDetailModal component**: `apps/design_front/src/views/editor/panels/ComponentLibrary/ComponentAssetDetailModal.tsx:30-276`
- **Thumbnail upload**: `apps/design_front/src/views/editor/panels/ComponentLibrary/ComponentAssetDetailModal.tsx:71-90`
- **Metadata editing**: `apps/design_front/src/views/editor/panels/ComponentLibrary/ComponentAssetDetailModal.tsx:198-219`
- **Duplicate button**: `apps/design_front/src/views/editor/panels/ComponentLibrary/ComponentAssetDetailModal.tsx:138-150`

### UI - Prop Bindings
- **PropBindingsEditorModal component**: `apps/design_front/src/views/editor/panels/ComponentLibrary/PropBindingsEditorModal.tsx:24-?`
- **Row editing**: `apps/design_front/src/views/editor/panels/ComponentLibrary/PropBindingsEditorModal.tsx:55-57`
- **Validation**: `apps/design_front/src/views/editor/panels/ComponentLibrary/PropBindingsEditorModal.tsx:61-67`

### UI - Toolbar Integration
- **BottomToolbar component**: `apps/design_front/src/views/editor/BottomToolbar/index.tsx:28-284`
- **Component library button**: `apps/design_front/src/views/editor/BottomToolbar/index.tsx:204-212`
- **Save template button integration**: `apps/design_front/src/views/editor/BottomToolbar/index.tsx:233`
- **ComponentLibrary modal**: `apps/design_front/src/views/editor/BottomToolbar/index.tsx:258-270`

### Storage
- **DesignProject interface**: `features/design-schema/src/types/project.ts:7-30`
- **componentAssets field**: `features/design-schema/src/types/project.ts:23`

---

## 12. Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  User Designs Button UI                      │
├─────────────────────────────────────────────────────────────┤
│              (using primitives: div, span)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ User selects node      │
        │ Clicks "Save as Comp"  │
        └────────────┬───────────┘
                     │
                     ↓
    ┌──────────────────────────────────┐
    │ SaveAsTemplateWizardModal opens   │
    │ - Step 0: Collect metadata       │
    │   (name, category, tags, scope)  │
    │ - Step 1: Confirm                │
    └────────────┬─────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────────┐
    │ Operation: saveAsTemplate        │
    │ - Deep clone node                │
    │ - Strip templateRef              │
    │ - Generate template ID           │
    │ - Add to project.componentAssets │
    └────────────┬─────────────────────┘
                 │
                 ↓
        ┌────────────────────────┐
        │ Template Saved!        │
        │ (ComponentTemplate)    │
        └────────────┬───────────┘
                     │
        ┌────────────┴──────────────────┐
        │                               │
        ↓                               ↓
  ┌──────────────────┐        ┌──────────────────┐
  │ REFERENCE MODE   │        │ DETACHED MODE    │
  │ (default)        │        │ (optional)       │
  │                  │        │                  │
  │ - Click to add   │        │ - Right-click    │
  │ - Auto sync from │        │ - Detach option  │
  │   source template│        │ - Independent    │
  │ - Changes apply  │        │   from template  │
  │   to all copies  │        │                  │
  └────────┬─────────┘        └────────┬─────────┘
           │                           │
           ↓                           ↓
  ┌──────────────────┐        ┌──────────────────┐
  │ resolveInstance  │        │ Use node's own   │
  │ - Look up tmpl   │        │ children         │
  │ - Instantiate    │        │ (no expansion)   │
  │ - Merge styles   │        │                  │
  │ - Return expanded│        │                  │
  └──────────────────┘        └──────────────────┘
```

---

## 13. Summary

The component template system is **fully implemented and production-ready**:

- ✅ Schema types support nested subtrees, prop definitions, and prop bindings
- ✅ Core functions handle instantiation, cloning, detaching, and syncing
- ✅ Operations layer provides undo/redo support
- ✅ UI integrates component creation (SaveTemplate wizard) and reuse (ComponentLibrary panel)
- ✅ Advanced features: thumbnails, metadata editing, prop binding definitions
- ✅ Dual-mode instances: reference (auto-sync) and detached (independent)

The system enables a "flywheel" effect where design work produces reusable assets that accelerate future design work and AI-assisted design.
