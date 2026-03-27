import { makeAutoObservable, runInAction, toJS } from 'mobx';
import type { DesignProject, Screen, Viewport } from '@globallink/design-schema';
import type { Operation, OperationResult } from '@globallink/design-operations';
import { OperationExecutor } from '@globallink/design-operations';

export class EditorStore {
  /** The operation executor holding immutable project state */
  private executor: OperationExecutor | null = null;

  /** Current screen ID being edited */
  activeScreenId: string | null = null;
  /** Selected node IDs on the canvas */
  selectedNodeIds: string[] = [];
  /** Currently hovered node ID */
  hoveredNodeId: string | null = null;
  /** Canvas zoom scale */
  canvasScale = 1;

  constructor() {
    makeAutoObservable(this);
  }

  /** Get the current project from the executor */
  get project(): DesignProject | null {
    return this.executor?.getProject() ?? null;
  }

  /** Current viewport */
  get currentViewport(): Viewport | null {
    return this.project?.currentViewport ?? null;
  }

  /** Current screen */
  get activeScreen(): Screen | null {
    if (!this.project) return null;
    if (!this.activeScreenId) return this.project.screens[0] ?? null;
    return this.project.screens.find((s) => s.id === this.activeScreenId) ?? null;
  }

  /** All screens */
  get screens(): Screen[] {
    return this.project?.screens ?? [];
  }

  /** Can undo */
  get canUndo(): boolean {
    return this.executor?.canUndo() ?? false;
  }

  /** Can redo */
  get canRedo(): boolean {
    return this.executor?.canRedo() ?? false;
  }

  /** Initialize the editor with a project */
  initProject(project: DesignProject): void {
    // Project data from MobX stores may be observable proxies. Convert to plain JS first.
    this.executor = new OperationExecutor(toJS(project) as DesignProject);
    this.activeScreenId = project.screens[0]?.id ?? null;
    this.selectedNodeIds = [];
    this.hoveredNodeId = null;
  }

  /** Execute an operation */
  execute(op: Operation): OperationResult {
    if (!this.executor) {
      return { success: false, description: 'No project loaded', affectedNodeIds: [] };
    }
    const result = this.executor.execute(op);
    // Trigger MobX re-render by touching a tracked field
    runInAction(() => {
      this.selectedNodeIds = [...this.selectedNodeIds];
    });
    return result;
  }

  /** Execute batch operations */
  executeBatch(ops: Operation[]): OperationResult[] {
    if (!this.executor) return [];
    const results = this.executor.executeBatch(ops);
    runInAction(() => {
      this.selectedNodeIds = [...this.selectedNodeIds];
    });
    return results;
  }

  undo(): void {
    this.executor?.undo();
    runInAction(() => {
      this.selectedNodeIds = [...this.selectedNodeIds];
    });
  }

  redo(): void {
    this.executor?.redo();
    runInAction(() => {
      this.selectedNodeIds = [...this.selectedNodeIds];
    });
  }

  /** Selection */
  select(nodeId: string | null): void {
    this.selectedNodeIds = nodeId ? [nodeId] : [];
  }

  setHovered(nodeId: string | null): void {
    this.hoveredNodeId = nodeId;
  }

  setCanvasScale(scale: number): void {
    this.canvasScale = Math.min(2, Math.max(0.3, scale));
  }

  /** Screen switching */
  setActiveScreen(screenId: string): void {
    this.activeScreenId = screenId;
    this.selectedNodeIds = [];
    this.hoveredNodeId = null;
  }

  /** Cleanup */
  dispose(): void {
    this.executor = null;
    this.activeScreenId = null;
    this.selectedNodeIds = [];
    this.hoveredNodeId = null;
    this.canvasScale = 1;
  }
}

export const editorStore = new EditorStore();
