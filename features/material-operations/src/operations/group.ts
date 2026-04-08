/**
 * 组操作：groupObjects, ungroupObjects
 */

import type { MaterialProjectSchema, MaterialObject } from '../schema';
import type {
  GroupObjectsOp,
  UngroupObjectsOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone, generateObjectId, findObjectIndex } from '../utils';

type ExecResult = { project: MaterialProjectSchema; result: OperationResult; inverse: InverseData };

// ===== groupObjects =====

export function executeGroupObjects(
  project: MaterialProjectSchema,
  params: GroupObjectsOp['params'],
): ExecResult {
  if (params.objectIds.length < 2) {
    return {
      project,
      result: { success: false, description: 'Need at least 2 objects to group', affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);
  const groupId = params.groupId ?? generateObjectId();

  // 收集要编组的对象（按原始顺序）
  const indices: number[] = [];
  const children: MaterialObject[] = [];

  for (const objId of params.objectIds) {
    const idx = findObjectIndex(newProject.objects, objId);
    if (idx === -1) {
      return {
        project,
        result: { success: false, description: `Object ${objId} not found`, affectedObjectIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    indices.push(idx);
    children.push(newProject.objects[idx]!);
  }

  // 计算组的包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const child of children) {
    const w = child.width * child.scaleX;
    const h = child.height * child.scaleY;
    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + w);
    maxY = Math.max(maxY, child.y + h);
  }

  // 子对象坐标转为相对于组
  const groupChildren = children.map((c) => ({
    ...c,
    x: c.x - minX,
    y: c.y - minY,
  }));

  // 从对象列表中移除（从大到小索引删除避免偏移）
  const sortedIndices = [...indices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    newProject.objects.splice(idx, 1);
  }

  // 创建组对象
  const groupObj: MaterialObject = {
    id: groupId,
    type: 'group',
    name: `Group`,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    fill: null,
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    children: groupChildren,
  };

  // 插入到最小索引处
  const insertIdx = Math.min(...indices);
  newProject.objects.splice(insertIdx, 0, groupObj);
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Grouped ${children.length} objects`,
      affectedObjectIds: [groupId],
    },
    inverse: {
      type: 'me:ungroupObjects',
      params: { groupId },
    },
  };
}

// ===== ungroupObjects =====

export function executeUngroupObjects(
  project: MaterialProjectSchema,
  params: UngroupObjectsOp['params'],
): ExecResult {
  const newProject = deepClone(project);
  const idx = findObjectIndex(newProject.objects, params.groupId);

  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `Group ${params.groupId} not found`, affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const group = newProject.objects[idx]!;
  if (group.type !== 'group' || !group.children?.length) {
    return {
      project,
      result: { success: false, description: `Object ${params.groupId} is not a group`, affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 子对象坐标转为绝对坐标
  const ungrouped = group.children.map((c) => ({
    ...c,
    x: c.x + group.x,
    y: c.y + group.y,
  }));

  // 移除组，插入子对象
  newProject.objects.splice(idx, 1, ...ungrouped);
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  const childIds = ungrouped.map((c) => c.id);

  return {
    project: newProject,
    result: {
      success: true,
      description: `Ungrouped ${ungrouped.length} objects`,
      affectedObjectIds: childIds,
    },
    inverse: {
      type: 'me:groupObjects',
      params: { objectIds: childIds, groupId: params.groupId },
    },
  };
}
