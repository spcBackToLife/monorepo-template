import type { DesignProject, ComponentNode, ComponentState } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type { Operation, OperationResult, InverseData, OperationDescription } from '../types';
import { ProjectState } from './state';
import { HistoryManager } from './history';
import { getAvailableOperations } from './description';

// Import all operation executors
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
  executeSetNodeVisibilityWhen,
  executeSetNodeLocked,
  executeSetNodeVisible,
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
} from '../operations/state';
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
  executeAddGlobalStateVariable,
  executeRemoveGlobalStateVariable,
  executeSetGlobalState,
  executeAddGlobalStateBinding,
  executeRemoveGlobalStateBinding,
  executeUpdateGlobalStateBinding,
} from '../operations/global-state';
import {
  executeUpdateComponentProps,
  executeAddPropDefinition,
  executeRemovePropDefinition,
} from '../operations/component-props';
import {
  executeAddDataSet,
  executeRemoveDataSet,
  executeUpdateDataSet,
  executeSwitchDataSet,
  executeBindData,
} from '../operations/data';
import {
  executeUpdateTemplate,
  executeDeleteTemplate,
  executeDuplicateTemplate,
} from '../operations/template';
import {
  executeAddAnnotation,
  executeRemoveAnnotation,
} from '../operations/annotation';
import { findNodeById, findParent } from '../utils/tree';

/**
 * Central executor that dispatches operations, manages state, and handles undo/redo.
 *
 * Usage:
 * ```ts
 * const executor = new OperationExecutor(myProject);
 * const result = executor.execute({ type: 'addElement', params: { ... } });
 * if (result.success) {
 *   const updatedProject = executor.getProject();
 * }
 * ```
 */
export class OperationExecutor {
  private state: ProjectState;
  private history: HistoryManager;

  constructor(project: DesignProject, historyMaxSize: number = 200) {
    this.state = new ProjectState(project);
    this.history = new HistoryManager(historyMaxSize);
  }

  /** Get the current project state */
  getProject(): DesignProject {
    return this.state.current;
  }

  /** Replace the project state (e.g., after loading from server) */
  setProject(project: DesignProject): void {
    this.state.current = deepClone(project);
    this.history.clear();
  }

  /** Execute a single operation */
  execute(op: Operation): OperationResult {
    const { project, result, inverse } = this.dispatch(this.state.current, op);

    if (result.success) {
      this.state.current = project;
      this.history.push({
        operation: op,
        inverse,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /** Execute a batch of operations atomically */
  executeBatch(ops: Operation[]): OperationResult[] {
    const results: OperationResult[] = [];
    let currentProject = this.state.current;
    const inverses: { operation: Operation; inverse: InverseData }[] = [];

    for (const op of ops) {
      const { project, result, inverse } = this.dispatch(currentProject, op);
      results.push(result);

      if (result.success) {
        currentProject = project;
        inverses.push({ operation: op, inverse });
      } else {
        // On failure, rollback all previous operations in this batch
        // by not committing any changes
        return results;
      }
    }

    // All operations succeeded — commit
    this.state.current = currentProject;
    for (const entry of inverses) {
      this.history.push({
        operation: entry.operation,
        inverse: entry.inverse,
        timestamp: Date.now(),
      });
    }

    return results;
  }

  /** Undo the last operation */
  undo(): OperationResult {
    if (!this.history.canUndo()) {
      return { success: false, description: 'Nothing to undo', affectedNodeIds: [] };
    }

    const entry = this.history.popUndo()!;
    const { project, result, inverse } = this.dispatchInverse(this.state.current, entry.inverse);

    if (result.success) {
      this.state.current = project;
      this.history.pushRedo({
        operation: entry.operation,
        inverse,
        timestamp: Date.now(),
      });
    }

    return { ...result, description: `Undo: ${result.description}` };
  }

  /** Redo the last undone operation */
  redo(): OperationResult {
    if (!this.history.canRedo()) {
      return { success: false, description: 'Nothing to redo', affectedNodeIds: [] };
    }

    const entry = this.history.popRedo()!;
    const { project, result, inverse } = this.dispatch(this.state.current, entry.operation);

    if (result.success) {
      this.state.current = project;
      this.history.push({
        operation: entry.operation,
        inverse,
        timestamp: Date.now(),
      });
    }

    return { ...result, description: `Redo: ${result.description}` };
  }

  /** Check if undo is available */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /** Check if redo is available */
  canRedo(): boolean {
    return this.history.canRedo();
  }

  /** Get all available operations description (for AI / MCP) */
  getAvailableOperations(): OperationDescription[] {
    return getAvailableOperations();
  }

  /** Get a snapshot of the current project (deep clone) */
  snapshot(): DesignProject {
    return this.state.snapshot();
  }

  /** Get undo/redo counts */
  getHistoryInfo(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.history.undoCount,
      redoCount: this.history.redoCount,
    };
  }

  // ===== Private dispatch =====

  private dispatch(
    project: DesignProject,
    op: Operation,
  ): { project: DesignProject; result: OperationResult; inverse: InverseData } {
    switch (op.type) {
      // Element operations
      case 'addElement':
        return executeAddElement(project, op.params);
      case 'removeElement':
        return executeRemoveElement(project, op.params);
      case 'moveElement':
        return executeMoveElement(project, op.params);
      case 'duplicateElement':
        return executeDuplicateElement(project, op.params);
      case 'insertSubtree':
        return executeInsertSubtree(project, op.params);
      case 'renameNode':
        return executeRenameNode(project, op.params);
      case 'wrapInContainer':
        return executeWrapInContainer(project, op.params);
      case 'unwrapContainer':
        return executeUnwrapContainer(project, op.params);
      case 'reorderElement':
        return executeReorderElement(project, op.params);
      case 'changeElementType':
        return executeChangeElementType(project, op.params);
      case 'setNodeVisibilityWhen':
        return executeSetNodeVisibilityWhen(project, op.params);
      case 'setNodeLocked':
        return executeSetNodeLocked(project, op.params);
      case 'setNodeVisible':
        return executeSetNodeVisible(project, op.params);

      // Style operations
      case 'updateStyle':
        return executeUpdateStyle(project, op.params);
      case 'resetStyle':
        return executeResetStyle(project, op.params);
      case 'batchUpdateStyle':
        return executeBatchUpdateStyle(project, op.params);

      // State operations
      case 'addState':
        return executeAddState(project, op.params);
      case 'removeState':
        return executeRemoveState(project, op.params);
      case 'updateState':
        return executeUpdateState(project, op.params);
      case 'setActiveState':
        return executeSetActiveState(project, op.params);

      // Event operations
      case 'addEvent':
        return executeAddEvent(project, op.params);
      case 'removeEvent':
        return executeRemoveEvent(project, op.params);
      case 'updateEvent':
        return executeUpdateEvent(project, op.params);
      case 'addNavigation':
        return executeAddNavigation(project, op.params);

      // Screen operations
      case 'addScreen':
        return executeAddScreen(project, op.params);
      case 'removeScreen':
        return executeRemoveScreen(project, op.params);
      case 'setActiveScreen':
        return executeSetActiveScreen(project, op.params);
      case 'renameScreen':
        return executeRenameScreen(project, op.params);
      case 'reorderScreen':
        return executeReorderScreen(project, op.params);

      // Viewport operations
      case 'switchViewport':
        return executeSwitchViewport(project, op.params);
      case 'addViewportPreset':
        return executeAddViewportPreset(project, op.params);

      // Asset operations
      case 'instantiateTemplate':
        return executeInstantiateTemplate(project, op.params);
      case 'saveAsTemplate':
        return executeSaveAsTemplate(project, op.params);
      case 'detachInstance':
        return executeDetachInstance(project, op.params);
      case 'syncInstance':
        return executeSyncInstance(project, op.params);

      // Global state operations
      case 'setGlobalState':
        return executeSetGlobalState(project, op.params);
      case 'addGlobalStateVariable':
        return executeAddGlobalStateVariable(project, op.params);
      case 'removeGlobalStateVariable':
        return executeRemoveGlobalStateVariable(project, op.params);
      case 'addGlobalStateBinding':
        return executeAddGlobalStateBinding(project, op.params);
      case 'removeGlobalStateBinding':
        return executeRemoveGlobalStateBinding(project, op.params);
      case 'updateGlobalStateBinding':
        return executeUpdateGlobalStateBinding(project, op.params);

      // Component props operations
      case 'updateComponentProps':
        return executeUpdateComponentProps(project, op.params);
      case 'addPropDefinition':
        return executeAddPropDefinition(project, op.params);
      case 'removePropDefinition':
        return executeRemovePropDefinition(project, op.params);

      // Data operations
      case 'addDataSet':
        return executeAddDataSet(project, op.params);
      case 'removeDataSet':
        return executeRemoveDataSet(project, op.params);
      case 'updateDataSet':
        return executeUpdateDataSet(project, op.params);
      case 'switchDataSet':
        return executeSwitchDataSet(project, op.params);
      case 'bindData':
        return executeBindData(project, op.params);

      // Template operations
      case 'updateTemplate':
        return executeUpdateTemplate(project, op.params);
      case 'deleteTemplate':
        return executeDeleteTemplate(project, op.params);
      case 'duplicateTemplate':
        return executeDuplicateTemplate(project, op.params);

      // Annotation operations
      case 'addAnnotation':
        return executeAddAnnotation(project, op.params);
      case 'removeAnnotation':
        return executeRemoveAnnotation(project, op.params);

      default:
        return {
          project,
          result: { success: false, description: `Unknown operation type: ${(op as any).type}`, affectedNodeIds: [] },
          inverse: { type: 'noop', params: {} },
        };
    }
  }

  /**
   * Dispatch an inverse operation (for undo).
   * Internal inverse types (prefixed with _) are handled specially.
   */
  private dispatchInverse(
    project: DesignProject,
    inv: InverseData,
  ): { project: DesignProject; result: OperationResult; inverse: InverseData } {
    // Handle internal inverse types
    switch (inv.type) {
      case 'noop':
        return {
          project,
          result: { success: true, description: 'No-op', affectedNodeIds: [] },
          inverse: { type: 'noop', params: {} },
        };

      case '_restoreElement':
        return this.restoreElement(project, inv.params as any);

      case '_restoreStyle':
        return this.restoreStyle(project, inv.params as any);

      case '_restoreBatchStyle':
        return this.restoreBatchStyle(project, inv.params as any);

      case '_restoreState':
        return this.restoreState(project, inv.params as any);

      case '_removeNavigationAndScreen':
        return this.removeNavigationAndScreen(project, inv.params as any);

      case '_restoreScreen':
        return this.restoreScreen(project, inv.params as any);

      case '_removeViewportPreset':
        return this.removeViewportPreset(project, inv.params as any);

      case '_removeTemplate':
        return this.removeTemplate(project, inv.params as any);

      case '_restoreTemplateRefMode':
        return this.restoreTemplateRefMode(project, inv.params as any);

      case '_restoreGlobalStateVariable':
        return this.restoreGlobalStateVariable(project, inv.params as any);

      case '_restorePropDefinition':
        return this.restorePropDefinition(project, inv.params as any);

      case '_restoreDataSet':
        return this.restoreDataSet(project, inv.params as any);

      case '_restoreNode':
        return this.restoreNode(project, inv.params as any);

      case '_restoreDeletedTemplate':
        return this.restoreDeletedTemplate(project, inv.params as any);

      default:
        // Regular operations can be used as inverse too (e.g., moveElement, setActiveState)
        return this.dispatch(project, { type: inv.type, params: inv.params } as Operation);
    }
  }

  // ===== Internal inverse handlers =====

  private restoreElement(
    project: DesignProject,
    params: { parentId: string; position: number; node: ComponentNode },
  ) {
    const newProject = deepClone(project);
    let parent: ComponentNode | undefined;
    for (const screen of newProject.screens) {
      parent = findNodeById(screen.rootNode, params.parentId);
      if (parent) break;
    }

    if (!parent) {
      return {
        project,
        result: { success: false, description: 'Cannot restore element: parent not found', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    if (!parent.children) parent.children = [];
    parent.children.splice(params.position, 0, params.node);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored element ${params.node.id}`, affectedNodeIds: [params.node.id, params.parentId] },
      inverse: { type: 'removeElement', params: { elementId: params.node.id } } as InverseData,
    };
  }

  private restoreStyle(
    project: DesignProject,
    params: {
      nodeId: string;
      restoreStyles: Record<string, any>;
      removeKeys: string[];
      restoreScreenBackground?: { screenId: string; previousValue: string | undefined };
    },
  ) {
    const newProject = deepClone(project);
    let node: ComponentNode | undefined;
    for (const screen of newProject.screens) {
      node = findNodeById(screen.rootNode, params.nodeId);
      if (node) break;
    }

    if (!node) {
      return {
        project,
        result: { success: false, description: 'Cannot restore styles: node not found', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    // Remove keys that were newly added
    for (const key of params.removeKeys) {
      delete (node.styles as any)[key];
    }
    // Restore old values
    Object.assign(node.styles, params.restoreStyles);
    if (params.restoreScreenBackground) {
      const sc = newProject.screens.find((s) => s.id === params.restoreScreenBackground!.screenId);
      if (sc) {
        const prev = params.restoreScreenBackground.previousValue;
        if (prev === undefined) {
          delete sc.backgroundColor;
        } else {
          sc.backgroundColor = prev;
        }
      }
    }
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored styles on ${params.nodeId}`, affectedNodeIds: [params.nodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreBatchStyle(
    project: DesignProject,
    params: { entries: Array<{ nodeId: string; restoreStyles: Record<string, any>; removeKeys: string[] }> },
  ) {
    const newProject = deepClone(project);
    const affectedNodeIds: string[] = [];

    for (const entry of params.entries) {
      let node: ComponentNode | undefined;
      for (const screen of newProject.screens) {
        node = findNodeById(screen.rootNode, entry.nodeId);
        if (node) break;
      }

      if (!node) {
        return {
          project,
          result: { success: false, description: `Cannot restore batch styles: node ${entry.nodeId} not found`, affectedNodeIds: [] },
          inverse: { type: 'noop', params: {} } as InverseData,
        };
      }

      // Remove keys that were newly added
      for (const key of entry.removeKeys) {
        delete (node.styles as any)[key];
      }
      // Restore old values
      Object.assign(node.styles, entry.restoreStyles);
      affectedNodeIds.push(entry.nodeId);
    }

    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored batch styles on ${affectedNodeIds.length} node(s)`, affectedNodeIds },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreState(
    project: DesignProject,
    params: {
      nodeId: string;
      stateName: string;
      styles: any;
      props?: any;
      transition?: ComponentState['transition'];
    },
  ) {
    const newProject = deepClone(project);
    let node: ComponentNode | undefined;
    for (const screen of newProject.screens) {
      node = findNodeById(screen.rootNode, params.nodeId);
      if (node) break;
    }

    if (!node) {
      return {
        project,
        result: { success: false, description: 'Cannot restore state: node not found', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    const state = node.states.find((s) => s.name === params.stateName);
    if (state) {
      state.styles = params.styles;
      state.props = params.props;
      if ('transition' in params) {
        if (params.transition !== undefined) {
          state.transition = params.transition;
        } else {
          delete state.transition;
        }
      }
    }
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored state "${params.stateName}" on ${params.nodeId}`, affectedNodeIds: [params.nodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private removeNavigationAndScreen(
    project: DesignProject,
    params: { nodeId: string; eventIndex: number; createdScreenId?: string },
  ) {
    const newProject = deepClone(project);

    // Remove the event
    let node: ComponentNode | undefined;
    for (const screen of newProject.screens) {
      node = findNodeById(screen.rootNode, params.nodeId);
      if (node) break;
    }
    if (node && params.eventIndex < node.events.length) {
      node.events.splice(params.eventIndex, 1);
    }

    // Remove the auto-created screen
    if (params.createdScreenId) {
      const idx = newProject.screens.findIndex((s) => s.id === params.createdScreenId);
      if (idx !== -1) {
        newProject.screens.splice(idx, 1);
      }
    }

    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: 'Removed navigation and auto-created screen', affectedNodeIds: [params.nodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreScreen(
    project: DesignProject,
    params: { screen: any; position: number },
  ) {
    const newProject = deepClone(project);
    newProject.screens.splice(params.position, 0, params.screen);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored screen "${params.screen.name}"`, affectedNodeIds: [params.screen.id] },
      inverse: { type: 'removeScreen', params: { screenId: params.screen.id } } as InverseData,
    };
  }

  private removeViewportPreset(
    project: DesignProject,
    params: { viewport: any },
  ) {
    const newProject = deepClone(project);
    const idx = newProject.viewportPresets.findIndex(
      (v) => v.name === params.viewport.name && v.width === params.viewport.width && v.height === params.viewport.height,
    );
    if (idx !== -1) {
      newProject.viewportPresets.splice(idx, 1);
    }
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Removed viewport preset "${params.viewport.name}"`, affectedNodeIds: [] },
      inverse: { type: 'addViewportPreset', params: { viewport: params.viewport } } as InverseData,
    };
  }

  private removeTemplate(
    project: DesignProject,
    params: { templateId: string },
  ) {
    const newProject = deepClone(project);
    const idx = newProject.componentAssets.findIndex((t) => t.id === params.templateId);
    if (idx !== -1) {
      newProject.componentAssets.splice(idx, 1);
    }
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Removed template ${params.templateId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreTemplateRefMode(
    project: DesignProject,
    params: { nodeId: string; mode: 'reference' | 'detached' },
  ) {
    const newProject = deepClone(project);
    let node: ComponentNode | undefined;
    for (const screen of newProject.screens) {
      node = findNodeById(screen.rootNode, params.nodeId);
      if (node) break;
    }
    if (node?.templateRef) {
      node.templateRef.mode = params.mode;
    }
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored template ref mode on ${params.nodeId}`, affectedNodeIds: [params.nodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreNode(
    project: DesignProject,
    params: { nodeId: string; node: ComponentNode },
  ) {
    const newProject = deepClone(project);

    // Find and replace the node
    for (const screen of newProject.screens) {
      if (screen.rootNode.id === params.nodeId) {
        screen.rootNode = params.node;
        break;
      }
      const parentInfo = findParent(screen.rootNode, params.nodeId);
      if (parentInfo) {
        parentInfo.parent.children![parentInfo.index] = params.node;
        break;
      }
    }

    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored node ${params.nodeId}`, affectedNodeIds: [params.nodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreDataSet(
    project: DesignProject,
    params: { screenId: string; dataSet: any; position: number },
  ) {
    const newProject = deepClone(project);
    const screen = newProject.screens.find((s) => s.id === params.screenId);

    if (!screen) {
      return {
        project,
        result: { success: false, description: `Cannot restore data set: screen ${params.screenId} not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    screen.dataSets.splice(params.position, 0, params.dataSet);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored data set "${params.dataSet.name}"`, affectedNodeIds: [params.screenId] },
      inverse: { type: 'removeDataSet', params: { screenId: params.screenId, dataSetId: params.dataSet.id } } as InverseData,
    };
  }

  private restoreGlobalStateVariable(
    project: DesignProject,
    params: { screenId: string; variable: any; position: number },
  ) {
    const newProject = deepClone(project);
    const screen = newProject.screens.find((s) => s.id === params.screenId);

    if (!screen) {
      return {
        project,
        result: { success: false, description: `Cannot restore global state variable: screen ${params.screenId} not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    screen.globalStates.splice(params.position, 0, params.variable);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored global state variable "${params.variable.name}"`, affectedNodeIds: [params.screenId] },
      inverse: { type: 'removeGlobalStateVariable', params: { screenId: params.screenId, variableName: params.variable.name } } as InverseData,
    };
  }

  private restorePropDefinition(
    project: DesignProject,
    params: { templateId: string; definition: any; position: number },
  ) {
    const newProject = deepClone(project);
    const template = newProject.componentAssets.find((t) => t.id === params.templateId);

    if (!template) {
      return {
        project,
        result: { success: false, description: `Cannot restore prop definition: template ${params.templateId} not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    template.propDefinitions.splice(params.position, 0, params.definition);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored prop definition "${params.definition.key}"`, affectedNodeIds: [params.templateId] },
      inverse: { type: 'removePropDefinition', params: { templateId: params.templateId, propKey: params.definition.key } } as InverseData,
    };
  }

  private restoreDeletedTemplate(
    project: DesignProject,
    params: { template: any; position: number },
  ) {
    const newProject = deepClone(project);
    newProject.componentAssets.splice(params.position, 0, params.template);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored template "${params.template.name}"`, affectedNodeIds: [params.template.id] },
      inverse: { type: 'deleteTemplate', params: { templateId: params.template.id } } as InverseData,
    };
  }
}
