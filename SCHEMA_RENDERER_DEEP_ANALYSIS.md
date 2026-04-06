# SchemaRenderer State Rendering Deep Analysis

## Executive Summary

The SchemaRenderer uses a **4-layer style/visibility resolution system** to apply state changes. The key insight is:

1. **`interactionPreview` is NOT about node.activeState** — it's a temporary overlay for visualization in the editor
2. **`node.activeState` is the schema-persisted business state** — controls the "business logic" appearance
3. **domainStateBindings/environmentBindings layer** handles conditional visibility and styling
4. **activeState from node.states** controls child visibility (childrenVisibility map)
5. **PreviewRenderer differs significantly** — it maintains runtime state overrides separate from schema

The **Panorama cells all look the same** because:
- They're rendering with `globalStates` changes (which only affect domain/environment bindings)
- `interactionPreview` only affects the selected node in editor, not all panorama cells
- Child visibility is driven by `node.activeState` which doesn't change between panorama cells

---

## Part 1: How SchemaRenderer Accepts and Uses Props

### `interactionPreview` Prop

```typescript
export type InteractionPreview = { nodeId: string; state: string };

export interface SchemaRendererProps {
  // 对选中节点临时预览 hover/active 等（与 setActiveState 独立）
  interactionPreview?: InteractionPreview | null;
  ...
}
```

**Location:** `features/design-engine/src/renderer/SchemaRenderer.tsx:233-241`

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

**Key points:**
- Returns `null` if the nodeId doesn't match
- Returns `null` if state is 'default' or 'normal'
- Otherwise returns the state name (e.g., 'hover', 'pressed', 'login-success')

### `globalStates` Prop

```typescript
export interface SchemaRendererProps {
  // Runtime global state values (variableName → current value)
  globalStates?: Record<string, string>;
  ...
}
```

**Location:** `features/design-engine/src/renderer/SchemaRenderer.tsx:19-53`

This is passed through to:
1. `resolveNodeProps()` for matching domainStateBindings
2. `resolveNodeStyles()` for matching domainStateBindings and environmentBindings
3. Both functions check if `binding.variableName` matches a key in globalStates

---

## Part 2: 4-Layer Style/Visibility Resolution

### resolveNodeStyles() - 4-Layer Merge

**Location:** `features/design-engine/src/styles/resolveStyles.ts:88-146`

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
        merged = { ...merged, ...binding.styles };
      }
    }
  }

  // Layer 2b: environment state bindings
  if (node.environmentBindings?.length) {
    // Same logic as domain state bindings
  }

  // Layer 3: business state (activeState override)
  const activeStateName = node.activeState ?? 'default';
  if (activeStateName !== 'default') {
    const activeState = node.states?.find((s) => s.name === activeStateName);
    if (activeState?.styles) {
      merged = { ...merged, ...activeState.styles };
    }
  }

  // Layer 4: interaction state (hover, active, focus, etc.)
  if (interactionState) {
    let interactionStateObj = node.states?.find((s) => s.name === interactionState);
    // Handle 'active' → 'pressed' mapping
    if (!interactionStateObj && interactionState === 'active') {
      interactionStateObj = node.states?.find((s) => s.name === 'pressed');
    }
    if (interactionStateObj?.styles) {
      merged = { ...merged, ...interactionStateObj.styles };
    }
  }

  return resolveStyles(merged, dataContext);
}
```

### resolveNodeProps() - Same 4-Layer Logic

**Location:** `features/design-engine/src/styles/resolveProps.ts:20-81`

Same layers for props and visibility:

```typescript
export function resolveNodeProps(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState?: string | null,
): ResolvedProps {
  // Layer 1: base props + visible
  let mergedProps: Record<string, unknown> = { ...node.props };
  let visible = node.visible !== false;

  // Layer 2: domain state bindings
  if (node.domainStateBindings?.length) {
    for (const binding of node.domainStateBindings) {
      const currentValue = globalStates[binding.variableName];
      if (currentValue === binding.value) {
        if (binding.props) {
          mergedProps = { ...mergedProps, ...binding.props };
        }
        if (binding.visible !== undefined) {
          visible = binding.visible;
        }
      }
    }
  }

  // Layer 2b: environment state bindings
  // Layer 3: business state (activeState)
  // Layer 4: interaction state
  // ...
}
```

**Visibility defaults:**
- `undefined` is treated as visible (safety for old data)
- Only `false` hides the node
- Any layer can hide the node

---

## Part 3: How activeState Affects Rendering

### activeState vs interactionState

**Location:** `features/design-engine/src/renderer/SchemaRenderer.tsx:262-283`

```typescript
const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);

// ...

const { props: mergedProps, visible } = resolveNodeProps(nodeForProps, globalStates, interactionForNode);

// ...

const baseStyles = resolveNodeStyles(node, globalStates, interactionForNode, dataContext);
```

**Key distinction:**
- `node.activeState` is SCHEMA-PERSISTED (written to data)
- `interactionForNode` is EDITOR TEMPORARY (from interactionPreview)
- Both are passed to `resolveNodeStyles()` as separate parameters
- `activeState` is applied in Layer 3
- `interactionState` is applied in Layer 4 (overrides Layer 3)

### Child Visibility Based on activeState

**Location:** `features/design-engine/src/renderer/SchemaRenderer.tsx:367-402`

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
          {...}
        />
      </GhostWrapper>
    );
  }
  return (
    <NodeRenderer key={child.id} node={child} {...} />
  );
});
```

**How it works:**
1. Look up `node.states` to find the state definition matching `node.activeState`
2. That state definition may have a `childrenVisibility` map
3. For each child, check if `childrenVisibility[child.id] === false`
4. If hidden, wrap in `GhostWrapper` (semi-transparent, labeled, still renders but appears disabled)
5. If visible, render normally

**GhostWrapper** shows which states make this child visible:
```typescript
function getVisibleStateNames(parent: ComponentNode, childId: string): string[] {
  return (parent.states ?? [])
    .filter((s) => s.childrenVisibility?.[childId] !== false)
    .map((s) => s.name);
}
```

---

## Part 4: How Editor Uses interactionPreview

### Canvas Usage

**Location:** `apps/design_front/src/views/editor/Canvas/index.tsx:118-131, 623-632`

```typescript
const schemaLayoutMap = useMemo(() => {
  // ...
  return buildSchemaLayoutMap(screen, {
    // ...
    interactionPreview:
      editorStore.selectedNodeIds.length === 1 &&
      editorStore.previewInteractionState &&
      editorStore.previewInteractionState !== 'normal'
        ? {
            nodeId: editorStore.selectedNodeIds[0]!,
            state: editorStore.previewInteractionState,
          }
        : null,
  });
}, [/* deps */]);

// Later when rendering:
<SchemaRenderer
  screen={screen}
  assets={editorStore.project?.componentAssets}
  globalStates={editorStore.currentGlobalStates}
  interactionPreview={
    editorStore.selectedNodeIds.length === 1 &&
    editorStore.previewInteractionState &&
    editorStore.previewInteractionState !== 'normal'
      ? {
          nodeId: editorStore.selectedNodeIds[0]!,
          state: editorStore.previewInteractionState,
        }
      : null
  }
  // ...
/>
```

**Conditions:**
1. Must have exactly ONE selected node
2. `previewInteractionState` must be set (from interaction card dropdown)
3. Must NOT be 'normal'

### StatePreviewThumbnail Usage

**Location:** `apps/design_front/src/views/editor/panels/RightPanel/StatePreviewThumbnail.tsx:69-74`

```typescript
<SchemaRenderer
  screen={screen}
  assets={assets}
  globalStates={globalStates}
  interactionPreview={{ nodeId, state: stateName }}
/>
```

Always passes an `interactionPreview` to force the given state.

### PanoramaCell Usage

**Location:** `apps/design_front/src/views/editor/Panorama/PanoramaCell.tsx:81-86`

```typescript
<SchemaRenderer
  screen={screen}
  assets={assets}
  globalStates={globalStates}
  interactionPreview={interactionPreview}
/>
```

Receives it as a prop (may be null for page panorama cells).

---

## Part 5: Panorama Combination Logic

### usePanoramaCombinations Hook

**Location:** `apps/design_front/src/views/editor/Panorama/useCombinations.ts`

```typescript
export interface PanoramaCombination {
  id: string;
  label: string;
  category: 'interaction' | 'custom';
  globalStates: Record<string, string>;  // ← Changes for page panorama
  interactionPreview?: { nodeId: string; state: string };  // ← For component panorama
}
```

#### Component Panorama (when targetNodeId is set)

```typescript
if (targetNodeId) {
  const node = findNode(screen.rootNode, targetNodeId);
  if (!node) return [];

  const result: PanoramaCombination[] = [];

  // Interaction states: default, hover, pressed, focus, disabled
  for (const state of INTERACTION_STATES) {
    result.push({
      id: `interaction-${state}`,
      label: STATE_LABELS[state] ?? state,
      category: 'interaction',
      globalStates: { ...currentGlobalStates },  // ← SAME globalStates
      interactionPreview: { nodeId: targetNodeId, state },  // ← DIFFERENT state
    });
  }

  // Custom business states (not in INTERACTION_STATES)
  const customStates = (node.states ?? []).filter(
    (s) => s.name !== 'default' && !INTERACTION_STATES.includes(s.name),
  );
  for (const s of customStates) {
    result.push({
      id: `custom-${s.name}`,
      label: s.name,
      category: 'custom',
      globalStates: { ...currentGlobalStates },
      interactionPreview: { nodeId: targetNodeId, state: s.name },
    });
  }
  return result;
}
```

#### Page Panorama (cartesian product of domain states)

```typescript
// Full cartesian product of all domain state variables
const valueArrays = domainStates.map((ds) =>
  ds.values.map((v) => ({
    varName: ds.name,
    value: v.value,
    label: v.label || v.value,
  })),
);

const allCombinations = cartesianProduct(valueArrays);
const capped = allCombinations.slice(0, MAX_COMBINATIONS);  // MAX = 50

return capped.map((combo, i) => ({
  id: `page-${i}`,
  label: combo.map((c) => c.label).join(' · '),
  category: 'custom' as const,
  globalStates: {
    ...currentGlobalStates,
    ...Object.fromEntries(combo.map((c) => [c.varName, c.value])),  // ← DIFFERENT
  },
  // No interactionPreview for page panorama
}));
```

---

## Part 6: PreviewRenderer Differences

### Key Difference: Runtime State Overrides

**Location:** `features/design-engine/src/preview/PreviewRenderer.tsx:421-449`

```typescript
function PreviewNodeRenderer({
  node: rawNode,
  rootNodeId,
  assets,
  globalStates,
  onNavigate,
  previewHiddenIds,
  runtimeNodeStates,  // ← Runtime state overrides
  isListItem = false,
}: PreviewNodeRendererProps) {
  const dataContext = useDataContext();

  const node = isComponentInstanceType(rawNode.type)
    ? resolveComponentInstance(rawNode, assets)
    : rawNode;

  if (node.type === 'annotation') {
    return null;
  }

  if (previewHiddenIds.has(node.id)) {
    return null;
  }

  // 运行时 activeState 覆盖（来自 setState action）
  const runtimeState = runtimeNodeStates?.[node.id];
  const effectiveNode = runtimeState && runtimeState !== node.activeState
    ? { ...node, activeState: runtimeState }
    : node;

  // Then resolveNodeProps uses effectiveNode.activeState!
  const { props: mergedProps, visible } = resolveNodeProps(nodeForProps, globalStates);
  const baseStyles = resolveNodeStyles(effectiveNode, globalStates, undefined, dataContext);
```

**Differences from SchemaRenderer:**

1. **No `interactionPreview` parameter** — PreviewRenderer doesn't use it
2. **Runtime state overrides via `runtimeNodeStates`** — from `setState` actions
3. **Actually modifies node.activeState** — for rendering (not schema-safe, temporary only)
4. **Uses `CSSPseudoInjector`** — to handle hover/focus with real CSS pseudo-classes
5. **`runtimeNodeStates` is maintained in state** — survives until user leaves preview or navigates
6. **No interaction layer** — doesn't apply a temporary "preview" state, it overrides activeState

### PreviewRenderer State Management

**Location:** `features/design-engine/src/preview/PreviewRenderer.tsx:118-126`

```typescript
const [runtimeGlobals, setRuntimeGlobals] = useState<Record<string, string>>(() => ({
  ...globalStates,
}));
/** 预览内节点的运行时 activeState 覆盖（setState action 修改） */
const [runtimeNodeStates, setRuntimeNodeStates] = useState<Record<string, string>>({});
```

These are separate from schema and allow setState to actually change displayed states.

---

## Part 7: Why Panorama Cells Look The Same

### Root Cause Analysis

Given the component panorama code:

```typescript
for (const state of INTERACTION_STATES) {
  result.push({
    globalStates: { ...currentGlobalStates },  // ← SAME
    interactionPreview: { nodeId, state },      // ← DIFFERENT
  });
}
```

Each cell has:
- Same `globalStates` → No domain/environment binding differences
- Different `interactionPreview.state` → Should show different interaction states

**They should NOT all look the same.** If they do, check:

1. **Is `interactionPreview` being used at all?**
   - Verify it's passed to SchemaRenderer
   - Add debug logging in `resolveInteractionForNode()`

2. **Does the target node have state definitions?**
   - Check `node.states` array includes 'hover', 'pressed', etc.
   - Check if those states have any `.styles` defined
   - If empty, no visual difference will appear

3. **Are the state styles actually different?**
   - State.styles may be identical to base styles
   - Or only override non-visual properties (props like text content)

4. **Is the node using CSS pseudo-classes instead?**
   - If true, the visual changes happen via CSS :hover
   - But SchemaRenderer doesn't use CSS pseudo-classes
   - PreviewRenderer does (via CSSPseudoInjector)

5. **Are child visibility changes expected?**
   - `childrenVisibility` only applies to business states
   - Not to interaction states (hover, pressed, focus, disabled)
   - Those map names are hardcoded in `INTERACTION_STATES`

### Solution: Check the Data

For each panorama cell, verify:
1. `screen.rootNode` has the targetNode with state definitions
2. Each state definition includes `.styles` with visual changes
3. That `interactionPreview` is actually reaching SchemaRenderer
4. That `resolveInteractionForNode` returns the non-null state name

---

## Part 8: Child Visibility Mechanism

### childrenVisibility Map

Only applies to **custom business states**, not interaction states.

**Location:** `features/design-engine/src/renderer/SchemaRenderer.tsx:367-371`

```typescript
const activeStateDef = node.states?.find((s) => s.name === node.activeState);
const cvMap = activeStateDef?.childrenVisibility;

// Later:
const hiddenInState = cvMap ? cvMap[child.id] === false : false;
```

**Key points:**
- Only read from `node.activeState`, not from `interactionForNode`
- Only children of nodes with custom states can have conditional visibility
- Each state definition has an optional `childrenVisibility: Record<childId, boolean>`
- `childrenVisibility[childId] === false` means hidden in that state
- Any other value (true, undefined) means visible

### GhostWrapper: Semi-Visible Hidden Components

When a child is hidden in the current activeState:

```typescript
<GhostWrapper key={child.id} node={child} visibleStates={getVisibleStateNames(node, child.id)}>
  <NodeRenderer {...} />
</GhostWrapper>
```

The GhostWrapper:
- Makes children 20% opacity
- Adds dashed outline
- Shows which states make it visible (label)
- Still renders in DOM (for selection/measurement)
- But is visually disabled

---

## Part 9: Domain State Bindings

### How Bindings Work

**Location:** `features/design-engine/src/styles/resolveStyles.ts:97-115`

```typescript
// Layer 2: domain state bindings
if (node.domainStateBindings?.length) {
  for (const binding of node.domainStateBindings) {
    const currentValue = globalStates[binding.variableName];
    if (currentValue === binding.value && binding.styles) {
      merged = { ...merged, ...binding.styles };
    }
  }
}

// Layer 2b: environment state bindings
if (node.environmentBindings?.length) {
  for (const binding of node.environmentBindings) {
    const currentValue = globalStates[binding.variableName];
    if (currentValue === binding.value && binding.styles) {
      merged = { ...merged, ...binding.styles };
    }
  }
}
```

**Binding structure:**
```typescript
{
  variableName: "theme",      // Key in globalStates
  value: "dark",              // Value to match
  styles: { backgroundColor: "#000" },  // Applied if match
  props?: { ... },
  visible?: boolean,
}
```

**For page panorama cells to look different:**
- You need domain states defined on the screen
- Each cell changes `globalStates[variableName]`
- Nodes must have domainStateBindings matching those variables
- Those bindings must have different `.styles`

---

## Part 10: Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ SchemaRenderer Input Props                                   │
├─────────────────────────────────────────────────────────────┤
│ • screen: Screen                                             │
│ • assets: ComponentTemplate[]                               │
│ • globalStates: Record<string, string>  ← Domain/Env states │
│ • interactionPreview?: { nodeId, state }  ← Temp editor     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   NodeRenderer()
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
   resolveNodeProps()              resolveNodeStyles()
        ↓                                       ↓
   Layer 1: base props            Layer 1: base styles
   Layer 2: domain/env bindings   Layer 2: domain/env bindings
   Layer 3: activeState props     Layer 3: activeState styles
   Layer 4: interactionState      Layer 4: interactionState styles
        ↓                                       ↓
   mergedProps, visible              reactStyles
        ↓                                       ↓
   resolveDataExpressions()      
        ↓                                
   resolvedProps (for PrimitiveRenderer)
        ↓
   PrimitiveRenderer()
        ↓
   Actual HTML elements with applied styles
```

---

## Part 11: Critical Implementation Details

### Interaction State → Pressed Mapping

**Location:** `features/design-engine/src/styles/resolveStyles.ts:134-142`

```typescript
if (interactionState) {
  let interactionStateObj = node.states?.find((s) => s.name === interactionState);
  // 画布「交互状态预览」下拉为 active，Schema 常命名为 pressed（与 CSS :active 一致）
  if (!interactionStateObj && interactionState === 'active') {
    interactionStateObj = node.states?.find((s) => s.name === 'pressed');
  }
```

**Meaning:** If the state name is 'active' but there's no state definition for it, try 'pressed' instead. This handles the UI dropdown saying "按下 (active)" but the schema using "pressed".

### CSS Pseudo-Classes in PreviewRenderer

**Location:** `features/design-engine/src/preview/CSSPseudoInjector.ts`

```typescript
const pseudoMap: Record<string, string> = {
  hover: ':hover',
  pressed: ':active',
  active: ':active',
  focus: ':focus',
  'focus-visible': ':focus-visible',
};

for (const state of node.states ?? []) {
  const pseudo = pseudoMap[state.name];
  if (!pseudo) continue;
  const cssProperties = this.stylesToCSS(state.styles);
  if (!cssProperties) continue;
  rules.push(
    `[data-node-id="${node.id}"]${pseudo} { ${cssProperties} }`,
  );
}
```

**Result:** In preview mode, hovering a button with a 'hover' state automatically applies the hover styles via CSS.

---

## Summary Table

| Feature | SchemaRenderer | PreviewRenderer |
|---------|---|---|
| **Purpose** | Edit mode rendering on canvas | Interactive preview mode |
| **interactionPreview** | ✓ Uses it (Layer 4 override) | ✗ Doesn't use it |
| **runtimeNodeStates** | ✗ Doesn't use | ✓ Maintains setState overrides |
| **node.activeState** | ✓ Applied in Layer 3 | ✓ Can be overridden by runtime state |
| **Interaction styles** | Via `interactionPreview` prop | Via CSS pseudo-classes |
| **Event handlers** | onClick, onNodeHover (editor) | Full event execution engine |
| **CSS Pseudo-Injection** | ✗ No | ✓ CSSPseudoInjector |
| **Data binding** | Yes, via DataContext | Yes, via DataContext |
| **Domain state bindings** | Yes, Layer 2 | Yes, Layer 2 |
| **List rendering** | Yes, with style overrides | Yes, with style overrides |
| **Child visibility** | Via childrenVisibility + GhostWrapper | Via effective visibility check |

---

## Key Takeaways

1. **interactionPreview is TEMPORARY** — Only for editor canvas preview, not persisted
2. **activeState is SCHEMA** — Persisted in data, drives child visibility and Layer 3 styles
3. **globalStates affect multiple layers** — Domain/env bindings use them for conditional styling
4. **4-layer merge is consistent** — Same logic in both resolveStyles and resolveProps
5. **PreviewRenderer is different** — Uses CSS pseudo-classes and runtime state overrides
6. **Panorama cells differ by interactionPreview OR globalStates** — Not both at the same time
7. **Ghost wrapper shows state visibility** — Hidden children still render but are semi-transparent and labeled
