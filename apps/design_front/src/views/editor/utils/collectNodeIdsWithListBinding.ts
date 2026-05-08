import type { ComponentNode } from '@globallink/design-schema';

/**
 * 收集子树中启用了列表绑定（v2 node.repeat）的节点 id，用于画布角标。
 *
 * v2 把 v1 的 props.__listData 迁移到 node.repeat: Expression<unknown[]> | string。
 * 只要存在非空的 repeat，就认为是列表容器。
 */
export function collectNodeIdsWithListBinding(root: ComponentNode): string[] {
  const out: string[] = [];
  const walk = (n: ComponentNode) => {
    const repeat = n.repeat;
    if (typeof repeat === 'string' ? repeat.trim() !== '' : repeat != null) {
      out.push(n.id);
    }
    n.children?.forEach(walk);
  };
  walk(root);
  return out;
}
