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
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById, findParent, walkTree } from '../utils/tree';

/** Create a new ComponentNode with defaults */
function createNode(
  tag: PrimitiveNodeType,
  styles?: CSSProperties,
  props?: Record<string, unknown>,
): ComponentNode {
  const defaultStyles = isPrimitiveType(tag) ? getDefaultStyles(tag) : {};
  return {
    id: generateNodeId(),
    type: tag as ComponentNode['type'],
    styles: { ...defaultStyles, ...styles },
    children: [],
    props: props ?? {},
    states: [],
    activeState: 'default',
    events: [],
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

  const newNode = createNode(params.tag, params.styles, params.props);
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
