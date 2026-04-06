# Login Page Schema Analysis: Custom States and Visibility Control

## Executive Summary

Your question targets the **critical gap** in the panorama rendering system: why do all states look identical when you have custom states like `login-success` and `login-failure` defined?

The issue is **architectural and multi-layered**:

1. **ComponentState Definition** (`login-success`, `login-failure`) includes `childrenVisibility` mappings
2. **BUT** the panorama system currently **does NOT apply these visibility overrides** when rendering different states
3. The SchemaRenderer renders the root node's baseStyles, but doesn't handle `state.childrenVisibility` transformations
4. Domain state bindings work differently and are not being evaluated during panorama rendering

---

## Part 1: TypeScript Schema Structure for States

### 1.1 ComponentState Type Definition
**File**: `features/design-schema/src/types/state.ts`

```typescript
interface ComponentState {
  name: string;                              // "login-success", "login-failure"
  styles: Partial<CSSProperties>;            // Visual style overrides for THIS state
  props?: Record<string, unknown>;           // Prop overrides (e.g., disabled=true)
  transition?: { duration, easing, ... };    // CSS transition when entering state
  childrenVisibility?: Record<string, boolean>;  // ← KEY: Per-child visibility mappings
  disabledEvents?: string[];                 // Events to disable in this state
}
```

**Critical Field**: `childrenVisibility`
- Maps child node ID → boolean (visible or hidden)
- When Root enters "login-success" state, descendant nodes can be hidden/shown per their ID
- Example for login-success state:
  ```
  {
    "child-error-toast-id": false,    // Hide error toast
    "child-success-toast-id": true,   // Show success toast
  }
  ```

### 1.2 ComponentNode Structure
**File**: `features/design-schema/src/types/node.ts`

```typescript
interface ComponentNode {
  id: string;
  name?: string;
  type: NodeType;                    // "div" | "button" | etc
  styles: CSSProperties;             // Base/default styles
  children?: ComponentNode[];        // Child nodes
  states: ComponentState[];          // All states this node can be in
  activeState: string;               // "default" | "login-success" etc
  events: ComponentEvent[];
  props: Record<string, unknown>;
  locked: boolean;
  visible: boolean;
  
  // Domain state system (different from component states)
  domainStates?: DomainStateVariable[];
  domainStateBindings?: DomainStateBinding[];
  environmentBindings?: EnvironmentStateBinding[];
}
```

### 1.3 Domain State vs Component States

**Component States** (what we're discussing):
- Defined on individual nodes
- Examples: hover, pressed, disabled, login-success, login-failure
- Can override styles, props, and child visibility
- Applied via `node.activeState` or panorama state preview
- Live in: `node.states[]`

**Domain States** (different system):
- Defined on container/screen level
- Variables like "orderStatus", "paymentPhase"
- Affects multiple descendants
- Lives in: `screen.domainStates[]` or `node.domainStates[]`
- Bindings live in: `node.domainStateBindings[]`

---

## Part 2: Login Page Example Schema

### 2.1 Hypothetical Root Node Structure (Login Page)

```json
{
  "id": "root-node-xyz",
  "name": "Root",
  "type": "div",
  "activeState": "default",
  "styles": {
    "display": "flex",
    "flexDirection": "column",
    "width": "100%",
    "minHeight": "100%",
    "backgroundColor": "#ffffff"
  },
  "children": [
    {
      "id": "form-container",
      "name": "Form Container",
      "type": "div",
      "children": [
        { "id": "username-input", "name": "Username", "type": "input" },
        { "id": "password-input", "name": "Password", "type": "input" },
        { "id": "login-button", "name": "Login Button", "type": "button" }
      ]
    },
    {
      "id": "error-toast",
      "name": "Error Toast",
      "type": "div",
      "visible": true,
      "styles": { "display": "none" }  // Hidden by default
    },
    {
      "id": "success-toast",
      "name": "Success Toast",
      "type": "div",
      "visible": true,
      "styles": { "display": "none" }  // Hidden by default
    }
  ],
  
  // ===== CRITICAL PART: Custom States =====
  "states": [
    {
      "name": "default",
      "styles": {},
      "childrenVisibility": {
        "error-toast": false,
        "success-toast": false,
        "form-container": true
      }
    },
    {
      "name": "login-success",
      "styles": { "backgroundColor": "#f0fdf4" },  // Light green background
      "childrenVisibility": {
        "error-toast": false,      // Hide error toast
        "success-toast": true,     // ← Show success toast
        "form-container": false    // ← Optionally hide form
      },
      "transition": { duration: 300 }
    },
    {
      "name": "login-failure",
      "styles": { "backgroundColor": "#fef2f2" },  // Light red background
      "childrenVisibility": {
        "error-toast": true,       // ← Show error toast
        "success-toast": false,    // Hide success toast
        "form-container": true     // Keep form visible for retry
      },
      "transition": { duration: 300 }
    }
  ]
}
```

---

## Part 3: Why Panorama Shows All States Looking Identical

### 3.1 The Panorama Rendering Flow
**File**: `apps/design_front/src/views/editor/Panorama/useCombinations.ts`

```typescript
// useCombinations.ts creates state combinations:
// - For Root node: ["default", "login-success", "login-failure"]
// - Each becomes a PanoramaCombination with:
//   - id: "interaction-login-success"
//   - label: "登陆成功"
//   - interactionPreview: { nodeId: "root-node-xyz", state: "login-success" }
```

**File**: `apps/design_front/src/views/editor/Panorama/PanoramaCell.tsx`

Then PanoramaCell renders each combination... BUT:

```typescript
// Pseudocode of what SHOULD happen:
function renderStateCell(combination) {
  const targetState = findState(node, combination.state);
  
  // ① Apply state-specific styles
  applyStyles(targetState.styles);
  
  // ② ⚠️ MISSING: Apply state's childrenVisibility mappings
  // For each child:
  //   if (targetState.childrenVisibility[child.id] !== undefined) {
  //     child.visible = targetState.childrenVisibility[child.id];
  //   }
  
  // ③ Render children with visibility applied
  renderChildren(node.children);
}
```

### 3.2 Where the Bug Likely Is

**Current Flow (Incomplete)**:
1. PanoramaCell receives `{ state: "login-success" }`
2. Finds the ComponentState object for "login-success"
3. Applies `state.styles` to root node styling
4. Renders children...
5. ❌ But does NOT read or apply `state.childrenVisibility`

**Result**: All panorama cells show the same child structure, just with different background colors or text!

### 3.3 Code Location of the Issue

**PanoramaCell.tsx** (likely around line 50-100):
```typescript
// ❌ This is NOT happening:
// - Read targetState.childrenVisibility
// - Filter/hide children based on it
// - Pass visibility context to SchemaRenderer
```

---

## Part 4: The Five-Layer State System (Context)

Your schema also supports a more complex state system with domain states:

### 4.1 Domain State Variable (Screen Level)
```typescript
interface DomainStateVariable {
  id: string;
  name: string;           // "loginPhase"
  label: string;
  values: [
    { value: "idle", label: "等待输入" },
    { value: "loading", label: "提交中" },
    { value: "success", label: "成功" },
    { value: "failure", label: "失败" }
  ];
  defaultValue: "idle";
  currentPreviewValue?: "success";
}
```

### 4.2 Domain State Binding (Child Level)
```typescript
interface DomainStateBinding {
  variableName: "loginPhase";
  value: "success";                 // Activates when loginPhase === "success"
  styles?: { display: "flex" };
  visible?: true;
  childrenVisibility?: { /* ... */ };
}
```

**Difference from ComponentState**:
- Component states: "default", "hover", "login-success" on ONE node
- Domain states: "loginPhase" variable scoped to screen/container, affects multiple descendants
- Evaluates at runtime based on actual data values
- In panorama: need to preview different values

---

## Part 5: What Needs to Be Fixed in Panorama Rendering

### 5.1 Checklist of Missing Implementations

**For Component State Visibility**:
- [ ] When rendering Root in "login-success" state:
  - [ ] Find the "login-success" state definition
  - [ ] Read its `childrenVisibility` mapping
  - [ ] For each child: `child.effectiveVisibility = childrenVisibility[child.id] ?? child.visible`
  - [ ] Don't render children where `effectiveVisibility === false`

**For Domain State Visibility**:
- [ ] When rendering screen with domain state "loginPhase" = "success":
  - [ ] For each descendant with domainStateBindings for "loginPhase":
    - [ ] Filter bindings where binding.value === "success"
    - [ ] Merge binding.childrenVisibility into node visibility
    - [ ] Hide/show siblings based on merged visibility

**In SchemaRenderer**:
- [ ] Accept visibility context from parent
- [ ] Apply visibility to each child before rendering
- [ ] Respect both node.visible AND state-applied visibility

### 5.2 Example: What Fixed Rendering Would Show

**Panorama Cell 1: "default" state**
```
Root (white background)
├─ Form Container (visible)
│  ├─ Username Input
│  ├─ Password Input
│  └─ Login Button
├─ Error Toast (hidden) ← childrenVisibility["error-toast"] = false
└─ Success Toast (hidden) ← childrenVisibility["success-toast"] = false
```

**Panorama Cell 2: "login-success" state**
```
Root (light green background)
├─ Form Container (hidden) ← childrenVisibility["form-container"] = false
├─ Error Toast (hidden)
└─ Success Toast (visible) ← childrenVisibility["success-toast"] = true
    "✓ Login successful! Redirecting..."
```

**Panorama Cell 3: "login-failure" state**
```
Root (light red background)
├─ Form Container (visible) ← childrenVisibility["form-container"] = true
│  ├─ Username Input
│  ├─ Password Input
│  └─ Login Button
├─ Error Toast (visible) ← childrenVisibility["error-toast"] = true
│  "✗ Invalid username or password"
└─ Success Toast (hidden)
```

---

## Part 6: MCP Tool Interaction Flow

If you wanted to inspect this via MCP (assuming project "pk2" existed):

### 6.1 Get Project Info
```bash
mcp__my-design-mcp__get_project_info(projectId="pk2")
→ Returns: { id, name, platform, screens[], componentAssets[] }
```

### 6.2 List Screens
```bash
mcp__my-design-mcp__list_screens(projectId="pk2")
→ Returns: [
  { id: "screen-123", name: "Login Page" },
  ...
]
```

### 6.3 Get Login Screen Schema
```bash
mcp__my-design-mcp__get_screen_schema(projectId="pk2", screenId="screen-123")
→ Returns complete Screen object with:
  - rootNode: { id, states: [...], children: [...], domainStates: [...] }
  - domainStates: [] (screen-level variables)
```

### 6.4 Navigate to Root States
```
rootNode.states = [
  { name: "default", childrenVisibility: { ... } },
  { name: "login-success", childrenVisibility: { ... } },
  { name: "login-failure", childrenVisibility: { ... } }
]
```

---

## Part 7: Architecture Overview

```
PanoramaPage
  ├─ usePanoramaCombinations()
  │  └─ For Root node: creates combinations for ["default", "login-success", "login-failure"]
  │
  ├─ PanoramaCell × 3
  │  ├─ combination = { state: "login-success", ... }
  │  ├─ Finds state definition from root.states[]
  │  ├─ ⚠️ Currently only applies: state.styles
  │  ├─ ❌ NOT applying: state.childrenVisibility
  │  │
  │  └─ SchemaRenderer
  │     ├─ Renders root node with merged styles
  │     └─ ❌ NOT filtering children visibility
  │
  └─ Result: All cells show same child tree, different root styling only
```

---

## Summary: Root Cause

| Aspect | Expected | Actual | Impact |
|--------|----------|--------|--------|
| Component state read | ✅ Found in node.states[] | ✅ ✓ | States exist in schema |
| State styles applied | ✅ Merge with root styles | ✅ ✓ | Background colors change |
| State visibility mapped | ✅ Read state.childrenVisibility | ❌ ✗ | **Bug #1** |
| Child visibility filtered | ✅ Hide/show per mapping | ❌ ✗ | **Bug #2** |
| Domain state bindings | ✅ Should evaluate value | ❓ Unclear | **Maybe Bug #3** |
| Rendered panorama result | ✅ All states look different | ❌ ✗ | "Why all identical?" |

**To fix**: Modify `PanoramaCell.tsx` to read and apply `state.childrenVisibility` before rendering children.

