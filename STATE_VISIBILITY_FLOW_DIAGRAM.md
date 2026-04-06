# State Visibility Flow — From Schema to Panorama Rendering

## Complete Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│ SCHEMA LAYER: Design Data                                          │
└────────────────────────────────────────────────────────────────────┘

    Root Node
    ├─ id: "root"
    ├─ children: [FormContainer, ErrorToast, SuccessToast]
    ├─ visible: true
    ├─ activeState: "default"
    └─ states: [
       {
         name: "default",
         styles: { backgroundColor: "#ffffff" },
         childrenVisibility: {
           "form-container": true,
           "error-toast": false,
           "success-toast": false
         }
       },
       {
         name: "login-success",
         styles: { backgroundColor: "#f0fdf4" },
         childrenVisibility: {             ← KEY DATA
           "form-container": false,
           "error-toast": false,
           "success-toast": true
         }
       },
       {
         name: "login-failure",
         styles: { backgroundColor: "#fef2f2" },
         childrenVisibility: {             ← KEY DATA
           "form-container": true,
           "error-toast": true,
           "success-toast": false
         }
       }
    ]


┌────────────────────────────────────────────────────────────────────┐
│ PANORAMA LAYER: State Combinations                                 │
└────────────────────────────────────────────────────────────────────┘

    usePanoramaCombinations(targetNodeId="root")
    
    Output:
    [
      {
        id: "interaction-default",
        state: "default",
        interactionPreview: { nodeId: "root", state: "default" }
      },
      {
        id: "interaction-login-success",
        state: "login-success",              ← Should trigger visibility
        interactionPreview: { nodeId: "root", state: "login-success" }
      },
      {
        id: "interaction-login-failure",
        state: "login-failure",              ← Should trigger visibility
        interactionPreview: { nodeId: "root", state: "login-failure" }
      }
    ]


┌────────────────────────────────────────────────────────────────────┐
│ RENDERING LAYER: PanoramaCell × 3                                  │
└────────────────────────────────────────────────────────────────────┘

    FOR EACH combination:
    
    ┌─ PanoramaCell (combination={state: "login-success"})
    │
    ├─ STEP 1: Find state definition
    │  targetState = root.states.find(s => s.name === "login-success")
    │  ✅ Found: { styles: {...}, childrenVisibility: {...} }
    │
    ├─ STEP 2: Apply styles to root
    │  mergedStyles = { ...root.styles, ...targetState.styles }
    │  ✅ backgroundColor changes to #f0fdf4 (light green)
    │
    ├─ STEP 3: Apply visibility overrides TO CHILDREN  ❌ MISSING
    │  for (child of root.children) {
    │    if (targetState.childrenVisibility[child.id] !== undefined) {
    │      child.effectiveVisibility = targetState.childrenVisibility[child.id]
    │      // For "login-success":
    │      // - form-container.effectiveVisibility = false (SHOULD BE HIDDEN)
    │      // - error-toast.effectiveVisibility = false (SHOULD BE HIDDEN)
    │      // - success-toast.effectiveVisibility = true (SHOULD BE VISIBLE)
    │    }
    │  }
    │
    ├─ STEP 4: Pass to SchemaRenderer
    │  <SchemaRenderer
    │    node={root}
    │    stateStyles={targetState.styles}
    │    visibilityOverride={targetState.childrenVisibility}  ← ADD THIS
    │  />
    │
    └─ SchemaRenderer Rendering  ❌ MISSING CHECK
       function renderNode(node) {
         // ❌ This check is missing:
         // if (node.effectiveVisibility === false) return null;
         
         return (
           <div style={node.mergedStyles}>
             {node.children.map(child => renderNode(child))}
             // ^ ALL CHILDREN RENDERED regardless of visibility
           </div>
         );
       }


┌────────────────────────────────────────────────────────────────────┐
│ BROWSER LAYER: What User Sees                                      │
└────────────────────────────────────────────────────────────────────┘

    ❌ CURRENT (BUG): All three panorama cells look nearly identical
    
    Cell 1: "default"
    ┌─ Root (white)
    ├─ Form (visible)
    ├─ Error (hidden by CSS)
    └─ Success (hidden by CSS)
    
    Cell 2: "login-success"
    ┌─ Root (light green) ← Only difference!
    ├─ Form (visible) ← WRONG - should be hidden
    ├─ Error (hidden by CSS)
    └─ Success (hidden by CSS) ← WRONG - should be visible
    
    Cell 3: "login-failure"
    ┌─ Root (light red) ← Only difference!
    ├─ Form (visible)
    ├─ Error (hidden by CSS) ← WRONG - should be visible
    └─ Success (hidden by CSS)


    ✅ EXPECTED (AFTER FIX): All three panorama cells look structurally different
    
    Cell 1: "default"
    ┌─ Root (white)
    ├─ Form (visible)
    │  ├─ Username Input
    │  ├─ Password Input
    │  └─ Login Button
    ├─ Error (hidden)
    └─ Success (hidden)
    
    Cell 2: "login-success" 
    ┌─ Root (light green)
    ├─ Form (HIDDEN by state)
    ├─ Error (hidden)
    └─ Success (VISIBLE by state)
       "✓ Login successful!"
    
    Cell 3: "login-failure"
    ┌─ Root (light red)
    ├─ Form (visible)
    │  ├─ Username Input
    │  ├─ Password Input
    │  └─ Login Button
    ├─ Error (VISIBLE by state)
    │  "✗ Username or password incorrect"
    └─ Success (hidden)
```

---

## State Visibility Evaluation Order

```
For each child node, effective visibility = 

  (1) base visibility        (child.visible = true)
  AND (2) component state    (state.childrenVisibility[child.id])
  AND (3) domain state       (binding.childrenVisibility[child.id])
  AND (4) environment state  (envBinding.childrenVisibility[child.id])
```

**Current Status**:
- (1) ✅ Applied
- (2) ❌ **Missing** — state visibility not applied
- (3) ❌ **Missing** — domain state visibility not applied
- (4) ❌ **Missing** — environment state visibility not applied

**Priority Order**: Fix (2) first (immediate issue), then (3) and (4).

---

## Implementation Timeline

### Phase 1: Component State Visibility (Fixes Login Example)
```
Duration: ~2-3 hours
Files: PanoramaCell.tsx, SchemaRenderer.tsx
Impact: Fixes "all states look identical" for current use cases
Scope: state.childrenVisibility handling
```

### Phase 2: Domain State Bindings (Fixes Complex Pages)
```
Duration: ~3-4 hours
Files: PanoramaCell.tsx, SchemaRenderer.tsx, useCombinations.ts
Impact: Fixes visibility for domain state variations
Scope: binding.childrenVisibility + cartesian combinations
```

### Phase 3: Environment State Bindings (Full System)
```
Duration: ~2 hours
Files: Same as Phase 2
Impact: Complete state visibility system
Scope: envBinding.childrenVisibility
```

---

## Success Criteria

- [ ] Panorama cells with different `state.childrenVisibility` show different children
- [ ] Toasts appear/disappear based on state
- [ ] Forms hide/show based on state
- [ ] Color + structural changes both visible in each panorama cell
- [ ] No child appears in one cell but is hidden in another cell (per state)
- [ ] Works for nested states (component states + domain states)

