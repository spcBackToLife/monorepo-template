import type { DesignProject, CSSProperties } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type { ApplyMaterialDesignOp, OperationResult, InverseData } from '../types';
import { findNodeById } from '../utils/tree';

/** Find a node across all screens */
function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

// ===== applyMaterialDesign =====

/**
 * Batch-apply material design changes to a node.
 * Combines style updates, prop updates, and materialProjectId association
 * in a single atomic operation.
 */
export function executeApplyMaterialDesign(
  project: DesignProject,
  params: ApplyMaterialDesignOp['params'],
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

  const stylesRecord = node.styles as Record<string, unknown>;

  // ---- Save old values for inverse ----

  // 1. Style inverse
  const oldStyles: Partial<CSSProperties> = {};
  const removedStyleKeys: string[] = [];
  if (params.styleUpdates) {
    const oldStylesRecord = oldStyles as Record<string, unknown>;
    for (const key of Object.keys(params.styleUpdates)) {
      if (key in stylesRecord) {
        oldStylesRecord[key] = stylesRecord[key];
      } else {
        removedStyleKeys.push(key);
      }
    }
  }

  // 2. Props inverse
  const oldProps: Record<string, unknown> = {};
  const removedPropKeys: string[] = [];
  if (params.propUpdates) {
    for (const key of Object.keys(params.propUpdates)) {
      if (key in node.props) {
        oldProps[key] = node.props[key];
      } else {
        removedPropKeys.push(key);
      }
    }
  }

  // 3. materialProjectId inverse
  const oldMaterialProjectId: string | undefined = node.materialProjectId;

  // 4. 显式清除的样式键（逆操作需恢复原值）
  const restoreClearedStyles: Record<string, unknown> = {};
  if (params.clearStyleKeys?.length) {
    for (const key of params.clearStyleKeys) {
      if (key in stylesRecord) {
        restoreClearedStyles[key] = stylesRecord[key];
        delete stylesRecord[key];
      }
    }
  }

  // ---- Apply changes ----

  if (params.styleUpdates) {
    Object.assign(node.styles, params.styleUpdates);
  }

  if (params.propUpdates) {
    Object.assign(node.props, params.propUpdates);
  }

  if (params.materialProjectId !== undefined) {
    node.materialProjectId = params.materialProjectId;
  }

  newProject.updatedAt = new Date().toISOString();

  // Build description parts
  const parts: string[] = [];
  if (params.styleUpdates) {
    parts.push(`${Object.keys(params.styleUpdates).length} style(s)`);
  }
  if (params.propUpdates) {
    parts.push(`${Object.keys(params.propUpdates).length} prop(s)`);
  }
  if (params.materialProjectId !== undefined) {
    parts.push('materialProjectId');
  }

  return {
    project: newProject,
    result: {
      success: true,
      description: `Applied material design to ${params.nodeId}: ${parts.join(', ')}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: '_restoreMaterialDesign',
      params: {
        nodeId: params.nodeId,
        restoreStyles: oldStyles,
        removeStyleKeys: removedStyleKeys,
        restoreClearedStyles,
        restoreProps: oldProps,
        removePropKeys: removedPropKeys,
        restoreMaterialProjectId: oldMaterialProjectId,
        hadMaterialProjectId: 'materialProjectId' in node || oldMaterialProjectId !== undefined,
      },
    },
  };
}
