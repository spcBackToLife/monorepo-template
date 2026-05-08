import { useMemo } from 'react';
import type { Screen, ComponentNode } from '@globallink/design-schema';

export interface PanoramaCombination {
  id: string;
  label: string;
  /** Category for filtering and grouping */
  category: 'interaction' | 'custom';
  /** Override globalStates for this cell */
  globalStates: Record<string, string>;
  /** For component panorama: force this state on the target node */
  interactionPreview?: { nodeId: string; state: string };
}

/** Built-in interaction states that every element has */
const INTERACTION_STATES = ['default', 'hover', 'pressed', 'focus', 'disabled'];

const STATE_LABELS: Record<string, string> = {
  default: '默认',
  hover: '悬浮',
  pressed: '按下',
  active: '按下',
  focus: '聚焦',
  disabled: '禁用',
};

function findNode(node: ComponentNode, id: string): ComponentNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Compute cartesian product of multiple arrays */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]],
  );
}

/** Max combination count for page panorama */
const MAX_COMBINATIONS = 50;

/**
 * Compute panorama combinations.
 * - Component mode: enumerate all states of the target node (interaction + custom)
 * - Page mode: enumerate all domain state value combinations (cartesian product)
 */
export function usePanoramaCombinations(
  screen: Screen | undefined,
  targetNodeId: string | null,
  currentGlobalStates: Record<string, string>,
): PanoramaCombination[] {
  return useMemo(() => {
    if (!screen) return [];

    // ===== Component Panorama =====
    if (targetNodeId) {
      const node = findNode(screen.rootNode, targetNodeId);
      if (!node) return [];

      const result: PanoramaCombination[] = [];

      // Interaction states
      for (const state of INTERACTION_STATES) {
        result.push({
          id: `interaction-${state}`,
          label: STATE_LABELS[state] ?? state,
          category: 'interaction',
          globalStates: { ...currentGlobalStates },
          interactionPreview: { nodeId: targetNodeId, state },
        });
      }

      // Custom business states
      const customStates = (node.states ?? []).filter(
        (s) => s.name !== 'default' && !INTERACTION_STATES.includes(s.name),
      );
      for (const s of customStates) {
        result.push({
          id: `custom-${s.name}`,
          label: s.name,
          category: 'custom',
          globalStates: { ...currentGlobalStates },
          interactionPreview: { nodeId: targetNodeId, state: s.name },
        });
      }

      return result;
    }

    // ===== Page Panorama =====
    // v2：按"屏幕级 view 变量中带 enum 的"做笛卡尔积。
    // 无 enum 变量则退化为单格当前态预览。
    const enumViewDefs = Object.values(screen.stateInit?.view ?? {}).filter(
      (v) => Array.isArray(v.enum) && v.enum.length > 0,
    );
    if (enumViewDefs.length === 0) {
      return [
        {
          id: 'page-default',
          label: '当前状态',
          category: 'custom' as const,
          globalStates: { ...currentGlobalStates },
        },
      ];
    }

    interface ComboItem {
      varName: string;
      value: unknown;
      label: string;
    }

    // Full cartesian product of all enum view variables
    const valueArrays: ComboItem[][] = enumViewDefs.map((vv) =>
      (vv.enum ?? []).map((opt) => ({
        varName: vv.name,
        value: opt.value,
        label: opt.label || String(opt.value),
      })),
    );

    const allCombinations = cartesianProduct<ComboItem>(valueArrays);

    // Cap at MAX_COMBINATIONS
    const capped = allCombinations.slice(0, MAX_COMBINATIONS);

    return capped.map((combo, i) => ({
      id: `page-${i}`,
      label: combo.map((c) => c.label).join(' · '),
      category: 'custom' as const,
      globalStates: {
        ...currentGlobalStates,
        ...Object.fromEntries(
          combo.map((c) => [
            c.varName,
            typeof c.value === 'string' ? c.value : JSON.stringify(c.value),
          ]),
        ),
      },
    }));
  }, [screen, targetNodeId, currentGlobalStates]);
}
