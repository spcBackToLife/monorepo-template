import type { ComponentNode } from '@globallink/design-schema';

/**
 * Find a node by ID in a ComponentNode tree.
 * Returns undefined if not found.
 */
export function findNodeById(
  root: ComponentNode,
  nodeId: string,
): ComponentNode | undefined {
  if (root.id === nodeId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Find the parent node of a given nodeId.
 * Returns { parent, index } where index is the child position, or undefined.
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
  return undefined;
}

/**
 * Walk a ComponentNode tree depth-first, calling visitor on each node.
 * If visitor returns false, stop traversal.
 */
export function walkTree(
  node: ComponentNode,
  visitor: (node: ComponentNode) => void | boolean,
): void {
  const result = visitor(node);
  if (result === false) return;
  if (node.children) {
    for (const child of node.children) {
      walkTree(child, visitor);
    }
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
    for (const c of n.children ?? []) {
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
      for (const c of n.children ?? []) walk(c, true);
    } else {
      for (const c of n.children ?? []) walk(c, false);
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
    for (const c of n.children ?? []) walk(c);
  }
  walk(root);
  return out;
}
