# SchemaRenderer Complete Documentation Bundle

This bundle contains three comprehensive documents analyzing the SchemaRenderer implementation and how it handles the `interactionPreview` prop.

## Documents Included

### 1. **SCHEMA_RENDERER_COMPLETE_ANALYSIS.md** (Main Reference)
The primary deep-dive analysis document answering all four questions:
- **Q1**: How does `interactionPreview` affect node rendering?
- **Q2**: Does interactionPreview affect child visibility?
- **Q3**: Complete 4-layer override system explanation
- **Q4**: Can we render "as if node X has activeState Y"?

**Contents:**
- Type definitions and function signatures
- Complete code walkthroughs with line numbers
- 4-layer merge system for both styles and props
- `GhostWrapper` purpose and implementation
- Multi-layer visibility resolution logic
- Limitations and current usage patterns

**Best for:** Understanding the complete rendering pipeline and decision-making logic.

---

### 2. **SCHEMA_RENDERER_DIAGRAMS.md** (Visual Reference)
ASCII art diagrams showing the rendering flow and data transformations:
1. Rendering Pipeline Flow
2. 4-Layer Resolution System (visual)
3. Visibility Resolution & Child Rendering
4. Complete Resolution Process (10 steps)
5. `interactionPreview` vs `node.activeState` (comparison)
6. `GhostWrapper` Purpose & Usage
7. Data Expression Resolution Flow

**Best for:** Quick visual understanding and teaching others.

---

### 3. **SCHEMA_RENDERER_QUICK_REF.md** (Cheat Sheet)
Fast reference guide with:
- TL;DR answers to all 4 questions
- Quick code snippets
- File structure and locations
- Common mistakes to avoid
- Debugging tips
- Performance considerations
- Related concepts glossary
- State name mappings

**Best for:** Looking up specific functions, debugging, and avoiding common pitfalls.

---

## Quick Answers

### Q1: How does `interactionPreview` affect node rendering?
**It applies style & prop overrides from a state (Layer 4) but does NOT modify `node.activeState` or affect child visibility.**

```typescript
<SchemaRenderer 
  screen={screen}
  interactionPreview={{ nodeId: 'btn-1', state: 'pressed' }}
/>
// Button renders with "pressed" state's styles & props
// But button.activeState remains unchanged
// And child visibility is unaffected
```

### Q2: Does interactionPreview affect child visibility?
**NO. Child visibility is determined ONLY by `node.activeState` (persistent), never by `interactionPreview`.**

Hidden children are still rendered wrapped in `<GhostWrapper>` (semi-transparent, with a badge label).

### Q3: 4-Layer Override System
**Merge order for both styles and props:**
1. Base (node.styles / node.props)
2. Global State Bindings (domain + environment)
3. Business State (node.activeState)
4. Interaction Preview (interactionPreview)

Later layers override earlier ones using spread merge.

### Q4: Can we render "as if node X has activeState Y"?
**Partial YES:**
- ✅ Style & prop overrides work via `interactionPreview`
- ❌ Child visibility changes require persistent `node.activeState` change

To preview full state including hidden children, you must modify `node.activeState` directly.

---

## Key Functions at a Glance

| Function | File | Purpose |
|----------|------|---------|
| `SchemaRenderer` | renderer/SchemaRenderer.tsx:68 | Main component setup |
| `NodeRenderer` | renderer/SchemaRenderer.tsx:243 | Recursive node rendering, 4-layer merge |
| `resolveInteractionForNode` | renderer/SchemaRenderer.tsx:233 | Extract state from interactionPreview |
| `resolveNodeStyles` | styles/resolveStyles.ts:88 | 4-layer style merge |
| `resolveNodeProps` | styles/resolveProps.ts:20 | 4-layer props + visibility merge |
| `GhostWrapper` | renderer/SchemaRenderer.tsx:446 | Visual wrapper for hidden children |
| `PrimitiveRenderer` | renderers/PrimitiveRenderer.tsx:25 | Map node.type to HTML element |

---

## Key Insights

### 1. `interactionPreview` is Temporary & Non-Persistent
- Passed as a prop, not stored in schema
- Only affects the current render
- Does not change any node data
- Use for: Canvas hover/focus visual feedback

### 2. `childrenVisibility` is State-Bound
- Lives on `state.definition.childrenVisibility` (Map<childId, boolean>)
- Only checked when rendering children
- References `node.activeState` (persistent)
- Never checks `interactionPreview`

### 3. Visibility Has Multiple Gates
- **Node-level**: `node.visible` (Layer 1), bindings (Layer 2)
- **Child-level**: `activeState.childrenVisibility` (state-specific)
- **GhostWrapper**: Rendered at 0.2 opacity when hidden in state
- **Not Mounted**: Only if `visible === false` after all 4 layers

### 4. There's No Way to Preview Child Visibility
- To see what children become hidden/visible with a different state
- You must change `node.activeState` (persistent change)
- Or: implement a `previewActiveState` parameter (architectural change)

---

## Common Patterns

### Preview Hover State
```typescript
const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

<SchemaRenderer
  screen={screen}
  interactionPreview={hoveredNodeId ? { nodeId: hoveredNodeId, state: 'hover' } : null}
  onNodeHover={setHoveredNodeId}
/>
```

### Preview Focused State
```typescript
const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

<SchemaRenderer
  screen={screen}
  interactionPreview={focusedNodeId ? { nodeId: focusedNodeId, state: 'focus' } : null}
/>
```

### Preview Business State (Limited)
```typescript
// This only shows styles & props, NOT child visibility changes
<SchemaRenderer
  screen={screen}
  interactionPreview={{ nodeId: 'form', state: 'submitted' }}
/>
```

### Change Actual State (Full Preview)
```typescript
// To see full state including hidden/visible children:
screen.rootNode.children?.[0]?.activeState = 'submitted';
<SchemaRenderer screen={screen} />
```

---

## File Locations

```
features/design-engine/src/
├── renderer/
│   ├── SchemaRenderer.tsx ..................... Main component
│   ├── ListInstanceContext.tsx ............... List rendering context
│   └── SchemaVirtualizeContext.tsx ........... Virtualization config
├── styles/
│   ├── resolveStyles.ts ....................... 4-layer style merge
│   ├── resolveProps.ts ........................ 4-layer props + visibility
│   └── resolveState.ts ........................ Simpler old version
├── renderers/
│   └── PrimitiveRenderer.tsx .................. HTML element mapping
├── data/
│   ├── DataContext.ts ......................... Data context provider
│   ├── resolveExpression.ts ................... {{data.x}} interpolation
│   └── ListRenderer.tsx ....................... List repetition logic
└── ... (other files)
```

---

## Debugging Checklist

When things aren't rendering as expected:

- [ ] Is `interactionPreview.nodeId` correct?
- [ ] Does the state name exist on `node.states`?
- [ ] Is `node.activeState` what you expect?
- [ ] Are children hidden by `childrenVisibility`?
- [ ] Did you check visibility resolution (4 layers)?
- [ ] Are data expressions rendering correctly?
- [ ] Is the node outside the viewport (virtualization)?

---

## Next Steps for Implementation

If you need to extend SchemaRenderer:

### To Support interactionPreview on Child Visibility:
1. Modify `resolveNodeProps` to accept `previewActiveState`
2. When rendering children, use preview state's `childrenVisibility` if provided
3. Add documentation explaining the limitation is removed

### To Add a Preview Mode:
1. Create `SchemaRendererPreview` that takes a schema "snapshot"
2. Render with `interactionPreview` applied
3. Show what the UI would look like in that state

### To Optimize Virtualization:
1. Pre-compute layout map before rendering (already done)
2. Memoize layer resolution results
3. Batch updates for large trees

---

## Related Concepts in the Codebase

- **ComponentNode**: The schema type for nodes (design-schema package)
- **ComponentState**: State definition with styles, props, childrenVisibility
- **DataContext**: Runtime data from active dataset scenarios
- **DomainStateBinding**: Global state binding that affects rendering
- **EnvironmentBinding**: Environment-specific binding (similar to domain state)
- **ListRenderer**: Repeats children per item in __listData array

---

## References

**Design Schema Package:**
- Defines `ComponentNode`, `ComponentState`, `Screen` types
- Located in: `@globallink/design-schema`

**Editor Integration:**
- Uses `interactionPreview` for canvas hover feedback
- Located in: `features/editor/`

**Preview/Runtime:**
- Uses full `SchemaRenderer` with data contexts
- Located in: `features/design-engine/src/preview/`

---

Generated: 2026-04-06
Analysis depth: Complete source code review
Files analyzed: 5 (SchemaRenderer.tsx, resolveStyles.ts, resolveProps.ts, PrimitiveRenderer.tsx, resolveState.ts)

