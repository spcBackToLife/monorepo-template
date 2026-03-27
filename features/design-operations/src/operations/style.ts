import type { DesignProject, CSSProperties } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type { UpdateStyleOp, ResetStyleOp, OperationResult, InverseData } from '../types';
import { findNodeById } from '../utils/tree';

/** Find a node across all screens */
function findNodeInProject(
  project: DesignProject,
  nodeId: string,
) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

// ===== updateStyle =====

export function executeUpdateStyle(
  project: DesignProject,
  params: UpdateStyleOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Save old values for inverse
  const oldStyles: Partial<CSSProperties> = {};
  const removedKeys: string[] = [];
  const stylesRecord = node.styles as Record<string, unknown>;
  const oldStylesRecord = oldStyles as Record<string, unknown>;
  for (const key of Object.keys(params.styles)) {
    if (key in stylesRecord) {
      oldStylesRecord[key] = stylesRecord[key];
    } else {
      removedKeys.push(key);
    }
  }

  // Apply new styles
  Object.assign(node.styles, params.styles);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated styles on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: '_restoreStyle',
      params: {
        nodeId: params.nodeId,
        restoreStyles: oldStyles,
        removeKeys: removedKeys,
      },
    },
  };
}

// ===== resetStyle =====

export function executeResetStyle(
  project: DesignProject,
  params: ResetStyleOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Save old values for inverse
  const oldStyles: Partial<CSSProperties> = {};
  const stylesRecord = node.styles as Record<string, unknown>;
  const oldStylesRecord = oldStyles as Record<string, unknown>;
  for (const prop of params.properties) {
    if (prop in stylesRecord) {
      oldStylesRecord[prop] = stylesRecord[prop];
      delete stylesRecord[prop];
    }
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Reset styles [${params.properties.join(', ')}] on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'updateStyle',
      params: {
        nodeId: params.nodeId,
        styles: oldStyles,
      },
    },
  };
}
