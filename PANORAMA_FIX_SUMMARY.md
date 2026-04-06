# Panorama State Visibility Fix Summary

## Issue Description

When viewing the panorama for a component with custom business states (e.g., `login-success`, `login-failure`), all state cells appeared identical visually, even though they should show different child elements based on the state.

**Example**: A login component with states where:
- `default` state shows: InputEmail, InputPassword, LoginButton
- `login-success` state shows: SuccessToast (InputEmail/InputPassword/LoginButton hidden)
- `login-failure` state shows: ErrorToast (InputEmail/InputPassword/LoginButton hidden)

The panorama showed all three states with all children visible, instead of showing different layouts per state.

## Root Cause Analysis

### The Architecture

The system has a 4-layer state merge for both **styles** and **visibility**:

```
Layer 1: Base styles/visibility (node.styles, node.children always rendered)
  ↓
Layer 2: Domain state bindings (globalStates matching domainStateBindings)
  ↓
Layer 3: Business state (node.activeState from states[] array)
  ↓
Layer 4: Interaction preview (temporary hover/pressed overlay)
```

### The Code Path

For **styles** (in `resolveNodeStyles` function):
```typescript
// Layer 3: business state
const activeStateName = node.activeState ?? 'default';
if (activeStateName !== 'default') {
  const activeState = node.states?.find((s) => s.name === activeStateName);
  if (activeState?.styles) {
    merged = { ...merged, ...activeState.styles };
  }
}

// Layer 4: interaction state (from interactionPreview)
if (interactionState) {
  let interactionStateObj = node.states?.find((s) => s.name === interactionState);
  if (interactionStateObj?.styles) {
    merged = { ...merged, ...interactionStateObj.styles };
  }
}
```

✅ **Works correctly**: Both layers are applied, interaction state takes priority.

For **childrenVisibility** (in `NodeRenderer` function):
```typescript
// BEFORE THE FIX
const activeStateDef = node.states?.find((s) => s.name === node.activeState);
const cvMap = activeStateDef?.childrenVisibility;
```

❌ **Broken**: Only uses `node.activeState`, completely ignores `interactionForNode` from the preview!

### Why This Breaks Panorama

In panorama, when we want to show different state variants:

1. **usePanoramaCombinations** creates a `PanoramaCombination` for each state with `interactionPreview: { nodeId, state }`
2. **PanoramaCell** passes this preview to SchemaRenderer
3. **SchemaRenderer** -> **NodeRenderer** receives the preview
4. **NodeRenderer** calls `resolveInteractionForNode(node.id, interactionPreview)` to get `interactionForNode`
5. Used for styles ✅, but NOT for childrenVisibility ❌

Result: All panorama cells show the same children because they all use `node.activeState` (which is still `default`), ignoring the temporary preview state.

## The Fix

Changed lines 367-368 in `features/design-engine/src/renderer/SchemaRenderer.tsx`:

```typescript
// BEFORE
const activeStateDef = node.states?.find((s) => s.name === node.activeState);
const cvMap = activeStateDef?.childrenVisibility;

// AFTER
const stateNameForVisibility = interactionForNode ?? node.activeState;
const activeStateDef = node.states?.find((s) => s.name === stateNameForVisibility);
const cvMap = activeStateDef?.childrenVisibility;
```

**Priority Order**:
1. `interactionForNode` (from panorama/preview) — temporary overlay state
2. `node.activeState` (schema state) — actual current state

This mirrors the exact same priority order used for **styles** at Layer 4.

## Impact Analysis

### ✅ Fixed Scenarios

**Component Panorama - Interaction States**
- Before: All states showed all children
- After: Each state (default, hover, pressed, focus, disabled) shows correct visibility

**Component Panorama - Custom Business States**
- Before: All states showed all children  
- After: Each state (login-success, login-failure, etc.) shows correct visibility

### ✅ Unaffected (Still Works)

**Page Panorama**
- Uses domain state bindings, not component states
- No `interactionPreview` involved
- Unchanged behavior

**Editor Canvas**
- No `interactionPreview` passed during normal editing
- Uses actual `node.activeState` (correct behavior)
- Unchanged behavior

**Preview Mode**
- No `interactionPreview` passed during preview
- Uses actual `node.activeState` (correct behavior)
- Unchanged behavior

**Temporary State Preview**
- When designer clicks "preview state" dropdown on canvas
- Uses `interactionPreview` for styles only (no children hiding needed typically)
- Still works, now also respects childrenVisibility

## Code Diff

```diff
--- a/features/design-engine/src/renderer/SchemaRenderer.tsx
+++ b/features/design-engine/src/renderer/SchemaRenderer.tsx
@@ -364,7 +364,11 @@ function NodeRenderer({
       />
     );
   } else {
-    const activeStateDef = node.states?.find((s) => s.name === node.activeState);
+    // Determine which state to use for childrenVisibility:
+    // Priority 1: interactionForNode (from interactionPreview) — used in panorama/preview
+    // Priority 2: node.activeState — actual schema state
+    const stateNameForVisibility = interactionForNode ?? node.activeState;
+    const activeStateDef = node.states?.find((s) => s.name === stateNameForVisibility);
     const cvMap = activeStateDef?.childrenVisibility;
 
     children = node.children?.map((child) => {
```

## Verification Steps

To verify this fix works:

1. **Create a test component** with multiple states and different `childrenVisibility`:
   ```
   Root (component node)
   ├── State: default
   │   └── childrenVisibility: { stateToast: false, defaultContent: true }
   ├── State: login-success
   │   └── childrenVisibility: { stateToast: true, defaultContent: false }
   └── State: login-failure
       └── childrenVisibility: { stateToast: true, defaultContent: false }
   ```

2. **Enter panorama** for this component

3. **Expected behavior**:
   - Default state: Shows defaultContent, hides stateToast (greyed out with 👁 label)
   - login-success state: Shows stateToast, hides defaultContent
   - login-failure state: Shows stateToast, hides defaultContent

4. **Before fix**: All three would show both children
5. **After fix**: Each shows correct visibility per state

## Related Issues Fixed

This fix also enables correct preview behavior for domain state bindings with `childrenVisibility` (when implemented). Currently domain state bindings only support `visible`, `styles`, and `props`, but the infrastructure now supports `childrenVisibility` in future.

## Performance Impact

**None** — Only adds one variable assignment (`stateNameForVisibility`), no additional loops or computations.

## Testing Checklist

- [ ] Component panorama shows correct visibility per state
- [ ] Page panorama unaffected
- [ ] Editor canvas unaffected  
- [ ] Preview mode unaffected
- [ ] GhostWrapper still shows correct label for hidden children
- [ ] No console errors or warnings
- [ ] Build passes typecheck and lint

## Related Commits

- Initial analysis documents: LOGIN_SCHEMA_ANALYSIS.md, PANORAMA_BUG_ROOT_CAUSE.md
- Schema type definitions: features/design-schema/src/types/state.ts
- Rendering engine: features/design-engine/src/renderer/SchemaRenderer.tsx
- Panorama views: apps/design_front/src/views/editor/Panorama/

