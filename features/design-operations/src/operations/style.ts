import type { DesignProject, CSSProperties } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  StyleUpdateOp,
  StyleResetOp,
  StyleBatchUpdateOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById } from '../utils/tree';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

// ===== style.update =====

export function executeUpdateStyle(project: DesignProject, params: StyleUpdateOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

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

  Object.assign(node.styles, params.styles);

  // 根节点背景同步到 Screen.backgroundColor
  let restoreScreenBackground: { screenId: string; previousValue: string | undefined } | undefined;
  if (Object.prototype.hasOwnProperty.call(params.styles, 'backgroundColor')) {
    for (const screen of newProject.screens) {
      if (screen.rootNode.id !== params.nodeId) continue;
      restoreScreenBackground = { screenId: screen.id, previousValue: screen.backgroundColor };
      const bg = (params.styles as Record<string, unknown>).backgroundColor;
      if (bg === undefined || bg === '') {
        delete screen.backgroundColor;
      } else {
        screen.backgroundColor = typeof bg === 'string' ? bg : String(bg);
      }
      break;
    }
  }

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
        ...(restoreScreenBackground ? { restoreScreenBackground } : {}),
      },
    },
  };
}

// ===== style.reset =====

export function executeResetStyle(project: DesignProject, params: StyleResetOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

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
      type: 'style.update',
      params: { nodeId: params.nodeId, styles: oldStyles },
    },
  };
}

// ===== style.batchUpdate =====

export function executeBatchUpdateStyle(project: DesignProject, params: StyleBatchUpdateOp['params']): Result {
  if (params.updates.length === 0) {
    return {
      project,
      result: { success: false, description: 'No style updates provided', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);
  const affectedNodeIds: string[] = [];
  const restoreEntries: Array<{
    nodeId: string;
    restoreStyles: Record<string, unknown>;
    removeKeys: string[];
  }> = [];

  for (const update of params.updates) {
    const node = findNodeInProject(newProject, update.nodeId);
    if (!node) {
      return {
        project,
        result: { success: false, description: `Node ${update.nodeId} not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }

    const restoreStyles: Record<string, unknown> = {};
    const removeKeys: string[] = [];
    const stylesRecord = node.styles as Record<string, unknown>;
    for (const key of Object.keys(update.styles)) {
      if (key in stylesRecord) {
        restoreStyles[key] = stylesRecord[key];
      } else {
        removeKeys.push(key);
      }
    }

    Object.assign(node.styles, update.styles);
    affectedNodeIds.push(update.nodeId);
    restoreEntries.push({ nodeId: update.nodeId, restoreStyles, removeKeys });
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Batch updated styles on ${params.updates.length} node(s)`,
      affectedNodeIds,
    },
    inverse: {
      type: '_restoreBatchStyle',
      params: { entries: restoreEntries },
    },
  };
}
