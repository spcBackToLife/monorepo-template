/**
 * 文字操作：updateText
 */

import type { MaterialProjectSchema } from '../schema';
import type {
  UpdateTextOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone, findObjectIndex } from '../utils';

type ExecResult = { project: MaterialProjectSchema; result: OperationResult; inverse: InverseData };

// ===== updateText =====

export function executeUpdateText(
  project: MaterialProjectSchema,
  params: UpdateTextOp['params'],
): ExecResult {
  const newProject = deepClone(project);
  const idx = findObjectIndex(newProject.objects, params.objectId);

  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `Object ${params.objectId} not found`, affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const obj = newProject.objects[idx]!;
  if (obj.type !== 'textbox') {
    return {
      project,
      result: { success: false, description: `Object "${obj.name}" is not a textbox`, affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 记录旧值
  const oldProps: Record<string, unknown> = {};
  const textProps = ['text', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'lineHeight'] as const;
  for (const key of textProps) {
    if (params[key] !== undefined) {
      oldProps[key] = obj[key];
    }
  }

  // 应用新值
  if (params.text !== undefined) obj.text = params.text;
  if (params.fontSize !== undefined) obj.fontSize = params.fontSize;
  if (params.fontFamily !== undefined) obj.fontFamily = params.fontFamily;
  if (params.fontWeight !== undefined) obj.fontWeight = params.fontWeight;
  if (params.textAlign !== undefined) obj.textAlign = params.textAlign;
  if (params.lineHeight !== undefined) obj.lineHeight = params.lineHeight;

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated text on "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:updateText',
      params: { objectId: params.objectId, ...oldProps },
    },
  };
}
