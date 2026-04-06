# SchemaRenderer Visual Diagrams

## 1. Rendering Pipeline Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    SchemaRenderer (React)                     │
│                  screen: Screen (design-schema)               │
│             interactionPreview?: { nodeId, state }            │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│         DataContextProvider (wrap data from datasets)        │
│              { data: { ...mergedScenarioData } }              │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│      SchemaVirtualizeContext (virtualization config)         │
│         { enabled, layoutMap, cullRect, ... }                │
└──────────────────────────────────────────────────────────────┘
                           ↓
        NodeRenderer(screen.rootNode, interactionPreview)
                           ↓
              ┌────────────┴────────────┐
              │                         │
         Recursive                     Returns
         NodeRenderer                  React.ReactNode
         for each child
              │                         
        (Process each child)
```

## 2. 4-Layer Resolution System for Styles & Props

```
┌─────────────────────────────────────────────────────────────────┐
│ NODE RENDERING LAYERS (Merge Order: Layer 1 → 2 → 3 → 4)      │
└─────────────────────────────────────────────────────────────────┘

INPUT: ComponentNode, globalStates, interactionPreview

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: BASE (node.styles / node.props / node.visible)       │
├─────────────────────────────────────────────────────────────────┤
│ Spread merge {...node.styles}                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: GLOBAL STATE BINDINGS                                 │
├─────────────────────────────────────────────────────────────────┤
│ for each binding in (domainStateBindings + environmentBindings):│
│   if globalStates[binding.variableName] === binding.value:     │
│     merged = {...merged, ...binding.styles}                     │
│     visible = binding.visible (if defined)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: BUSINESS STATE (node.activeState)                     │
├─────────────────────────────────────────────────────────────────┤
│ if node.activeState !== 'default':                              │
│   const activeState = node.states.find(s => s.name ===         │
│                                     node.activeState)            │
│   merged = {...merged, ...activeState.styles}                  │
│   (childrenVisibility applied ONLY HERE, not earlier)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: INTERACTION PREVIEW (hover/focus/active)              │
├─────────────────────────────────────────────────────────────────┤
│ if interactionPreview?.nodeId === node.id:                     │
│   const interactionState = node.states.find(                   │
│     s => s.name === interactionPreview.state                    │
│   )                                                              │
│   // Special: 'active' → 'pressed' mapping                      │
│   merged = {...merged, ...interactionState.styles}             │
│                                                                  │
│   ⚠️  Does NOT affect childrenVisibility!                       │
│   ⚠️  Does NOT change node.activeState!                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FINAL: React.CSSProperties Conversion                           │
├─────────────────────────────────────────────────────────────────┤
│ for each CSS property:                                          │
│   if numeric && not in UNITLESS_PROPERTIES:                    │
│     value = value === 0 ? 0 : `${value}px`                     │
│   return resolved                                               │
└─────────────────────────────────────────────────────────────────┘

OUTPUT: React.CSSProperties / ResolvedProps { props, visible }
```

## 3. Visibility Resolution & Child Rendering

```
┌────────────────────────────────────────────────────────┐
│         VISIBILITY RESOLUTION FOR ONE NODE              │
└────────────────────────────────────────────────────────┘

Is node.visible !== false?
  └→ YES: continue
  └→ NO: return null (not mounted)
          ↓
Does any domainStateBinding match & set visible=false?
  └→ YES: return null
  └→ NO: continue
          ↓
Does any environmentBinding match & set visible=false?
  └→ YES: return null
  └→ NO: continue
          ↓
✅ NODE IS VISIBLE → Render it

┌────────────────────────────────────────────────────────┐
│      CHILD RENDERING (childrenVisibility)              │
└────────────────────────────────────────────────────────┘

Get parent's activeState definition:
  activeStateDef = parent.states.find(s => s.name === parent.activeState)
  cvMap = activeStateDef?.childrenVisibility  // Map<childId, boolean>

For each child:
  ┌─────────────────────────────────────────┐
  │ Is cvMap[child.id] === false?           │
  └─────────────────────────────────────────┘
         │
    ┌────┴────┐
    │          │
   YES        NO
    │          │
    ↓          ↓
  GHOST     NORMAL
  WRAPPER   RENDER
    │          │
    ↓          ↓
  render    render
  with      at normal
  opacity   opacity
  0.2 +     (1.0)
  badge
  showing
  which
  states
  make it
  visible

⚠️  KEY INSIGHT: interactionPreview does NOT affect childrenVisibility!
   Only node.activeState (persistent) determines which children are hidden.
```

## 4. Resolution Process for One Node (Complete)

```
input: ComponentNode (rawNode), interactionPreview, globalStates, dataContext

┌─────────────────────────────────────────────────────────┐
│ STEP 1: Resolve Component Instances                     │
└─────────────────────────────────────────────────────────┘
if rawNode.type is ComponentInstance (reference):
  node = resolveComponentInstance(rawNode, assets)
    // Replace reference with actual component template
else:
  node = rawNode

┌─────────────────────────────────────────────────────────┐
│ STEP 2: Check Virtualization Culling                    │
└─────────────────────────────────────────────────────────┘
if shouldVirtualizeCullNode(vctx, node):
  return null  // Don't mount if outside viewport + margin

┌─────────────────────────────────────────────────────────┐
│ STEP 3: Resolve Interaction Preview State               │
└─────────────────────────────────────────────────────────┘
interactionForNode = resolveInteractionForNode(node.id, interactionPreview)
  // Returns interactionPreview.state if nodeId matches
  // Returns null otherwise

┌─────────────────────────────────────────────────────────┐
│ STEP 4: Resolve Props + Visibility (4-layer merge)      │
└─────────────────────────────────────────────────────────┘
{ props: mergedProps, visible } = resolveNodeProps(
  node,
  globalStates,
  interactionForNode  // ← passed as Layer 4
)
  // Returns: { props: {...}, visible: boolean }

┌─────────────────────────────────────────────────────────┐
│ STEP 5: Skip if Hidden                                  │
└─────────────────────────────────────────────────────────┘
if visible === false:
  return null  // Node not mounted in DOM

┌─────────────────────────────────────────────────────────┐
│ STEP 6: Resolve Styles (4-layer merge)                  │
└─────────────────────────────────────────────────────────┘
reactStyles = resolveNodeStyles(
  node,
  globalStates,
  interactionForNode,  // ← passed as Layer 4
  dataContext
)
  // Returns: React.CSSProperties

┌─────────────────────────────────────────────────────────┐
│ STEP 7: Resolve Data Expressions                        │
└─────────────────────────────────────────────────────────┘
resolvedProps = resolvePropsExpressions(mergedProps, dataContext)
  // Replace {{data.x}} with actual values from active dataset
  // OR: replace if not found

┌─────────────────────────────────────────────────────────┐
│ STEP 8: Render Children                                 │
└─────────────────────────────────────────────────────────┘
if node has __listData prop:
  // List container: repeat children per item
  children = <ListRenderer>
    <NodeRenderer for each list item, key=`${child.id}-${index}`>
else:
  // Normal children
  for each child:
    if child hidden in parent's activeState childrenVisibility:
      render <GhostWrapper> around <NodeRenderer>
        // Opacity 0.2 + badge showing which states make it visible
    else:
      render <NodeRenderer> normally

┌─────────────────────────────────────────────────────────┐
│ STEP 9: Render with Event Handlers                      │
└─────────────────────────────────────────────────────────┘
return (
  <div onClick={handleClick} onMouseEnter={...} style={{display: 'contents'}}>
    <PrimitiveRenderer node={node} style={reactStyles} props={resolvedProps}>
      {children}
    </PrimitiveRenderer>
  </div>
)

┌─────────────────────────────────────────────────────────┐
│ STEP 10: Map to HTML Element                            │
└─────────────────────────────────────────────────────────┘
PrimitiveRenderer switches on node.type:
  'div'     → <div>
  'button'  → <button>
  'img'     → <img>
  'input'   → <input>
  'p'       → <p>
  etc.

All elements get:
  data-node-id={node.id}
  data-node-instance-key={encodeNodeInstanceKey(...)}
  data-node-type={node.type}
  style={reactStyles}
  {...resolvedProps}
  {children}
```

## 5. interactionPreview vs node.activeState

```
╔═════════════════════════════════════════════════════════════════╗
║                    Temporary Overlay                             ║
║                  (interactionPreview)                            ║
╠═════════════════════════════════════════════════════════════════╣
║ • Passed as prop to SchemaRenderer                              ║
║ • Lives only for render duration                                ║
║ • Does NOT persist in schema                                    ║
║ • Does NOT affect node.activeState (persistent)                 ║
║ • Applied only to styles & props (Layer 4)                      ║
║ • Does NOT affect childrenVisibility                            ║
║ • Use: Canvas hover/focus preview                               ║
║ • Example: { nodeId: 'btn-1', state: 'hover' }                 ║
╚═════════════════════════════════════════════════════════════════╝
                            vs
╔═════════════════════════════════════════════════════════════════╗
║                    Persistent State                              ║
║                  (node.activeState)                              ║
╠═════════════════════════════════════════════════════════════════╣
║ • Stored in node.activeState property                           ║
║ • Persists in schema                                            ║
║ • Changes only via explicit mutation                            ║
║ • Applied to styles, props, AND childrenVisibility (Layer 3)   ║
║ • Determines child visibility (GhostWrapper if hidden)          ║
║ • Use: Business logic state (e.g., "submitted", "loading")     ║
║ • Example: node.activeState = "submitted"                      ║
╚═════════════════════════════════════════════════════════════════╝
```

## 6. GhostWrapper Purpose & Usage

```
┌────────────────────────────────────────────────────────┐
│           CHILD IS HIDDEN IN CURRENT STATE             │
│       (cvMap[child.id] === false for activeState)     │
└────────────────────────────────────────────────────────┘

getVisibleStateNames(parent, childId)
  → [state names where cvMap[childId] !== false]
  → e.g., ['default', 'hover']

                         ↓

         <GhostWrapper visibleStates={['default', 'hover']}>
           <NodeRenderer child />
         </GhostWrapper>

                         ↓

           Renders with:
           • opacity: 0.2 (semi-transparent)
           • outline: 1px dashed blue (faint border)
           • Badge showing "👁 default, hover"

        Purpose:
        ✓ Show full tree hierarchy
        ✓ Indicate which states make child visible
        ✓ Allow interaction (can click to select)
        ✓ Visual feedback: "this child is hidden now"

        NOT:
        ✗ Permanently hidden
        ✗ Not mounted in DOM
        ✗ Can't interact
```

## 7. Data Expression Resolution Flow

```
NODE: { props: { text: "Hello {{data.user.name}}" } }
      { styles: { color: "{{data.colors.primary}}" } }

CONTEXT: { data: { user: { name: "Alice" }, colors: { primary: "#1677ff" } } }

                              ↓

resolvePropsExpressions(props, context)
  for each prop value:
    if string contains "{{...}}":
      value = resolveExpression(value, context)  // Evaluate template
    else:
      keep as-is

                              ↓

RESULT:
  props: { text: "Hello Alice" }
  styles: { color: "#1677ff" }

                              ↓

PrimitiveRenderer renders:
  <div style={{color: '#1677ff'}}>Hello Alice</div>
```

