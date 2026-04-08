/**
 * 对齐/分布操作：alignObjects, distributeObjects
 */

import type { MaterialProjectSchema } from '../schema';
import type {
  AlignObjectsOp,
  DistributeObjectsOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone, findObjectIndex } from '../utils';

type ExecResult = {
  project: MaterialProjectSchema;
  result: OperationResult;
  inverse: InverseData;
};

// ===== alignObjects =====

export function executeAlignObjects(
  project: MaterialProjectSchema,
  params: AlignObjectsOp['params'],
): ExecResult {
  if (params.objectIds.length < 2) {
    return {
      project,
      result: { success: false, description: 'Need at least 2 objects to align', affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);

  // 收集对象
  const objects = params.objectIds
    .map((id) => {
      const idx = findObjectIndex(newProject.objects, id);
      return idx !== -1 ? newProject.objects[idx]! : null;
    })
    .filter(Boolean) as typeof newProject.objects;

  if (objects.length < 2) {
    return {
      project,
      result: { success: false, description: 'Some objects not found', affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 保存旧位置
  const oldPositions = objects.map((obj) => ({
    objectId: obj.id,
    props: { x: obj.x, y: obj.y },
  }));

  // 计算边界
  const bounds = objects.map((obj) => ({
    left: obj.x,
    top: obj.y,
    right: obj.x + obj.width * obj.scaleX,
    bottom: obj.y + obj.height * obj.scaleY,
    centerX: obj.x + (obj.width * obj.scaleX) / 2,
    centerY: obj.y + (obj.height * obj.scaleY) / 2,
    width: obj.width * obj.scaleX,
    height: obj.height * obj.scaleY,
  }));

  const minLeft = Math.min(...bounds.map((b) => b.left));
  const maxRight = Math.max(...bounds.map((b) => b.right));
  const minTop = Math.min(...bounds.map((b) => b.top));
  const maxBottom = Math.max(...bounds.map((b) => b.bottom));
  const centerX = (minLeft + maxRight) / 2;
  const centerY = (minTop + maxBottom) / 2;

  // 执行对齐
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]!;
    const b = bounds[i]!;

    switch (params.alignment) {
      case 'left':
        obj.x = minLeft;
        break;
      case 'center':
        obj.x = centerX - b.width / 2;
        break;
      case 'right':
        obj.x = maxRight - b.width;
        break;
      case 'top':
        obj.y = minTop;
        break;
      case 'middle':
        obj.y = centerY - b.height / 2;
        break;
      case 'bottom':
        obj.y = maxBottom - b.height;
        break;
    }

    obj.x = Math.round(obj.x);
    obj.y = Math.round(obj.y);
  }

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Aligned ${objects.length} objects (${params.alignment})`,
      affectedObjectIds: params.objectIds,
    },
    inverse: {
      type: 'me:restorePositions',
      params: { positions: oldPositions },
    },
  };
}

// ===== distributeObjects =====

export function executeDistributeObjects(
  project: MaterialProjectSchema,
  params: DistributeObjectsOp['params'],
): ExecResult {
  if (params.objectIds.length < 3) {
    return {
      project,
      result: { success: false, description: 'Need at least 3 objects to distribute', affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);

  const objects = params.objectIds
    .map((id) => {
      const idx = findObjectIndex(newProject.objects, id);
      return idx !== -1 ? newProject.objects[idx]! : null;
    })
    .filter(Boolean) as typeof newProject.objects;

  if (objects.length < 3) {
    return {
      project,
      result: { success: false, description: 'Some objects not found', affectedObjectIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 保存旧位置
  const oldPositions = objects.map((obj) => ({
    objectId: obj.id,
    props: { x: obj.x, y: obj.y },
  }));

  if (params.axis === 'horizontal') {
    // 按 X 排序
    const sorted = [...objects].sort((a, b) => a.x - b.x);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    const totalSpan =
      (last.x + last.width * last.scaleX) - first.x;
    const totalObjWidth = sorted.reduce(
      (sum, o) => sum + o.width * o.scaleX,
      0,
    );
    const gap = (totalSpan - totalObjWidth) / (sorted.length - 1);

    let currentX = first.x + first.width * first.scaleX + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i]!.x = Math.round(currentX);
      currentX += sorted[i]!.width * sorted[i]!.scaleX + gap;
    }
  } else {
    // 按 Y 排序
    const sorted = [...objects].sort((a, b) => a.y - b.y);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    const totalSpan =
      (last.y + last.height * last.scaleY) - first.y;
    const totalObjHeight = sorted.reduce(
      (sum, o) => sum + o.height * o.scaleY,
      0,
    );
    const gap = (totalSpan - totalObjHeight) / (sorted.length - 1);

    let currentY = first.y + first.height * first.scaleY + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i]!.y = Math.round(currentY);
      currentY += sorted[i]!.height * sorted[i]!.scaleY + gap;
    }
  }

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Distributed ${objects.length} objects (${params.axis})`,
      affectedObjectIds: params.objectIds,
    },
    inverse: {
      type: 'me:restorePositions',
      params: { positions: oldPositions },
    },
  };
}

// ===== restorePositions (用于 undo 对齐/分布) =====

export function executeRestorePositions(
  project: MaterialProjectSchema,
  params: { positions: { objectId: string; props: { x: number; y: number } }[] },
): ExecResult {
  const newProject = deepClone(project);

  const affectedIds: string[] = [];
  for (const entry of params.positions) {
    const idx = findObjectIndex(newProject.objects, entry.objectId);
    if (idx !== -1) {
      newProject.objects[idx]!.x = entry.props.x;
      newProject.objects[idx]!.y = entry.props.y;
      affectedIds.push(entry.objectId);
    }
  }

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Restored positions for ${affectedIds.length} objects`,
      affectedObjectIds: affectedIds,
    },
    inverse: { type: 'noop', params: {} },
  };
}
