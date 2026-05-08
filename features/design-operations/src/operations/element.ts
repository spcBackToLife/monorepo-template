import type {
  DesignProject,
  ComponentNode,
  CSSProperties,
  ExpressionStyles,
  PrimitiveNodeType,
  Expression,
} from '@globallink/design-schema';
import {
  generateNodeId,
  deepClone,
  getDefaultStyles,
  isPrimitiveType,
  normalizeExpression,
} from '@globallink/design-schema';
import type {
  ElementAddOp,
  ElementRemoveOp,
  ElementMoveOp,
  ElementDuplicateOp,
  ElementInsertSubtreeOp,
  ElementRenameOp,
  ElementWrapOp,
  ElementUnwrapOp,
  ElementReorderOp,
  ElementChangeTypeOp,
  ElementSetLockedOp,
  ElementSetRoleOp,
  ElementSetVisibleOp,
  ElementSetVisibleWhenOp,
  ElementSetRepeatOp,
  ElementSetBindOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById, findParent, isNodeOrAncestorLocked, walkTree } from '../utils/tree';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

/** Create a new ComponentNode with defaults */
function createNode(
  tag: PrimitiveNodeType,
  styles?: ExpressionStyles | CSSProperties,
  props?: Record<string, unknown>,
  explicitId?: string,
): ComponentNode {
  const defaultStyles = isPrimitiveType(tag) ? getDefaultStyles(tag) : {};
  const practicalDefaults: CSSProperties = tag === 'div' ? { width: '200px', height: '50px' } : {};
  return {
    id: explicitId ?? generateNodeId(),
    type: tag as ComponentNode['type'],
    styles: { ...defaultStyles, ...practicalDefaults, ...(styles ?? {}) } as ExpressionStyles,
    children: [],
    props: props ?? {},
    states: [],
    activeState: 'default',
    events: [],
    locked: false,
    visible: true,
  };
}

/** Find the screen index containing a given nodeId */
function findScreenContaining(project: DesignProject, nodeId: string): number {
  for (let i = 0; i < project.screens.length; i++) {
    if (findNodeById(project.screens[i].rootNode, nodeId)) {
      return i;
    }
  }
  return -1;
}

function findNodeAcrossScreens(project: DesignProject, nodeId: string): ComponentNode | undefined {
  for (const screen of project.screens) {
    const found = findNodeById(screen.rootNode, nodeId);
    if (found) return found;
  }
  return undefined;
}

// ===== element.add =====

export function executeAddElement(project: DesignProject, params: ElementAddOp['params']): Result {
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

  if (!parent.children) parent.children = [];

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
      type: 'element.remove',
      params: { elementId: newNode.id },
    },
  };
}

// ===== element.remove =====

export function executeRemoveElement(project: DesignProject, params: ElementRemoveOp['params']): Result {
  const newProject = deepClone(project);

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

// ===== element.move =====

export function executeMoveElement(project: DesignProject, params: ElementMoveOp['params']): Result {
  const newProject = deepClone(project);

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

  const [movedNode] = oldParentInfo.parent.children!.splice(oldParentInfo.index, 1);

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

  if (!newParent.children) newParent.children = [];

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
      type: 'element.move',
      params: {
        elementId: params.elementId,
        newParentId: oldParentInfo.parent.id,
        position: oldParentInfo.index,
      },
    },
  };
}

// ===== element.insertSubtree =====

export function executeInsertSubtree(project: DesignProject, params: ElementInsertSubtreeOp['params']): Result {
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

  if (!parent.children) parent.children = [];

  const cloned = deepClone(params.subtree);
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
      type: 'element.remove',
      params: { elementId: cloned.id },
    },
  };
}

// ===== element.duplicate =====

export function executeDuplicateElement(project: DesignProject, params: ElementDuplicateOp['params']): Result {
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

  const rootId = params.newElementId;
  const childIds = params._childIds;
  let cursor = 0;
  let isFirst = true;
  walkTree(cloned, (n) => {
    if (isFirst) {
      n.id = rootId ?? generateNodeId();
      isFirst = false;
      return;
    }
    if (childIds && cursor < childIds.length) {
      n.id = childIds[cursor]!;
      cursor += 1;
    } else {
      n.id = generateNodeId();
    }
  });

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
      type: 'element.remove',
      params: { elementId: cloned.id },
    },
  };
}

// ===== element.rename =====

export function executeRenameNode(project: DesignProject, params: ElementRenameOp['params']): Result {
  const newProject = deepClone(project);

  const node = findNodeAcrossScreens(newProject, params.nodeId);

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
      type: 'element.rename',
      params: { nodeId: params.nodeId, name: oldName },
    },
  };
}

// ===== element.wrap =====

export function executeWrapInContainer(project: DesignProject, params: ElementWrapOp['params']): Result {
  if (params.nodeIds.length === 0) {
    return {
      project,
      result: { success: false, description: 'No node IDs provided', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);

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

  const containerTag = params.containerTag ?? 'div';
  const container = createNode(containerTag, params.containerStyles);

  const nodesToWrap: ComponentNode[] = [];
  for (let i = indices.length - 1; i >= 0; i--) {
    const [removed] = parent.children!.splice(indices[i], 1);
    nodesToWrap.unshift(removed);
  }

  container.children = nodesToWrap;
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
      type: 'element.unwrap',
      params: { containerId: container.id },
    },
  };
}

// ===== element.unwrap =====

export function executeUnwrapContainer(project: DesignProject, params: ElementUnwrapOp['params']): Result {
  const newProject = deepClone(project);

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
  const containerStyles = deepClone(container.styles) as Partial<CSSProperties>;
  const containerTag = container.type;

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
      type: 'element.wrap',
      params: {
        nodeIds: childIds,
        containerTag,
        containerStyles,
      },
    },
  };
}

// ===== element.reorder =====

export function executeReorderElement(project: DesignProject, params: ElementReorderOp['params']): Result {
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
      type: 'element.reorder',
      params: {
        nodeId: params.nodeId,
        parentId: params.parentId,
        newIndex: currentIndex,
      },
    },
  };
}

// ===== element.changeType =====

export function executeChangeElementType(project: DesignProject, params: ElementChangeTypeOp['params']): Result {
  const newProject = deepClone(project);

  const node = findNodeAcrossScreens(newProject, params.nodeId);

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
      type: 'element.changeType',
      params: { nodeId: params.nodeId, newType: oldType },
    },
  };
}

// ===== element.setLocked / element.setVisible / element.setRole =====

export function executeSetNodeLocked(project: DesignProject, params: ElementSetLockedOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
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
      type: 'element.setLocked',
      params: { nodeId: params.nodeId, locked: previous },
    },
  };
}

export function executeSetNodeRole(project: DesignProject, params: ElementSetRoleOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous = node.editorMetadata?.role ?? null;
  if (params.role === null) {
    if (node.editorMetadata) {
      delete node.editorMetadata.role;
      if (Object.keys(node.editorMetadata).length === 0) {
        delete node.editorMetadata;
      }
    }
  } else {
    if (!node.editorMetadata) node.editorMetadata = {};
    node.editorMetadata.role = params.role;
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Set editorMetadata.role=${params.role ?? 'null'} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setRole',
      params: { nodeId: params.nodeId, role: previous },
    },
  };
}

export function executeSetNodeVisible(project: DesignProject, params: ElementSetVisibleOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
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
      type: 'element.setVisible',
      params: { nodeId: params.nodeId, visible: previous },
    },
  };
}

// ===== element.setVisibleWhen / setRepeat / setBind（v2 新增） =====

export function executeSetNodeVisibleWhen(project: DesignProject, params: ElementSetVisibleWhenOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous: Expression<boolean> | string | null = node.visibleWhen ?? null;
  if (params.visibleWhen === null || params.visibleWhen === '') {
    delete node.visibleWhen;
  } else {
    node.visibleWhen = params.visibleWhen as Expression<boolean>;
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated visibleWhen on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setVisibleWhen',
      params: { nodeId: params.nodeId, visibleWhen: previous },
    },
  };
}

export function executeSetNodeRepeat(project: DesignProject, params: ElementSetRepeatOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous: Expression<unknown[]> | string | null = node.repeat ?? null;
  if (params.repeat === null || params.repeat === '') {
    delete node.repeat;
  } else {
    node.repeat = params.repeat as Expression<unknown[]>;
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated repeat on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setRepeat',
      params: { nodeId: params.nodeId, repeat: previous },
    },
  };
}

export function executeSetNodeBind(project: DesignProject, params: ElementSetBindOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  const previous: { path: string } | null = node.bind ? { ...node.bind } : null;
  if (params.bind === null) {
    delete node.bind;
  } else {
    node.bind = { ...params.bind };
  }
  newProject.updatedAt = new Date().toISOString();
  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated bind on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'element.setBind',
      params: { nodeId: params.nodeId, bind: previous },
    },
  };
}
