import type { DesignProject, ComponentNode } from '@globallink/design-schema';
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
} from '../operations/element';
import {
  executeUpdateStyle,
  executeResetStyle,
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
  executeAddNavigation,
} from '../operations/event';
import {
  executeAddScreen,
  executeRemoveScreen,
  executeSetActiveScreen,
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

      // Style operations
      case 'updateStyle':
        return executeUpdateStyle(project, op.params);
      case 'resetStyle':
        return executeResetStyle(project, op.params);

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
      case 'addNavigation':
        return executeAddNavigation(project, op.params);

      // Screen operations
      case 'addScreen':
        return executeAddScreen(project, op.params);
      case 'removeScreen':
        return executeRemoveScreen(project, op.params);
      case 'setActiveScreen':
        return executeSetActiveScreen(project, op.params);

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

      case '_restoreNode':
        return this.restoreNode(project, inv.params as any);

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
    params: { nodeId: string; restoreStyles: Record<string, any>; removeKeys: string[] },
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
    newProject.updatedAt = new Date().toISOString();

    return {
      project: newProject,
      result: { success: true, description: `Restored styles on ${params.nodeId}`, affectedNodeIds: [params.nodeId] },
      inverse: { type: 'noop', params: {} } as InverseData,
    };
  }

  private restoreState(
    project: DesignProject,
    params: { nodeId: string; stateName: string; styles: any; props?: any },
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
}
