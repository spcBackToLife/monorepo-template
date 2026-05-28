# Event/Action System Analysis - Design UI Platform

## Overview

This document maps out the complete event/action system in the design-ui monorepo, identifying where action types are defined, executed, and where timer/conditional actions could be integrated.

**Current Date:** May 28, 2026  
**Analysis Scope:** 
- `features/design-engine` - Runtime execution engine
- `features/design-schema` - Type definitions  
- `features/design-codegen` - Code generation (secondary)

---

## 1. ACTION TYPES DEFINITION

### 1.1 Type Definitions Location
**File:** `features/design-schema/src/types/action.ts`

### 1.2 Current Action Type Categories

#### A. State Mutation Actions
```typescript
- state.set      → Set value at path: { type: 'state.set', path: string, value: Expression | unknown }
- state.append   → Append to array at path
- state.remove   → Remove from array (by index or predicate)
- state.merge    → Shallow merge object at path
- state.toggle   → Flip boolean at path
```

#### B. Effect/Async Actions  
```typescript
- effect.fetch   → Execute API call with mock/http routing
  - Contains nested: params, onSuccess[], onError[]
  - Exposes $last context for chaining
- effect.cancel  → Cancel pending fetch
```

#### C. Navigation Actions
```typescript
- nav.go         → Navigate to screen with animation
- nav.back       → Go back in navigation stack
```

#### D. UI/Visual Actions
```typescript
- ui.showToast   → Display toast notification (success|error|warning|info)
- ui.openUrl     → Open URL in tab or window
- ui.delay       → Pause for N milliseconds
- node.setVisualState → Switch node's visualState with optional auto-revert
```

#### E. Extension Actions
```typescript
- custom         → Business-defined action (handler + payload)
```

### 1.3 Event Trigger Types
```typescript
export type EventTrigger =
  | 'click'
  | 'doubleClick'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'longPress'
  | 'screenEnter'
  | 'screenExit'
  | 'screenVisible'
  | 'screenHidden'
  | 'scrollReachBottom'
  | 'scrollReachTop'
  | 'navigateBack'
  | 'change'        // v2 new: form input change
  | 'submit'        // v2 new: form submit
```

### 1.4 Event Condition Pattern (Already Exists!)
```typescript
interface ComponentEvent {
  trigger: EventTrigger;
  actions: Action[];
  condition?: EventCondition;    // ← Conditional execution!
  description?: string;
  disabled?: boolean;
}

interface EventCondition {
  when: Expression<boolean>;     // ← Boolean expression gate
}
```

**Key Finding:** Conditions are already defined in the schema but may not be fully implemented in PreviewRenderer!

---

## 2. ACTION EXECUTION ARCHITECTURE

### 2.1 Dispatcher (Primary Executor)
**File:** `features/design-engine/src/state/Dispatcher.ts`

#### Responsibility
- Takes `Action[]` and executes them **serially** (not parallel)
- Maintains execution context through expressions
- Routes actions to appropriate handlers

#### Execution Flow
```
Dispatcher.run(actions[]) 
  → for each action:
    → runOne(action)
      → switch(action.type):
        - state.* → Reducer → Store.setState()
        - effect.fetch → EffectExecutor.run() → onSuccess/onError chain
        - effect.cancel → EffectExecutor.cancel()
        - nav.go/back → hostAdapters.onNavGo/onNavBack()
        - ui.* → hostAdapters.onShowToast/onOpenUrl/ui.delay()
        - node.setVisualState → hostAdapters.onSetVisualState()
        - custom → hostAdapters.onCustomAction()
```

#### Code Structure
```typescript
private async runOne(action: Action, extraCtx: Partial<EvalContext>): Promise<void> {
  const ctx = this.buildCtx(extraCtx);
  
  switch (action.type) {
    case 'state.set':
      return this.applyStateMutation(resolveActionValue(action, ctx));
    
    case 'effect.fetch':
      return this.runEffectFetch(action, extraCtx);
    
    case 'nav.go':
      this.deps.host?.onNavGo?.(action.targetScreenId, action.animation);
      return;
    
    // ... etc
    
    default:
      console.warn('[Dispatcher] unknown action', action);
  }
}
```

### 2.2 Reducer (State Mutations)
**File:** `features/design-engine/src/state/Reducer.ts`

#### Responsibility
- Pure function: `(oldState, action) → newState`
- Immutable updates via path-based navigation
- Handles: set, append, remove, merge, toggle

#### Path Navigation Syntax
Supports dot notation and bracket indexing:
- `"view.inputDraft"` → view.inputDraft
- `"data.messages[2].text"` → data.messages[2].text
- Auto-creates intermediate objects/arrays

### 2.3 EffectExecutor (Async Side Effects)
**File:** `features/design-engine/src/state/EffectExecutor.ts`

#### Responsibility
- Routes `effect.fetch` to MockDriver or HttpDriver based on env
- Manages AbortController for cancellation
- Returns `EffectStatus: { status: 'pending'|'success'|'error'|'idle', data?, error?, timestamps }`

#### Driver Pattern
```typescript
interface EffectDriver {
  fetch(
    dataSource: ApiDataSource,
    params: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<EffectStatus>
}

// MockDriver: Uses mock.scenarios with statusCode/delay/isTimeout
// HttpDriver: Uses native fetch() with BaseURL + endpoint config
```

#### Effect Lifecycle
```
effect.fetch action
  ↓
Write EffectStatus('pending') → store.effects[dataSourceId]
  ↓
EffectExecutor.run(dataSource, params, signal)
  ↓
  ├─ Success: finalStatus = { status: 'success', data }
  │   ↓
  │   Write status → store
  │   Write data → store.data[dataSource.name]
  │   Expand onSuccess[] chain with $last context
  │
  └─ Error: finalStatus = { status: 'error', error }
      ↓
      Write status → store
      Expand onError[] chain with $last context
```

### 2.4 Store (State Container)
**File:** `features/design-engine/src/state/Store.ts`

#### Interface
```typescript
interface Store {
  getState(): ScreenState;
  setState(updater: (s: ScreenState) => ScreenState): void;
  subscribe(listener: () => void): () => void;
}
```

#### ScreenState Structure
```typescript
{
  data: Record<string, unknown>;      // Data source results
  view: Record<string, unknown>;      // Temporary UI state (drafts, modals, etc)
  effects: Record<string, EffectStatus>;  // Fetch status tracking
}
```

### 2.5 HostAdapters (Environment Delegation)
**File:** `features/design-engine/src/state/Dispatcher.ts` (lines 42-55)

```typescript
interface HostAdapters {
  onNavGo?: (targetScreenId: string, animation?: unknown) => void;
  onNavBack?: () => void;
  onShowToast?: (args: { toastType, message, duration, position }) => void;
  onOpenUrl?: (url: string, openInNewTab?: boolean) => void;
  onSetVisualState?: (nodeId: string, state: string, autoRevertMs?: number) => void;
  onCustomAction?: (handler: string, payload: Record<string, unknown>) => void;
}
```

**Purpose:** Dispatcher delegates non-state actions to the host environment (React PreviewRenderer, compiled framework, etc)

---

## 3. RUNTIME EXECUTION - PreviewRenderer

**File:** `features/design-engine/src/preview/PreviewRenderer.tsx`

### 3.1 Initialization
```typescript
// Per-screen runtime setup
const storeRef = useRef(createStore(buildEditorPreviewState(screen)));
const effectsRef = useRef(new EffectExecutor({ mock, http }, env));
const dispatcher = useMemo(() => new Dispatcher({
  store: storeRef.current,
  effects: effectsRef.current,
  dataSources: screen.dataSources,
  host: hostAdapters,
}), [...]);
```

### 3.2 Life Cycle Events
PreviewRenderer fires lifecycle events by name:
- **screenEnter** - On first render of screen
- **screenExit** - When navigating away (not fully implemented)
- **screenVisible** - When tab becomes visible
- **screenHidden** - When tab hidden
- **scrollReachBottom** - Near bottom of container (threshold + debounce)
- **scrollReachTop** - At top of container
- **navigateBack** - Host calls back callback

```typescript
const fireLifecycleEvents = useCallback(
  async (trigger: string) => {
    const events = (screen.rootNode.events ?? []).filter(
      (e) => e.trigger === trigger && !e.disabled
    );
    for (const event of events) {
      await dispatcher.run(event.actions as Action[]);
    }
  },
  [...]
);
```

### 3.3 Node Event Binding
**File:** `PreviewRenderer.tsx` lines 416-469

PreviewRenderer walks the node tree and binds React event handlers:

```typescript
// For each node's events array:
for (const event of effectiveNode.events ?? []) {
  if (event.disabled) continue;
  
  if (event.trigger === 'click') {
    handlers.onClick = (e) => {
      prev?.(e);
      dispatcher.run(event.actions as Action[]);  // ← Execute action chain
    };
  } else if (event.trigger === 'doubleClick') {
    handlers.onDoubleClick = () => dispatcher.run(event.actions);
  } else if (event.trigger === 'change') {
    propsForRender.onChange = (e) => {
      prev?.(e);
      dispatcher.run(event.actions);
    };
  } else if (event.trigger === 'submit') {
    handlers.onSubmit = (e) => {
      e.preventDefault();
      dispatcher.run(event.actions);
    };
  }
  // hover / longPress handled via CSSPseudoInjector (separate)
}
```

**⚠️ MISSING:** No event.condition evaluation here! Conditions are defined in schema but never checked.

### 3.4 Controlled Binding (state.bind)
```typescript
if (bindPath) {
  const value = getByPath(dataContext.state, bindPath);
  propsForRender.onChange = (e) => {
    dispatcher.run([{ type: 'state.set', path: bindPath, value: e.target.value }]);
  };
}
```

---

## 4. EXPRESSION EVALUATION

### 4.1 Expression Engine
**File:** `features/design-engine/src/expression/`

#### Types Supported
```typescript
type Expression<T = unknown> = string;  // Template: "{{ ... }}" or bare "expression"

// Templates: "{{ state.view.x + 1 }}"
// Bare:      "state.view.x === 'open'"   (for conditions)
```

#### Compilation & Evaluation
```typescript
// Compile expression string → function
const compiled = compileExpression("{{ state.data.count }}");
const result = compiled(ctx);  // ctx = { state, item?, index?, parent? }

// Bare expression (no {{ }})
evaluateExpression("state.view.x > 5", ctx);
```

### 4.2 EvalContext
```typescript
interface EvalContext {
  state: ScreenState;
  item?: unknown;        // Current item in list repeat
  index?: number;        // Current index in repeat
  parent?: unknown;      // Parent scope in nested repeats
  $last?: EffectStatus;  // Last effect result (onSuccess/onError context)
}
```

---

## 5. ENTRY POINTS FOR TIMER & CONDITIONAL ACTIONS

### 5.1 Event Condition Evaluation ✅ IMPLEMENTED

**Status:** Completed in PreviewRenderer - Both node-level events and lifecycle events now evaluate conditions before firing!

**Implementation Details:**

Both node-level events and lifecycle events now check conditions before firing:

```typescript
// Helper for node events (line 458-471)
const shouldFireEvent = (event: typeof effectiveNode.events[0]) => {
  if (event.condition?.when) {
    try {
      const conditionFn = compileExpression(event.condition.when);
      const result = conditionFn(dataContext);
      return result !== false && result !== 0 && result !== '' && result !== null && result !== undefined;
    } catch (err) {
      console.warn('[PreviewRenderer] event condition evaluation failed:', err, event);
      return true;
    }
  }
  return true;
};

// Usage: wrap dispatcher.run with condition check
if (shouldFireEvent(event)) {
  dispatcher.run(event.actions as Action[]);
}

// For lifecycle events: integrated into fireLifecycleEvents() function
```

### 5.2 Timer Action Integration Point

#### Option A: New Action Type (Recommended)
Define in `features/design-schema/src/types/action.ts`:

```typescript
// Timer control actions
export interface UiStartTimerAction {
  type: 'ui.startTimer';
  timerId: string;          // Unique identifier
  duration: number;         // ms
  interval?: number;        // Optional: fire every N ms until duration
  onTick?: Action[];        // Actions to run each tick
  onComplete?: Action[];    // Actions when timer finishes
  autoCancel?: boolean;     // Cancel if another startTimer same id
}

export interface UiStopTimerAction {
  type: 'ui.stopTimer';
  timerId: string;
}

export interface UiResetTimerAction {
  type: 'ui.resetTimer';
  timerId: string;
}

// Add to Action union:
export type Action = 
  | // ... existing types
  | UiStartTimerAction
  | UiStopTimerAction
  | UiResetTimerAction;
```

#### Option B: Implement in Dispatcher

**File:** `features/design-engine/src/state/Dispatcher.ts`

Add timer manager:
```typescript
export class TimerManager {
  private timers = new Map<string, {
    timeoutId: ReturnType<typeof setTimeout>;
    intervalId?: ReturnType<typeof setInterval>;
    startTime: number;
    duration: number;
  }>();

  async run(
    action: UiStartTimerAction,
    dispatcher: Dispatcher,
    ctx: EvalContext
  ): Promise<void> {
    // Cancel any existing timer with same id
    this.stop(action.timerId);
    
    const startTime = Date.now();
    
    if (action.interval) {
      // Repeated firing
      let elapsedTicks = 0;
      const intervalId = setInterval(async () => {
        if (action.onTick) {
          await dispatcher.run(action.onTick, ctx);
        }
        elapsedTicks++;
      }, action.interval);
      
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (action.onComplete) {
          dispatcher.run(action.onComplete, ctx);
        }
        this.timers.delete(action.timerId);
      }, action.duration);
      
      this.timers.set(action.timerId, { timeoutId, intervalId, startTime, duration: action.duration });
    } else {
      // Single fire after duration
      const timeoutId = setTimeout(() => {
        if (action.onComplete) {
          dispatcher.run(action.onComplete, ctx);
        }
        this.timers.delete(action.timerId);
      }, action.duration);
      
      this.timers.set(action.timerId, { timeoutId, startTime, duration: action.duration });
    }
  }
  
  stop(timerId: string): void {
    const timer = this.timers.get(timerId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      if (timer.intervalId) clearInterval(timer.intervalId);
      this.timers.delete(timerId);
    }
  }
  
  getStatus(timerId: string): { elapsed: number; remaining: number } | null {
    const timer = this.timers.get(timerId);
    if (!timer) return null;
    const elapsed = Date.now() - timer.startTime;
    return { elapsed, remaining: Math.max(0, timer.duration - elapsed) };
  }
}
```

Integration in Dispatcher:
```typescript
export class Dispatcher {
  private timerManager = new TimerManager();
  
  private async runOne(action: Action, extraCtx: Partial<EvalContext>): Promise<void> {
    const ctx = this.buildCtx(extraCtx);
    
    switch (action.type) {
      // ... existing cases
      
      case 'ui.startTimer':
        return this.timerManager.run(action, this, ctx);
      case 'ui.stopTimer':
        this.timerManager.stop(action.timerId);
        return;
      case 'ui.resetTimer':
        // Stop and restart
        this.timerManager.stop(action.timerId);
        return;
    }
  }
}
```

### 5.3 Conditional Action Integration Point

#### Option A: Logic.if Action Type
```typescript
export interface LogicIfAction {
  type: 'logic.if';
  condition: Expression<boolean>;
  then: Action[];
  else?: Action[];
}

export interface LogicSwitchAction {
  type: 'logic.switch';
  expression: Expression;
  cases: Array<{
    when: Expression;
    actions: Action[];
  }>;
  default?: Action[];
}
```

#### Option B: Implement in Dispatcher
```typescript
case 'logic.if': {
  const condFn = compileExpression(action.condition);
  const result = condFn(ctx);
  if (result) {
    await this.run(action.then, extraCtx);
  } else if (action.else) {
    await this.run(action.else, extraCtx);
  }
  return;
}

case 'logic.switch': {
  const exprFn = compileExpression(action.expression);
  const value = exprFn(ctx);
  
  for (const c of action.cases) {
    const whenFn = compileExpression(c.when);
    if (whenFn(ctx)) {
      await this.run(c.actions, extraCtx);
      return;
    }
  }
  
  if (action.default) {
    await this.run(action.default, extraCtx);
  }
  return;
}
```

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Fix Event Condition Evaluation ✓ QUICK WIN
- [ ] Modify PreviewRenderer event loop (line ~439)
- [ ] Add condition check before dispatcher.run()
- [ ] Add unit test for condition evaluation

### Phase 2: Add Timer Actions 
- [ ] Define UiStartTimerAction, UiStopTimerAction in design-schema
- [ ] Implement TimerManager in design-engine
- [ ] Integrate into Dispatcher.runOne()
- [ ] Add HostAdapter hook for timer lifecycle
- [ ] Unit tests in dispatcher.test.ts

### Phase 3: Add Conditional Logic Actions
- [ ] Define LogicIfAction, LogicSwitchAction in design-schema
- [ ] Implement logic action handlers in Dispatcher
- [ ] Expression evaluation tests
- [ ] End-to-end test with nested conditions

### Phase 4: Update Codegen (design-codegen)
- [ ] Parser: Handle new action types
- [ ] Adapters: Generate equivalent TypeScript/React code
- [ ] Test codegen output

---

## 7. KEY PATTERNS & DESIGN DECISIONS

### 7.1 Serial Execution
Actions execute **one-by-one**, not in parallel:
```typescript
async run(actions: Action[] | undefined) {
  for (const action of actions) {
    await this.runOne(action, extraCtx);
  }
}
```

**Implication:** Each action sees the state mutations from previous actions.

### 7.2 Context Threading
Context carries through the chain:
```typescript
await dispatcher.run(actions, { item: currentItem, index: i });
```

Nested actions can access parent item/index via `{{ item }}` / `{{ index }}`.

### 7.3 $last Binding
Special `$last` variable captures effect result:
```typescript
onSuccess: [
  {
    type: 'state.append',
    path: 'data.messages',
    value: '{{ $last.data.reply }}'  // ← Access effect response
  }
]
```

### 7.4 Expression Evaluation Two Styles
1. **Template:** `"{{ state.view.x + 1 }}"` → resolves in {{ }}
2. **Bare:** `"state.view.x === 5"` → entire string is expression (for conditions)

### 7.5 No Revert/Rollback
If an action fails, the state doesn't revert. Previous mutations persist.

---

## 8. FILES MODIFIED FOR EACH FEATURE

### For Event Condition Evaluation
```
features/design-engine/src/preview/PreviewRenderer.tsx (add condition check ~line 439)
features/design-engine/src/state/__tests__/dispatcher.test.ts (add condition test)
```

### For Timer Actions
```
features/design-schema/src/types/action.ts (add UiStartTimerAction, etc)
features/design-schema/src/types/index.ts (export new types)
features/design-engine/src/state/Dispatcher.ts (add TimerManager, handle new actions)
features/design-engine/src/preview/PreviewRenderer.tsx (optional: expose timer status to UI)
features/design-engine/src/state/__tests__/dispatcher.test.ts (add timer tests)
```

### For Conditional Logic Actions
```
features/design-schema/src/types/action.ts (add LogicIfAction, LogicSwitchAction)
features/design-schema/src/types/index.ts (export new types)
features/design-engine/src/state/Dispatcher.ts (handle logic.if, logic.switch)
features/design-engine/src/state/__tests__/dispatcher.test.ts (add logic tests)
```

---

## 9. EXISTING ASYNC/EFFECT PATTERNS TO LEARN FROM

### 9.1 effect.fetch Pattern
- Uses Promise-based flow
- Returns EffectStatus with typed results
- Supports cancellation via AbortController
- Chains onSuccess/onError
- **Good model for timer actions**

### 9.2 ui.delay Pattern
```typescript
case 'ui.delay':
  await delay(action.duration);
  return;
```

Simple wrapper around Promise. Timers could follow similar pattern but more complex (recurring, cancellable).

### 9.3 HostAdapter Delegation
- Actions outside core state machine delegate to host
- Allows customization per environment (React, Next, compiled, etc)
- **Could add hostAdapters.onTimerStart/Stop for custom implementations**

---

## 10. TESTING PATTERNS

### From dispatcher.test.ts
```typescript
// Setup
const { store, dispatcher, effects, host } = setup([dataSources]);

// Execute
await dispatcher.run([
  { type: 'effect.fetch', dataSourceId: 'id', onSuccess: [...] }
]);

// Assert
expect(store.getState().effects['id'].status).toBe('success');
expect(host.onShowToast).toHaveBeenCalledTimes(1);
```

**Pattern for timer tests:**
```typescript
it('ui.startTimer fires onTick multiple times', async () => {
  const onTick = mock(() => {});
  await dispatcher.run([{
    type: 'ui.startTimer',
    timerId: 'test',
    duration: 100,
    interval: 25,
    onTick: [{ type: 'custom', handler: 'onTick' }]
  }]);
  
  await new Promise(r => setTimeout(r, 110));
  expect(host.onCustomAction).toHaveBeenCalledTimes(4);
});
```

---

## 11. QUICK REFERENCE: ACTION HANDLER LOCATIONS

| Action | Handler Location | Type |
|--------|------------------|------|
| state.* | Reducer.ts | Pure sync |
| effect.fetch | EffectExecutor.ts | Async Promise |
| effect.cancel | EffectExecutor.ts | Sync |
| nav.go/back | Dispatcher → hostAdapters | Delegated |
| ui.showToast | Dispatcher → hostAdapters | Delegated |
| ui.openUrl | Dispatcher → hostAdapters | Delegated |
| ui.delay | Dispatcher (delay fn) | Async Promise |
| node.setVisualState | Dispatcher → hostAdapters | Delegated |
| custom | Dispatcher → hostAdapters | Delegated |
| **ui.startTimer** | (NEW) Dispatcher → TimerManager | Async Promise |
| **logic.if** | (NEW) Dispatcher | Sync |
| **logic.switch** | (NEW) Dispatcher | Sync |

---

## Summary

The action system is well-architected around a **Dispatcher/Reducer/Store** pattern with:
1. **Type safety** via TypeScript discriminated unions
2. **Async composition** through Promise chains and onSuccess/onError
3. **Expression evaluation** for dynamic behavior
4. **Environmental flexibility** via HostAdapters

**Quick wins:**
1. Add event.condition evaluation to PreviewRenderer (~15 min)
2. Add logic.if/logic.switch in Dispatcher (~30 min)
3. Add timer manager (~1 hour)

All modifications follow existing patterns and don't require architectural changes.
