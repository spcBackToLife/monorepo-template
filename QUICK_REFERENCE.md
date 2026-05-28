# Issue Investigation - Quick Reference

## Issue Comparison Matrix

| Aspect | Issue 1: Default Styles | Issue 2: Icon Stretching | Issue 3: visibleWhen |
|--------|-------------------------|------------------------|-------------------|
| **Status** | ✅ CONFIRMED BUG | ✅ CONFIRMED BUG | ⚠️ NEEDS VERIFICATION |
| **Severity** | HIGH | HIGH | CRITICAL |
| **Type** | Bug + Missing Feature | CSS Value Bug | Possible User Error |
| **Primary File** | `primitives.ts` + `element.ts` | `canvas.ts` | `PreviewRenderer.tsx` |
| **Line Numbers** | 26-40, 377-379, 53-162 | export_and_apply | 84-90, 181-185 |
| **Root Cause** | Too many defaults applied | `backgroundSize: 'contain'` | Likely state path mismatch |
| **User Impact** | Unwanted flex layouts | Icons stretched/distorted | UI not reactive |
| **Fix Complexity** | LOW-MEDIUM | MEDIUM | MEDIUM (if real) |

---

## Quick Debug Checklist

### Issue 1: Default Styles
```
[ ] Create div via element/add with no styles parameter
[ ] Inspect computed styles in DevTools
[ ] Verify display: flex, flexDirection: column present
[ ] Check primitives.ts lines 26-40 for culprit styles
[ ] Consider: Is layoutHint parameter being used?
```

### Issue 2: Icon Stretching  
```
[ ] Apply 20x20 icon to 48x48 button via canvas/export_and_apply
[ ] Inspect backgroundSize: verify it's 'contain'
[ ] Check if backgroundClip/backgroundOrigin set to 'border-box'
[ ] Visual: Does icon scale to fill container? (BUG = yes)
[ ] Test fix: Change backgroundSize to '20px 20px'
```

### Issue 3: visibleWhen Not Working
```
[ ] Create button: onClick -> state.set({ view: { loginMode: 'password' } })
[ ] Create text: visibleWhen: {{ state.view.loginMode === 'password' }}
[ ] Click button in preview, does text appear?
[ ] If NO:
    [ ] Check browser console for errors
    [ ] Add logging in PreviewRenderer subscription (line 88)
    [ ] Add logging in resolveNodeProps (line 54)
    [ ] Verify state.set uses correct path (view vs data)
[ ] If YES:
    [ ] Issue might be state path usage, not architecture
```

---

## Code Snippets for Reference

### Issue 1: Where Defaults Are Applied
```typescript
// primitives.ts - line 147
const defaultStyles = isPrimitiveType(tag) ? getDefaultStyles(tag) : {};

// primitives.ts - line 148  
const practicalDefaults = inferPracticalDefaults(tag, parent?.styles, layoutHint);

// primitives.ts - line 153 (culprit merge)
styles: { ...defaultStyles, ...practicalDefaults, ...(styles ?? {}) }
```

### Issue 2: Where Stretching Happens
```typescript
// canvas.ts - export_and_apply
styleUpdates: {
  backgroundImage: `url("${imgUrl}")`,
  backgroundSize: 'contain',  // ← BUG: causes stretching
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
  // ... 4 more styles
}
```

### Issue 3: Where State Should Trigger Re-render
```typescript
// PreviewRenderer.tsx - lines 86-90
useEffect(() => {
  const unsub = storeRef.current.subscribe(() => forceTick((n) => n + 1));
  return unsub;
}, []);

// This SHOULD work: store change -> forceTick -> React re-render
// -> DataContext refresh -> visibleWhen re-evaluate
```

---

## Files to Modify for Fixes

### Issue 1 Fixes
1. **Option A**: Modify `element.ts` executeAddElement (add skipDefaults param)
2. **Option B**: Remove lines 26-40 from `primitives.ts` 
3. **Option C**: Modify `element.ts` inferPracticalDefaults (add context check)

### Issue 2 Fixes
1. **Option A**: Modify `canvas.ts` export_and_apply (use CSS masking)
2. **Option B**: Modify `canvas.ts` export_and_apply (backgroundSize: '20px 20px')
3. **Option C**: Add icon metadata to material project schema

### Issue 3 Verification
1. Add console.log in `PreviewRenderer.tsx` line 88 subscription callback
2. Add console.log in `resolveProps.ts` line 55 expression evaluation
3. Create test case in preview mode
4. If working: user education on state.set path usage
5. If broken: check Store.ts setState listener notification (line 51)

---

## Architecture Diagrams

### Issue 1: Default Styles Flow
```
element/add called
  ↓
executeAddElement() [element.ts:186]
  ↓
createNode() [element.ts:139]
  ├→ getDefaultStyles(tag) [primitives.ts:377] ← Source 1
  ├→ inferPracticalDefaults() [element.ts:53] ← Source 2
  └→ Merge: {...defaults, ...practical, ...userStyles}
  ↓
ComponentNode with merged styles ← BUG RESULT
```

### Issue 2: Icon Stretching Flow
```
canvas/export_and_apply called
  ↓
export_and_apply handler [canvas.ts]
  ↓
Apply 9 hardcoded styles including backgroundSize: 'contain'
  ↓
executeApplyMaterialDesign() [material.ts:22]
  ↓
Apply styles to target node
  ↓
Browser renders 20x20 icon stretched to 48x48 ← BUG RESULT
```

### Issue 3: visibleWhen Reactivity Flow
```
User clicks button
  ↓
dispatcher.run(event.actions) [PreviewRenderer.tsx:445]
  ↓
state.set action dispatched [Dispatcher.ts:85]
  ↓
store.setState() called [Dispatcher.ts:152]
  ↓
Store notifies listeners [Store.ts:51]
  ↓
forceTick incremented [PreviewRenderer.tsx:88]
  ↓
React re-renders
  ↓
DataContext refreshed with new state [PreviewRenderer.tsx:182]
  ↓
PreviewNodeRenderer called with new context
  ↓
resolveNodeProps() evaluates visibleWhen [resolveProps.ts:54]
  ↓
visible = result of expression
  ↓
Element shows/hides ← SHOULD WORK ✅
```

---

## Testing Commands

### List affected files
```bash
cd /Users/pikun/Documents/work/design-ui/design-ui-monorepo

# Issue 1
find . -path ./node_modules -prune -o -name "primitives.ts" -type f -print
find . -path ./node_modules -prune -o -path "*/operations/element.ts" -type f -print

# Issue 2
find . -path ./node_modules -prune -o -path "*/tools/domain/canvas.ts" -type f -print
find . -path ./node_modules -prune -o -path "*/operations/material.ts" -type f -print

# Issue 3
find . -path ./node_modules -prune -o -path "*/preview/PreviewRenderer.tsx" -type f -print
find . -path ./node_modules -prune -o -name "Store.ts" -type f -print
```

### Search for related code
```bash
# Find all references to defaultStyles
grep -r "defaultStyles" features/design-schema/src/registry/

# Find all export_and_apply handlers
grep -r "export_and_apply" apps/design-mcp/src/

# Find all visibleWhen evaluations
grep -r "visibleWhen" features/design-engine/src/
```

