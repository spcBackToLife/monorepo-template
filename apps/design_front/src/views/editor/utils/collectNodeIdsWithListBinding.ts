import type { ComponentNode } from '@globallink/design-schema';
import { hasExpression } from '@globallink/design-engine';

/** 子树中配置了 __listData 表达式（列表绑定）的节点 id，用于画布角标 */
export function collectNodeIdsWithListBinding(root: ComponentNode): string[] {
  const out: string[] = [];
  const walk = (n: ComponentNode) => {
    if (hasExpression(n.props?.__listData)) {
      out.push(n.id);
    }
    n.children?.forEach(walk);
  };
  walk(root);
  return out;
}
