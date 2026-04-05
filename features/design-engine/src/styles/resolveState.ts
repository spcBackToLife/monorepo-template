import type { ComponentNode, CSSProperties } from '@globallink/design-schema';

/**
 * Resolve the active state of a ComponentNode.
 *
 * If the node's activeState matches one of its defined states,
 * merge that state's style/prop overrides onto the base values.
 * Returns the final styles and props.
 */
export function resolveActiveState(node: ComponentNode): {
  styles: CSSProperties;
  props: Record<string, unknown>;
} {
  const baseStyles = { ...node.styles };
  const baseProps = { ...node.props };

  // "default" means no state override
  if (!node.activeState || node.activeState === 'default') {
    return { styles: baseStyles, props: baseProps };
  }

  const activeState = node.states?.find((s) => s.name === node.activeState);
  if (!activeState) {
    return { styles: baseStyles, props: baseProps };
  }

  // Merge state overrides
  const mergedStyles = { ...baseStyles, ...activeState.styles };
  const mergedProps = { ...baseProps, ...(activeState.props ?? {}) };

  return { styles: mergedStyles, props: mergedProps };
}
