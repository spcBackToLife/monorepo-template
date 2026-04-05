import { makeAutoObservable, runInAction, toJS } from 'mobx';
import type { ComponentNode, DesignProject, DomainStateVariable, Screen, Viewport } from '@globallink/design-schema';
import { generateNodeId, normalizeNode } from '@globallink/design-schema';
import type { Operation, OperationResult } from '@globallink/design-operations';
import { OperationExecutor, findNodeInScreens, findParent, findParentInScreens, walkTree } from '@globallink/design-operations';
import { API_BASE, ApiError, apiJson, getErrorMessage } from '@/api/client';
import { authStore } from '@/stores/auth';
import { syncManager } from '@/services/SyncManager';

/** Storage key for pending operations across page reloads */
const PENDING_OPS_KEY = 'design-editor-pending-ops:';

/** W1-002：编辑画布 pan/zoom 与 Schema 视口尺寸独立；按项目会话记忆，刷新后可恢复 */
const CANVAS_VIEW_KEY = 'design-editor-canvas-view:';

function readStoredCanvasView(projectId: string): { scale: number; panX: number; panY: number } | null {
  try {
    const raw = sessionStorage.getItem(CANVAS_VIEW_KEY + projectId);
    if (!raw) return null;
    const o = JSON.parse(raw) as { scale?: unknown; panX?: unknown; panY?: unknown };
    if (typeof o.scale !== 'number') return null;
    return {
      scale: Math.min(4, Math.max(0.1, o.scale)),
      panX: typeof o.panX === 'number' ? o.panX : 0,
      panY: typeof o.panY === 'number' ? o.panY : 0,
    };
  } catch {
    return null;
  }
}

function savePendingOperations(projectId: string, ops: Array<{ operation: Operation; fingerprint: string }>): void {
  try {
    const data = JSON.stringify(ops);
    localStorage.setItem(PENDING_OPS_KEY + projectId, data);
  } catch (err) {
    // quota exceeded / private mode
    console.warn('[editor] failed to save pending operations to localStorage:', err);
  }
}

function loadPendingOperations(projectId: string): Array<{ operation: Operation; fingerprint: string }> {
  try {
    const raw = localStorage.getItem(PENDING_OPS_KEY + projectId);
    if (!raw) return [];
    return JSON.parse(raw) as Array<{ operation: Operation; fingerprint: string }>;
  } catch (err) {
    console.warn('[editor] failed to load pending operations from localStorage:', err);
    return [];
  }
}

function clearPendingOperations(projectId: string): void {
  try {
    localStorage.removeItem(PENDING_OPS_KEY + projectId);
  } catch {
    // ignore
  }
}

function writeStoredCanvasView(projectId: string, scale: number, panX: number, panY: number): void {
  try {
    sessionStorage.setItem(CANVAS_VIEW_KEY + projectId, JSON.stringify({ scale, panX, panY }));
  } catch {
    // quota / private mode
  }
}

export type ToolType = 'select' | 'hand' | 'container' | 'element' | 'text' | 'component' | 'annotation';

/** 右侧面板可滚动分区（用于「展开并定位」） */
export type RightPanelSectionId = 'props' | 'styles' | 'states' | 'events' | 'data' | 'code' | 'children';

/** Phase 3：编辑上下文（五层状态驱动） */
export interface EditorStateContext {
  /** 交互态预览：default | hover | active | focus | disabled */
  interactionState: string;
  /** 正在编辑 props/styles 覆盖的组件态；null = base/default */
  componentStateEditing: string | null;
  /** 领域态上下文锁定（子元素导航不丢预览） */
  lockedDomain: { variableName: string } | null;
}

export type LeftPanelView = 'pages' | 'elements' | 'data';

export class EditorStore {
  /** The operation executor holding immutable project state */
  private executor: OperationExecutor | null = null;
  /** Observable project snapshot for UI rendering */
  private projectState: DesignProject | null = null;

  /** Current screen ID being edited */
  activeScreenId: string | null = null;
  /** Selected node IDs on the canvas */
  selectedNodeIds: string[] = [];
  /** Currently hovered node ID */
  hoveredNodeId: string | null = null;
  /** Canvas zoom scale */
  canvasScale = 1;
  /** Canvas pan offset */
  canvasPanX = 0;
  canvasPanY = 0;

  /** W2：8px 栅格吸附开关（与对齐线并存时对齐线优先） */
  snapToGridEnabled = true;
  /** 在编辑区绘制浅层栅格（与吸附独立） */
  showGridInEditor = false;
  gridSizePx = 8;
  /** 画布根区域尺寸（用于 Cmd+0 适配视口） */
  canvasViewportWidth = 0;
  canvasViewportHeight = 0;

  /** --- Layout state (1.4.1) --- */
  activeTool: ToolType = 'select';
  /** 双击工具栏按钮锁定后，创建元素不自动切回选择工具 */
  toolLocked = false;
  previewMode = false;
  /** 预览模式下的页面导航栈（与 navigate 事件一致；返回键 pop）— W6-091 */
  previewNavStackIds: string[] = [];
  previewTransition: string = 'fade';
  /** Ref for PreviewRenderer to register navigateBack lifecycle handler */
  previewNavigateBackRef: { current: (() => Promise<boolean>) | null } = { current: null };
  leftPanelWidth = 280;
  rightPanelWidth = 320;
  leftPanelCollapsed = false;
  rightPanelCollapsed = false;
  /** 递增以触发底部工具栏打开组件库 Modal（快捷键 C 与 requestOpenComponentLibrary 联动） */
  componentLibraryOpenNonce = 0;

  /** Phase 3：统一状态上下文（与画布 / 右栏联动） */
  stateContext: EditorStateContext = {
    interactionState: 'default',
    componentStateEditing: null,
    lockedDomain: null,
  };

  /** 各折叠区块是否收起（key = section id） */
  collapsedSections: Record<string, boolean> = {};

  /** 展开右栏后滚动到该分区（由 RightPanel 消费后清空） */
  rightPanelScrollToSection: RightPanelSectionId | null = null;

  /** Phase 4：左侧产品导航器当前视图 */
  leftPanelView: LeftPanelView = 'elements';

  /** Phase 5：画布顶部上下文条是否显示 */
  showCanvasContextBar = true;

  /** --- 领域态 + 环境态运行时预览（合并传入 SchemaRenderer globalStates） --- */
  currentGlobalStates: Record<string, string> = {};

  /**
   * W6-042：编辑画布上对选中节点临时叠加交互状态（不写入 Schema；与交互卡片/ activeState 独立）
   * null 或 'normal' 表示不叠加
   */
  previewInteractionState: string | null = null;

  /** W7-022：画布 DOM 检测到有节点超出当前设备视口范围 */
  viewportOverflow = false;

  /**
   * W7-025：设备框外不挂载 Schema DOM；命中/对齐使用 buildSchemaLayoutMap + mergeCoordinateMaps。
   * 若与布局估计不一致可关。
   */
  canvasVirtualizeOutsideDeviceFrame = true;

  /** W8-100：预览模式设备外壳开关 */
  previewShowDeviceFrame = true;

  /** 代码分屏视图开关 */
  codeSplitView = false;

  /** 最近一次复制到内存的节点 JSON（与系统剪贴板同步写入，供粘贴） */
  clipboardSubtreeJson: string | null = null;

  /** 内存中的样式剪贴板（复制/粘贴样式，与节点 JSON 剪贴板独立） */
  styleClipboard: Record<string, string | number> | null = null;

  /** Project color palette (persistent) */
  projectColorPalette: string[] = [
    '#000000', '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#616161',
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
  ];

  /** Recently used colors (last 12) */
  recentColors: string[] = [];

  addRecentColor(color: string): void {
    const normalized = color.toLowerCase();
    this.recentColors = [
      normalized,
      ...this.recentColors.filter(c => c !== normalized),
    ].slice(0, 12);
  }

  addPaletteColor(color: string): void {
    if (!this.projectColorPalette.includes(color)) {
      this.projectColorPalette = [...this.projectColorPalette, color];
    }
  }

  removePaletteColor(color: string): void {
    this.projectColorPalette = this.projectColorPalette.filter(c => c !== color);
  }

  /** Pending operations waiting for server persistence (with fingerprints) */
  private pendingOperations: Array<{ operation: Operation; fingerprint: string }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private readonly flushIntervalMs = 10000; // Reduced from 180s to 10s for faster persistence

  /** Critical operation types that should flush immediately to prevent data loss */
  private readonly criticalOperationTypes = new Set([
    'saveAsTemplate',        // Creating component template
    'deleteTemplate',        // Deleting component template
    'duplicateTemplate',     // Duplicating component template
    'createScreen',          // Creating new screen
    'deleteScreen',          // Deleting screen (risky operation)
    'createEnvironmentState', // Environment state management
    'deleteEnvironmentState',
  ]);

  /** Retry state for failed operations */
  private retryQueue: Array<{ operation: Operation; fingerprint: string; retryCount: number }> = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxRetries = 5;
  private readonly retryBackoffMs = 1000; // Start with 1s, doubles each time

  constructor() {
    makeAutoObservable(this);
    // Restore pending operations from localStorage on startup
    this.restorePendingOperationsFromStorage();
  }

  /** Get the current project from the executor */
  get project(): DesignProject | null {
    return this.projectState;
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

  /**
   * 当前选中节点可继承的领域态变量：页面级 + 自选中节点向上到根的各容器上定义的 domainStates。
   */
  get resolvedInheritedDomainStates(): DomainStateVariable[] {
    const screen = this.activeScreen;
    if (!screen) return [];
    const seen = new Set<string>();
    const out: DomainStateVariable[] = [];
    const push = (list: DomainStateVariable[] | undefined) => {
      for (const d of list ?? []) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          out.push(d);
        }
      }
    };
    push(screen.domainStates);
    const nodeId = this.selectedNodeIds[0];
    if (!nodeId) return out;
    let cur: string | null = nodeId;
    while (cur) {
      const fp = findParentInScreens(this.screens, cur);
      if (!fp) break;
      const parent = findNodeInScreens(this.screens, fp.parent.id);
      push(parent?.domainStates);
      cur = fp.parent.id;
    }
    return out;
  }

  /** Can undo */
  get canUndo(): boolean {
    return this.executor?.canUndo() ?? false;
  }

  /** Can redo */
  get canRedo(): boolean {
    return this.executor?.canRedo() ?? false;
  }

  /** 预览中是否可「返回」上一页（导航栈深度大于 1） */
  get previewCanGoBack(): boolean {
    return this.previewMode && this.previewNavStackIds.length > 1;
  }

  /** Initialize the editor with a project */
  initProject(project: DesignProject): void {
    // Clear any previously pending operations for other projects
    if (this.project?.id && this.project.id !== project.id) {
      clearPendingOperations(this.project.id);
    }
    // Project data from MobX stores may be observable proxies. Convert to plain JS first.
    const plain = toJS(project) as DesignProject;
    for (const screen of plain.screens) {
      normalizeNode(screen.rootNode);
      const rs = screen.rootNode.styles as Record<string, unknown>;
      delete rs.left;
      delete rs.top;
      delete rs.right;
      delete rs.bottom;
    }
    for (const asset of plain.componentAssets ?? []) {
      if (asset.schema) normalizeNode(asset.schema);
    }
    this.executor = new OperationExecutor(plain);
    this.projectState = this.executor.getProject();
    this.activeScreenId = plain.screens[0]?.id ?? null;
    this.selectedNodeIds = [];
    this.hoveredNodeId = null;
    this.canvasScale = 1;
    this.canvasPanX = 0;
    this.canvasPanY = 0;
    const restored = readStoredCanvasView(plain.id);
    if (restored) {
      this.canvasScale = restored.scale;
      this.canvasPanX = restored.panX;
      this.canvasPanY = restored.panY;
    }
    this.initGlobalStatesForScreen();
    this.previewMode = false;
    this.previewNavStackIds = [];
    this.stateContext = {
      interactionState: 'default',
      componentStateEditing: null,
      lockedDomain: null,
    };
    this.collapsedSections = {};
    this.rightPanelScrollToSection = null;
    this.leftPanelView = 'elements';
    // Restore any pending operations after project is initialized
    this.restoreProjectPendingOps();
  }

  private restorePendingOperationsFromStorage(): void {
    // This will be called after project is loaded
    // We defer restoration to initProject() since projectId is not yet available
  }

  /** Call this after initProject to restore any pending operations */
  private restoreProjectPendingOps(): void {
    if (!this.project?.id || !this.executor) return;
    const restored = loadPendingOperations(this.project.id);
    if (restored.length === 0) return;

    console.log(`[editor] restored ${restored.length} pending operations from localStorage`);

    // Re-execute operations locally so the in-memory project state includes them.
    // They may already be included if the server persisted them before the reload,
    // so we silently ignore failures (duplicate ops are harmless).
    let replayedCount = 0;
    for (const entry of restored) {
      const result = this.executor.execute(entry.operation);
      if (result.success) replayedCount++;
    }
    if (replayedCount > 0) {
      runInAction(() => {
        this.projectState = this.executor!.getProject();
      });
      console.log(`[editor] replayed ${replayedCount}/${restored.length} pending operations locally`);
    }

    // Add to pending operations queue for server flush
    this.pendingOperations.push(...restored);
    // Schedule flush
    this.scheduleFlush();
  }

  /** Execute an operation */
  execute(op: Operation): OperationResult {
    if (!this.executor) {
      return { success: false, description: 'No project loaded', affectedNodeIds: [] };
    }
    const result = this.executor.execute(op);
    // Trigger MobX re-render by touching a tracked field
    runInAction(() => {
      this.projectState = this.executor!.getProject();
      this.selectedNodeIds = [...this.selectedNodeIds];
      // setActiveScreen 在数据层是 no-op，但 UI 必须切换当前页（见 design-operations/screen.ts）
      if (op.type === 'setActiveScreen' && result.success) {
        this.activeScreenId = op.params.screenId;
        this.selectedNodeIds = [];
        this.hoveredNodeId = null;
        this.initGlobalStatesForScreen();
      }
    });
    if (result.success) {
      // Generate fingerprint for echo deduplication
      const { fingerprint } = syncManager.wrapOutgoing(op);
      this.enqueuePersist(op, fingerprint, this.isCriticalOperation(op));
    }
    return result;
  }

  private isCriticalOperation(op: Operation): boolean {
    return this.criticalOperationTypes.has(op.type);
  }

  /** Apply operation from remote sync without re-persisting */
  applyRemoteOperation(op: Operation): OperationResult {
    if (!this.executor) {
      return { success: false, description: 'No project loaded', affectedNodeIds: [] };
    }
    const result = this.executor.execute(op);
    runInAction(() => {
      this.projectState = this.executor!.getProject();
      this.selectedNodeIds = [...this.selectedNodeIds];
      if (op.type === 'setActiveScreen' && result.success) {
        this.activeScreenId = op.params.screenId;
        this.selectedNodeIds = [];
        this.hoveredNodeId = null;
        this.initGlobalStatesForScreen();
      }
    });
    return result;
  }

  /** Execute batch operations with sync persistence */
  executeBatch(ops: Operation[]): OperationResult[] {
    if (!this.executor) return [];
    const results = this.executor.executeBatch(ops);
    runInAction(() => {
      this.projectState = this.executor!.getProject();
      this.selectedNodeIds = [...this.selectedNodeIds];
    });
    for (let i = 0; i < ops.length; i++) {
      if (results[i]?.success) {
        const { fingerprint } = syncManager.wrapOutgoing(ops[i]);
        this.enqueuePersist(ops[i], fingerprint, this.isCriticalOperation(ops[i]));
      }
    }
    return results;
  }

  undo(): void {
    this.executor?.undo();
    runInAction(() => {
      this.projectState = this.executor?.getProject() ?? this.projectState;
      this.selectedNodeIds = [...this.selectedNodeIds];
    });
  }

  redo(): void {
    this.executor?.redo();
    runInAction(() => {
      this.projectState = this.executor?.getProject() ?? this.projectState;
      this.selectedNodeIds = [...this.selectedNodeIds];
    });
  }

  /** Selection */
  select(nodeId: string | null): void {
    const next = nodeId ? [nodeId] : [];
    const prev = this.selectedNodeIds[0];
    if (prev !== next[0]) {
      this.previewInteractionState = null;
      this.stateContext = {
        ...this.stateContext,
        interactionState: 'default',
        componentStateEditing: null,
      };
    }
    this.selectedNodeIds = next;
  }

  setHovered(nodeId: string | null): void {
    this.hoveredNodeId = nodeId;
  }

  setCanvasScale(scale: number): void {
    this.canvasScale = Math.min(4, Math.max(0.1, scale));
    this.persistCanvasView();
  }

  setCanvasPan(x: number, y: number): void {
    this.canvasPanX = x;
    this.canvasPanY = y;
    this.persistCanvasView();
  }

  private persistCanvasView(): void {
    const id = this.project?.id;
    if (!id) return;
    writeStoredCanvasView(id, this.canvasScale, this.canvasPanX, this.canvasPanY);
  }

  setSnapToGridEnabled(value: boolean): void {
    this.snapToGridEnabled = value;
  }

  setShowGridInEditor(value: boolean): void {
    this.showGridInEditor = value;
  }

  setCanvasViewportSize(width: number, height: number): void {
    this.canvasViewportWidth = Math.max(0, width);
    this.canvasViewportHeight = Math.max(0, height);
  }

  /** Cmd+0：按当前设备视口逻辑尺寸适配到编辑区 */
  fitCanvasToViewport(): void {
    const vp = this.currentViewport;
    if (!vp || this.canvasViewportWidth <= 0) return;
    const pad = 48;
    const aw = Math.max(1, this.canvasViewportWidth - pad);
    const ah = Math.max(1, this.canvasViewportHeight - pad);
    const s = Math.min(aw / vp.width, ah / vp.height, 4);
    const scale = Math.max(0.1, s);
    const scaledW = vp.width * scale;
    const scaledH = vp.height * scale;
    runInAction(() => {
      this.canvasScale = scale;
      this.canvasPanX = (this.canvasViewportWidth - scaledW) / 2;
      this.canvasPanY = (this.canvasViewportHeight - scaledH) / 2;
    });
    this.persistCanvasView();
  }

  /** Cmd+1：缩放到 100% */
  zoomTo100Percent(): void {
    this.setCanvasScale(1);
  }

  setActiveTool(tool: ToolType): void {
    this.toolLocked = false;
    this.activeTool = tool;
  }

  toggleToolLocked(): void {
    this.toolLocked = !this.toolLocked;
  }

  /** 请求打开组件库：BottomToolbar 订阅 nonce 并 setLibraryOpen(true) */
  requestOpenComponentLibrary(): void {
    runInAction(() => {
      this.componentLibraryOpenNonce += 1;
    });
  }

  setPreviewMode(preview: boolean): void {
    this.previewMode = preview;
    if (preview && this.activeScreenId) {
      this.previewNavStackIds = [this.activeScreenId];
    } else if (!preview) {
      this.previewNavStackIds = [];
    }
  }

  /** 预览内页面跳转（事件 navigate / 程序化），压栈 */
  previewNavigateTo(screenId: string, animation?: string): void {
    if (!this.previewMode || !this.activeScreenId) return;
    if (this.previewNavStackIds.length === 0) {
      this.previewNavStackIds = [this.activeScreenId];
    }
    const top = this.previewNavStackIds[this.previewNavStackIds.length - 1];
    if (top === screenId) return;
    this.previewTransition = animation ?? 'slide-left';
    this.previewNavStackIds = [...this.previewNavStackIds, screenId];
    this.setActiveScreen(screenId);
  }

  /** 预览顶栏「返回」：先执行 navigateBack 生命周期，再弹出当前页 */
  async previewNavigateBack(): Promise<void> {
    if (!this.previewMode || this.previewNavStackIds.length <= 1) return;

    // Check if PreviewRenderer has a navigateBack lifecycle handler
    const handler = this.previewNavigateBackRef.current;
    if (handler) {
      const handled = await handler();
      if (handled) return; // lifecycle event blocked the back navigation
    }

    const nextStack = this.previewNavStackIds.slice(0, -1);
    const prevId = nextStack[nextStack.length - 1];
    if (!prevId) return;
    this.previewTransition = 'slide-right';
    this.previewNavStackIds = nextStack;
    this.setActiveScreen(prevId);
  }

  setLeftPanelWidth(width: number): void {
    this.leftPanelWidth = Math.max(180, Math.min(480, width));
  }

  setRightPanelWidth(width: number): void {
    this.rightPanelWidth = Math.max(240, Math.min(520, width));
  }

  toggleLeftPanel(): void {
    this.leftPanelCollapsed = !this.leftPanelCollapsed;
  }

  toggleCodeSplitView(): void {
    this.codeSplitView = !this.codeSplitView;
  }

  toggleRightPanel(): void {
    this.rightPanelCollapsed = !this.rightPanelCollapsed;
  }

  /** 交互态预览（与 stateContext 同步） */
  setStateContextInteraction(state: string): void {
    this.stateContext = { ...this.stateContext, interactionState: state };
    this.previewInteractionState = state === 'default' ? null : state;
  }

  setStateContextComponentState(name: string | null): void {
    this.stateContext = { ...this.stateContext, componentStateEditing: name };
  }

  lockDomainState(variableName: string): void {
    this.stateContext = { ...this.stateContext, lockedDomain: { variableName } };
  }

  unlockDomainState(): void {
    this.stateContext = { ...this.stateContext, lockedDomain: null };
  }

  toggleSectionCollapsed(sectionId: string): void {
    this.collapsedSections = {
      ...this.collapsedSections,
      [sectionId]: !this.collapsedSections[sectionId],
    };
  }

  /** 展开右侧面板并请求滚动到指定分区（代码 / 数据等入口） */
  focusRightPanelSection(section: RightPanelSectionId): void {
    runInAction(() => {
      this.rightPanelCollapsed = false;
      this.rightPanelScrollToSection = section;
    });
  }

  clearRightPanelScrollTarget(): void {
    this.rightPanelScrollToSection = null;
  }

  setLeftPanelView(view: LeftPanelView): void {
    this.leftPanelView = view;
  }

  setShowCanvasContextBar(show: boolean): void {
    this.showCanvasContextBar = show;
  }

  /** Multi-select: add or remove from selection */
  toggleSelect(nodeId: string): void {
    const idx = this.selectedNodeIds.indexOf(nodeId);
    if (idx >= 0) {
      this.selectedNodeIds = this.selectedNodeIds.filter((id) => id !== nodeId);
    } else {
      this.selectedNodeIds = [...this.selectedNodeIds, nodeId];
    }
    this.previewInteractionState = null;
  }

  /** Multi-select: set multiple */
  selectMultiple(nodeIds: string[]): void {
    this.selectedNodeIds = [...nodeIds];
    this.previewInteractionState = null;
  }

  /** 将节点序列化到剪贴板（W1-027） */
  copyNodeToClipboard(nodeId: string): void {
    const node = findNodeInScreens(this.screens, nodeId);
    if (!node) return;
    const plain = toJS(node) as ComponentNode;
    const json = JSON.stringify(plain);
    runInAction(() => {
      this.clipboardSubtreeJson = json;
    });
    void navigator.clipboard?.writeText?.(json).catch(() => {});
  }

  copySelectionToClipboard(): void {
    const id = this.selectedNodeIds[0];
    if (!id) return;
    this.copyNodeToClipboard(id);
  }

  /** @param sourceNodeId 若传入则从该节点复制；否则从当前选中的第一个节点复制 */
  copyStyles(sourceNodeId?: string): void {
    const nodeId = sourceNodeId ?? this.selectedNodeIds[0];
    if (!nodeId) return;
    const node = findNodeInScreens(this.screens, nodeId);
    if (!node) return;
    const styles = (node.styles ?? {}) as Record<string, string | number>;
    runInAction(() => {
      this.styleClipboard = { ...styles };
    });
  }

  /** @param targetNodeIds 若传入则只对这些节点生效；否则对当前全部选中节点生效 */
  pasteStyles(targetNodeIds?: string[]): void {
    if (!this.styleClipboard) return;
    const clip = { ...this.styleClipboard };
    const ids =
      targetNodeIds !== undefined && targetNodeIds.length > 0
        ? targetNodeIds
        : [...this.selectedNodeIds];
    for (const nodeId of ids) {
      this.execute({
        type: 'updateStyle',
        params: { nodeId, styles: clip },
      });
    }
  }

  /** 清空已设置的样式（恢复为默认） */
  resetStyles(targetNodeIds?: string[]): void {
    const ids =
      targetNodeIds !== undefined && targetNodeIds.length > 0
        ? targetNodeIds
        : [...this.selectedNodeIds];
    for (const nodeId of ids) {
      const node = findNodeInScreens(this.screens, nodeId);
      if (!node) continue;
      const properties = Object.keys(node.styles ?? {});
      if (properties.length === 0) continue;
      this.execute({
        type: 'resetStyle',
        params: { nodeId, properties },
      });
    }
  }

  /** 剪切：复制后删除（根节点不可剪） */
  cutSelection(): void {
    this.copySelectionToClipboard();
    const id = this.selectedNodeIds[0];
    const rootId = this.activeScreen?.rootNode.id;
    if (!id || !rootId || id === rootId) return;
    this.execute({ type: 'removeElement', params: { elementId: id } });
    this.select(null);
  }

  /** 粘贴：优先内存 JSON，否则读系统剪贴板 */
  async pasteFromClipboard(): Promise<OperationResult> {
    let text = this.clipboardSubtreeJson;
    if (!text?.trim()) {
      try {
        text = await navigator.clipboard.readText();
      } catch {
        return { success: false, description: '无法读取剪贴板', affectedNodeIds: [] };
      }
    }
    return this.applyPasteJson(text);
  }

  private applyPasteJson(text: string): OperationResult {
    let subtree: ComponentNode;
    try {
      subtree = JSON.parse(text) as ComponentNode;
    } catch {
      return { success: false, description: '剪贴板不是有效 JSON', affectedNodeIds: [] };
    }
    if (!isValidPasteSubtree(subtree)) {
      return { success: false, description: '剪贴板不是有效的节点树', affectedNodeIds: [] };
    }

    const screen = this.activeScreen;
    if (!screen) {
      return { success: false, description: '无当前页面', affectedNodeIds: [] };
    }

    const rootId = screen.rootNode.id;
    const selectedId = this.selectedNodeIds[0];
    let parentId: string;
    let position: number;

    if (!selectedId || selectedId === rootId) {
      parentId = rootId;
      position = screen.rootNode.children?.length ?? 0;
    } else {
      const info = findParent(screen.rootNode, selectedId);
      if (!info) {
        return { success: false, description: '无法解析父节点', affectedNodeIds: [] };
      }
      parentId = info.parent.id;
      position = info.index + 1;
    }

    walkTree(subtree, (n) => { n.id = generateNodeId(); });
    const r = this.execute({
      type: 'insertSubtree',
      params: { parentId, subtree, position },
    });
    if (r.success && r.affectedNodeIds[0]) {
      this.select(r.affectedNodeIds[0]);
    }
    return r;
  }

  /** Set a global state variable's current runtime value */
  setCurrentGlobalState(variableName: string, value: string): void {
    this.currentGlobalStates = { ...this.currentGlobalStates, [variableName]: value };
  }

  /** W6-042：一次应用全局状态组合（矩阵行） */
  applyGlobalStateCombo(valuesByName: Record<string, string>): void {
    this.currentGlobalStates = { ...this.currentGlobalStates, ...valuesByName };
  }

  setPreviewInteractionState(state: string | null): void {
    this.previewInteractionState = state;
    this.stateContext = {
      ...this.stateContext,
      interactionState: state == null || state === 'normal' ? 'default' : state,
    };
  }

  setViewportOverflow(overflow: boolean): void {
    this.viewportOverflow = overflow;
  }

  /** 初始化领域态 + 环境态预览值（写入 currentGlobalStates 供画布解析） */
  initGlobalStatesForScreen(): void {
    const screen = this.activeScreen;
    const project = this.project;
    if (!screen) return;
    const states: Record<string, string> = {};
    for (const gs of screen.domainStates ?? []) {
      states[gs.name] = gs.currentPreviewValue ?? gs.defaultValue;
    }
    for (const ev of project?.environmentStates ?? []) {
      states[ev.name] = ev.currentPreviewValue ?? ev.defaultValue;
    }
    this.currentGlobalStates = states;
  }

  /** Screen switching */
  setActiveScreen(screenId: string): void {
    this.activeScreenId = screenId;
    this.selectedNodeIds = [];
    this.hoveredNodeId = null;
    this.initGlobalStatesForScreen();
  }

  /** Cleanup */
  dispose(): void {
    this.flushPersistOnPageExit();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.executor = null;
    this.projectState = null;
    this.activeScreenId = null;
    this.selectedNodeIds = [];
    this.hoveredNodeId = null;
    this.canvasScale = 1;
    this.canvasPanX = 0;
    this.canvasPanY = 0;
    this.snapToGridEnabled = true;
    this.showGridInEditor = false;
    this.gridSizePx = 8;
    this.canvasViewportWidth = 0;
    this.canvasViewportHeight = 0;
    this.activeTool = 'select';
    this.previewMode = false;
    this.previewNavStackIds = [];
    this.leftPanelWidth = 280;
    this.rightPanelWidth = 320;
    this.leftPanelCollapsed = false;
    this.rightPanelCollapsed = false;
    this.componentLibraryOpenNonce = 0;
    this.currentGlobalStates = {};
    this.previewInteractionState = null;
    this.stateContext = {
      interactionState: 'default',
      componentStateEditing: null,
      lockedDomain: null,
    };
    this.collapsedSections = {};
    this.rightPanelScrollToSection = null;
    this.leftPanelView = 'elements';
    this.showCanvasContextBar = true;
    this.viewportOverflow = false;
    this.clipboardSubtreeJson = null;
    this.styleClipboard = null;
  }

  private enqueuePersist(op: Operation, fingerprint: string, forceImmediate = false): void {
    if (!this.project?.id) return;

    // All operations go into a single ordered queue to preserve execution order.
    // Critical operations trigger an immediate flush of the entire queue.
    this.pendingOperations.push({ operation: op, fingerprint });
    savePendingOperations(this.project.id, this.pendingOperations);

    if (forceImmediate) {
      // Cancel any scheduled batched flush and flush everything now
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      void this.flushPersistNow();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushPersistNow();
    }, this.flushIntervalMs);
  }

  /** ⌘S / Ctrl+S：取消定时批量，立即把待上报操作发到服务端 */
  async saveNow(): Promise<{ status: 'saved' | 'noop' | 'failed' }> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const hadPending = this.pendingOperations.length > 0;
    const ok = await this.flushPersistNow();
    if (!hadPending) return { status: 'noop' };
    return { status: ok ? 'saved' : 'failed' };
  }

  /** @returns 无需上报或上报成功为 true；仅在上报失败时为 false */
  async flushPersistNow(): Promise<boolean> {
    if (!this.project?.id) return true;
    if (this.pendingOperations.length === 0) return true;
    if (this.isFlushing) return true;
    this.isFlushing = true;
    syncManager.saveStatus.markSaving();
    const pending = this.takePendingOperations();
    const operations = pending.map((p) => p.operation);
    const fingerprints = pending.map((p) => p.fingerprint);
    try {
      const resp = await apiJson<{ results: OperationResult[]; startSeq?: number; endSeq?: number }>(`/projects/${this.project.id}/operations/batch`, {
        method: 'POST',
        body: JSON.stringify({ operations, fingerprints }),
        token: authStore.token,
      });
      // Acknowledge sequence numbers from server
      if (resp.endSeq != null) {
        syncManager.ackSeq(resp.endSeq);
      }
      syncManager.saveStatus.markSaved();
      // Clear localStorage after successful flush
      clearPendingOperations(this.project!.id);
      return true;
    } catch (err: unknown) {
      // 400: Structural error - analyze which operations are causing it
      if (err instanceof ApiError && err.status === 400) {
        console.error('[editor] persist batch rejected (400):', getErrorMessage(err.body));
        
        // Try to identify problematic operations from error response
        if (err.body && typeof err.body === 'object' && 'failedOperationIndex' in err.body) {
          const failedIdx = (err.body as Record<string, unknown>).failedOperationIndex as number;
          const failedOp = operations[failedIdx];
          console.error('[editor] operation causing failure:', failedIdx, failedOp?.type, getErrorMessage(err.body));
          
          // Move failed op and everything after to retry queue with backoff
          const failedAndLater = pending.slice(failedIdx);
          for (const item of failedAndLater) {
            this.addToRetryQueue(item.operation, item.fingerprint);
          }
          
          // Re-queue operations before the failure
          const beforeFailed = pending.slice(0, failedIdx);
          this.pendingOperations = [...beforeFailed, ...this.pendingOperations];
          
          if (beforeFailed.length > 0) {
            this.scheduleFlush();
          }
        } else {
          // Entire batch failed, add to retry queue
          for (const item of pending) {
            this.addToRetryQueue(item.operation, item.fingerprint);
          }
        }
        
        syncManager.saveStatus.markFailed();
        return false;
      }
      
      // Network errors: re-queue and retry
      console.error('[editor] persist operation batch failed (retryable):', err);
      for (const item of pending) {
        this.addToRetryQueue(item.operation, item.fingerprint);
      }
      
      syncManager.saveStatus.markFailed();
      this.scheduleRetry();
      return false;
    } finally {
      this.isFlushing = false;
      if (this.pendingOperations.length > 0) this.scheduleFlush();
    }
  }

  /** Add operation to retry queue with exponential backoff */
  private addToRetryQueue(op: Operation, fingerprint: string): void {
    const existing = this.retryQueue.find((r) => r.operation === op);
    if (existing) {
      existing.retryCount++;
    } else {
      this.retryQueue.push({ operation: op, fingerprint, retryCount: 0 });
    }
  }

  /** Schedule retry for failed operations with exponential backoff */
  private scheduleRetry(): void {
    if (this.retryTimer || this.retryQueue.length === 0) return;
    
    // Get min retry count from queue
    const minRetries = Math.min(...this.retryQueue.map((r) => r.retryCount));
    if (minRetries >= this.maxRetries) {
      console.error('[editor] max retries exceeded, operations dropped:', this.retryQueue.map((r) => r.operation.type));
      this.retryQueue = [];
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delayMs = this.retryBackoffMs * Math.pow(2, minRetries);
    console.log(`[editor] scheduling retry in ${delayMs}ms (attempt ${minRetries + 1}/${this.maxRetries})`);
    
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flushRetryQueue();
    }, delayMs);
  }

  /** Flush operations from retry queue */
  private async flushRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return;
    
    const pending = this.retryQueue;
    this.retryQueue = [];
    const operations = pending.map((p) => p.operation);
    const fingerprints = pending.map((p) => p.fingerprint);
    
    console.log(`[editor] flushing ${operations.length} operations from retry queue`);
    
    try {
      await apiJson<{ results: OperationResult[] }>(
        `/projects/${this.project!.id}/operations/batch`,
        {
          method: 'POST',
          body: JSON.stringify({ operations, fingerprints }),
          token: authStore.token,
        }
      );
      console.log('[editor] retry batch succeeded');
      syncManager.saveStatus.markSaved();
    } catch (err) {
      console.warn('[editor] retry batch failed, re-queuing:', err);
      // Add back to retry queue and schedule another retry
      for (let i = 0; i < pending.length; i++) {
        this.addToRetryQueue(pending[i].operation, pending[i].fingerprint);
      }
      this.scheduleRetry();
    }
  }

  flushPersistOnPageExit(): void {
    if (!this.project?.id || this.pendingOperations.length === 0) return;
    const pending = this.takePendingOperations();
    const operations = pending.map((p) => p.operation);
    const fingerprints = pending.map((p) => p.fingerprint);
    const token = authStore.token;
    const url = `${API_BASE}/projects/${this.project.id}/operations/batch`;

    // keepalive lets browser continue request during unload/navigation.
    void fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ operations, fingerprints }),
    }).catch(() => {
      // Best effort on page-exit; if it fails the session is gone.
    });
  }

  private takePendingOperations(): Array<{ operation: Operation; fingerprint: string }> {
    const pending = [...this.pendingOperations];
    this.pendingOperations = [];
    return pending;
  }

}

function isValidPasteSubtree(n: unknown): n is ComponentNode {
  if (!n || typeof n !== 'object') return false;
  const o = n as Record<string, unknown>;
  if (typeof o.type !== 'string') return false;
  if (!Array.isArray(o.children)) return false;
  for (const c of o.children) {
    if (!isValidPasteSubtree(c)) return false;
  }
  return true;
}

export const editorStore = new EditorStore();
