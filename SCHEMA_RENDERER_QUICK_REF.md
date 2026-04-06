# SchemaRenderer Quick Reference

## TL;DR Answers to Your Questions

### Q1: How does `interactionPreview` affect node rendering?

**Answer:** It applies **CSS style and prop overrides** from a state, but does NOT modify `node.activeState` or affect child visibility.

```typescript
// Use it like this:
<SchemaRenderer
  screen={screen}
  interactionPreview={{ nodeId: 'button-1', state: 'pressed' }}
/>
// Effect: Button's styles from "pressed" state are applied (Layer 4)
// Side effects: NONE on activeState, children visibility, or data
```

**Key Code:**
```typescript
function resolveInteractionForNode(nodeId, interactionPreview) {
  if (!interactionPreview || interactionPreview.nodeId !== nodeId) return null;
  return interactionPreview.state; // e.g., 'pressed', 'hover', 'focus'
}

// Passed to BOTH:
resolveNodeProps(node, globalStates, interactionForNode)      // Layer 4
resolveNodeStyles(node, globalStates, interactionForNode)     // Layer 4
```

---

### Q2: Does `interactionPreview` affect child visibility?

**Answer:** **NO.** Child visibility is determined ONLY by `node.activeState` (persistent), never by `interactionPreview`.

```typescript
// Where child visibility is checked:
const activeStateDef = node.states?.find(s => s.name === node.activeState);
const cvMap = activeStateDef?.childrenVisibility;  // ← ONLY checks activeState

// NOT this:
// const cvMap = ??? // interactionPreview is NEVER checked here
```

**Result:** Hidden children are still rendered wrapped in `<GhostWrapper>` (opacity 0.2, badge label).

---

### Q3: 4-Layer Override System - Complete Order

**Styles & Props Resolution (same order for both):**

1. **Layer 1: Base** — `node.styles` / `node.props` / `node.visible`
2. **Layer 2: Global Bindings** — `domainStateBindings` + `environmentBindings` (if match)
3. **Layer 3: Business State** — `node.activeState` (if != 'default')
4. **Layer 4: Interaction Preview** — `interactionPreview` styles/props (if provided)

**Each layer spreads over previous:** `{...layer1, ...layer2, ...layer3, ...layer4}`

**Files:**
- `resolveNodeStyles()` → `features/design-engine/src/styles/resolveStyles.ts` (line 88)
- `resolveNodeProps()` → `features/design-engine/src/styles/resolveProps.ts` (line 20)

---

### Q4: How to render "as if node X has activeState Y"?

**Possible:** ✅ Partial (styles & props only)
**Not Possible:** ❌ Full tree with visibility changes

**Using `interactionPreview`:**
```typescript
// ✅ This works:
<SchemaRenderer
  interactionPreview={{ nodeId: 'form', state: 'submitted' }}
  screen={screen}
/>
// Result: Form renders with "submitted" state's styles & props

// ❌ This doesn't work for children visibility:
// You get the style changes, but childrenVisibility still uses node.activeState
// To see hidden children, you must change node.activeState (persistent)
```

**To preview full state including hidden children:**
1. Option A: Modify `node.activeState` directly (changes schema)
2. Option B: Add `previewActiveState` parameter to SchemaRenderer (not implemented)
3. Option C: Modify `resolveNodeProps` to check interaction preview for children (not implemented)

---

## Quick Code Reference

### Type Definition
```typescript
export type InteractionPreview = { nodeId: string; state: string };
```

### Main Function
```typescript
function SchemaRenderer({
  screen,
  assets = [],
  globalStates = {},
  dataContext,
  interactionPreview = null,  // ← HERE
  onNodeClick,
  onNodeHover,
  onNodeDoubleClick,
  // ... other props
}: SchemaRendererProps)
```

### Key Functions

**Resolve interaction for a node:**
```typescript
const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);
// Returns: null | 'pressed' | 'hover' | 'focus' | etc.
```

**Resolve props + visibility:**
```typescript
const { props: mergedProps, visible } = resolveNodeProps(
  node,
  globalStates,
  interactionForNode  // ← Layer 4
);
// Returns: { props: {...}, visible: boolean }
```

**Resolve styles:**
```typescript
const reactStyles = resolveNodeStyles(
  node,
  globalStates,
  interactionForNode,  // ← Layer 4
  dataContext
);
// Returns: React.CSSProperties
```

**Resolve data expressions:**
```typescript
const resolvedProps = resolvePropsExpressions(mergedProps, dataContext);
// Replaces {{data.x}} with values from dataContext
```

---

## File Structure

```
features/design-engine/src/
├── renderer/
│   ├── SchemaRenderer.tsx          ← Main component
│   │   ├── resolveInteractionForNode() (line 233)
│   │   ├── NodeRenderer() (line 243)
│   │   ├── GhostWrapper() (line 446)
│   │   └── getVisibleStateNames() (line 440)
│   └── ...
├── styles/
│   ├── resolveStyles.ts            ← 4-layer style resolution
│   │   ├── resolveNodeStyles() (line 88)
│   │   └── resolveStyles() (line 36)
│   ├── resolveProps.ts             ← 4-layer props + visibility
│   │   └── resolveNodeProps() (line 20)
│   └── resolveState.ts             ← Older, simpler version
├── renderers/
│   └── PrimitiveRenderer.tsx        ← Maps node.type → HTML element
└── data/
    └── resolveExpression.ts         ← {{data.x}} interpolation
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Thinking interactionPreview changes activeState
```typescript
// WRONG:
const node = { activeState: 'default', states: [...] };
renderWithInteractionPreview({ nodeId: node.id, state: 'pressed' });
console.log(node.activeState); // Still 'default'! Not 'pressed'
```

### ❌ Mistake 2: Expecting children visibility to change with interactionPreview
```typescript
// WRONG:
// Parent has activeState = 'default', and cvMap.childId = false
// So child is hidden (GhostWrapper)
renderWithInteractionPreview({ nodeId: parent.id, state: 'expanded' });
// Child is STILL hidden! interaction preview doesn't affect children visibility
```

### ❌ Mistake 3: Forgetting that Layer 4 only applies if nodeId matches
```typescript
// WRONG:
interactionPreview = { nodeId: 'button-1', state: 'pressed' };
// Other nodes won't get 'pressed' styles even if they also have 'pressed' state
// Only button-1 gets the preview
```

### ✅ Correct Usage
```typescript
// Apply 'pressed' state preview to button-1:
<SchemaRenderer
  screen={screen}
  interactionPreview={{ nodeId: 'button-1', state: 'pressed' }}
/>

// Remove preview (go back to activeState):
<SchemaRenderer
  screen={screen}
  interactionPreview={null}
/>

// Preview different node:
<SchemaRenderer
  screen={screen}
  interactionPreview={{ nodeId: 'input-1', state: 'focus' }}
/>
```

---

## Debugging Tips

### See all rendering layers:
```typescript
// Add logging to resolveNodeStyles:
console.log('Layer 1 (base):', node.styles);
console.log('Layer 2 (bindings):', merged);
console.log('Layer 3 (activeState):', node.activeState, activeState.styles);
console.log('Layer 4 (interaction):', interactionState, interactionStateObj.styles);
console.log('Final:', merged);
```

### Check if child is hidden:
```typescript
const activeStateDef = node.states?.find(s => s.name === node.activeState);
const cvMap = activeStateDef?.childrenVisibility;
console.log(`Child ${child.id} hidden?`, cvMap?.[child.id] === false);
```

### Check if node is visible:
```typescript
const { visible } = resolveNodeProps(node, globalStates, interactionForNode);
console.log(`Node visible?`, visible);
```

### Check what interaction was resolved:
```typescript
const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);
console.log('Interaction for node:', interactionForNode);
// null = no interaction preview for this node
// 'pressed' = has 'pressed' interaction
```

---

## Performance Considerations

### SchemaRenderer is optimized for:
- **Virtualization**: Nodes outside viewport are culled (not mounted)
- **Memoization**: Uses `useMemo` for data context, virtualize context
- **Spread merging**: Each layer uses `{...prev, ...layer}` for shallow copies
- **Data expressions**: Only resolved if string contains `{{`

### What can be slow:
- Deep trees with many nodes
- Many global state bindings per node
- Complex data expressions (`{{data.deeply.nested.path}}`)
- GhostWrapper rendering (when many children are hidden per state)

### Optimization flags:
```typescript
// Enable virtualization to skip rendering nodes outside viewport:
<SchemaRenderer
  virtualizeOutsideDeviceFrame={true}
  virtualizeViewportWidth={375}
  virtualizeViewportHeight={812}
  virtualizeMarginPx={240}
/>

// Enable editor canvas optimization:
<SchemaRenderer
  editorCanvasOptimize={true}  // Adds contain: layout to root
/>
```

---

## Related Concepts

### `childrenVisibility` ≠ `visible`
- **`visible`**: Boolean on node itself — if false, node not mounted
- **`childrenVisibility`**: Map on state def — controls which CHILDREN are hidden (but rendered as ghost)

### `activeState` ≠ `interactionPreview`
- **`activeState`**: Persistent, in schema, affects children visibility
- **`interactionPreview`**: Temporary, prop-based, styles/props only

### `node.states[activeState]` layers
- **Styles**: Overrides base styles when activeState != 'default'
- **Props**: Overrides base props when activeState != 'default'
- **ChildrenVisibility**: Only here! Determines which children are hidden

---

## State Name Mapping

When you pass `interactionPreview.state = 'active'`, renderer maps it to 'pressed':

```typescript
if (interactionState === 'active') {
  interactionStateObj = node.states?.find((s) => s.name === 'pressed');
}
```

This is because:
- Canvas UI shows "active" in the state dropdown
- Schema typically names the state "pressed" (matches CSS :active)

**Common state names:**
- `'default'` — base state
- `'hover'` — on mouse over
- `'pressed'` — when clicking (CSS :active)
- `'focus'` — when focused (CSS :focus)
- `'disabled'` — when disabled
- Custom states: `'submitted'`, `'loading'`, `'expanded'`, etc.

