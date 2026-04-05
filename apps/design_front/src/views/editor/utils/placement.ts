import type { ComponentNode } from '@globallink/design-schema';
import { findNodeById, findParent } from '@globallink/design-operations';

/** 不能作为「新建子节点」直接父级时，沿树向上找到最近可挂子节点的容器 */
export const PLACEMENT_LEAF_TYPES = new Set<string>([
  'img',
  'input',
  'textarea',
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'a',
  'button',
]);

/**
 * 从当前选中节点出发解析放置父级：选中即父（叶子则上升到可包裹祖先）；与产品文档「选中容器」一致。
 */
export function resolveDrawParentId(
  root: ComponentNode,
  selectedId: string | undefined,
  rootId: string,
): string {
  if (!selectedId) return rootId;
  let id = selectedId;
  for (let d = 0; d < 64; d++) {
    if (id === rootId) return rootId;
    const node = findNodeById(root, id);
    if (!node) return rootId;
    if (!PLACEMENT_LEAF_TYPES.has(node.type)) return id;
    const p = findParent(root, id);
    if (!p) return rootId;
    id = p.parent.id;
  }
  return rootId;
}
