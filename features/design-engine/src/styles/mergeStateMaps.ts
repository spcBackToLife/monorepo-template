/**
 * Merge a default-state map with an active-state map.
 * Keys present in `activeMap` override the same keys from `defaultMap`.
 *
 * Semantics for non-default states:
 *   - key exists in activeMap → explicit override for this state
 *   - key absent from activeMap → inherited from defaultMap
 */
export function mergeStateMaps<V>(
  defaultMap: Record<string, V> | undefined,
  activeMap: Record<string, V> | undefined,
): Record<string, V> | undefined {
  if (!defaultMap && !activeMap) return undefined;
  if (!defaultMap) return activeMap;
  if (!activeMap) return defaultMap;
  return { ...defaultMap, ...activeMap };
}
