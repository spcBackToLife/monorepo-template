/**
 * @globallink/material-operations
 *
 * 素材编辑器操作系统 — 与 @globallink/design-operations 完全同构。
 *
 * 架构：
 *   MaterialProjectSchema (数据模型)
 *   + MaterialOperation (操作定义)
 *   + MaterialOperationExecutor (执行器 + undo/redo)
 *   = 后端和前端共享的纯数据操作层
 */

// ===== Schema =====
export type {
  GradientStop,
  GradientDef,
  ShadowDef,
  FilterEntry,
  MaterialObjectType,
  MaterialObject,
  ReferenceFrameConfig,
  MaterialProjectSchema,
} from './schema';

export {
  createMaterialProject,
  createDefaultObject,
} from './schema';

// ===== Operation Types =====
export type {
  OperationResult,
  InverseData,
  // 画布操作
  SetBackgroundColorOp,
  ResizeCanvasOp,
  ResizeReferenceFrameOp,
  // 对象 CRUD
  AddObjectOp,
  RemoveObjectOp,
  UpdateObjectOp,
  DuplicateObjectOp,
  // 图层
  ReorderObjectOp,
  SetVisibilityOp,
  SetLockOp,
  RenameObjectOp,
  // 样式
  SetFillOp,
  SetStrokeOp,
  SetOpacityOp,
  SetShadowOp,
  SetBlendModeOp,
  // 组
  GroupObjectsOp,
  UngroupObjectsOp,
  // 文字
  UpdateTextOp,
  // 布尔运算
  BooleanOpOp,
  BooleanOpType,
  // 对齐/分布
  AlignObjectsOp,
  DistributeObjectsOp,
  AlignmentType,
  // 联合
  MaterialOperation,
  MaterialOperationType,
} from './types';

// ===== Executor =====
export { MaterialOperationExecutor } from './executor/index';

// ===== History =====
export { HistoryManager } from './executor/history';
export type { HistoryEntry } from './executor/history';

// ===== Utils =====
export {
  deepClone,
  generateObjectId,
  findObjectById,
  findObjectIndex,
} from './utils';

// ===== CSS Tools (migrated from @globallink/material-editor) =====
export * from './css-tools';
