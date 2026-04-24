import type {
  DesignProject,
  ComponentNode,
  ComponentState,
  DomainStateVariable,
  EnvironmentVariable,
  DataSource,
  DataScenario,
} from '@globallink/design-schema';
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
  executeSetChildVisibility,
  executeResetStateStyle,
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
  executeAddDomainState,
  executeRemoveDomainState,
  executeUpdateDomainState,
  executeSetDomainStatePreview,
  executeAddDomainStateBinding,
  executeRemoveDomainStateBinding,
  executeUpdateDomainStateBinding,
} from '../operations/domain-state';
import {
  executeAddEnvironmentState,
  executeRemoveEnvironmentState,
  executeUpdateEnvironmentState,
  executeSetEnvironmentPreview,
  executeAddEnvironmentBinding,
  executeUpdateEnvironmentBinding,
  executeRemoveEnvironmentBinding,
} from '../operations/environment';
import {
  executeUpdateComponentProps,
  executeAddPropDefinition,
  executeRemovePropDefinition,
} from '../operations/component-props';
import {
  executeAddDataSource,
  executeRemoveDataSource,
  executeUpdateDataSource,
  executeSwitchDataSourcePhase,
  executeAddDataScenario,
  executeUpdateDataScenario,
  executeRemoveDataScenario,
  executeSwitchDataScenario,
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
import {
  executeApplyMaterialDesign,
} from '../operations/material';
import {
  executeAddApiEndpoint,
  executeRemoveApiEndpoint,
  executeUpdateApiEndpoint,
  executeAddMockScenario,
  executeUpdateMockScenario,
  executeRemoveMockScenario,
  executeSwitchMockScenario,
} from '../operations/api-endpoint';
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
      case 'setChildVisibility':
        return executeSetChildVisibility(project, op.params);
      case 'resetStateStyle':
        return executeResetStateStyle(project, op.params);

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

      // Domain state operations
      case 'addDomainState':
        return executeAddDomainState(project, op.params);
      case 'removeDomainState':
        return executeRemoveDomainState(project, op.params);
      case 'updateDomainState':
        return executeUpdateDomainState(project, op.params);
      case 'setDomainStatePreview':
        return executeSetDomainStatePreview(project, op.params);
      case 'addDomainStateBinding':
        return executeAddDomainStateBinding(project, op.params);
      case 'removeDomainStateBinding':
        return executeRemoveDomainStateBinding(project, op.params);
      case 'updateDomainStateBinding':
        return executeUpdateDomainStateBinding(project, op.params);

      // Environment state operations
      case 'addEnvironmentState':
        return executeAddEnvironmentState(project, op.params);
      case 'removeEnvironmentState':
        return executeRemoveEnvironmentState(project, op.params);
      case 'updateEnvironmentState':
        return executeUpdateEnvironmentState(project, op.params);
      case 'setEnvironmentPreview':
        return executeSetEnvironmentPreview(project, op.params);
      case 'addEnvironmentBinding':
        return executeAddEnvironmentBinding(project, op.params);
      case 'updateEnvironmentBinding':
        return executeUpdateEnvironmentBinding(project, op.params);
      case 'removeEnvironmentBinding':
        return executeRemoveEnvironmentBinding(project, op.params);

      // Component props operations
      case 'updateComponentProps':
        return executeUpdateComponentProps(project, op.params);
      case 'addPropDefinition':
        return executeAddPropDefinition(project, op.params);
      case 'removePropDefinition':
        return executeRemovePropDefinition(project, op.params);

      // Data operations
      case 'addDataSource':
        return executeAddDataSource(project, op.params);
      case 'removeDataSource':
        return executeRemoveDataSource(project, op.params);
      case 'updateDataSource':
        return executeUpdateDataSource(project, op.params);
      case 'switchDataSourcePhase':
        return executeSwitchDataSourcePhase(project, op.params);
      case 'addDataScenario':
        return executeAddDataScenario(project, op.params);
      case 'updateDataScenario':
        return executeUpdateDataScenario(project, op.params);
      case 'removeDataScenario':
        return executeRemoveDataScenario(project, op.params);
      case 'switchDataScenario':
        return executeSwitchDataScenario(project, op.params);
      case 'bindData':
        return executeBindData(project, op.params);

      // Template operations
      case 'updateTemplate':
        return executeUpdateTemplate(project, op.params);
      case 'deleteTemplate':
        return executeDeleteTemplate(project, op.params);
      case 'duplicateTemplate':
        return executeDuplicateTemplate(project, op.params);

      // API Endpoint operations
      case 'addApiEndpoint':
        return executeAddApiEndpoint(project, op.params);
      case 'removeApiEndpoint':
        return executeRemoveApiEndpoint(project, op.params);
      case 'updateApiEndpoint':
        return executeUpdateApiEndpoint(project, op.params);
      case 'addMockScenario':
        return executeAddMockScenario(project, op.params);
      case 'updateMockScenario':
        return executeUpdateMockScenario(project, op.params);
      case 'removeMockScenario':
        return executeRemoveMockScenario(project, op.params);
      case 'switchMockScenario':
        return executeSwitchMockScenario(project, op.params);

      // Annotation operations
      case 'addAnnotation':
        return executeAddAnnotation(project, op.params);
      case 'removeAnnotation':
        return executeRemoveAnnotation(project, op.params);

      // Material design operations
      case 'applyMaterialDesign':
        return executeApplyMaterialDesign(project, op.params);

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

      case '_restoreDomainState':
        return this.restoreDomainState(project, inv.params as any);

      case '_restoreDomainStatePreview':
        return this.restoreDomainStatePreview(project, inv.params as any);

      case '_restoreEnvironmentState':
        return this.restoreEnvironmentState(project, inv.params as any);

      case '_restoreEnvironmentPreview':
        return this.restoreEnvironmentPreview(project, inv.params as any);

      case '_restorePropDefinition':
        return this.restorePropDefinition(project, inv.params as any);

      case '_restoreDataSource':
        return this.restoreDataSource(project, inv.params as any);

      case '_restoreDataScenario':
        return this.restoreDataScenario(project, inv.params as any);

      case '_restoreNode':
        return this.restoreNode(project, inv.params as any);

      case '_restoreDeletedTemplate':
        return this.restoreDeletedTemplate(project, inv.params as any);

      case '_restoreApiEndpoint':
        return this.restoreApiEndpoint(project, inv.params as any);

      case '_restoreMockScenario':
        return this.restoreMockScenario(project, inv.params as any);

      case '_restoreChildVisibility':
        return this.restoreChildVisibility(project, inv.params as any);

      case '_restoreMaterialDesign':
        return this.restoreMaterialDesign(project, inv.params as any);

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

    const state = node.states?.find((s) => s.name === params.stateName);
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
    if (node && node.events && params.eventIndex < node.events.length) {
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

  private restoreDataSource(
    project: DesignProject,
    params: { screenId: string; dataSource: DataSource; position: number },
  ) {
    const newProject = deepClone(project);
    const screen = newProject.screens.find((s) => s.id === params.screenId);

    if (!screen) {
      return {
        project,
        result: { success: false, description: `Cannot restore data source: screen ${params.screenId} not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    screen.dataSources.splice(params.position, 0, params.dataSource);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored data source "${params.dataSource.name}"`, affectedNodeIds: [params.screenId] },
      inverse: { type: 'removeDataSource', params: { screenId: params.screenId, dataSourceId: params.dataSource.id } } as InverseData,
    };
  }

  private restoreDataScenario(
    project: DesignProject,
    params: {
      screenId: string;
      dataSourceId: string;
      scenario: DataScenario;
      position: number;
      previousActiveScenarioId: string;
    },
  ) {
    const newProject = deepClone(project);
    const screen = newProject.screens.find((s) => s.id === params.screenId);
    const dataSource = screen?.dataSources.find((ds) => ds.id === params.dataSourceId);

    if (!screen || !dataSource) {
      return {
        project,
        result: { success: false, description: `Cannot restore scenario: screen or data source not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    dataSource.scenarios.splice(params.position, 0, params.scenario);
    dataSource.activeScenarioId = params.previousActiveScenarioId;
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored scenario "${params.scenario.name}"`, affectedNodeIds: [params.screenId] },
      inverse: {
        type: 'removeDataScenario',
        params: { screenId: params.screenId, dataSourceId: params.dataSourceId, scenarioId: params.scenario.id },
      } as InverseData,
    };
  }

  private restoreDomainState(
    project: DesignProject,
    params: {
      ownerId: string;
      ownerType: 'screen' | 'node';
      variable: DomainStateVariable;
      position: number;
    },
  ) {
    const newProject = deepClone(project);

    if (params.ownerType === 'screen') {
      const screen = newProject.screens.find((s) => s.id === params.ownerId);
      if (!screen) {
        return {
          project,
          result: {
            success: false,
            description: `Cannot restore domain state: screen ${params.ownerId} not found`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} } as InverseData,
        };
      }
      screen.domainStates.splice(params.position, 0, params.variable);
    } else {
      let node: ComponentNode | undefined;
      for (const screen of newProject.screens) {
        node = findNodeById(screen.rootNode, params.ownerId);
        if (node) break;
      }
      if (!node) {
        return {
          project,
          result: {
            success: false,
            description: `Cannot restore domain state: node ${params.ownerId} not found`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} } as InverseData,
        };
      }
      if (!node.domainStates) {
        node.domainStates = [];
      }
      node.domainStates.splice(params.position, 0, params.variable);
    }

    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: {
        success: true,
        description: `Restored domain state variable "${params.variable.name}"`,
        affectedNodeIds: [params.ownerId],
      },
      inverse: {
        type: 'removeDomainState',
        params: {
          ownerId: params.ownerId,
          ownerType: params.ownerType,
          variableName: params.variable.name,
        },
      } as InverseData,
    };
  }

  private restoreDomainStatePreview(
    project: DesignProject,
    params: {
      ownerId: string;
      ownerType: 'screen' | 'node';
      variableName: string;
      previousValue: string | undefined;
      replacedWith: string;
    },
  ) {
    const newProject = deepClone(project);

    let list: DomainStateVariable[] | undefined;
    if (params.ownerType === 'screen') {
      const screen = newProject.screens.find((s) => s.id === params.ownerId);
      if (!screen) {
        return {
          project,
          result: {
            success: false,
            description: `Cannot restore domain state preview: screen ${params.ownerId} not found`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} } as InverseData,
        };
      }
      list = screen.domainStates;
    } else {
      let node: ComponentNode | undefined;
      for (const screen of newProject.screens) {
        node = findNodeById(screen.rootNode, params.ownerId);
        if (node) break;
      }
      if (!node) {
        return {
          project,
          result: {
            success: false,
            description: `Cannot restore domain state preview: node ${params.ownerId} not found`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} } as InverseData,
        };
      }
      list = node.domainStates;
    }

    const variable = list?.find((v) => v.name === params.variableName);
    if (!variable) {
      return {
        project,
        result: {
          success: false,
          description: `Cannot restore domain state preview: variable "${params.variableName}" not found`,
          affectedNodeIds: [],
        },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    if (params.previousValue === undefined) {
      delete variable.currentPreviewValue;
    } else {
      variable.currentPreviewValue = params.previousValue;
    }

    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: {
        success: true,
        description: `Restored domain state preview for "${params.variableName}"`,
        affectedNodeIds: [params.ownerId],
      },
      inverse: {
        type: 'setDomainStatePreview',
        params: {
          ownerId: params.ownerId,
          ownerType: params.ownerType,
          variableName: params.variableName,
          value: params.replacedWith,
        },
      } as InverseData,
    };
  }

  private restoreEnvironmentState(
    project: DesignProject,
    params: { variable: EnvironmentVariable; position: number },
  ) {
    const newProject = deepClone(project);
    if (!newProject.environmentStates) {
      newProject.environmentStates = [];
    }

    newProject.environmentStates.splice(params.position, 0, params.variable);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: {
        success: true,
        description: `Restored environment variable "${params.variable.name}"`,
        affectedNodeIds: [],
      },
      inverse: { type: 'removeEnvironmentState', params: { variableName: params.variable.name } } as InverseData,
    };
  }

  private restoreEnvironmentPreview(
    project: DesignProject,
    params: { variableName: string; previousPreview: string | undefined; redoValue: string },
  ) {
    const newProject = deepClone(project);
    if (!newProject.environmentStates) {
      newProject.environmentStates = [];
    }

    const variable = newProject.environmentStates.find((v) => v.name === params.variableName);
    if (!variable) {
      return {
        project,
        result: {
          success: false,
          description: `Cannot restore environment preview: variable "${params.variableName}" not found`,
          affectedNodeIds: [],
        },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    if (params.previousPreview === undefined) {
      delete variable.currentPreviewValue;
    } else {
      variable.currentPreviewValue = params.previousPreview;
    }
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: {
        success: true,
        description: `Restored environment preview for "${params.variableName}"`,
        affectedNodeIds: [],
      },
      inverse: {
        type: 'setEnvironmentPreview',
        params: { variableName: params.variableName, value: params.redoValue },
      } as InverseData,
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

  private restoreApiEndpoint(
    project: DesignProject,
    params: { screenId: string; endpoint: any; position: number },
  ) {
    const newProject = deepClone(project);
    const screen = newProject.screens.find((s) => s.id === params.screenId);

    if (!screen) {
      return {
        project,
        result: { success: false, description: `Cannot restore API endpoint: screen ${params.screenId} not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    if (!screen.apiEndpoints) {
      screen.apiEndpoints = [];
    }
    screen.apiEndpoints.splice(params.position, 0, params.endpoint);
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored API endpoint "${params.endpoint.definition.name}"`, affectedNodeIds: [params.screenId] },
      inverse: { type: 'removeApiEndpoint', params: { screenId: params.screenId, endpointId: params.endpoint.definition.id } } as InverseData,
    };
  }

  private restoreMockScenario(
    project: DesignProject,
    params: {
      screenId: string;
      endpointId: string;
      scenario: any;
      position: number;
      previousActiveScenarioId: string;
    },
  ) {
    const newProject = deepClone(project);
    const screen = newProject.screens.find((s) => s.id === params.screenId);
    const endpoint = screen?.apiEndpoints?.find((ep) => ep.definition.id === params.endpointId);

    if (!screen || !endpoint) {
      return {
        project,
        result: { success: false, description: `Cannot restore mock scenario: endpoint not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    endpoint.scenarios.splice(params.position, 0, params.scenario);
    endpoint.activeScenarioId = params.previousActiveScenarioId;
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored mock scenario "${params.scenario.name}"`, affectedNodeIds: [params.screenId] },
      inverse: {
        type: 'removeMockScenario',
        params: { screenId: params.screenId, endpointId: params.endpointId, scenarioId: params.scenario.id },
      } as InverseData,
    };
  }

  private restoreChildVisibility(
    project: DesignProject,
    params: {
      parentNodeId: string;
      childNodeId: string;
      stateName: string;
      oldValue: boolean | undefined;
    },
  ) {
    const newProject = deepClone(project);
    let parent: ReturnType<typeof findNodeById> | undefined;
    for (const scr of newProject.screens) {
      parent = findNodeById(scr.rootNode, params.parentNodeId);
      if (parent) break;
    }

    if (!parent) {
      return {
        project,
        result: { success: false, description: `Parent node not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    const state = (parent.states ?? []).find((s) => s.name === params.stateName);
    if (state) {
      if (params.oldValue === undefined) {
        if (state.childrenVisibility) {
          delete state.childrenVisibility[params.childNodeId];
          if (Object.keys(state.childrenVisibility).length === 0) {
            delete state.childrenVisibility;
          }
        }
      } else {
        if (!state.childrenVisibility) state.childrenVisibility = {};
        state.childrenVisibility[params.childNodeId] = params.oldValue;
      }
    }

    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored child visibility`, affectedNodeIds: [params.parentNodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreMaterialDesign(
    project: DesignProject,
    params: {
      nodeId: string;
      restoreStyles: Record<string, any>;
      removeStyleKeys: string[];
      restoreClearedStyles?: Record<string, any>;
      restoreProps: Record<string, any>;
      removePropKeys: string[];
      restoreMaterialProjectId: string | undefined;
      hadMaterialProjectId: boolean;
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
        result: { success: false, description: 'Cannot restore material design: node not found', affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} } as InverseData,
      };
    }

    // Restore styles: remove newly added keys, then restore old values
    for (const key of params.removeStyleKeys) {
      delete (node.styles as any)[key];
    }
    Object.assign(node.styles, params.restoreStyles);
    if (params.restoreClearedStyles && Object.keys(params.restoreClearedStyles).length > 0) {
      Object.assign(node.styles, params.restoreClearedStyles);
    }

    // Restore props: remove newly added keys, then restore old values
    for (const key of params.removePropKeys) {
      delete node.props[key];
    }
    Object.assign(node.props, params.restoreProps);

    // Restore materialProjectId
    if (params.hadMaterialProjectId) {
      if (params.restoreMaterialProjectId !== undefined) {
        node.materialProjectId = params.restoreMaterialProjectId;
      } else {
        delete node.materialProjectId;
      }
    }

    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored material design on ${params.nodeId}`, affectedNodeIds: [params.nodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }
}
