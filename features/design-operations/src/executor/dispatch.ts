/**
 * Operation 调度表 —— 把 op.type 映射到对应的 executeXxx。
 *
 * 与 dispatchInverse（处理 _restoreXxx）互补：本表只走"正向" Operation。
 * 单文件 < 200 行；新增 op 域时在此处加 case。
 */

import type { DesignProject } from '@globallink/design-schema';
import type { Operation, OperationResult, InverseData } from '../types';

import {
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
} from '../operations/element';
import {
  executeUpdateStyle,
  executeResetStyle,
  executeBatchUpdateStyle,
} from '../operations/style';
import {
  executeAddState,
  executeRemoveState,
  executeUpdateState,
  executeSetActiveState,
  executeSetChildVisibility,
  executeResetStateStyle,
} from '../operations/visual-state';
import {
  executeAddEvent,
  executeRemoveEvent,
  executeUpdateEvent,
  executeAddNavigation,
} from '../operations/event';
import {
  executeAddScreen,
  executeRemoveScreen,
  executeSetActiveScreen,
  executeRenameScreen,
  executeReorderScreen,
} from '../operations/screen';
import {
  executeSwitchViewport,
  executeAddViewportPreset,
} from '../operations/viewport';
import {
  executeInstantiateTemplate,
  executeSaveAsTemplate,
  executeDetachInstance,
  executeSyncInstance,
} from '../operations/asset';
import {
  executeUpdateComponentProps,
  executeAddPropDefinition,
  executeRemovePropDefinition,
} from '../operations/component-props';
import {
  executeUpdateTemplate,
  executeDeleteTemplate,
  executeDuplicateTemplate,
} from '../operations/template';
import {
  executeAddAnnotation,
  executeRemoveAnnotation,
} from '../operations/annotation';
import { executeApplyMaterialDesign } from '../operations/material';
import {
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
} from '../operations/data-source';
import {
  executeAddViewVariable,
  executeRemoveViewVariable,
  executeUpdateViewVariable,
  executeSetViewPreview,
  executeSetDataInit,
  executeRemoveDataInit,
} from '../operations/screen-state';
import {
  executeAddGlobalViewVariable,
  executeRemoveGlobalViewVariable,
  executeUpdateGlobalViewVariable,
  executeSetGlobalViewPreview,
} from '../operations/global-state';

export type DispatchResult = {
  project: DesignProject;
  result: OperationResult;
  inverse: InverseData;
};

/** 入口：根据 op.type 找到对应 handler 并执行 */
export function dispatchOperation(project: DesignProject, op: Operation): DispatchResult {
  switch (op.type) {
    // ===== Element =====
    case 'element.add': return executeAddElement(project, op.params);
    case 'element.remove': return executeRemoveElement(project, op.params);
    case 'element.move': return executeMoveElement(project, op.params);
    case 'element.duplicate': return executeDuplicateElement(project, op.params);
    case 'element.insertSubtree': return executeInsertSubtree(project, op.params);
    case 'element.rename': return executeRenameNode(project, op.params);
    case 'element.wrap': return executeWrapInContainer(project, op.params);
    case 'element.unwrap': return executeUnwrapContainer(project, op.params);
    case 'element.reorder': return executeReorderElement(project, op.params);
    case 'element.changeType': return executeChangeElementType(project, op.params);
    case 'element.setLocked': return executeSetNodeLocked(project, op.params);
    case 'element.setRole': return executeSetNodeRole(project, op.params);
    case 'element.setVisible': return executeSetNodeVisible(project, op.params);
    case 'element.setVisibleWhen': return executeSetNodeVisibleWhen(project, op.params);
    case 'element.setRepeat': return executeSetNodeRepeat(project, op.params);
    case 'element.setBind': return executeSetNodeBind(project, op.params);

    // ===== Style =====
    case 'style.update': return executeUpdateStyle(project, op.params);
    case 'style.reset': return executeResetStyle(project, op.params);
    case 'style.batchUpdate': return executeBatchUpdateStyle(project, op.params);

    // ===== Visual State =====
    case 'visualState.add': return executeAddState(project, op.params);
    case 'visualState.remove': return executeRemoveState(project, op.params);
    case 'visualState.update': return executeUpdateState(project, op.params);
    case 'visualState.setActive': return executeSetActiveState(project, op.params);
    case 'visualState.setChildVisibility': return executeSetChildVisibility(project, op.params);
    case 'visualState.resetStyle': return executeResetStateStyle(project, op.params);

    // ===== Event =====
    case 'event.add': return executeAddEvent(project, op.params);
    case 'event.remove': return executeRemoveEvent(project, op.params);
    case 'event.update': return executeUpdateEvent(project, op.params);
    case 'event.addNavigation': return executeAddNavigation(project, op.params);

    // ===== Screen =====
    case 'screen.add': return executeAddScreen(project, op.params);
    case 'screen.remove': return executeRemoveScreen(project, op.params);
    case 'screen.setActive': return executeSetActiveScreen(project, op.params);
    case 'screen.rename': return executeRenameScreen(project, op.params);
    case 'screen.reorder': return executeReorderScreen(project, op.params);

    // ===== Viewport =====
    case 'viewport.switch': return executeSwitchViewport(project, op.params);
    case 'viewport.addPreset': return executeAddViewportPreset(project, op.params);

    // ===== Asset / Template =====
    case 'asset.instantiateTemplate': return executeInstantiateTemplate(project, op.params);
    case 'asset.saveAsTemplate': return executeSaveAsTemplate(project, op.params);
    case 'asset.detachInstance': return executeDetachInstance(project, op.params);
    case 'asset.syncInstance': return executeSyncInstance(project, op.params);
    case 'template.update': return executeUpdateTemplate(project, op.params);
    case 'template.delete': return executeDeleteTemplate(project, op.params);
    case 'template.duplicate': return executeDuplicateTemplate(project, op.params);

    // ===== Component Props =====
    case 'componentProps.update': return executeUpdateComponentProps(project, op.params);
    case 'componentProps.addDefinition': return executeAddPropDefinition(project, op.params);
    case 'componentProps.removeDefinition': return executeRemovePropDefinition(project, op.params);

    // ===== Annotation =====
    case 'annotation.add': return executeAddAnnotation(project, op.params);
    case 'annotation.remove': return executeRemoveAnnotation(project, op.params);

    // ===== Material =====
    case 'material.applyDesign': return executeApplyMaterialDesign(project, op.params);

    // ===== Data Source =====
    case 'dataSource.add': return executeAddDataSource(project, op.params);
    case 'dataSource.remove': return executeRemoveDataSource(project, op.params);
    case 'dataSource.update': return executeUpdateDataSource(project, op.params);
    case 'dataSource.setEndpoint': return executeSetEndpoint(project, op.params);
    case 'dataSource.setDefaultParams': return executeSetDefaultParams(project, op.params);
    case 'dataSource.setStaticInitial': return executeSetStaticInitial(project, op.params);
    case 'dataSource.addMockScenario': return executeAddMockScenario(project, op.params);
    case 'dataSource.updateMockScenario': return executeUpdateMockScenario(project, op.params);
    case 'dataSource.removeMockScenario': return executeRemoveMockScenario(project, op.params);
    case 'dataSource.switchMockScenario': return executeSwitchMockScenario(project, op.params);

    // ===== Screen State =====
    case 'screenState.addViewVariable': return executeAddViewVariable(project, op.params);
    case 'screenState.removeViewVariable': return executeRemoveViewVariable(project, op.params);
    case 'screenState.updateViewVariable': return executeUpdateViewVariable(project, op.params);
    case 'screenState.setViewPreview': return executeSetViewPreview(project, op.params);
    case 'screenState.setDataInit': return executeSetDataInit(project, op.params);
    case 'screenState.removeDataInit': return executeRemoveDataInit(project, op.params);

    // ===== Global State =====
    case 'globalState.addViewVariable': return executeAddGlobalViewVariable(project, op.params);
    case 'globalState.removeViewVariable': return executeRemoveGlobalViewVariable(project, op.params);
    case 'globalState.updateViewVariable': return executeUpdateGlobalViewVariable(project, op.params);
    case 'globalState.setViewPreview': return executeSetGlobalViewPreview(project, op.params);

    default: {
      const _exhaustive: never = op;
      void _exhaustive;
      return {
        project,
        result: {
          success: false,
          description: `Unknown operation type: ${(op as { type: string }).type}`,
          affectedNodeIds: [],
        },
        inverse: { type: 'noop', params: {} },
      };
    }
  }
}
