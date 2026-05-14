/**
 * Compute Semantics — Determines state/handler ownership.
 *
 * Decides what stays in the page vs. what goes into hooks.
 * No framework logic — purely semantic ownership decisions.
 */

import type { PageIR, SplitPlan, HandlerIR } from '../core/types';
import type { EmitSemantics } from './types';

/**
 * Compute the semantic ownership for state and handlers.
 *
 * Rules:
 * - If a hook manages a state variable, page doesn't redeclare it.
 * - If a hook owns a handler, page doesn't redefine it.
 * - Page's onMount is "covered" if a data-fetching hook handles the same data source.
 */
export function computeSemantics(
  pageIR: PageIR,
  plan: SplitPlan,
): EmitSemantics {
  // Build hook → state mapping
  const hookManagedState = new Map<string, string[]>();
  const allHookStateNames = new Set<string>();

  for (const hook of plan.hooks) {
    const varNames = hook.stateVars.map(v => v.name);
    hookManagedState.set(hook.hookName, varNames);
    for (const name of varNames) {
      allHookStateNames.add(name);
    }
  }

  // Build hook → handler mapping
  const hookManagedHandlers = new Map<string, string>();
  const allHookHandlerNames = new Set<string>();

  for (const hook of plan.hooks) {
    if (hook.handler) {
      hookManagedHandlers.set(hook.hookName, hook.handler.name);
      allHookHandlerNames.add(hook.handler.name);
    }
  }

  // Page-owned state = all state minus hook-managed
  const pageOwnedState = [
    ...pageIR.viewState.filter(v => !allHookStateNames.has(v.name)),
    ...pageIR.dataState.filter(d => !allHookStateNames.has(d.name)),
  ];

  // Page-owned handlers = all non-screenEnter handlers minus hook-owned
  const pageOwnedHandlers = pageIR.handlers.filter(h =>
    h.trigger !== 'screenEnter' && !allHookHandlerNames.has(h.name),
  );

  // Page needs onMount only if it wasn't absorbed by a data-fetching hook
  const onMountCoveredByHook = plan.hooks.some(
    h => h.reason === 'data-fetching' && h.dataSource !== undefined,
  );
  const pageNeedsOnMount = !!pageIR.onMount && !onMountCoveredByHook;

  return {
    hookManagedState,
    hookManagedHandlers,
    pageOwnedState,
    pageOwnedHandlers,
    pageNeedsOnMount,
  };
}
