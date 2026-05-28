# Action System Implementation Guide

**Version:** 1.0  
**Last Updated:** May 29, 2026  
**Status:** Complete - All Phases Implemented

This guide documents the event/action system architecture and implementation patterns in design-engine.

## Table of Contents

1. [Overview](#overview)
2. [Action Types](#action-types)
3. [Execution Model](#execution-model)
4. [Implementation Pattern](#implementation-pattern)
5. [Adding New Actions](#adding-new-actions)
6. [Testing](#testing)

---

## Overview

The event/action system provides a declarative way to handle user interactions and side effects in the design UI platform. Actions are small, composable units of work that can be triggered by events and combined into chains.

### Key Characteristics

- **Serial Execution:** Actions run one at a time, in order
- **Expression Support:** All values evaluated using the expression engine
- **Context Threading:** State and local context available throughout chain
- **Type-Safe:** Full TypeScript support with exhaustive checking
- **Extensible:** Easy to add new action types

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ComponentEvent                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ trigger: EventTrigger                                      │ │
│  │ condition?: EventCondition  ← Evaluated first              │ │
│  │ actions: Action[]           ← Executed if condition true   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ PreviewRenderer      │
        │ Evaluates condition  │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Dispatcher.run()    │
        │  Serial execution    │
        └──────────┬───────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
  ┌────────────┐          ┌──────────────┐
  │ Reducers   │          │ Effect       │
  │ (state.*)  │          │ Executor     │
  │            │          │ (effect.*)   │
  └────────────┘          └──────────────┘
```

---

## Action Types

### State Mutation Actions

**Purpose:** Modify application state

```typescript
// Set value at path
{ type: 'state.set', path: 'view.inputDraft', value: '{{ state.data.message }}' }

// Append to array
{ type: 'state.append', path: 'data.items', value: newItem }

// Remove from array (by index or predicate)
{ type: 'state.remove', path: 'data.items', index: 0 }
{ type: 'state.remove', path: 'data.items', predicate: '{{ item.id === targetId }}' }

// Merge object at path
{ type: 'state.merge', path: 'view.filters', value: { type: 'active' } }

// Toggle boolean
{ type: 'state.toggle', path: 'view.isExpanded' }
```

### Effect/Async Actions

**Purpose:** Fetch data or perform side effects

```typescript
// Fetch API data (with optional callbacks)
{
  type: 'effect.fetch',
  dataSourceId: 'api_getUserProfile',
  params: { userId: '{{ state.view.currentUserId }}' },
  onSuccess: [
    { type: 'state.set', path: 'data.user', value: '{{ $last.data }}' }
  ],
  onError: [
    { type: 'ui.showToast', toastType: 'error', message: '{{ $last.error.message }}' }
  ]
}

// Cancel pending fetch
{ type: 'effect.cancel', dataSourceId: 'api_getUserProfile' }
```

### Navigation Actions

**Purpose:** Navigate between screens

```typescript
// Go to screen with optional animation
{ type: 'nav.go', targetScreenId: 'screen_details', animation: { type: 'slide-left' } }

// Go back
{ type: 'nav.back' }
```

### UI Actions

**Purpose:** Display notifications, open URLs, or delays

```typescript
// Show toast notification
{ type: 'ui.showToast', toastType: 'success', message: 'Saved!' }

// Open URL
{ type: 'ui.openUrl', url: 'https://example.com', openInNewTab: true }

// Delay execution
{ type: 'ui.delay', duration: 500 }

// Start timer (with optional looping)
{
  type: 'ui.startTimer',
  timerId: 'countdown',
  duration: 5000,
  onComplete: [
    { type: 'nav.go', targetScreenId: 'screen_home' }
  ]
}

// Stop timer
{ type: 'ui.stopTimer', timerId: 'countdown' }

// Reset timer
{ type: 'ui.resetTimer', timerId: 'countdown' }
```

### Node State Actions

**Purpose:** Change visual state of components

```typescript
{
  type: 'node.setVisualState',
  nodeId: 'button_submit',
  state: 'loading',
  autoRevertMs: 2000  // Revert to 'default' after 2 seconds
}
```

### Logic Actions

**Purpose:** Conditional branching

```typescript
// If-then-else
{
  type: 'logic.if',
  when: '{{ state.data.count > 10 }}',
  then: [
    { type: 'ui.showToast', toastType: 'warning', message: 'Count is high!' }
  ],
  else: [
    { type: 'state.set', path: 'view.warning', value: false }
  ]
}

// Switch statement
{
  type: 'logic.switch',
  value: '{{ state.view.activeTab }}',
  cases: [
    {
      match: 'home',
      actions: [{ type: 'nav.go', targetScreenId: 'screen_home' }]
    },
    {
      match: 'profile',
      actions: [{ type: 'nav.go', targetScreenId: 'screen_profile' }]
    }
  ],
  default: [
    { type: 'ui.showToast', toastType: 'info', message: 'Unknown tab' }
  ]
}
```

### Custom Actions

**Purpose:** Business-defined extensions

```typescript
{
  type: 'custom',
  handler: 'trackEvent',
  payload: { eventName: 'purchase', value: 100 }
}
```

---

## Execution Model

### Serial Execution

Actions execute one-by-one, not in parallel:

```typescript
const actions = [
  { type: 'state.set', path: 'view.loading', value: true },
  { type: 'effect.fetch', dataSourceId: 'api_items' },
  { type: 'state.set', path: 'view.loading', value: false }
];

// Executes in order: 
// 1. Set loading = true
// 2. Fetch completes (and updates state.data via onSuccess)
// 3. Set loading = false
```

### Context Threading

Context carries through the entire chain:

```typescript
// In repeat binding
{
  type: 'state.append',
  path: 'data.selected',
  value: '{{ item }}'  // ← item from repeat context
}

// In onSuccess callback
{
  type: 'state.set',
  path: 'data.user',
  value: '{{ $last.data }}'  // ← $last from effect
}
```

### Expression Evaluation

All expressions evaluated before action execution:

```typescript
// Template syntax: {{ ... }}
'{{ state.view.count + 1 }}'

// Bare expression (for conditions)
'state.view.isOpen === true'

// Functions available
'{{ state.data.items.length > 0 }}'
'{{ state.view.search.toLowerCase() }}'
```

---

## Implementation Pattern

### Adding a New Action Type

#### Step 1: Define the Type

**File:** `features/design-schema/src/types/action.ts`

```typescript
export interface MyCustomAction {
  type: 'my.custom';
  // Properties...
  targetId: string;
  duration?: number;
}
```

#### Step 2: Add to Union

**File:** `features/design-schema/src/types/action.ts`

```typescript
export type Action = 
  | // ... existing types
  | MyCustomAction;
```

#### Step 3: Export Types

**File:** `features/design-schema/src/types/index.ts`

```typescript
export type { MyCustomAction } from './action';
```

#### Step 4: Implement Handler

**File:** `features/design-engine/src/state/Dispatcher.ts`

```typescript
private async runOne(action: Action, extraCtx: Partial<EvalContext>): Promise<void> {
  const ctx = this.buildCtx(extraCtx);
  
  switch (action.type) {
    // ... existing cases
    
    case 'my.custom':
      return this.runMyCustom(action as Extract<Action, { type: 'my.custom' }>, ctx);
  }
}

private runMyCustom(
  action: Extract<Action, { type: 'my.custom' }>,
  ctx: EvalContext,
): void {
  // Implementation...
  console.log(`Running custom action: ${action.targetId}`);
}
```

#### Step 5: Add Codegen Support

**File:** `features/design-engine/src/codegen/reactCodegen.ts`

```typescript
case 'my.custom':
  parts.push(`/* my.custom: ${action.targetId} */`);
  break;

// And in actionSummary():
case 'my.custom':
  return `my.custom:${a.targetId}`;
```

#### Step 6: Add Tests

**File:** `features/design-engine/src/state/__tests__/dispatcher.test.ts`

```typescript
it('should handle my.custom action', async () => {
  const dispatcher = createDispatcher();
  const actions: Action[] = [
    { type: 'my.custom', targetId: 'test' }
  ];
  
  await dispatcher.run(actions);
  // Assert expected behavior
});
```

---

## Adding New Actions

### Timer Actions (Already Implemented ✅)

The timer action system allows scheduling and looping execution:

```typescript
// Single-fire after 2 seconds
{
  type: 'ui.startTimer',
  timerId: 'notification_delay',
  duration: 2000,
  onComplete: [
    { type: 'ui.showToast', toastType: 'info', message: 'Done!' }
  ]
}

// Looping every 1 second for 10 seconds
{
  type: 'ui.startTimer',
  timerId: 'progress_update',
  duration: 10000,
  interval: 1000,
  onTick: [
    { type: 'state.set', path: 'view.progress', value: '{{ state.view.progress + 10 }}' }
  ],
  onComplete: [
    { type: 'state.set', path: 'view.progress', value: 100 }
  ]
}
```

### Logic Actions (Already Implemented ✅)

Conditional branching for complex workflows:

```typescript
// Conditional rendering
{
  type: 'logic.if',
  when: '{{ state.data.userRole === "admin" }}',
  then: [
    { type: 'state.set', path: 'view.showAdminPanel', value: true }
  ]
}

// Multi-branch logic
{
  type: 'logic.switch',
  value: '{{ state.view.currentStep }}',
  cases: [
    { match: 1, actions: [/* step 1 */] },
    { match: 2, actions: [/* step 2 */] }
  ]
}
```

---

## Testing

### Unit Testing Pattern

```typescript
import { Dispatcher } from '@globallink/design-engine';
import type { Store, EffectExecutor } from '@globallink/design-engine';

describe('Dispatcher - Custom Action', () => {
  let dispatcher: Dispatcher;
  let store: Store;

  beforeEach(() => {
    store = createStore();
    dispatcher = new Dispatcher({
      store,
      effects: createEffectExecutor(),
      dataSources: () => undefined,
    });
  });

  it('should execute custom action with payload', async () => {
    const actions = [
      {
        type: 'custom',
        handler: 'trackEvent',
        payload: { name: 'test' }
      }
    ];

    await dispatcher.run(actions);
    // Assert side effects
  });
});
```

### Integration Testing

Test the full flow including events:

```typescript
it('should handle complete event flow with conditions', async () => {
  const screen = {
    rootNode: {
      id: 'button',
      events: [
        {
          trigger: 'click',
          condition: { when: '{{ state.view.isEnabled }}' },
          actions: [
            { type: 'state.set', path: 'view.clicked', value: true }
          ]
        }
      ]
    }
  };

  // Simulate event with condition check
  const shouldFire = evaluateExpression(screen.rootNode.events[0].condition.when, ctx);
  if (shouldFire) {
    await dispatcher.run(screen.rootNode.events[0].actions);
  }
  
  expect(store.getState().view.clicked).toBe(true);
});
```

---

## Performance Considerations

### Timer Management

- Each timer gets a unique ID and auto-cancels previous timer with same ID
- Timers use native setTimeout/setInterval
- No memory leaks: timers deleted when complete

### Expression Evaluation

- Expressions compiled once, executed many times
- Context passed through entire chain efficiently
- No unnecessary re-evaluations

### Serial Execution Benefits

- Predictable state transitions
- Easy to reason about flow
- No race conditions

---

## Common Patterns

### Fetch with Retry

```typescript
{
  type: 'effect.fetch',
  dataSourceId: 'api_data',
  onError: [
    { type: 'ui.showToast', toastType: 'warning', message: 'Retrying...' },
    { type: 'ui.delay', duration: 1000 },
    { type: 'effect.fetch', dataSourceId: 'api_data' }
  ]
}
```

### Loading State

```typescript
{
  type: 'logic.if',
  when: '{{ state.effects.api_data.status === "pending" }}',
  then: [
    { type: 'node.setVisualState', nodeId: 'spinner', state: 'visible' }
  ]
}
```

### Validation

```typescript
{
  type: 'logic.if',
  when: '{{ state.view.email && state.view.email.includes("@") }}',
  then: [
    { type: 'effect.fetch', dataSourceId: 'api_subscribe' }
  ],
  else: [
    { type: 'ui.showToast', toastType: 'error', message: 'Invalid email' }
  ]
}
```

---

## Troubleshooting

### Action Not Executing

1. Check event condition if present
2. Verify action type is supported
3. Check expression evaluation in console
4. Ensure path/value are correctly formed

### Timer Not Working

1. Verify timerId is unique
2. Check duration is > 0
3. Look for console.warn errors
4. Ensure callbacks are valid action arrays

### State Not Updating

1. Check path is correct (use dot notation)
2. Verify value expression evaluates to expected type
3. Check for immutability in state
4. Ensure action runs serially

---

## References

- [design-schema/src/types/action.ts](../features/design-schema/src/types/action.ts)
- [design-engine/src/state/Dispatcher.ts](../features/design-engine/src/state/Dispatcher.ts)
- [EVENT_ACTION_SYSTEM_ANALYSIS.md](./EVENT_ACTION_SYSTEM_ANALYSIS.md)

