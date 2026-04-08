/**
 * 对象 CRUD 操作：addObject, removeObject, updateObject, duplicateObject
 */

import type { MaterialProjectSchema, MaterialObject } from '../schema';
import { createDefaultObject } from '../schema';
import type {
  AddObjectOp,
  RemoveObjectOp,
  UpdateObjectOp,
  DuplicateObjectOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone, generateObjectId, findObjectIndex } from '../utils';

type ExecResult = { project: MaterialProjectSchema; result: OperationResult; inverse: InverseData };

// ===== addObject =====

export function executeAddObject(
  project: MaterialProjectSchema,
  params: AddObjectOp['params'],
): ExecResult {
  const newProject = deepClone(project);
  const id = params.objectId ?? generateObjectId();

  // 创建默认对象并合并传入的属性
  const defaultObj = createDefaultObject(params.object.type, id);
  const newObj: MaterialObject = {
    ...defaultObj,
    ...params.object,
    id, // 确保 ID 正确
  };

  // 插入到指定位置
  if (params.position !== undefined && params.position >= 0 && params.position <= newProject.objects.length) {
    newProject.objects.splice(params.position, 0, newObj);
  } else {
    newProject.objects.push(newObj);
  }

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added ${newObj.type} "${newObj.name}"`,
      affectedObjectIds: [id],
    },
    inverse: {
      type: 'me:removeObject',
      params: { objectId: id },
    },
  };
}

// ===== removeObject =====

export function executeRemoveObject(
  project: MaterialProjectSchema,
  params: RemoveObjectOp['params'],
): ExecResult {
  // 保护默认元素不被删除
  if (project.defaultElementId && params.objectId === project.defaultElementId) {
    return {
      project,
      result: { success: false, description: 'Cannot remove the default element', affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);
  const idx = findObjectIndex(newProject.objects, params.objectId);

  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `Object ${params.objectId} not found`, affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const removed = newProject.objects.splice(idx, 1)[0]!;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed ${removed.type} "${removed.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:addObject',
      params: { object: removed, objectId: removed.id, position: idx },
    },
  };
}

// ===== updateObject =====

export function executeUpdateObject(
  project: MaterialProjectSchema,
  params: UpdateObjectOp['params'],
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

  // 默认元素：不允许修改位置和尺寸属性（但允许样式属性）
  const isDefault = project.defaultElementId && params.objectId === project.defaultElementId;
  const protectedKeys = ['x', 'y', 'width', 'height', 'scaleX', 'scaleY', 'rotation'];

  // 记录旧值用于反向操作
  const oldProps: Record<string, unknown> = {};
  for (const key of Object.keys(params.props)) {
    if (isDefault && protectedKeys.includes(key)) continue;
    oldProps[key] = (obj as unknown as Record<string, unknown>)[key];
  }

  // 应用新值（跳过默认元素的受保护属性）
  for (const key of Object.keys(params.props)) {
    if (isDefault && protectedKeys.includes(key)) continue;
    (obj as unknown as Record<string, unknown>)[key] = (params.props as unknown as Record<string, unknown>)[key];
  }
  // 不允许修改 id 和 type
  obj.id = params.objectId;

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated ${obj.type} "${obj.name}"`,
      affectedObjectIds: [params.objectId],
    },
    inverse: {
      type: 'me:updateObject',
      params: { objectId: params.objectId, props: oldProps },
    },
  };
}

// ===== duplicateObject =====

export function executeDuplicateObject(
  project: MaterialProjectSchema,
  params: DuplicateObjectOp['params'],
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

  const original = newProject.objects[idx]!;
  const newId = params.newObjectId ?? generateObjectId();
  const duplicate = deepClone(original);
  duplicate.id = newId;
  duplicate.name = `${original.name} Copy`;
  duplicate.x += params.offsetX ?? 20;
  duplicate.y += params.offsetY ?? 20;

  // 插入到原对象之后
  newProject.objects.splice(idx + 1, 0, duplicate);
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Duplicated "${original.name}" → "${duplicate.name}"`,
      affectedObjectIds: [newId],
    },
    inverse: {
      type: 'me:removeObject',
      params: { objectId: newId },
    },
  };
}
