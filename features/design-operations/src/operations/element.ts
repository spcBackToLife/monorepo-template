import type { DesignProject, ComponentNode, CSSProperties, PrimitiveNodeType } from '@globallink/design-schema';
import {
  generateNodeId,
  deepClone,
  getDefaultStyles,
  isPrimitiveType,
} from '@globallink/design-schema';
import type {
  AddElementOp,
  RemoveElementOp,
  MoveElementOp,
  DuplicateElementOp,
  InsertSubtreeOp,
  RenameNodeOp,
  WrapInContainerOp,
  UnwrapContainerOp,
  ReorderElementOp,
  ChangeElementTypeOp,
  SetNodeVisibilityWhenOp,
  SetNodeLockedOp,
  SetNodeVisibleOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById, findParent, isNodeOrAncestorLocked, walkTree } from '../utils/tree';

/** Create a new ComponentNode with defaults */
function createNode(
  tag: PrimitiveNodeType,
  styles?: CSSProperties,
  props?: Record<string, unknown>,
  explicitId?: string,
): ComponentNode {
  const defaultStyles = isPrimitiveType(tag) ? getDefaultStyles(tag) : {};
  const practicalDefaults: CSSProperties = tag === 'div' ? { width: '200px', height: '50px' } : {};
  return {
    id: explicitId ?? generateNodeId(),
    type: tag as ComponentNode['type'],
    styles: { ...defaultStyles, ...practicalDefaults, ...styles },
    children: [],
    props: props ?? {},
    states: [],
    activeState: 'default',
    events: [],
    locked: false,
    visible: true,
  };
}

/** Find the screen containing a given nodeId */
function findScreenContaining(
  project: DesignProject,
  nodeId: string,
): number {
  for (let i = 0; i < project.screens.length; i++) {
    if (findNodeById(project.screens[i].rootNode, nodeId)) {
      return i;
    }
  }
  return -1;
}

// ===== addElement =====

export function executeAddElement(
  project: DesignProject,
  params: AddElementOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screenIdx = findScreenContaining(newProject, params.parentId);
  if (screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const parent = findNodeById(newProject.screens[screenIdx].rootNode, params.parentId);
  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.children) {
    parent.children = [];
  }

  if (params.elementId) {
    for (const s of newProject.screens) {
      if (findNodeById(s.rootNode, params.elementId)) {
        return {
          project,
          result: {
            success: false,
            description: `Node id ${params.elementId} already exists`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} },
        };
      }
    }
  }

  const newNode = createNode(params.tag, params.styles, params.props, params.elementId);
  const position = params.position ?? parent.children.length;
  parent.children.splice(position, 0, newNode);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added ${params.tag} element to ${params.parentId}`,
      affectedNodeIds: [newNode.id, params.parentId],
    },
    inverse: {
      type: 'removeElement',
      params: { elementId: newNode.id },
    },
  };
}

// ===== removeElement =====

export function executeRemoveElement(
  project: DesignProject,
  params: RemoveElementOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  // Find parent across all screens
  let parentInfo: { parent: ComponentNode; index: number } | undefined;
  let screenIdx = -1;

  for (let i = 0; i < newProject.screens.length; i++) {
    const root = newProject.screens[i].rootNode;
    if (root.id === params.elementId) {
      return {
        project,
        result: { success: false, description: 'Cannot remove root node of a screen', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    const result = findParent(root, params.elementId);
    if (result) {
      parentInfo = result;
      screenIdx = i;
      break;
    }
  }

  if (!parentInfo || screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Element ${params.elementId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Save the removed node for inverse
  const removedNode = deepClone(parentInfo.parent.children![parentInfo.index]);
  parentInfo.parent.children!.splice(parentInfo.index, 1);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed element ${params.elementId}`,
      affectedNodeIds: [params.elementId, parentInfo.parent.id],
    },
    inverse: {
      type: '_restoreElement',
      params: {
        parentId: parentInfo.parent.id,
        position: parentInfo.index,
        node: removedNode,
      },
    },
  };
}

// ===== moveElement =====

export function executeMoveElement(
  project: DesignProject,
  params: MoveElementOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  // Find current parent
  let oldParentInfo: { parent: ComponentNode; index: number } | undefined;
  for (const screen of newProject.screens) {
    const result = findParent(screen.rootNode, params.elementId);
    if (result) {
      oldParentInfo = result;
      break;
    }
  }

  if (!oldParentInfo) {
    return {
      project,
      result: { success: false, description: `Element ${params.elementId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  let moveScreenRoot: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    if (findNodeById(screen.rootNode, params.elementId)) {
      moveScreenRoot = screen.rootNode;
      break;
    }
  }
  if (moveScreenRoot && isNodeOrAncestorLocked(moveScreenRoot, params.elementId)) {
    return {
      project,
      result: { success: false, description: '无法移动已锁定（或祖先已锁定）的节点', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (moveScreenRoot && isNodeOrAncestorLocked(moveScreenRoot, params.newParentId)) {
    return {
      project,
      result: { success: false, description: '无法移动到已锁定子树内', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Remove from old parent
  const [movedNode] = oldParentInfo.parent.children!.splice(oldParentInfo.index, 1);

  // Find new parent
  let newParent: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    newParent = findNodeById(screen.rootNode, params.newParentId);
    if (newParent) break;
  }

  if (!newParent) {
    return {
      project,
      result: { success: false, description: `New parent ${params.newParentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!newParent.children) {
    newParent.children = [];
  }

  const position = params.position ?? newParent.children.length;
  newParent.children.splice(position, 0, movedNode);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Moved element ${params.elementId} to ${params.newParentId}`,
      affectedNodeIds: [params.elementId, oldParentInfo.parent.id, params.newParentId],
    },
    inverse: {
      type: 'moveElement',
      params: {
        elementId: params.elementId,
        newParentId: oldParentInfo.parent.id,
        position: oldParentInfo.index,
      },
    },
  };
}

// ===== insertSubtree (paste) =====

export function executeInsertSubtree(
  project: DesignProject,
  params: InsertSubtreeOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screenIdx = findScreenContaining(newProject, params.parentId);
  if (screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const parent = findNodeById(newProject.screens[screenIdx].rootNode, params.parentId);
  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.children) {
    parent.children = [];
  }

  const cloned = deepClone(params.subtree);
  // Preserve provided IDs for deterministic replay.
  // Callers must pre-generate unique IDs before creating this operation.

  const position = params.position ?? parent.children.length;
  const safePos = Math.max(0, Math.min(position, parent.children.length));
  parent.children.splice(safePos, 0, cloned);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: 'Inserted subtree',
      affectedNodeIds: [cloned.id, params.parentId],
    },
    inverse: {
      type: 'removeElement',
      params: { elementId: cloned.id },
    },
  };
}

// ===== duplicateElement =====

export function executeDuplicateElement(
  project: DesignProject,
  params: DuplicateElementOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  let parentInfo: { parent: ComponentNode; index: number } | undefined;
  for (const screen of newProject.screens) {
    const result = findParent(screen.rootNode, params.elementId);
    if (result) {
      parentInfo = result;
      break;
    }
  }

  if (!parentInfo) {
    return {
      project,
      result: { success: false, description: `Element ${params.elementId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const originalNode = parentInfo.parent.children![parentInfo.index];
  const cloned = deepClone(originalNode);

  // Regenerate all IDs in the cloned tree
  walkTree(cloned, (n) => {
    n.id = generateNodeId();
  });

  // Insert right after the original
  parentInfo.parent.children!.splice(parentInfo.index + 1, 0, cloned);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Duplicated element ${params.elementId}`,
      affectedNodeIds: [params.elementId, cloned.id, parentInfo.parent.id],
    },
    inverse: {
      type: 'removeElement',
      params: { elementId: cloned.id },
    },
  };
}

// ===== renameNode =====

export function executeRenameNode(
  project: DesignProject,
  params: RenameNodeOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldName = node.name ?? '';
  const nextName = params.name.trim();
  node.name = nextName.length > 0 ? nextName : undefined;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Renamed node ${params.nodeId} to "${node.name ?? '未命名'}"`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'renameNode',
      params: { nodeId: params.nodeId, name: oldName },
    },
  };
}

// ===== wrapInContainer =====

export function executeWrapInContainer(
  project: DesignProject,
  params: WrapInContainerOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  if (params.nodeIds.length === 0) {
    return {
      project,
      result: { success: false, description: 'No node IDs provided', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);

  // All nodes must share the same parent
  const screenIdx = findScreenContaining(newProject, params.nodeIds[0]);
  if (screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeIds[0]} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const root = newProject.screens[screenIdx].rootNode;
  const firstParentInfo = findParent(root, params.nodeIds[0]);
  if (!firstParentInfo) {
    return {
      project,
      result: { success: false, description: `Parent of node ${params.nodeIds[0]} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const parent = firstParentInfo.parent;

  // Verify all nodes share the same parent
  for (const nodeId of params.nodeIds) {
    const info = findParent(root, nodeId);
    if (!info || info.parent.id !== parent.id) {
      return {
        project,
        result: { success: false, description: `All nodes must share the same parent. Node ${nodeId} has a different parent.`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
  }

  // Collect indices and sort them
  const indices: number[] = [];
  for (const nodeId of params.nodeIds) {
    const idx = parent.children!.findIndex((c) => c.id === nodeId);
    if (idx === -1) {
      return {
        project,
        result: { success: false, description: `Node ${nodeId} not found in parent's children`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    indices.push(idx);
  }
  indices.sort((a, b) => a - b);

  // Create the container node
  const containerTag = params.containerTag ?? 'div';
  const container = createNode(containerTag, params.containerStyles);

  // Extract nodes from parent (remove from highest index first to preserve indices)
  const nodesToWrap: ComponentNode[] = [];
  for (let i = indices.length - 1; i >= 0; i--) {
    const [removed] = parent.children!.splice(indices[i], 1);
    nodesToWrap.unshift(removed);
  }

  // Add extracted nodes as children of the container
  container.children = nodesToWrap;

  // Insert container at the position of the first extracted node
  parent.children!.splice(indices[0], 0, container);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Wrapped ${params.nodeIds.length} element(s) in a ${containerTag} container`,
      affectedNodeIds: [container.id, parent.id, ...params.nodeIds],
    },
    inverse: {
      type: 'unwrapContainer',
      params: { containerId: container.id },
    },
  };
}

// ===== unwrapContainer =====

export function executeUnwrapContainer(
  project: DesignProject,
  params: UnwrapContainerOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  // Find the container's parent
  let parentInfo: { parent: ComponentNode; index: number } | undefined;
  let screenIdx = -1;

  for (let i = 0; i < newProject.screens.length; i++) {
    const root = newProject.screens[i].rootNode;
    if (root.id === params.containerId) {
      return {
        project,
        result: { success: false, description: 'Cannot unwrap root node of a screen', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    const result = findParent(root, params.containerId);
    if (result) {
      parentInfo = result;
      screenIdx = i;
      break;
    }
  }

  if (!parentInfo || screenIdx === -1) {
    return {
      project,
      result: { success: false, description: `Container ${params.containerId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const container = parentInfo.parent.children![parentInfo.index];
  const children = container.children ?? [];
  const childIds = children.map((c) => c.id);
  const containerStyles = deepClone(container.styles);
  const containerTag = container.type;

  // Remove the container and insert its children at the same position
  parentInfo.parent.children!.splice(parentInfo.index, 1, ...children);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Unwrapped container ${params.containerId}, releasing ${children.length} child(ren)`,
      affectedNodeIds: [params.containerId, parentInfo.parent.id, ...childIds],
    },
    inverse: {
      type: 'wrapInContainer',
      params: {
        nodeIds: childIds,
        containerTag: containerTag,
        containerStyles: containerStyles,
      },
    },
  };
}

// ===== reorderElement =====

export function executeReorderElement(
  project: DesignProject,
  params: ReorderElementOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  let parent: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    parent = findNodeById(screen.rootNode, params.parentId);
    if (parent) break;
  }

  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.children) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentId} has no children`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const currentIndex = parent.children.findIndex((c) => c.id === params.nodeId);
  if (currentIndex === -1) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found in parent ${params.parentId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  let reorderScreenRoot: ComponentNode | undefined;
  for (const s of newProject.screens) {
    if (findNodeById(s.rootNode, params.parentId)) {
      reorderScreenRoot = s.rootNode;
      break;
    }
  }
  if (reorderScreenRoot && isNodeOrAncestorLocked(reorderScreenRoot, params.nodeId)) {
    return {
      project,
      result: { success: false, description: '无法重排已锁定（或祖先已锁定）的节点', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Remove from current position and insert at new position
  const [node] = parent.children.splice(currentIndex, 1);
  const clampedIndex = Math.min(params.newIndex, parent.children.length);
  parent.children.splice(clampedIndex, 0, node);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Reordered element ${params.nodeId} from index ${currentIndex} to ${clampedIndex}`,
      affectedNodeIds: [params.nodeId, params.parentId],
    },
    inverse: {
      type: 'reorderElement',
      params: {
        nodeId: params.nodeId,
        parentId: params.parentId,
        newIndex: currentIndex,
      },
    },
  };
}

// ===== changeElementType =====

export function executeChangeElementType(
  project: DesignProject,
  params: ChangeElementTypeOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldType = node.type as PrimitiveNodeType;
  node.type = params.newType as ComponentNode['type'];

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Changed element ${params.nodeId} type from ${oldType} to ${params.newType}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'changeElementType',
      params: {
        nodeId: params.nodeId,
        newType: oldType,
      },
    },
  };
}

// ===== setNodeVisibilityWhen =====

export function executeSetNodeVisibilityWhen(
  project: DesignProject,
  params: SetNodeVisibilityWhenOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous =
    node.visibilityWhen === undefined ? null : { ...node.visibilityWhen };

  if (params.visibilityWhen === null) {
    delete node.visibilityWhen;
  } else {
    node.visibilityWhen = { ...params.visibilityWhen };
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated visibility rule on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'setNodeVisibilityWhen',
      params: {
        nodeId: params.nodeId,
        visibilityWhen: previous,
      },
    },
  };
}

// ===== setNodeLocked / setNodeVisible (W7-023) =====

export function executeSetNodeLocked(
  project: DesignProject,
  params: SetNodeLockedOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = node.locked;
  node.locked = params.locked;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set locked=${params.locked} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'setNodeLocked',
      params: { nodeId: params.nodeId, locked: previous },
    },
  };
}

export function executeSetNodeVisible(
  project: DesignProject,
  params: SetNodeVisibleOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  let node: ComponentNode | undefined;
  for (const screen of newProject.screens) {
    node = findNodeById(screen.rootNode, params.nodeId);
    if (node) break;
  }

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = node.visible;
  node.visible = params.visible;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set visible=${params.visible} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'setNodeVisible',
      params: { nodeId: params.nodeId, visible: previous },
    },
  };
}
