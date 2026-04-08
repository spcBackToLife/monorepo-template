/**
 * 图层操作：reorderObject, setVisibility, setLock, renameObject
 */

import type { MaterialProjectSchema } from '../schema';
import type {
  ReorderObjectOp,
  SetVisibilityOp,
  SetLockOp,
  RenameObjectOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone, findObjectIndex } from '../utils';

type ExecResult = { project: MaterialProjectSchema; result: OperationResult; inverse: InverseData };

// ===== reorderObject =====

export function executeReorderObject(
  project: MaterialProjectSchema,
  params: ReorderObjectOp['params'],
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

  const lastIdx = newProject.objects.length - 1;
  let newIdx = idx;
  let inverseDirection: ReorderObjectOp['params']['direction'] = params.direction;

  switch (params.direction) {
    case 'front':
      newIdx = lastIdx;
      inverseDirection = 'back'; // 近似反向
      break;
    case 'back':
      newIdx = 0;
      inverseDirection = 'front';
      break;
    case 'forward':
      newIdx = Math.min(idx + 1, lastIdx);
      inverseDirection = 'backward';
      break;
    case 'backward':
      newIdx = Math.max(idx - 1, 0);
      inverseDirection = 'forward';
      break;
  }

  if (newIdx !== idx) {
    const [obj] = newProject.objects.splice(idx, 1);
    newProject.objects.splice(newIdx, 0, obj!);
    newProject.version++;
    newProject.updatedAt = new Date().toISOString();
  }

  return {
    project: newProject,
    result: {
      success: true,
      description: `Moved object ${params.direction}`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:reorderObject',
      params: { objectId: params.objectId, direction: inverseDirection },
    },
  };
}

// ===== setVisibility =====

export function executeSetVisibility(
  project: MaterialProjectSchema,
  params: SetVisibilityOp['params'],
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
  const oldVisible = obj.visible;
  obj.visible = params.visible;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set "${obj.name}" ${params.visible ? 'visible' : 'hidden'}`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:setVisibility',
      params: { objectId: params.objectId, visible: oldVisible },
    },
  };
}

// ===== setLock =====

export function executeSetLock(
  project: MaterialProjectSchema,
  params: SetLockOp['params'],
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
  const oldLocked = obj.locked;
  obj.locked = params.locked;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `${params.locked ? 'Locked' : 'Unlocked'} "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:setLock',
      params: { objectId: params.objectId, locked: oldLocked },
    },
  };
}

// ===== renameObject =====

export function executeRenameObject(
  project: MaterialProjectSchema,
  params: RenameObjectOp['params'],
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
  const oldName = obj.name;
  obj.name = params.name;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Renamed "${oldName}" → "${params.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:renameObject',
      params: { objectId: params.objectId, name: oldName },
    },
  };
}
