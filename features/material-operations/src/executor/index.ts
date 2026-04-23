/**
 * MaterialOperationExecutor — 素材编辑器操作执行器
 *
 * 与 @globallink/design-operations OperationExecutor 完全同构：
 * - dispatch(op) → { project, result, inverse }
 * - execute(op) → 提交状态 + 推入历史
 * - undo() / redo()
 * - snapshot()
 *
 * 纯函数式执行，可同时在后端（Node.js）和前端（浏览器）运行。
 */

import type { MaterialProjectSchema } from '../schema';
import type { MaterialOperation, OperationResult, InverseData } from '../types';
import { MaterialProjectState } from './state';
import { HistoryManager } from './history';
import { deepClone } from '../utils';

// 导入所有操作执行函数
import {
  executeAddObject,
  executeRemoveObject,
  executeUpdateObject,
  executeDuplicateObject,
} from '../operations/object';
import {
  executeSetBackgroundColor,
  executeResizeCanvas,
  executeResizeReferenceFrame,
} from '../operations/canvas';
import {
  executeReorderObject,
  executeSetVisibility,
  executeSetLock,
  executeRenameObject,
} from '../operations/layer';
import {
  executeSetFill,
  executeSetStroke,
  executeSetOpacity,
  executeSetShadow,
  executeSetBlendMode,
} from '../operations/style';
import {
  executeGroupObjects,
  executeUngroupObjects,
} from '../operations/group';
import {
  executeUpdateText,
} from '../operations/text';
import {
  executeBooleanOp,
  executeUndoBooleanOp,
} from '../operations/boolean';
import {
  executeAlignObjects,
  executeDistributeObjects,
  executeRestorePositions,
} from '../operations/align';

type DispatchResult = {
  project: MaterialProjectSchema;
  result: OperationResult;
  inverse: InverseData;
};

export class MaterialOperationExecutor {
  private state: MaterialProjectState;
  private history: HistoryManager;

  constructor(project: MaterialProjectSchema, historyMaxSize: number = 200) {
    this.state = new MaterialProjectState(project);
    this.history = new HistoryManager(historyMaxSize);
  }

  /** 获取当前项目状态 */
  getProject(): MaterialProjectSchema {
    return this.state.current;
  }

  /** 替换项目状态（如从服务器加载后） */
  setProject(project: MaterialProjectSchema): void {
    this.state.current = deepClone(project);
    this.history.clear();
  }

  /** 执行单个操作 */
  execute(op: MaterialOperation): OperationResult {
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

  /** 批量执行操作（原子性：全部成功或全部回滚） */
  executeBatch(ops: MaterialOperation[]): OperationResult[] {
    const results: OperationResult[] = [];
    let currentProject = this.state.current;
    const inverses: { operation: MaterialOperation; inverse: InverseData }[] = [];

    for (const op of ops) {
      const { project, result, inverse } = this.dispatch(currentProject, op);
      results.push(result);

      if (result.success) {
        currentProject = project;
        inverses.push({ operation: op, inverse });
      } else {
        // 某个操作失败，回滚所有
        return results;
      }
    }

    // 全部成功 — 提交
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

  /** 撤销 */
  undo(): OperationResult {
    if (!this.history.canUndo()) {
      return { success: false, description: 'Nothing to undo', affectedObjectIds: [] };
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

  /** 重做 */
  redo(): OperationResult {
    if (!this.history.canRedo()) {
      return { success: false, description: 'Nothing to redo', affectedObjectIds: [] };
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

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  /** 获取当前快照（深拷贝） */
  snapshot(): MaterialProjectSchema {
    return this.state.snapshot();
  }

  /** 获取历史信息 */
  getHistoryInfo(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.history.undoCount,
      redoCount: this.history.redoCount,
    };
  }

  // ===== Private dispatch =====

  private dispatch(
    project: MaterialProjectSchema,
    op: MaterialOperation,
  ): DispatchResult {
    if (op == null || typeof (op as { type?: unknown }).type !== 'string') {
      return {
        project,
        result: {
          success: false,
          description: 'Invalid material operation: missing type or null operation',
          affectedObjectIds: [],
        },
        inverse: { type: 'noop', params: {} },
      };
    }

    switch (op.type) {
      // 画布操作
      case 'me:setBackgroundColor':
        return executeSetBackgroundColor(project, op.params);
      case 'me:resizeCanvas':
        return executeResizeCanvas(project, op.params);
      case 'me:resizeReferenceFrame':
        return executeResizeReferenceFrame(project, op.params);

      // 对象 CRUD
      case 'me:addObject':
        return executeAddObject(project, op.params);
      case 'me:removeObject':
        return executeRemoveObject(project, op.params);
      case 'me:updateObject':
        return executeUpdateObject(project, op.params);
      case 'me:duplicateObject':
        return executeDuplicateObject(project, op.params);

      // 图层
      case 'me:reorderObject':
        return executeReorderObject(project, op.params);
      case 'me:setVisibility':
        return executeSetVisibility(project, op.params);
      case 'me:setLock':
        return executeSetLock(project, op.params);
      case 'me:renameObject':
        return executeRenameObject(project, op.params);

      // 样式
      case 'me:setFill':
        return executeSetFill(project, op.params);
      case 'me:setStroke':
        return executeSetStroke(project, op.params);
      case 'me:setOpacity':
        return executeSetOpacity(project, op.params);
      case 'me:setShadow':
        return executeSetShadow(project, op.params);
      case 'me:setBlendMode':
        return executeSetBlendMode(project, op.params);

      // 组
      case 'me:groupObjects':
        return executeGroupObjects(project, op.params);
      case 'me:ungroupObjects':
        return executeUngroupObjects(project, op.params);

      // 文字
      case 'me:updateText':
        return executeUpdateText(project, op.params);

      // 布尔运算
      case 'me:booleanOp':
        return executeBooleanOp(project, op.params);

      // 对齐/分布
      case 'me:alignObjects':
        return executeAlignObjects(project, op.params);
      case 'me:distributeObjects':
        return executeDistributeObjects(project, op.params);

      default: {
        const _exhaustive: never = op;
        return {
          project,
          result: { success: false, description: `Unknown operation: ${(op as { type: string }).type}`, affectedObjectIds: [] },
          inverse: { type: 'noop', params: {} },
        };
      }
    }
  }

  /** 执行反向操作（用于 undo） */
  private dispatchInverse(
    project: MaterialProjectSchema,
    inverse: InverseData,
  ): DispatchResult {
    if (inverse.type === 'noop') {
      return {
        project,
        result: { success: true, description: 'No-op', affectedObjectIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }

    // 布尔运算的反向操作
    if (inverse.type === 'me:undoBooleanOp') {
      return executeUndoBooleanOp(project, inverse.params as Parameters<typeof executeUndoBooleanOp>[1]);
    }

    // 对齐/分布的反向操作 — 恢复位置
    if (inverse.type === 'me:restorePositions') {
      return executeRestorePositions(project, inverse.params as Parameters<typeof executeRestorePositions>[1]);
    }

    // 将 InverseData 构造为 MaterialOperation 并 dispatch
    const op = { type: inverse.type, params: inverse.params } as unknown as MaterialOperation;
    return this.dispatch(project, op);
  }
}
