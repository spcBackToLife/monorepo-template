/**
 * @globallink/material-operations — Operation 类型定义
 *
 * 与 @globallink/design-operations 同构的操作类型系统。
 * 每个操作都有 type + params，执行后产生 OperationResult + InverseData。
 */

import type { MaterialObject, MaterialObjectType, GradientDef, ShadowDef } from './schema';

// ===== 操作结果 =====

/** 操作执行结果 */
export interface OperationResult {
  success: boolean;
  description: string;
  affectedObjectIds: string[];
}

/** 反向操作数据（用于 undo） */
export interface InverseData {
  type: string;
  params: Record<string, unknown>;
}

// ===== 画布操作 =====

export interface SetBackgroundColorOp {
  type: 'me:setBackgroundColor';
  params: { color: string };
}

export interface ResizeCanvasOp {
  type: 'me:resizeCanvas';
  params: { width: number; height: number };
}

export interface ResizeReferenceFrameOp {
  type: 'me:resizeReferenceFrame';
  params: { width: number; height: number };
}

// ===== 对象 CRUD =====

export interface AddObjectOp {
  type: 'me:addObject';
  params: {
    /** 对象属性（至少包含 type） */
    object: Partial<MaterialObject> & { type: MaterialObjectType };
    /** 预生成 ID（确定性重放） */
    objectId?: string;
    /** 插入位置（默认追加到末尾） */
    position?: number;
  };
}

export interface RemoveObjectOp {
  type: 'me:removeObject';
  params: { objectId: string };
}

export interface UpdateObjectOp {
  type: 'me:updateObject';
  params: {
    objectId: string;
    props: Partial<MaterialObject>;
  };
}

export interface DuplicateObjectOp {
  type: 'me:duplicateObject';
  params: {
    objectId: string;
    newObjectId?: string;
    offsetX?: number;
    offsetY?: number;
  };
}

// ===== 图层操作 =====

export interface ReorderObjectOp {
  type: 'me:reorderObject';
  params: {
    objectId: string;
    /** 目标位置方向 */
    direction: 'front' | 'back' | 'forward' | 'backward';
  };
}

export interface SetVisibilityOp {
  type: 'me:setVisibility';
  params: { objectId: string; visible: boolean };
}

export interface SetLockOp {
  type: 'me:setLock';
  params: { objectId: string; locked: boolean };
}

export interface RenameObjectOp {
  type: 'me:renameObject';
  params: { objectId: string; name: string };
}

// ===== 样式操作 =====

export interface SetFillOp {
  type: 'me:setFill';
  params: {
    objectId: string;
    fill: string | GradientDef | null;
  };
}

export interface SetStrokeOp {
  type: 'me:setStroke';
  params: {
    objectId: string;
    stroke: string | null;
    strokeWidth?: number;
  };
}

export interface SetOpacityOp {
  type: 'me:setOpacity';
  params: { objectId: string; opacity: number };
}

export interface SetShadowOp {
  type: 'me:setShadow';
  params: { objectId: string; shadow: ShadowDef | null };
}

export interface SetBlendModeOp {
  type: 'me:setBlendMode';
  params: { objectId: string; blendMode: string };
}

// ===== 组操作 =====

export interface GroupObjectsOp {
  type: 'me:groupObjects';
  params: {
    objectIds: string[];
    groupId?: string;
  };
}

export interface UngroupObjectsOp {
  type: 'me:ungroupObjects';
  params: { groupId: string };
}

// ===== 文字操作 =====

export interface UpdateTextOp {
  type: 'me:updateText';
  params: {
    objectId: string;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    textAlign?: string;
    lineHeight?: number;
  };
}

// ===== 联合类型 =====

export type MaterialOperation =
  // 画布
  | SetBackgroundColorOp
  | ResizeCanvasOp
  | ResizeReferenceFrameOp
  // 对象 CRUD
  | AddObjectOp
  | RemoveObjectOp
  | UpdateObjectOp
  | DuplicateObjectOp
  // 图层
  | ReorderObjectOp
  | SetVisibilityOp
  | SetLockOp
  | RenameObjectOp
  // 样式
  | SetFillOp
  | SetStrokeOp
  | SetOpacityOp
  | SetShadowOp
  | SetBlendModeOp
  // 组
  | GroupObjectsOp
  | UngroupObjectsOp
  // 文字
  | UpdateTextOp;

/** 所有操作类型字符串 */
export type MaterialOperationType = MaterialOperation['type'];
