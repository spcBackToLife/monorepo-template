/**
 * 撤销/重做管理器
 *
 * 基于 Fabric.js Canvas JSON 状态快照实现。
 * 每次有意义的操作后调用 saveState() 保存快照。
 */

export interface HistoryState {
  /** Fabric canvas JSON snapshot */
  canvasJSON: string;
  /** 时间戳 */
  timestamp: number;
}

export class HistoryManager {
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private maxHistory: number;
  private listeners: Set<() => void> = new Set();
  private _locked = false;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  /** 保存当前状态 */
  saveState(canvasJSON: string): void {
    if (this._locked) return;

    this.undoStack.push({
      canvasJSON,
      timestamp: Date.now(),
    });

    // 限制历史数量
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // 新操作后清空 redo 栈
    this.redoStack = [];
    this.notify();
  }

  /** 撤销：返回上一个状态的 JSON */
  undo(currentCanvasJSON: string): string | null {
    if (this.undoStack.length === 0) return null;

    const current: HistoryState = {
      canvasJSON: currentCanvasJSON,
      timestamp: Date.now(),
    };
    this.redoStack.push(current);

    const prev = this.undoStack.pop()!;
    this.notify();
    return prev.canvasJSON;
  }

  /** 重做：返回下一个状态的 JSON */
  redo(currentCanvasJSON: string): string | null {
    if (this.redoStack.length === 0) return null;

    const current: HistoryState = {
      canvasJSON: currentCanvasJSON,
      timestamp: Date.now(),
    };
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.notify();
    return next.canvasJSON;
  }

  /** 是否可以撤销 */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** 是否可以重做 */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** 撤销栈深度 */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /** 重做栈深度 */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /** 锁定（在恢复快照期间避免递归保存） */
  lock(): void {
    this._locked = true;
  }

  /** 解锁 */
  unlock(): void {
    this._locked = false;
  }

  /** 清空历史 */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  /** 订阅变更 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
