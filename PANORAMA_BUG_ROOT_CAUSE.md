# Panorama State Display Bug — Root Cause Analysis

## TL;DR

**Why all states look identical in panorama**:

1. ✅ **ComponentState objects exist** in schema with `childrenVisibility` mappings
2. ✅ **State styles are applied** (background colors change)
3. ❌ **State visibility mappings are IGNORED** (children don't hide/show)
4. ❌ **Panorama renders all states with identical child trees**

Result: User sees only styling differences, not structural/visibility differences.

---

## The Schema Chain

### Level 1: Define Custom States on Root
```typescript
// Root node in schema
{
  id: "root",
  states: [
    {
      name: "login-success",
      styles: { backgroundColor: "#f0fdf4" },
      childrenVisibility: {  // ← THIS EXISTS IN SCHEMA
        "error-toast": false,
        "success-toast": true
      }
    },
    {
      name: "login-failure",
      styles: { backgroundColor: "#fef2f2" },
      childrenVisibility: {  // ← THIS TOO
        "error-toast": true,
        "success-toast": false
      }
    }
  ]
}
```

### Level 2: Panorama Creates Combinations
**useCombinations.ts**:
```typescript
const combinations = [
  { id: "state-login-success", state: "login-success", ... },
  { id: "state-login-failure", state: "login-failure", ... },
];
```

### Level 3: PanoramaCell Should Apply State Visibility
**PanoramaCell.tsx** (SHOULD DO):
```typescript
const targetState = findStateByName(node, combination.state);

// Apply styles ✅ (DOES THIS)
const mergedStyles = { ...node.styles, ...targetState.styles };

// Apply childrenVisibility ❌ (DOESN'T DO THIS)
const childVisibility = targetState.childrenVisibility || {};
children.forEach(child => {
  if (childVisibility[child.id] !== undefined) {
    child.effectiveVisibility = childVisibility[child.id];  // ← MISSING
  }
});
```

### Level 4: SchemaRenderer Renders with Visibility Applied
**SchemaRenderer** (SHOULD DO):
```typescript
function renderNode(node) {
  // Check effective visibility (state + bindings + base)
  const shouldRender = node.effectiveVisibility !== false;
  
  if (!shouldRender) return null; // ← MISSING THIS CHECK
  
  return (
    <div style={node.mergedStyles}>
      {node.children?.map(child => renderNode(child))}
    </div>
  );
}
```

---

## The Three Missing Pieces

| Component | Task | Status | Impact |
|-----------|------|--------|--------|
| **PanoramaCell** | Read `state.childrenVisibility` | ❌ Missing | Children always visible |
| **PanoramaCell** | Pass visibility to renderer | ❌ Missing | Visibility context lost |
| **SchemaRenderer** | Check `effectiveVisibility` | ❌ Missing | All children render |

---

## Evidence in Code

### What Exists in Schema
- ✅ `ComponentNode.states: ComponentState[]`
- ✅ `ComponentState.childrenVisibility?: Record<string, boolean>`
- ✅ `ComponentState.props?: Record<string, unknown>`
- ✅ `ComponentState.styles: Partial<CSSProperties>`

### What Happens in Panorama
1. useCombinations finds states → ✅ Works
2. PanoramaCell gets state object → ✅ Works  
3. PanoramaCell applies state.styles → ✅ Works
4. PanoramaCell applies state.childrenVisibility → ❌ **MISSING**
5. SchemaRenderer filters children → ❌ **MISSING**

---

## Quick Fix Strategy

### Option A: Minimal (In PanoramaCell)
```typescript
// PanoramaCell.tsx
function renderCell() {
  const state = findState(targetNode, combination.state);
  
  // Pass childrenVisibility to renderer
  return (
    <SchemaRenderer
      node={targetNode}
      stateOverride={state}
      visibilityOverride={state?.childrenVisibility}  // ← Add this
    />
  );
}
```

### Option B: Cleaner (Create Visibility Context)
```typescript
// Create effective node with visibility applied
function applyStateVisibility(node, state) {
  const withVisibility = structuredClone(node);
  const vis = state?.childrenVisibility || {};
  
  withVisibility.children = node.children?.map(child => ({
    ...child,
    effectiveVisible: vis[child.id] ?? child.visible
  }));
  
  return withVisibility;
}

// In PanoramaCell:
const nodeWithVisibility = applyStateVisibility(node, state);
return <SchemaRenderer node={nodeWithVisibility} />;
```

---

## Test Case: Before vs After

### Before Fix
```
Panorama showing "login-success" state:
┌─ Root (light green bg)          ← state.styles applied ✅
├─ Form Container (VISIBLE)       ← should be HIDDEN ❌
│  ├─ Username Input
│  ├─ Password Input
│  └─ Login Button
├─ Error Toast (HIDDEN)           ← correct
└─ Success Toast (VISIBLE)        ← correct

^ Same children in all three states!
```

### After Fix
```
Panorama showing "login-success" state:
┌─ Root (light green bg)          ← state.styles applied ✅
├─ Form Container (HIDDEN)        ← state.childrenVisibility applied ✅
├─ Error Toast (HIDDEN)
└─ Success Toast (VISIBLE)        ← state.childrenVisibility applied ✅

^ Different children per state!
```

---

## Related: Domain State System (Separate Issue)

Your schema also has a second state system for complex scenarios:

```typescript
// Screen-level domain state
screen.domainStates = [{
  name: "loginPhase",
  values: ["idle", "loading", "success", "failure"]
}];

// Child receives binding
node.domainStateBindings = [{
  variableName: "loginPhase",
  value: "success",
  childrenVisibility: { /* ... */ }  // ← Also ignored in panorama
}];
```

This would need SEPARATE handling:
1. Read `screen.domainStates` for all possible values
2. Create combinations for cartesian product (already done!)
3. For each value, apply corresponding `domainStateBindings`
4. Merge visibility from bindings → same issue

**Diagnosis**: Your useCombinations.ts already creates these combinations, but PanoramaCell doesn't apply the domain state bindings' visibility overrides either.

---

## Files to Modify

1. **apps/design_front/src/views/editor/Panorama/PanoramaCell.tsx**
   - Read `targetState.childrenVisibility`
   - Pass to SchemaRenderer

2. **apps/design_front/src/components/SchemaRenderer/SchemaRenderer.tsx** (or wherever)
   - Accept visibility context
   - Filter children based on visibility
   - Merge: `node.visible AND effectiveVisiblity AND stateVisibility`

3. **Potentially**: Add utility function
   - `applyStateVisibility(node, state)` to cleanly transform
   - `mergeVisibilityOverrides(node, stateVis, bindingVis)` for complex cases

---

## Why This Matters

The panorama feature is supposed to be the "quality assurance checkpoint" for state design. Without proper visibility rendering:

- ❌ Designers can't see if Toast visibility works
- ❌ Designers can't see if Form hiding works  
- ❌ Designers can't see if elements conditionally appear/disappear
- ❌ Whole states might be incomplete in production

This is a **critical rendering bug** that breaks the panorama's entire value proposition.

