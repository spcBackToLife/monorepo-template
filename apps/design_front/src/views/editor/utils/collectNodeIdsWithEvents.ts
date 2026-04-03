import type { ComponentNode } from '@globallink/design-schema';

/** 遍历子树，收集存在 events 的节点 id（用于画布闪电角标） */
export function collectNodeIdsWithEvents(root: ComponentNode): string[] {
  const out: string[] = [];
  const walk = (n: ComponentNode) => {
    const ev = n.events;
    if (Array.isArray(ev) && ev.length > 0) out.push(n.id);
    n.children?.forEach(walk);
  };
  walk(root);
  return out;
}
