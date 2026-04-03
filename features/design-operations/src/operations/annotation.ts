import type { DesignProject, ComponentNode } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  AddAnnotationOp,
  RemoveAnnotationOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById, findParent } from '../utils/tree';

/** Find a node across all screens */
function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

/** Find parent of a node across all screens */
function findParentInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const result = findParent(screen.rootNode, nodeId);
    if (result) return result;
  }
  return undefined;
}

// ===== addAnnotation =====

export function executeAddAnnotation(
  project: DesignProject,
  params: AddAnnotationOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const parent = findNodeInProject(newProject, params.parentId);
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

  const annotationId = `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const annotationNode: ComponentNode = {
    id: annotationId,
    name: 'Annotation',
    type: 'annotation' as ComponentNode['type'],
    styles: params.styles ?? {},
    props: {
      content: params.content,
      ...(params.author ? { author: params.author } : {}),
    },
    children: [],
    states: [],
    activeState: 'default',
    events: [],
    globalStateBindings: [],
    locked: false,
    visible: true,
  };

  const position = params.position ?? parent.children.length;
  parent.children.splice(position, 0, annotationNode);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added annotation to ${params.parentId}`,
      affectedNodeIds: [annotationId, params.parentId],
    },
    inverse: {
      type: 'removeElement',
      params: { elementId: annotationId },
    },
  };
}

// ===== removeAnnotation =====

export function executeRemoveAnnotation(
  project: DesignProject,
  params: RemoveAnnotationOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const parentInfo = findParentInProject(newProject, params.annotationId);
  if (!parentInfo) {
    return {
      project,
      result: { success: false, description: `Annotation ${params.annotationId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const { parent, index } = parentInfo;
  const removedNode = parent.children![index];

  parent.children!.splice(index, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed annotation ${params.annotationId}`,
      affectedNodeIds: [params.annotationId, parent.id],
    },
    inverse: {
      type: '_restoreElement',
      params: { parentId: parent.id, position: index, node: removedNode },
    },
  };
}
