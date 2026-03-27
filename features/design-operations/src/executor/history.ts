import type { Operation, InverseData } from '../types';

/** A single entry in the history stack */
export interface HistoryEntry {
  /** The operation that was executed */
  operation: Operation;
  /** Data needed to reverse this operation */
  inverse: InverseData;
  /** Timestamp when the operation was executed */
  timestamp: number;
}

/**
 * Manages undo/redo history for an OperationExecutor.
 *
 * Uses a linear stack model:
 * - Each execute() pushes to the undo stack and clears the redo stack
 * - undo() pops from undo, pushes to redo
 * - redo() pops from redo, pushes to undo
 */
export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
  }

  /** Push a new operation onto the undo stack. Clears redo stack. */
  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    // Trim if exceeding max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    // Any new operation invalidates the redo stack
    this.redoStack = [];
  }

  /** Pop the last entry from the undo stack (for undo). */
  popUndo(): HistoryEntry | undefined {
    return this.undoStack.pop();
  }

  /** Push an entry onto the redo stack (after undo). */
  pushRedo(entry: HistoryEntry): void {
    this.redoStack.push(entry);
  }

  /** Pop the last entry from the redo stack (for redo). */
  popRedo(): HistoryEntry | undefined {
    return this.redoStack.pop();
  }

  /** Check if undo is available */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Check if redo is available */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Get the number of undo entries */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /** Get the number of redo entries */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /** Clear all history */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Get all undo entries (for serialization / debugging) */
  getUndoEntries(): readonly HistoryEntry[] {
    return this.undoStack;
  }

  /** Get all redo entries (for serialization / debugging) */
  getRedoEntries(): readonly HistoryEntry[] {
    return this.redoStack;
  }
}
