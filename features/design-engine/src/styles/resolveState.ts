import type { ComponentNode, CSSProperties } from '@globallink/design-schema';

/**
 * 解析节点的当前 visualState（activeState）：把对应态的 styles/props 叠在 base 上。
 *
 * 注：返回的 styles 类型仍是 schema CSSProperties（每值可为表达式），调用方拿到后再用
 * resolveStyles 求值并转成 React.CSSProperties。
 */
export function resolveActiveState(node: ComponentNode): {
  styles: CSSProperties;
  props: Record<string, unknown>;
} {
  const baseStyles: CSSProperties = { ...node.styles } as CSSProperties;
  const baseProps = { ...node.props };

  // "default" means no state override
  if (!node.activeState || node.activeState === 'default') {
    return { styles: baseStyles, props: baseProps };
  }

  const activeState = node.states?.find((s) => s.name === node.activeState);
  if (!activeState) {
    return { styles: baseStyles, props: baseProps };
  }

  const mergedStyles: CSSProperties = {
    ...baseStyles,
    ...(activeState.styles as CSSProperties),
  };
  const mergedProps = { ...baseProps, ...(activeState.props ?? {}) };

  return { styles: mergedStyles, props: mergedProps };
}
