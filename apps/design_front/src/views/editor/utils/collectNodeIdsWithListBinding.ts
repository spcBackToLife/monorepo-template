import type { ComponentNode } from '@globallink/design-schema';

/**
 * 收集子树中启用了列表绑定（v2.1 `node.repeat = { expression, template }`）的节点 id，用于画布 ≡ 角标。
 *
 * 需要同时考察两个子结构：
 *   1. 常规 `children`（静态装饰）
 *   2. `repeat.template` 子树（每 item 模板也可能嵌套列表）
 */
export function collectNodeIdsWithListBinding(root: ComponentNode): string[] {
  const out: string[] = [];
  const walk = (n: ComponentNode) => {
    const r = n.repeat;
    if (r && typeof r === 'object' && typeof r.expression === 'string' && r.expression.trim() !== '') {
      out.push(n.id);
    }
    n.children?.forEach(walk);
    if (r?.template) walk(r.template);
  };
  walk(root);
  return out;
}
