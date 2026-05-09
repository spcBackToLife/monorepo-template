import type { ComponentNode } from '@globallink/design-schema';

/**
 * v2.1 节点树遍历约定：
 *   一个节点的"逻辑子节点" = 常规 `children` ∪ `repeat.template`（如果有）。
 *
 * 任何工具函数都应同时考察这两个子结构，否则：
 *   - MCP `style/update` 无法定位 template 子树里的节点
 *   - 画布 hitTest / 锁定 / 注释扫描无法覆盖列表项
 *   - Undo/Redo 无法找到被迁移到 template 下的节点
 *
 * 内部抽出 `iterateChildren(n)` 表达这个语义，所有 walk/find 走同一条路。
 */
function iterateChildren(n: ComponentNode): ComponentNode[] {
  const out: ComponentNode[] = [];
  if (n.children) out.push(...n.children);
  if (n.repeat?.template) out.push(n.repeat.template);
  return out;
}

/**
 * Find a node by ID in a ComponentNode tree.
 * Returns undefined if not found.
 */
export function findNodeById(
  root: ComponentNode,
  nodeId: string,
): ComponentNode | undefined {
  if (root.id === nodeId) return root;
  for (const child of iterateChildren(root)) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Find the parent node of a given nodeId.
 * Returns { parent, index } where index is the child position.
 *
 * v2.1 约定：当子节点位于 `repeat.template` 位置时，`index === -1`。
 * 调用方（move / remove / reorder / wrap / unwrap 等）需要识别 `-1` 并走 template 分支：
 *   - 直接改 `parent.repeat.template` 而非 `parent.children[index]`
 */
export function findParent(
  root: ComponentNode,
  nodeId: string,
): { parent: ComponentNode; index: number } | undefined {
  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      if (root.children[i].id === nodeId) {
        return { parent: root, index: i };
      }
      const found = findParent(root.children[i], nodeId);
      if (found) return found;
    }
  }
  if (root.repeat?.template) {
    const tpl = root.repeat.template;
    if (tpl.id === nodeId) {
      return { parent: root, index: -1 };
    }
    const found = findParent(tpl, nodeId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Walk a ComponentNode tree depth-first, calling visitor on each node.
 * If visitor returns false, stop descending into that node's subtree.
 *
 * 遍历范围覆盖 `children` 与 `repeat.template`。
 */
export function walkTree(
  node: ComponentNode,
  visitor: (node: ComponentNode) => void | boolean,
): void {
  const result = visitor(node);
  if (result === false) return;
  for (const child of iterateChildren(node)) {
    walkTree(child, visitor);
  }
}

/**
 * Find a node across all screens in a project-like structure.
 * Searches every screen's rootNode.
 */
export function findNodeInScreens(
  screens: { rootNode: ComponentNode }[],
  nodeId: string,
): ComponentNode | undefined {
  for (const screen of screens) {
    const found = findNodeById(screen.rootNode, nodeId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Find the parent of a node across all screens.
 */
export function findParentInScreens(
  screens: { rootNode: ComponentNode }[],
  nodeId: string,
): { parent: ComponentNode; index: number; screenIndex: number } | undefined {
  for (let si = 0; si < screens.length; si++) {
    // Check if nodeId is the root node itself (no parent in tree)
    if (screens[si].rootNode.id === nodeId) {
      return undefined;
    }
    const result = findParent(screens[si].rootNode, nodeId);
    if (result) {
      return { ...result, screenIndex: si };
    }
  }
  return undefined;
}

/** 节点自身或任一祖先 locked 时为 true（W7-023） */
export function isNodeOrAncestorLocked(root: ComponentNode, nodeId: string): boolean {
  function walk(n: ComponentNode, ancestorLocked: boolean): boolean | null {
    const L = ancestorLocked || n.locked;
    if (n.id === nodeId) return L;
    for (const c of iterateChildren(n)) {
      const r = walk(c, L);
      if (r !== null) return r;
    }
    return null;
  }
  return walk(root, false) ?? false;
}

/** 画布命中测试需跳过的节点 id：自身 locked 或任一祖先 locked（W7-023） */
export function collectEffectivelyLockedNodeIds(root: ComponentNode): Set<string> {
  const out = new Set<string>();
  function walk(n: ComponentNode, ancestorLocked: boolean) {
    const L = ancestorLocked || n.locked;
    if (L) {
      out.add(n.id);
      for (const c of iterateChildren(n)) walk(c, true);
    } else {
      for (const c of iterateChildren(n)) walk(c, false);
    }
  }
  walk(root, false);
  return out;
}

/** 画布命中时可跳过 annotation，以便在注释标记下拾取真实节点（W7-024） */
export function collectAnnotationNodeIds(root: ComponentNode): Set<string> {
  const out = new Set<string>();
  function walk(n: ComponentNode) {
    if (n.type === 'annotation') out.add(n.id);
    for (const c of iterateChildren(n)) walk(c);
  }
  walk(root);
  return out;
}
