/**
 * 项目级一等字段操作（DesignProject 顶层）。
 *
 * 设计原则：
 *   - 这些字段是 A 类一等字段（渲染契约会读），与 meta（B 类）严格分离
 *   - 写入策略：整体替换（globalOverlays 数量极少，整组替换语义清晰）
 *   - inverse：保旧值即可
 */

import type { DesignProject } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  ProjectSetGlobalOverlaysOp,
  OperationResult,
  InverseData,
} from '../types';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

// ===== project.setGlobalOverlays =====

export function executeSetGlobalOverlays(
  project: DesignProject,
  params: ProjectSetGlobalOverlaysOp['params'],
): Result {
  const newProject = deepClone(project);
  const previous = newProject.globalOverlays
    ? deepClone(newProject.globalOverlays)
    : undefined;

  if (params.overlays === null) {
    delete newProject.globalOverlays;
  } else {
    newProject.globalOverlays = deepClone(params.overlays);
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set globalOverlays (count=${params.overlays?.length ?? 0})`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'project.setGlobalOverlays',
      params: { overlays: previous ?? null },
    },
  };
}
