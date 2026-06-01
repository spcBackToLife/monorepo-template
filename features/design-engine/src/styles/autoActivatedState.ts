/**
 * 共享 helper —— 计算节点的 autoVisualState（v3 ★）。
 *
 * 任何挂在 node.states 上、写了 activeWhen 表达式且求值为 truthy 的态，
 * 视为「业务自动激活」。多个同时为 true 时取 states 数组中第一个匹配的。
 *
 * 在多处需要复用：
 *   - resolveStyles：决定 layer 1.5 styles 叠加
 *   - resolveProps ：决定 layer 1.5 props 叠加（含 textContent 等）
 *   - SchemaRenderer：决定父节点 childrenVisibility / childrenStates 该读哪个 state
 *
 * 这三处此前各写一份 / 漏写一份，导致：
 *   ❌ 父节点 visualState 通过 activeWhen 自动激活后，childrenStates 不生效
 *      （勾选 ✓ 永远不显示等典型场景）
 */
import type { ComponentNode } from '@globallink/design-schema';
import { hasExpression, resolveExpression, type DataContext } from '../data/dataContext';

export function computeAutoActivatedState(
  node: ComponentNode,
  dataContext: DataContext,
): string | null {
  if (!node.states?.length) return null;
  for (const state of node.states) {
    if (state.activeWhen && typeof state.activeWhen === 'string' && hasExpression(state.activeWhen)) {
      const result = resolveExpression(state.activeWhen, dataContext);
      if (result) return state.name;
    }
  }
  return null;
}
