# Design UI Monorepo: Issue Investigation Report

## Executive Summary

This report documents findings for 3 critical issues in the design-ui-monorepo codebase:

1. **Issue 1**: Default styles injection on `element/add` causing layout problems
2. **Issue 2**: Material design application stretching icons on larger containers  
3. **Issue 3**: Preview engine not re-rendering when state changes via `visibleWhen` + `state.set`

---

## Issue 1: Element/Add Default Styles Injection

### Current Behavior

When creating elements via MCP `element/add` operation (e.g., creating a `div`), default CSS styles are automatically injected that cause layout problems:
- Divs get: `display: flex`, `flexDirection: column`, `flex: 1`, `minHeight: 40px`, `minWidth: 40px`
- This causes pill-shaped tabs to be squished into circles
- Parent layout containers unwanted flex constraints

### Root Cause Locations

**File 1**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-schema/src/registry/primitives.ts`

- **Lines 26-40**: PRIMITIVES registry definition
  ```typescript
  div: {
    tag: 'div',
    displayName: 'Div',
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '40px',
      minWidth: '40px',
    },
    ...
  }
  ```

- **Lines 377-379**: `getDefaultStyles()` function returns copy of primitive's `defaultStyles`
  ```typescript
  export function getDefaultStyles(primitiveType: string): CSSProperties {
    const prim = PRIMITIVES[primitiveType];
    return prim?.defaultStyles ? { ...prim.defaultStyles } : {};
  }
  ```

**File 2**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-operations/src/operations/element.ts`

- **Lines 139-162**: `createNode()` function
  - **Line 147**: Gets default styles from primitives registry
    ```typescript
    const defaultStyles = isPrimitiveType(tag) ? getDefaultStyles(tag) : {};
    ```
  
  - **Line 148**: Also applies layout-hint based defaults via `inferPracticalDefaults()`
    ```typescript
    const practicalDefaults = inferPracticalDefaults(tag, parent?.styles, layoutHint);
    ```
  
  - **Line 153**: Merges both with user-provided styles (user styles take precedence)
    ```typescript
    styles: { ...defaultStyles, ...practicalDefaults, ...(styles ?? {}) }
    ```

- **Lines 53-136**: `inferPracticalDefaults()` function
  - Applies additional default styles based on `layoutHint` parameter
  - Example: if no `layoutHint`, applies flex layout defaults for divs

- **Lines 186-248**: `executeAddElement()` function
  - Calls `createNode()` which applies both sources of defaults
  - Creates ComponentNode with merged default styles

### Assessment

**Type**: BUG (unintended side effect) / MISSING FEATURE (lack of granular control)

**Severity**: High - affects basic layout patterns

**Details**:
- The PRIMITIVES registry `defaultStyles` were designed to provide sensible defaults for "starting fresh"
- However, the combination of registry defaults + `inferPracticalDefaults()` causes too much automatic styling
- Users cannot opt-out of this default styling via MCP parameters
- The `layoutHint` parameter only partially controls this behavior

### Recommended Fixes

1. **Option A** (Minimal change): Allow `element/add` to accept a parameter to disable automatic defaults
   - Add `skipDefaults?: boolean` parameter to `element/add`
   - Check this flag before applying `getDefaultStyles()` and `inferPracticalDefaults()`

2. **Option B** (Comprehensive): Remove default styles from PRIMITIVES registry
   - Delete `defaultStyles` from all primitive definitions
   - Move defaults into a separate "best practices" layer that only applies in specific contexts
   - Let users explicitly set styles via MCP parameters or design system tokens

3. **Option C** (Hybrid): Make defaults context-aware
   - Only apply defaults when creating top-level elements or containers
   - Skip defaults for elements added inside existing containers with flex/grid layouts

---

## Issue 2: Material Design Application Stretching Icons

### Current Behavior

When using `canvas/export_and_apply` to apply a material design element:
- A 20x20 icon is applied to a 48x48 button container
- Icon appears distorted/stretched to fill entire container
- `backgroundSize: 'contain'` is applied but causes stretching instead of contained sizing

### Root Cause Location

**File**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/apps/design-mcp/src/tools/domain/canvas.ts`

- **Lines**: Contains `export_and_apply` handler (exact line numbers in full file)
  
  When `applyCssTarget === 'background-image'`, applies these 9 styles:
  ```typescript
  styleUpdates: {
    backgroundImage: `url("${imgUrl}")`,
    backgroundSize: 'contain',          // ← Causes stretching
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    border: 'none',
    borderWidth: 0,
    boxSizing: 'border-box',
    backgroundClip: 'border-box',
    backgroundOrigin: 'border-box',
  }
  ```

**File**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-operations/src/operations/material.ts`

- **Lines 22-131**: `executeApplyMaterialDesign()` function
  - Generic operation handler that applies style/prop updates
  - Does NOT define the 9 styles directly (those come from canvas tool)
  - Simply applies whatever `styleUpdates` object is passed to it

### Assessment

**Type**: BUG (incorrect CSS value for use case)

**Severity**: High - visually breaks icon designs

**Root Issue**: 
- `backgroundSize: 'contain'` is correct for "scale to fit while maintaining aspect ratio"
- However, combined with `backgroundClip: 'border-box'` and `backgroundOrigin: 'border-box'`, it creates unintended behavior
- When the container (48x48) is larger than the source icon (20x20), `contain` tries to scale the image to fit the container, causing visible stretching/blurriness

### The Real Problem

The use of `background-image` CSS approach for icon application is fundamentally problematic:
- Background images don't have intrinsic size control like `<img>` tags
- CSS background properties were designed for patterns/images, not precise icon sizing
- No way to specify exact output dimensions (20x20) within a larger container (48x48)

### Recommended Fixes

1. **Option A** (Best): Use CSS masking instead of background-image
   ```css
   backgroundImage: `url("${imgUrl}")`,
   backgroundSize: 'cover',
   WebkitMaskImage: `url("${imgUrl}")`,
   maskSize: '20px 20px',  // explicit size
   maskPosition: 'center',
   maskRepeat: 'no-repeat',
   ```

2. **Option B**: Use fixed background-size with smaller pixel dimensions
   ```css
   backgroundImage: `url("${imgUrl}")`,
   backgroundSize: '20px 20px',  // ← explicit size instead of 'contain'
   backgroundPosition: 'center',
   backgroundRepeat: 'no-repeat',
   ```

3. **Option C**: Store icon metadata (source dimensions) and scale proportionally
   - Save 20x20 source size in material metadata
   - Calculate scale ratio: 48 / 20 = 2.4x
   - Apply `backgroundSize: '20px 20px'` and let browser scale

4. **Option D**: Use `<img>` element approach for precise sizing
   - Create a small `<img>` element with fixed 20x20 size
   - Position absolutely centered within 48x48 container
   - More reliable but requires different DOM structure

---

## Issue 3: Preview Engine - visibleWhen + state.set Not Re-rendering

### Current Behavior

In preview mode:
- Clicking a tab that dispatches `state.set({loginMode: 'password'})`
- Element with `visibleWhen: {{ state.view.loginMode === 'password' }}` does NOT appear
- Expected: element should show/hide based on state changes
- Actual: element visibility is not reactive to state mutations

### Investigation Findings

**The subscription mechanism EXISTS and is CORRECT**:

**File**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-engine/src/state/Store.ts`
- **Lines 17-27**: Store interface with `subscribe()` method
- **Lines 39-68**: Store implementation using Set of listeners
- **Lines 47-59**: `setState()` method notifies all listeners when state changes

**File**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-engine/src/preview/PreviewRenderer.tsx`
- **Lines 86-90**: Store subscription is properly set up
  ```typescript
  useEffect(() => {
    const unsub = storeRef.current.subscribe(() => forceTick((n) => n + 1));
    return unsub;
  }, []);
  ```
  - This subscribes to store changes
  - Each change increments `forceTick` counter
  - React re-renders when state hook changes

- **Line 84**: Force update state hook
  ```typescript
  const [, forceTick] = useState(0);
  ```

- **Lines 181-185**: DataContext creation (happens on every render due to `forceTick` in dependencies)
  ```typescript
  const previewDataContext: DataContext = useMemo(
    () => buildScreenDataContext(screen, storeRef.current.getState()),
    [screen, storeRef.current.getState()],  // ← depends on getState()
  );
  ```

**File**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-engine/src/styles/resolveProps.ts`
- **Lines 52-59**: `visibleWhen` expression evaluation at render time
  ```typescript
  if (visible && node.visibleWhen) {
    const fn = compileExpression(node.visibleWhen);
    const result = fn(dataContext);
    if (result === false || result === 0 || result === '' || result === null || result === undefined) {
      visible = false;
    }
  }
  ```
  - Correctly evaluates expression in DataContext
  - DataContext contains current state values

**File**: `/Users/pikun/Documents/work/design-ui/design-ui-monorepo/features/design-engine/src/state/Dispatcher.ts`
- **Lines 84-90**: `state.set` action handling
  ```typescript
  case 'state.set':
  case 'state.append':
  case 'state.merge':
    return this.applyStateMutation(
      resolveActionValue(action, ctx) as StateSetAction | StateAppendAction | StateMergeAction,
    );
  ```

- **Lines 145-153**: `applyStateMutation()` calls `store.setState()`
  ```typescript
  private applyStateMutation(
    action: StateSetAction | StateAppendAction | StateMergeAction | StateToggleAction,
  ): void {
    this.deps.store.setState((s) => reduceStateAction(s, action));
  }
  ```

### Assessment

**Type**: LIKELY NOT A BUG (architecture is correct), but possible in specific scenarios

**Severity**: Critical - breaks reactive UI patterns if confirmed

### Possible Root Causes

After thorough code review, the architecture appears **correct** and **should work**:

1. ✅ Store has proper subscription mechanism
2. ✅ Dispatcher calls `store.setState()` when `state.set` action fires
3. ✅ PreviewRenderer subscribes to store changes
4. ✅ Store subscription triggers `forceTick` update
5. ✅ DataContext is recreated on each render with fresh state
6. ✅ `visibleWhen` expressions are evaluated per-render with DataContext
7. ✅ `resolveNodeProps()` returns correct `visible` value based on expression

**However, possible issues could be**:

1. **Type mismatch**: `state.view.loginMode` vs `state.data.loginMode`
   - User's `state.set({loginMode: 'password'})` sets to `data` (top-level)
   - But `visibleWhen` references `state.view.loginMode` (should use different path)
   - Needs verification of which state bucket was intended

2. **DataContext dependency issue** (unlikely but possible):
   - Line 184 has `storeRef.current.getState()` in useMemo dependencies
   - `getState()` returns a new reference each call, even if state unchanged
   - Could cause unnecessary recalculations but shouldn't break visibility

3. **Expression evaluation context**:
   - Verify that `{{ state.view.loginMode === 'password' }}` actually gets the current state value
   - Could be a stale closure or evaluation timing issue

### Recommended Verification Steps

1. **Test the actual behavior**:
   - Create a test screen with:
     - Button with `onClick: state.set({ view.loginMode: 'password' })`
     - Text element with `visibleWhen: {{ state.view.loginMode === 'password' }}`
   - Click button in preview mode and observe if text appears

2. **Check state.set parameter**:
   - Verify `state.set()` call uses correct state path
   - Should be `state.set({ view: { loginMode: 'password' } })` or similar
   - NOT `state.set({ loginMode: 'password' })` which would set at top level

3. **Add debug logging**:
   - In `resolveNodeProps()`, log expression evaluation result
   - In `PreviewRenderer`, log when store subscription fires
   - Verify chain of events fires correctly

4. **Check for timing issues**:
   - Verify no async delays between `state.set` and re-render
   - Check if effect.fetch is interfering with state updates

### Recommended Fixes

If issue is confirmed to exist:

1. **Add explicit state path documentation**:
   - Clarify that `state.set` sets to `state.data` by default
   - For `state.view` changes, use `state.set({ view: { key: value } })`

2. **Consider adding state.view.set action type**:
   - Easier API: `{ type: 'state.view.set', path: 'loginMode', value: 'password' }`
   - Reduces confusion about data vs view state

3. **Add warning for common mistakes**:
   - Log warning if `visibleWhen` references undefined paths
   - Help user identify state path mismatches

---

## File Structure Summary

### Issue 1 Related Files
- `features/design-schema/src/registry/primitives.ts` (Lines 26-40, 377-379)
- `features/design-operations/src/operations/element.ts` (Lines 53-162, 186-248)

### Issue 2 Related Files
- `apps/design-mcp/src/tools/domain/canvas.ts` (export_and_apply handler)
- `features/design-operations/src/operations/material.ts` (Lines 22-131)

### Issue 3 Related Files
- `features/design-engine/src/preview/PreviewRenderer.tsx` (Lines 84-90, 181-185)
- `features/design-engine/src/state/Store.ts` (Lines 17-68)
- `features/design-engine/src/state/Dispatcher.ts` (Lines 84-90, 145-153)
- `features/design-engine/src/styles/resolveProps.ts` (Lines 52-59)

