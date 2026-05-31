import type { ComponentNode } from '@globallink/design-schema';
import type { DataContext } from '../data/dataContext';
import { resolveExpression } from '../data/dataContext';
import { compileExpression } from '@globallink/design-expression';

export interface ResolvedProps {
  props: Record<string, unknown>;
  visible: boolean;
}

/**
 * Props + visibility resolution（4 层）：
 *   1. base:        node.props + node.visible
 *   2. business:    node.states[activeState].props（activeState ≠ 'default'）
 *   3. interaction: hover/active/focus 等 visualState
 *   4. visibleWhen: 表达式驱动的运行时可见性（任一布尔假值即隐藏）
 *
 * 注意：props 不在此层做表达式求值，由调用方走 resolvePropsForRender。
 */
export function resolveNodeProps(
  node: ComponentNode,
  dataContext: DataContext,
  interactionState?: string | null,
  /** State override from parent's childrenStates mapping */
  parentStateOverride?: string | null,
): ResolvedProps {
  // Layer 1: base props + visible
  // undefined 必须视为「可见」，否则旧数据 / 接口若省略 visible 会整棵子树消失
  let mergedProps: Record<string, unknown> = { ...node.props };
  let visible = node.visible !== false;

  // Layer 2: business state (activeState override)
  const effectiveStateName = parentStateOverride ?? node.activeState;
  if (!interactionState && effectiveStateName && effectiveStateName !== 'default') {
    const activeState = node.states?.find((s) => s.name === effectiveStateName);
    if (activeState?.props) {
      mergedProps = { ...mergedProps, ...activeState.props };
    }
  }

  // Layer 3: interaction state (hover / active / focus / ...)
  if (interactionState) {
    let interactionStateObj = node.states?.find((s) => s.name === interactionState);
    if (!interactionStateObj && interactionState === 'active') {
      interactionStateObj = node.states?.find((s) => s.name === 'pressed');
    }
    if (interactionStateObj?.props) {
      mergedProps = { ...mergedProps, ...interactionStateObj.props };
    }
  }

  // Layer 4: visibleWhen — 表达式驱动可见性
  if (visible && node.visibleWhen) {
    const fn = compileExpression(node.visibleWhen);
    const result = fn(dataContext);
    if (result === false || result === 0 || result === '' || result === null || result === undefined) {
      visible = false;
    }
  }

  return { props: mergedProps, visible };
}

/**
 * 在 ctx 下批量求 props 中的表达式字段。
 * 与 dataContext.resolvePropsExpressions 等价，仅作 styles 层一致命名导出。
 */
export function resolvePropsForRender(
  props: Record<string, unknown>,
  ctx: DataContext,
): Record<string, unknown> {
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && /\{\{[\s\S]+?\}\}/.test(v)) {
      out[k] = resolveExpression(v, ctx);
      changed = true;
    } else {
      out[k] = v;
    }
  }
  return changed ? out : props;
}
