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
  InsertSubtreeOp,
  UpdateStyleOp,
  ResetStyleOp,
  AddStateOp,
  RemoveStateOp,
  UpdateStateOp,
  SetActiveStateOp,
  SetChildVisibilityOp,
  AddEventOp,
  RemoveEventOp,
  UpdateEventOp,
  AddNavigationOp,
  AddScreenOp,
  RemoveScreenOp,
  SetActiveScreenOp,
  RenameScreenOp,
  SwitchViewportOp,
  AddViewportPresetOp,
  InstantiateTemplateOp,
  SaveAsTemplateOp,
  DetachInstanceOp,
  SyncInstanceOp,
  WrapInContainerOp,
  UnwrapContainerOp,
  ReorderElementOp,
  BatchUpdateStyleOp,
  ChangeElementTypeOp,
  ReorderScreenOp,
  AddDomainStateOp,
  RemoveDomainStateOp,
  UpdateDomainStateOp,
  SetDomainStatePreviewOp,
  AddDomainStateBindingOp,
  UpdateDomainStateBindingOp,
  RemoveDomainStateBindingOp,
  AddEnvironmentStateOp,
  RemoveEnvironmentStateOp,
  UpdateEnvironmentStateOp,
  SetEnvironmentPreviewOp,
  AddEnvironmentBindingOp,
  UpdateEnvironmentBindingOp,
  RemoveEnvironmentBindingOp,
  UpdateComponentPropsOp,
  AddPropDefinitionOp,
  RemovePropDefinitionOp,
  AddDataSourceOp,
  RemoveDataSourceOp,
  UpdateDataSourceOp,
  SwitchDataSourcePhaseOp,
  AddDataScenarioOp,
  UpdateDataScenarioOp,
  RemoveDataScenarioOp,
  SwitchDataScenarioOp,
  BindDataOp,
  UpdateTemplateOp,
  DeleteTemplateOp,
  DuplicateTemplateOp,
  AddAnnotationOp,
  RemoveAnnotationOp,
  ApplyMaterialDesignOp,
  SetNodeVisibilityWhenOp,
  SetNodeLockedOp,
  SetNodeVisibleOp,
  AddApiEndpointOp,
  RemoveApiEndpointOp,
  UpdateApiEndpointOp,
  AddMockScenarioOp,
  UpdateMockScenarioOp,
  RemoveMockScenarioOp,
  SwitchMockScenarioOp,
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
  isNodeOrAncestorLocked,
  collectEffectivelyLockedNodeIds,
  collectAnnotationNodeIds,
} from './utils/tree';

// ===== Individual Operation Executors (advanced usage) =====
export {
  executeAddElement,
  executeRemoveElement,
  executeMoveElement,
  executeDuplicateElement,
  executeInsertSubtree,
  executeWrapInContainer,
  executeUnwrapContainer,
  executeReorderElement,
  executeChangeElementType,
} from './operations/element';

export {
  executeUpdateStyle,
  executeResetStyle,
  executeBatchUpdateStyle,
} from './operations/style';

export {
  executeAddState,
  executeRemoveState,
  executeUpdateState,
  executeSetActiveState,
  executeSetChildVisibility,
} from './operations/state';

export {
  executeAddEvent,
  executeRemoveEvent,
  executeUpdateEvent,
  executeAddNavigation,
} from './operations/event';

export {
  executeAddScreen,
  executeRemoveScreen,
  executeSetActiveScreen,
  executeReorderScreen,
  executeRenameScreen,
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

export {
  executeAddDomainState,
  executeRemoveDomainState,
  executeUpdateDomainState,
  executeSetDomainStatePreview,
  executeAddDomainStateBinding,
  executeRemoveDomainStateBinding,
  executeUpdateDomainStateBinding,
} from './operations/domain-state';

export {
  executeAddEnvironmentState,
  executeRemoveEnvironmentState,
  executeUpdateEnvironmentState,
  executeSetEnvironmentPreview,
  executeAddEnvironmentBinding,
  executeUpdateEnvironmentBinding,
  executeRemoveEnvironmentBinding,
} from './operations/environment';

export {
  executeUpdateComponentProps,
  executeAddPropDefinition,
  executeRemovePropDefinition,
} from './operations/component-props';

export {
  executeAddDataSource,
  executeRemoveDataSource,
  executeUpdateDataSource,
  executeSwitchDataSourcePhase,
  executeAddDataScenario,
  executeUpdateDataScenario,
  executeRemoveDataScenario,
  executeSwitchDataScenario,
  executeBindData,
} from './operations/data';

export {
  executeUpdateTemplate,
  executeDeleteTemplate,
  executeDuplicateTemplate,
} from './operations/template';

export {
  executeAddAnnotation,
  executeRemoveAnnotation,
} from './operations/annotation';

export {
  executeApplyMaterialDesign,
} from './operations/material';

export {
  executeAddApiEndpoint,
  executeRemoveApiEndpoint,
  executeUpdateApiEndpoint,
  executeAddMockScenario,
  executeUpdateMockScenario,
  executeRemoveMockScenario,
  executeSwitchMockScenario,
} from './operations/api-endpoint';
