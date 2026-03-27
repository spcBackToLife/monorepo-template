// ===== Types =====
export type {
  Operation,
  OperationType,
  OperationResult,
  InverseData,
  OperationDescription,
  OperationParamSchema,
  // Individual operation types
  AddElementOp,
  RemoveElementOp,
  MoveElementOp,
  DuplicateElementOp,
  UpdateStyleOp,
  ResetStyleOp,
  AddStateOp,
  RemoveStateOp,
  UpdateStateOp,
  SetActiveStateOp,
  AddEventOp,
  RemoveEventOp,
  AddNavigationOp,
  AddScreenOp,
  RemoveScreenOp,
  SetActiveScreenOp,
  SwitchViewportOp,
  AddViewportPresetOp,
  InstantiateTemplateOp,
  SaveAsTemplateOp,
  DetachInstanceOp,
  SyncInstanceOp,
} from './types';

// ===== Executor =====
export { OperationExecutor } from './executor/index';

// ===== History =====
export { HistoryManager } from './executor/history';
export type { HistoryEntry } from './executor/history';

// ===== State =====
export { ProjectState } from './executor/state';

// ===== Description (for MCP/AI) =====
export { getAvailableOperations } from './executor/description';

// ===== Tree Utilities =====
export {
  findNodeById,
  findParent,
  walkTree,
  findNodeInScreens,
  findParentInScreens,
} from './utils/tree';

// ===== Individual Operation Executors (advanced usage) =====
export {
  executeAddElement,
  executeRemoveElement,
  executeMoveElement,
  executeDuplicateElement,
} from './operations/element';

export {
  executeUpdateStyle,
  executeResetStyle,
} from './operations/style';

export {
  executeAddState,
  executeRemoveState,
  executeUpdateState,
  executeSetActiveState,
} from './operations/state';

export {
  executeAddEvent,
  executeRemoveEvent,
  executeAddNavigation,
} from './operations/event';

export {
  executeAddScreen,
  executeRemoveScreen,
  executeSetActiveScreen,
} from './operations/screen';

export {
  executeSwitchViewport,
  executeAddViewportPreset,
} from './operations/viewport';

export {
  executeInstantiateTemplate,
  executeSaveAsTemplate,
  executeDetachInstance,
  executeSyncInstance,
} from './operations/asset';
