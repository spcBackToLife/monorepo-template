/**
 * 素材编辑器 HistoryManager — 操作级 undo/redo
 *
 * 与 @globallink/design-operations HistoryManager 完全同构。
 */

import type { MaterialOperation, InverseData } from '../types';

/** 历史条目 */
export interface HistoryEntry {
  /** 执行的操作 */
  operation: MaterialOperation;
  /** 反向操作数据 */
  inverse: InverseData;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 线性栈模型的 undo/redo 管理器。
 *
 * - execute() → 推入 undo 栈，清空 redo 栈
 * - undo() → 从 undo 弹出，推入 redo
 * - redo() → 从 redo 弹出，推入 undo
 */
export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
  }

  /** 推入新操作到 undo 栈，清空 redo 栈 */
  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  /** 从 undo 栈弹出 */
  popUndo(): HistoryEntry | undefined {
    return this.undoStack.pop();
  }

  /** 推入 redo 栈 */
  pushRedo(entry: HistoryEntry): void {
    this.redoStack.push(entry);
  }

  /** 从 redo 栈弹出 */
  popRedo(): HistoryEntry | undefined {
    return this.redoStack.pop();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoCount(): number {
    return this.undoStack.length;
  }

  get redoCount(): number {
    return this.redoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoEntries(): readonly HistoryEntry[] {
    return this.undoStack;
  }

  getRedoEntries(): readonly HistoryEntry[] {
    return this.redoStack;
  }
}
