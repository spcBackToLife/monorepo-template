import type { DesignProject } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  Operation,
  OperationResult,
  InverseData,
  OperationDescription,
} from '../types';
import { ProjectState } from './state';
import { HistoryManager } from './history';
import { getAvailableOperations } from './description';
import { dispatchOperation } from './dispatch';
import { dispatchInverse } from './inverse';

/**
 * Central executor that dispatches operations, manages state, and handles undo/redo.
 *
 * Usage:
 * ```ts
 * const executor = new OperationExecutor(myProject);
 * const result = executor.execute({ type: 'element.add', params: { ... } });
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
      this.history.push({ operation: op, inverse, timestamp: Date.now() });
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
        // 失败时回滚整批：state 不更新
        return results;
      }
    }

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
      this.history.push({ operation: entry.operation, inverse, timestamp: Date.now() });
    }
    return { ...result, description: `Redo: ${result.description}` };
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }
  canRedo(): boolean {
    return this.history.canRedo();
  }

  /** 给 MCP / AI 用的 op 列表 */
  getAvailableOperations(): OperationDescription[] {
    return getAvailableOperations();
  }

  /** Get a snapshot of the current project (deep clone) */
  snapshot(): DesignProject {
    return this.state.snapshot();
  }

  getHistoryInfo(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.history.undoCount,
      redoCount: this.history.redoCount,
    };
  }

  // ===== private =====

  private dispatch(project: DesignProject, op: Operation) {
    return dispatchOperation(project, op);
  }

  /** 处理 inverse：先看是不是 _restoreXxx；不是则按常规 op 走 dispatch */
  private dispatchInverse(project: DesignProject, inv: InverseData) {
    const out = dispatchInverse(project, inv);
    if (out) return out;
    // inv 是常规 op type（如 'element.move' 用作 undo），降级到 dispatch
    return dispatchOperation(project, { type: inv.type, params: inv.params } as Operation);
  }
}
