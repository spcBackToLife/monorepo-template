/**
 * 样式操作：setFill, setStroke, setOpacity, setShadow, setBlendMode
 */

import type { MaterialProjectSchema } from '../schema';
import type {
  SetFillOp,
  SetStrokeOp,
  SetOpacityOp,
  SetShadowOp,
  SetBlendModeOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone, findObjectIndex } from '../utils';

type ExecResult = { project: MaterialProjectSchema; result: OperationResult; inverse: InverseData };

// ===== setFill =====

export function executeSetFill(
  project: MaterialProjectSchema,
  params: SetFillOp['params'],
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
  const oldFill = obj.fill;
  obj.fill = params.fill;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set fill on "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:setFill',
      params: { objectId: params.objectId, fill: oldFill },
    },
  };
}

// ===== setStroke =====

export function executeSetStroke(
  project: MaterialProjectSchema,
  params: SetStrokeOp['params'],
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
  const oldStroke = obj.stroke;
  const oldStrokeWidth = obj.strokeWidth;
  obj.stroke = params.stroke;
  if (params.strokeWidth !== undefined) {
    obj.strokeWidth = params.strokeWidth;
  }
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set stroke on "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:setStroke',
      params: { objectId: params.objectId, stroke: oldStroke, strokeWidth: oldStrokeWidth },
    },
  };
}

// ===== setOpacity =====

export function executeSetOpacity(
  project: MaterialProjectSchema,
  params: SetOpacityOp['params'],
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
  const oldOpacity = obj.opacity;
  obj.opacity = Math.max(0, Math.min(1, params.opacity));
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set opacity to ${params.opacity} on "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:setOpacity',
      params: { objectId: params.objectId, opacity: oldOpacity },
    },
  };
}

// ===== setShadow =====

export function executeSetShadow(
  project: MaterialProjectSchema,
  params: SetShadowOp['params'],
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
  const oldShadow = obj.shadow ?? null;
  obj.shadow = params.shadow;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set shadow on "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:setShadow',
      params: { objectId: params.objectId, shadow: oldShadow },
    },
  };
}

// ===== setBlendMode =====

export function executeSetBlendMode(
  project: MaterialProjectSchema,
  params: SetBlendModeOp['params'],
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
  const oldBlendMode = obj.blendMode;
  obj.blendMode = params.blendMode;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set blend mode to ${params.blendMode} on "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:setBlendMode',
      params: { objectId: params.objectId, blendMode: oldBlendMode },
    },
  };
}
