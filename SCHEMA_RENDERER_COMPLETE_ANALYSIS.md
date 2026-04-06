# SchemaRenderer Deep Dive: interactionPreview & Rendering Pipeline

## Overview

SchemaRenderer is the core React renderer that converts a design-schema `Screen` (a tree of `ComponentNode`s) into a real React DOM tree. It implements a sophisticated 4-layer override system for both styles and props, with special handling for interaction previews, business state, global state bindings, and visibility logic.

---

## Question 1: How does `interactionPreview` affect node rendering?

### The Short Answer
**`interactionPreview` does NOT change `activeState`.** It is a **temporary, stateless overlay** that applies CSS style overrides from a specific state without modifying the node's persistent `activeState` property.

### The Implementation Flow

#### Step 1: Define InteractionPreview
```typescript
export type InteractionPreview = { nodeId: string; state: string };
```

Located in `SchemaRenderer.tsx` (line 17):
- `nodeId`: Which node should get the preview state
- `state`: The name of the state to preview (e.g., "hover", "pressed", "active")

#### Step 2: Resolve Interaction for Current Node
```typescript
function resolveInteractionForNode(
  nodeId: string,
  interactionPreview: InteractionPreview | null | undefined,
): string | null {
  if (!interactionPreview || interactionPreview.nodeId !== nodeId) return null;
  const s = interactionPreview.state;
  if (!s || s === 'default' || s === 'normal') return null;
  return s;
}
```

Located in `SchemaRenderer.tsx` (lines 233-241):
- Only returns a state if `interactionPreview` exists AND the `nodeId` matches AND the state is not "default"/"normal"
- Returns `null` otherwise (meaning no interaction preview for this node)

#### Step 3: Pass Through Rendering Pipeline
```typescript
const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);

// ... later ...

const { props: mergedProps, visible } = resolveNodeProps(nodeForProps, globalStates, interactionForNode);
const baseStyles = resolveNodeStyles(node, globalStates, interactionForNode, dataContext);
```

Located in `SchemaRenderer.tsx` (lines 262, 272, 283):
- The resolved interaction state is passed to **both** `resolveNodeProps()` and `resolveNodeStyles()`
- Note: It does NOT change `node.activeState` (the persistent property)

---

## Question 2: 4-Layer Override System - Complete Merge Order

### For **Styles** (resolveNodeStyles):

```
Layer 1: Base Styles
  ↓ (merged with spread operator)
Layer 2: Global State Bindings (domainStateBindings + environmentBindings)
  ↓ (if current globalState value matches binding.value, apply binding.styles)
Layer 3: Business State (node.activeState)
  ↓ (if activeState !== 'default', find state def and apply styles)
Layer 4: Interaction State (hover/active/focus preview)
  ↓ (if interactionPreview provided, find state def and apply styles)
Final: React.CSSProperties Conversion
```

**Code Location:** `features/design-engine/src/styles/resolveStyles.ts` (lines 88-146)

**Key Implementation Details:**

```typescript
export function resolveNodeStyles(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState?: string | null,
  dataContext?: DataContext,
): React.CSSProperties {
  // Layer 1: base styles
  let merged: CSSProperties = { ...node.styles };

  // Layer 2: domain state bindings
  if (node.domainStateBindings?.length) {
    for (const binding of node.domainStateBindings) {
      const currentValue = globalStates[binding.variableName];
      if (currentValue === binding.value && binding.styles) {
        merged = { ...merged, ...binding.styles };  // ← Spread merge!
      }
    }
  }

  // Layer 2b: environment state bindings (same logic)
  // ... similar code ...

  // Layer 3: business state (activeState override)
  const activeStateName = node.activeState ?? 'default';
  if (activeStateName !== 'default') {
    const activeState = node.states?.find((s) => s.name === activeStateName);
    if (activeState?.styles) {
      merged = { ...merged, ...activeState.styles };
    }
    if (activeState?.transition) {
      // Apply transition timing if defined
      const t = activeState.transition;
      const duration = t.duration ?? 200;
      const easing = t.easing ?? 'ease';
      const props = t.properties?.join(', ') ?? 'all';
      merged = { ...merged, transition: `${props} ${duration}ms ${easing}` };
    }
  }

  // Layer 4: interaction state (hover, active, focus, etc.)
  if (interactionState) {
    let interactionStateObj = node.states?.find((s) => s.name === interactionState);
    /** 
     * 画布「交互状态预览」下拉为 active，Schema 常命名为 pressed（与 CSS :active 一致）
     * Canvas shows "active" in dropdown, but schema typically names the state "pressed"
     */
    if (!interactionStateObj && interactionState === 'active') {
      interactionStateObj = node.states?.find((s) => s.name === 'pressed');
    }
    if (interactionStateObj?.styles) {
      merged = { ...merged, ...interactionStateObj.styles };
    }
  }

  // Convert to React.CSSProperties (numeric → px)
  return resolveStyles(merged, dataContext);
}
```

### For **Props** (resolveNodeProps):

**Identical merge order for props:**

```
Layer 1: Base Props (node.props)
  ↓
Layer 2: Global State Bindings
  ↓ (if binding.props exists, merge them)
Layer 3: Business State (node.activeState)
  ↓ (if activeState !== 'default' and activeState.props exists)
Layer 4: Interaction State
  ↓ (if interactionState provided and state.props exists)
Result: { props: Record<string, unknown>, visible: boolean }
```

**Code Location:** `features/design-engine/src/styles/resolveProps.ts` (lines 20-81)

**Key Points:**
- Props and visibility are resolved together in one function
- `visible` field is also resolved through the same 4 layers
- Default visibility: `node.visible !== false` (undefined = visible)
- Each binding layer can override visibility

---

## Question 3: Does interactionPreview affect child visibility?

### Short Answer
**NO, `interactionPreview` does NOT affect child visibility.**

Child visibility is determined **only** by `childrenVisibility` maps attached to **business states** (node.activeState), not by interaction previews.

### The Implementation

Located in `SchemaRenderer.tsx` (lines 367-402):

```typescript
const activeStateDef = node.states?.find((s) => s.name === node.activeState);
const cvMap = activeStateDef?.childrenVisibility;

children = node.children?.map((child) => {
  const hiddenInState = cvMap ? cvMap[child.id] === false : false;
  if (hiddenInState) {
    return (
      <GhostWrapper key={child.id} node={child} visibleStates={getVisibleStateNames(node, child.id)}>
        <NodeRenderer
          key={child.id}
          node={child}
          // ... props ...
        />
      </GhostWrapper>
    );
  }
  return (
    <NodeRenderer
      key={child.id}
      node={child}
      // ... props ...
    />
  );
});
```

**Critical Logic:**
1. `cvMap` is fetched from `activeStateDef.childrenVisibility` — **ONLY from node.activeState**, not from interactionPreview
2. If `cvMap[child.id] === false`, the child is wrapped in `<GhostWrapper>` (semi-visible, faded, with label)
3. The child is still rendered (mounted in DOM), but with opacity 0.2 and a visual indicator
4. `interactionPreview` is **completely ignored** for childrenVisibility logic

### What is GhostWrapper?

Located in `SchemaRenderer.tsx` (lines 446-488):

```typescript
function GhostWrapper({
  node,
  visibleStates,
  children,
}: {
  node: ComponentNode;
  visibleStates: string[];
  children: React.ReactNode;
}) {
  const label = visibleStates.length > 0 ? visibleStates.join(', ') : '(无)';
  return (
    <div
      data-ghost-node={node.id}
      style={{
        opacity: 0.2,
        pointerEvents: 'auto',
        position: 'relative',
        outline: '1px dashed rgba(99,102,241,0.4)',
        outlineOffset: '-1px',
      }}
    >
      {children}
      <div
        style={{
          // ... badge styling ...
          backgroundColor: 'rgba(99,102,241,0.85)',
          color: '#fff',
          fontSize: '9px',
          lineHeight: '14px',
          padding: '0 4px',
          borderBottomLeftRadius: '3px',
          pointerEvents: 'none',
          zIndex: 1,
          whiteSpace: 'nowrap',
        }}
      >
        👁 {label}
      </div>
    </div>
  );
}
```

**Purpose:**
- Renders children at 50% opacity (not hidden, but grayed out)
- Shows a small badge listing which states make this child visible
- Allows designer to see the full tree hierarchy even when some children are hidden in current state
- Indicates the child will become visible if you switch to one of the listed states

### Visibility Resolution Logic

Located in `SchemaRenderer.tsx` (lines 440-444):

```typescript
function getVisibleStateNames(parent: ComponentNode, childId: string): string[] {
  return (parent.states ?? [])
    .filter((s) => s.childrenVisibility?.[childId] !== false)
    .map((s) => s.name);
}
```

This function:
1. Loops through all states defined on the parent node
2. Keeps only states where the child is NOT hidden (`childrenVisibility[childId] !== false`)
3. Returns list of state names where child is visible
4. Used to populate the GhostWrapper badge label

---

## Question 4: How does the renderer resolve which nodes to show/hide based on state?

### Multi-Layer Visibility Resolution

Visibility is determined through **multiple independent layers**, and a node is hidden if **ANY** layer says it should be hidden:

#### Layer 1: Explicit node.visible
```typescript
let visible = node.visible !== false;
```
- Base visibility flag
- Default: `true` (undefined means visible)
- This prevents old/broken data from hiding entire subtrees

#### Layer 2: Global/Domain State Bindings
```typescript
if (node.domainStateBindings?.length) {
  for (const binding of node.domainStateBindings) {
    const currentValue = globalStates[binding.variableName];
    if (currentValue === binding.value) {
      if (binding.visible !== undefined) {
        visible = binding.visible;
      }
    }
  }
}

// Same for environmentBindings
```

- If a binding matches current global state value, its `visible` flag overrides

#### Layer 3: Business State Visibility
```typescript
const activeStateName = node.activeState;
// NOTE: resolveNodeProps doesn't check activeState.visible
// That's intentional — activeState only has childrenVisibility, not node-level visible
```

- Business states only affect **children visibility** (via childrenVisibility), not node-level visibility
- This is intentional: a node's own visibility can't depend on activeState, only child visibility can

#### Layer 4: Node Props visibilityWhen
```typescript
// NOT in resolveNodeProps function
// This is a separate schema field that would be checked elsewhere if implemented
```

- Schema has a `visibilityWhen` field but it's not actively implemented in current rendering
- Comment in code: "visibilityWhen: optional global-state equality gate (hides if mismatch)"
- Designed for future conditional visibility based on global state

### Complete Visibility Flow in NodeRenderer

Located in `SchemaRenderer.tsx` (lines 243-280):

```typescript
function NodeRenderer({
  node: rawNode,
  rootNodeId,
  assets,
  globalStates,
  interactionPreview = null,
  isListItem = false,
  onNodeClick,
  onNodeHover,
  onNodeDoubleClick,
}: NodeRendererProps) {
  const dataContext = useDataContext();
  const vctx = useSchemaVirtualize();

  // Step 1: Resolve component instances
  const node = isComponentInstanceType(rawNode.type)
    ? resolveComponentInstance(rawNode, assets)
    : rawNode;

  // Step 2: Resolve interaction preview (for style/prop overrides)
  const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);

  // Step 3: Check virtualization culling
  if (shouldVirtualizeCullNode(vctx, { nodeId: node.id, rootNodeId })) {
    return null;
  }

  // Step 4: Resolve props + visibility through 4-layer merge
  const nodeForProps: ComponentNode = hasExpression(node.props?.__listData)
    ? { ...node, props: { ...node.props, __listData: undefined } }
    : node;
  const { props: mergedProps, visible } = resolveNodeProps(nodeForProps, globalStates, interactionForNode);

  // Step 5: Skip if explicitly hidden
  if (visible === false) {
    return null;  // ← Node not mounted in DOM at all
  }

  // Step 6: Resolve styles
  const baseStyles = resolveNodeStyles(node, globalStates, interactionForNode, dataContext);

  // ... rest of rendering ...
}
```

**Key Insight:**
- If `visible === false` after all 4 layers are resolved, the node returns `null` from React
- The node is not mounted in DOM, no `data-node-id`, no selection rect possible
- BUT: If a parent's childrenVisibility hides a child, child is still rendered (wrapped in GhostWrapper)

---

## Answer to Question 4: "Is there a way to render as if node X has activeState Y?"

### Current Capability: YES, but ONLY for Visual Preview

**Using `interactionPreview`:**

```typescript
schemaRenderer.interactionPreview = {
  nodeId: 'button-01',
  state: 'pressed'  // or 'hover', 'active', 'focus', etc.
};
```

This will:
1. ✅ Apply style overrides from the "pressed" state
2. ✅ Apply prop overrides from the "pressed" state
3. ❌ NOT change the node's persistent `activeState`
4. ❌ NOT affect child visibility (childrenVisibility still uses persistent activeState)

**Code Evidence:**
```typescript
const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);
// ... interactionForNode is passed to resolveNodeProps and resolveNodeStyles
// ... but node.activeState is NEVER modified
// ... and childrenVisibility is ALWAYS read from node.activeState
```

### Limitation: Cannot Preview childrenVisibility Changes

**You CANNOT tell SchemaRenderer**: "Show me the full tree as if node X has activeState Y, including which children become hidden/visible."

**Why:**
- `childrenVisibility` is tightly bound to `node.activeState`
- Only the persistent `node.activeState` is checked, never interaction preview
- To preview full state-driven visibility changes, you'd need to:
  1. Temporarily modify `node.activeState` and rebuild the schema
  2. OR: Add a second `previewActiveState` parameter to SchemaRenderer
  3. OR: Modify `resolveNodeProps` to check interaction preview for hidden children (current code doesn't)

### Current Usage Pattern

In the editor, `interactionPreview` is used for:
- Showing hover/focus/active CSS styling in the canvas
- NOT for previewing full state-driven visibility changes
- Designers preview child visibility by clicking to change `activeState` persistently

---

## Complete Rendering Pipeline Summary

```
SchemaRenderer
  ↓
DataContextProvider (wraps data from active datasets)
  ↓
SchemaVirtualizeContext (virtualization config)
  ↓
NodeRenderer (recursive, for each node in tree)
  ├─ Step 1: Resolve component instances
  ├─ Step 2: Resolve interaction preview state
  ├─ Step 3: Check virtualization culling
  ├─ Step 4: Resolve props + visibility (4-layer merge)
  │   ├─ Layer 1: base props + node.visible
  │   ├─ Layer 2: domain/environment state bindings
  │   ├─ Layer 3: business state (activeState)
  │   └─ Layer 4: interaction preview
  ├─ Step 5: Skip if visible === false
  ├─ Step 6: Resolve styles (4-layer merge, same layers)
  ├─ Step 7: Resolve data expressions in props
  ├─ Step 8: Render children
  │   ├─ If __listData: wrap in ListRenderer (repeat per item)
  │   └─ Else: iterate children, check childrenVisibility
  │       ├─ If hidden in activeState: wrap in GhostWrapper (0.2 opacity)
  │       └─ Else: render normally
  └─ Step 9: Wrap in PrimitiveRenderer + event handlers
       └─ PrimitiveRenderer maps node.type to HTML element (div, button, img, etc.)
```

---

## Key Files & Line References

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `SchemaRenderer` | SchemaRenderer.tsx | 68-159 | Main component, sets up data/virtualize contexts |
| `NodeRenderer` | SchemaRenderer.tsx | 243-423 | Recursive node rendering, 4-layer resolution |
| `resolveInteractionForNode` | SchemaRenderer.tsx | 233-241 | Extracts state from interactionPreview |
| `GhostWrapper` | SchemaRenderer.tsx | 446-488 | Visual wrapper for state-hidden children |
| `getVisibleStateNames` | SchemaRenderer.tsx | 440-444 | Lists states where child is visible |
| `resolveNodeStyles` | resolveStyles.ts | 88-146 | 4-layer style merge + React conversion |
| `resolveNodeProps` | resolveProps.ts | 20-81 | 4-layer props + visibility merge |
| `resolveStyles` | resolveStyles.ts | 36-75 | Numeric → px conversion |
| `PrimitiveRenderer` | PrimitiveRenderer.tsx | 25-211 | Maps node.type to HTML element |

---

## Interaction Preview vs Active State: Side-by-Side

| Aspect | interactionPreview | node.activeState |
|--------|-------------------|-----------------|
| Persistence | Temporary, passed as prop | Permanent, in node schema |
| Applied To | Style & prop layers | Style, props, & childrenVisibility |
| Affects Styles | YES (Layer 4) | YES (Layer 3) |
| Affects Props | YES (Layer 4) | YES (Layer 3) |
| Affects Child Visibility | NO | YES (via childrenVisibility) |
| Changed By | Parent (canvas preview) | User or state machine |
| Use Case | Hover/focus visual preview | Business logic state |

