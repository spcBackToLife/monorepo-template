// ===== Types =====
export type {
  Operation,
  OperationType,
  OperationResult,
  InverseData,
  OperationDescription,
  OperationParamSchema,
  // Element
  ElementOperation,
  ElementAddOp,
  ElementRemoveOp,
  ElementMoveOp,
  ElementDuplicateOp,
  ElementInsertSubtreeOp,
  ElementRenameOp,
  ElementWrapOp,
  ElementUnwrapOp,
  ElementReorderOp,
  ElementChangeTypeOp,
  ElementSetLockedOp,
  ElementSetRoleOp,
  ElementSetVisibleOp,
  ElementSetVisibleWhenOp,
  ElementSetRepeatOp,
  ElementSetBindOp,
  // Style
  StyleOperation,
  StyleUpdateOp,
  StyleResetOp,
  StyleBatchUpdateOp,
  // VisualState
  VisualStateOperation,
  VisualStateAddOp,
  VisualStateRemoveOp,
  VisualStateUpdateOp,
  VisualStateSetActiveOp,
  VisualStateResetStyleOp,
  VisualStateSetChildVisibilityOp,
  // Event
  EventOperation,
  EventAddOp,
  EventRemoveOp,
  EventUpdateOp,
  EventAddNavigationOp,
  // Screen / Viewport / Asset / Template / Component-Props / Annotation / Material
  ScreenOperation,
  ScreenAddOp,
  ScreenRemoveOp,
  ScreenSetActiveOp,
  ScreenRenameOp,
  ScreenReorderOp,
  ViewportOperation,
  ViewportSwitchOp,
  ViewportAddPresetOp,
  AssetOperation,
  AssetInstantiateTemplateOp,
  AssetSaveAsTemplateOp,
  AssetDetachInstanceOp,
  AssetSyncInstanceOp,
  TemplateOperation,
  TemplateUpdateOp,
  TemplateDeleteOp,
  TemplateDuplicateOp,
  ComponentPropsOperation,
  ComponentPropsUpdateOp,
  ComponentPropsAddDefinitionOp,
  ComponentPropsRemoveDefinitionOp,
  AnnotationOperation,
  AnnotationAddOp,
  AnnotationRemoveOp,
  MaterialOperation,
  MaterialApplyDesignOp,
  // Data Source
  DataSourceOperation,
  DataSourceAddOp,
  DataSourceRemoveOp,
  DataSourceUpdateOp,
  DataSourceSetEndpointOp,
  DataSourceSetDefaultParamsOp,
  DataSourceSetStaticInitialOp,
  DataSourceAddMockScenarioOp,
  DataSourceUpdateMockScenarioOp,
  DataSourceRemoveMockScenarioOp,
  DataSourceSwitchMockScenarioOp,
  // Screen State
  ScreenStateOperation,
  ScreenStateAddViewVariableOp,
  ScreenStateRemoveViewVariableOp,
  ScreenStateUpdateViewVariableOp,
  ScreenStateSetViewPreviewOp,
  ScreenStateSetDataInitOp,
  ScreenStateRemoveDataInitOp,
  // Global State
  GlobalStateOperation,
  GlobalStateAddViewVariableOp,
  GlobalStateRemoveViewVariableOp,
  GlobalStateUpdateViewVariableOp,
  GlobalStateSetViewPreviewOp,
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
  executeRenameNode,
  executeWrapInContainer,
  executeUnwrapContainer,
  executeReorderElement,
  executeChangeElementType,
  executeSetNodeLocked,
  executeSetNodeRole,
  executeSetNodeVisible,
  executeSetNodeVisibleWhen,
  executeSetNodeRepeat,
  executeSetNodeBind,
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
  executeResetStateStyle,
} from './operations/visual-state';

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
  executeRenameScreen,
  executeReorderScreen,
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
  executeUpdateComponentProps,
  executeAddPropDefinition,
  executeRemovePropDefinition,
} from './operations/component-props';

export {
  executeAddDataSource,
  executeRemoveDataSource,
  executeUpdateDataSource,
  executeSetEndpoint,
  executeSetDefaultParams,
  executeSetStaticInitial,
  executeAddMockScenario,
  executeUpdateMockScenario,
  executeRemoveMockScenario,
  executeSwitchMockScenario,
} from './operations/data-source';

export {
  executeAddViewVariable,
  executeRemoveViewVariable,
  executeUpdateViewVariable,
  executeSetViewPreview,
  executeSetDataInit,
  executeRemoveDataInit,
} from './operations/screen-state';

export {
  executeAddGlobalViewVariable,
  executeRemoveGlobalViewVariable,
  executeUpdateGlobalViewVariable,
  executeSetGlobalViewPreview,
} from './operations/global-state';

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
