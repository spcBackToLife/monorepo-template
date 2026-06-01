import { makeAutoObservable, runInAction, toJS } from 'mobx';
import type {
  ComponentNode,
  CSSProperties,
  DesignProject,
  Screen,
  Viewport,
  ViewVariableDef,
  ThemeConfig,
  ThemeOp,
  TokenKind,
  StyleIntent,
  DecorationRules,
  IconSpec,
  ComponentStateSpec,
  TokenOverrides,
} from '@globallink/design-schema';
import { generateNodeId, normalizeNode } from '@globallink/design-schema';
import type { Operation, OperationResult } from '@globallink/design-operations';
import { OperationExecutor, findNodeInScreens, findParent, findParentInScreens, walkTree } from '@globallink/design-operations';
import { API_BASE, ApiError, apiJson, getErrorMessage } from '@/api/client';
import { authStore } from '@/stores/auth';
import { syncManager } from '@/services/SyncManager';

/** Shape of serialized canvas view state stored in sessionStorage */
interface CanvasViewState {
  scale?: number;
  panX?: number;
  panY?: number;
}

/** Shape of a pending operation entry stored in localStorage */
interface OperationLogEntry {
  operation: Operation;
  fingerprint: string;
}

/** Storage key for pending operations across page reloads */
const PENDING_OPS_KEY = 'design-editor-pending-ops:';

/** W1-002：编辑画布 pan/zoom 与 Schema 视口尺寸独立；按项目会话记忆，刷新后可恢复 */
const CANVAS_VIEW_KEY = 'design-editor-canvas-view:';

function readStoredCanvasView(projectId: string): { scale: number; panX: number; panY: number } | null {
  try {
    const raw = sessionStorage.getItem(CANVAS_VIEW_KEY + projectId);
    if (!raw) return null;
    const o: CanvasViewState = JSON.parse(raw);
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

function savePendingOperations(projectId: string, ops: OperationLogEntry[]): void {
  try {
    const data = JSON.stringify(ops);
    localStorage.setItem(PENDING_OPS_KEY + projectId, data);
  } catch (err) {
    // quota exceeded / private mode
    console.warn('[editor] failed to save pending operations to localStorage:', err);
  }
}

function loadPendingOperations(projectId: string): OperationLogEntry[] {
  try {
    const raw = localStorage.getItem(PENDING_OPS_KEY + projectId);
    if (!raw) return [];
    const entries: OperationLogEntry[] = JSON.parse(raw);
    return entries;
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

/**
 * 会影响"页面级 view 变量"的 v2 op：执行后须重跑 initStatePreviewForScreen，
 * 让 currentStatePreview 与 schema 同步（影响表达式作用域）。
 */
const STATE_PREVIEW_RESYNC_OPS = new Set<string>([
  'screenState.addViewVariable',
  'screenState.removeViewVariable',
  'screenState.updateViewVariable',
  'screenState.setViewPreview',
  'screenState.setDataInit',
  'screenState.removeDataInit',
  'globalState.addViewVariable',
  'globalState.removeViewVariable',
  'globalState.updateViewVariable',
  'globalState.setViewPreview',
]);

export type ToolType = 'select' | 'hand' | 'container' | 'element' | 'text' | 'component' | 'annotation';

/** 右侧面板可滚动分区（用于「展开并定位」） */
export type RightPanelSectionId = 'props' | 'styles' | 'states' | 'events' | 'data' | 'code' | 'children';

/** Phase 3：编辑上下文（v2：移除 v1 lockedDomain，仅保留 visualState 维度的预览） */
export interface EditorStateContext {
  /** 交互态预览：default | hover | active | focus | disabled | <自定义> */
  interactionState: string;
  /** 正在编辑 props/styles 覆盖的视觉态；null = base/default */
  componentStateEditing: string | null;
}

export type LeftPanelView = 'pages' | 'elements' | 'data' | 'materials';

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
  /** 状态预览缩略图条是否展开（持久化到 localStorage） */
  statePreviewStripExpanded = typeof localStorage !== 'undefined' ? localStorage.getItem('statePreviewStripExpanded') !== 'false' : true;
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
  };

  /** 各折叠区块是否收起（key = section id） */
  collapsedSections: Record<string, boolean> = {};

  /** 展开右栏后滚动到该分区（由 RightPanel 消费后清空） */
  rightPanelScrollToSection: RightPanelSectionId | null = null;

  /** Phase 4：左侧产品导航器当前视图 */
  leftPanelView: LeftPanelView = 'elements';

  /** Phase 5：画布顶部上下文条是否显示 */
  showCanvasContextBar = true;

  /** --- 领域态 + 环境态运行时预览（合并传入 SchemaRenderer globalStates） ---
   *
   * ★ v3 修复 Bug B：用 unknown 保留原始类型（boolean/number/object/...）。
   * 此前 Record<string, string> 用 JSON.stringify 转字符串，导致 false/0 被存成
   * 真值字符串 "false"/"0"，再喂给画布 dataContext 时 state.view.submitting === "false"
   * 在 ternary 中变 truthy（典型 bug：默认 submitting=false 却展示"登录中..."）。
   */
  currentGlobalStates: Record<string, unknown> = {};

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

  /**
   * 预览期 effect.fetch 的路由目标（v2 EffectExecutor.env）。
   * - 'mock'：编辑器内用 ApiDataSource.mock 的 responseBody；默认
   * - 'http'：走真实接口（HttpDriver）
   * 由 DataTab 顶部全局开关控制，后续接入 PreviewRenderer 的 EffectExecutor 时消费。
   */
  previewEffectEnv: 'mock' | 'http' = 'mock';

  /** 素材编辑器弹窗状态（右键菜单"设计素材…" / 属性面板"高级编辑"打开） */
  materialEditorOpen = false;
  materialEditorTargetNodeId: string | null = null;
  materialEditorInitTab: 'gradient' | 'shadow' | 'filter' | 'canvas' | 'animation' | 'assets' = 'gradient';
  /** 指定打开的素材工程 ID（为 null 时自动查找/创建） */
  materialEditorProjectId: string | null = null;
  /** 指定打开的槽位名称（为 null 时默认使用 'default'） */
  materialEditorSlotName: string | null = null;
  /** 强制新建素材工程（跳过所有查找逻辑，直接创建新工程 + 新槽位） */
  materialEditorForceCreate = false;
  /** 素材导出的 CSS 目标属性（如 background-image, props.src 等） */
  materialEditorCssTarget: string | null = null;

  /** 最近一次复制到内存的节点 JSON（与系统剪贴板同步写入，供粘贴） */
  clipboardSubtreeJson: string | null = null;

  /** 内存中的样式剪贴板（复制/粘贴样式，与节点 JSON 剪贴板独立） */
  styleClipboard: Partial<CSSProperties> | null = null;

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
  private pendingOperations: OperationLogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private readonly flushIntervalMs = 10000; // Reduced from 180s to 10s for faster persistence

  /** Critical operation types that should flush immediately to prevent data loss */
  private readonly criticalOperationTypes = new Set([
    'asset.saveAsTemplate',     // Creating component template
    'template.delete',           // Deleting component template
    'template.duplicate',        // Duplicating component template
    'screen.add',                // Creating new screen
    'screen.remove',             // Deleting screen (risky operation)
    'globalState.addViewVariable',    // Project-level state mgmt
    'globalState.removeViewVariable',
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
   * 当前屏幕作用域内可见的 view 变量定义（v2）：
   *   - 项目级 globalStateInit.view（所有屏幕共享）
   *   - 当前屏幕 stateInit.view（屏幕私有，与 global 同名时屏幕覆盖）
   *
   * 仅供编辑器面板（变量列表 / 表达式补全）参考；运行时 evalContext 由渲染器组装。
   */
  get resolvedViewVariables(): ViewVariableDef[] {
    const screen = this.activeScreen;
    const project = this.project;
    if (!screen) return [];
    const seen = new Set<string>();
    const out: ViewVariableDef[] = [];
    const push = (defs: Record<string, ViewVariableDef> | undefined) => {
      if (!defs) return;
      for (const def of Object.values(defs)) {
        if (!seen.has(def.name)) {
          seen.add(def.name);
          out.push(def);
        }
      }
    };
    // 屏幕级先（同名覆盖项目级）
    push(screen.stateInit?.view);
    push(project?.globalStateInit?.view);
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

  /**
   * Get the parent state override for the first selected node (if any).
   * This determines which state a child node should render with based on parent's childrenStates mapping.
   */
  get selectedNodeParentStateOverride(): string | null {
    const nodeId = this.selectedNodeIds[0];
    if (!nodeId) return null;

    const parent = findParentInScreens(this.screens, nodeId);
    if (!parent?.parent) return null;

    // Check if parent has custom states with childrenStates mapping
    const parentNode = parent.parent;
    const activeState = parentNode.activeState ?? 'default';
    const stateDef = parentNode.states?.find((s) => s.name === activeState);

    // Look up the override for this child in the parent's active state
    if (stateDef?.childrenStates?.[nodeId]) {
      return stateDef.childrenStates[nodeId];
    }

    return null;
  }

  /** Initialize the editor with a project */
  initProject(project: DesignProject): void {
    // Clear any previously pending operations for other projects
    if (this.project?.id && this.project.id !== project.id) {
      clearPendingOperations(this.project.id);
    }
    // Project data from MobX stores may be observable proxies. Convert to plain JS first.
    const plain = toJS(project);
    for (const screen of plain.screens) {
      normalizeNode(screen.rootNode);
      const rs = screen.rootNode.styles;
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
      // screen.setActive 在数据层是 no-op，但 UI 必须切换当前页（见 design-operations/screen.ts）
      if (op.type === 'screen.setActive' && result.success) {
        this.activeScreenId = op.params.screenId;
        this.selectedNodeIds = [];
        this.hoveredNodeId = null;
        this.initGlobalStatesForScreen();
      } else if (
        result.success &&
        this.activeScreen &&
        STATE_PREVIEW_RESYNC_OPS.has(op.type)
      ) {
        // view 变量增删改预览值后，画布 globalStates 需与 Schema 同步
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
      if (op.type === 'screen.setActive' && result.success) {
        this.activeScreenId = op.params.screenId;
        this.selectedNodeIds = [];
        this.hoveredNodeId = null;
        this.initGlobalStatesForScreen();
      } else if (
        result.success &&
        this.activeScreen &&
        STATE_PREVIEW_RESYNC_OPS.has(op.type)
      ) {
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

  // ===== Theme Management =====
  //
  // 所有主题写入走后端的 POST /theme/op 端点（与 MCP theme/* 工具同源），
  // 后端用 schema 包的 applyThemeOp reducer 统一处理，保证落库结构一致。

  /** 通用入口：应用一个主题操作 */
  private async applyThemeOp(op: ThemeOp): Promise<void> {
    if (!this.projectState?.id || !this.projectState.themeConfig) return;
    try {
      const resp = await apiJson<{ themeConfig: ThemeConfig; changed: string[] }>(
        `/projects/${this.projectState.id}/theme/op`,
        { method: 'POST', body: JSON.stringify({ op }), token: authStore.token },
      );
      runInAction(() => {
        this.projectState!.themeConfig = resp.themeConfig;
      });
    } catch (err) {
      console.error('[editor] applyThemeOp failed:', err);
      throw err;
    }
  }

  /** 切换当前激活的主题 */
  switchTheme(themeId: string): Promise<void> {
    return this.applyThemeOp({ type: 'switch_theme', themeId });
  }

  /** 切换当前主题内的色彩方案 */
  switchColorScheme(schemeId: string, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'switch_color_scheme', schemeId, themeId });
  }

  /** 创建一个新主题 */
  scaffoldTheme(args: { themeId: string; name: string; description?: string; copyFrom?: string; activate?: boolean }): Promise<void> {
    return this.applyThemeOp({ type: 'scaffold_theme', ...args });
  }

  /** 删除一个主题 */
  deleteTheme(themeId: string): Promise<void> {
    return this.applyThemeOp({ type: 'delete_theme', themeId });
  }

  /** 更新主题风格意图（深合并） */
  setThemeIntent(intent: Partial<StyleIntent>, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'set_theme_intent', intent, themeId });
  }

  /** 更新主题 base tokens（深合并；别名/包装自动） */
  setThemeTokens(kind: TokenKind, values: Record<string, unknown>, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'set_theme_tokens', kind, values, themeId });
  }

  /** 更新装饰规则 */
  setThemeDecoration(decorationRules: Partial<DecorationRules>, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'set_theme_decoration', decorationRules, themeId });
  }

  /** 更新图标规格 */
  setThemeIconSpec(iconSpec: Partial<IconSpec>, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'set_theme_icon_spec', iconSpec, themeId });
  }

  /** 更新组件状态规范 */
  setThemeStateSpec(stateSpec: Partial<ComponentStateSpec>, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'set_theme_state_spec', stateSpec, themeId });
  }

  /** 添加色彩方案 */
  addColorScheme(args: { schemeId: string; name?: string; label?: string; kind?: 'dark' | 'light' | 'high-contrast' | 'custom'; overrides?: TokenOverrides; themeId?: string }): Promise<void> {
    return this.applyThemeOp({ type: 'add_color_scheme', ...args });
  }

  /** 更新色彩方案 overrides（深合并；别名自动） */
  updateColorSchemeOverrides(schemeId: string, kind: TokenKind, values: Record<string, unknown>, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'update_color_scheme_overrides', schemeId, kind, values, themeId });
  }

  /** 删除色彩方案 */
  removeColorScheme(schemeId: string, themeId?: string): Promise<void> {
    return this.applyThemeOp({ type: 'remove_color_scheme', schemeId, themeId });
  }

  /** 校验当前主题配置（R-THEME-01~10 红线） */
  async validateTheme(): Promise<{ ok: boolean; errors: unknown[]; warnings: unknown[] }> {
    if (!this.projectState?.id) return { ok: false, errors: [], warnings: [] };
    return apiJson(
      `/projects/${this.projectState.id}/theme/validate`,
      { method: 'POST', token: authStore.token },
    );
  }

  /** 持久化整个 themeConfig（仅迁移/导入场景；常规写入请用 applyThemeOp 系列方法） */
  private async persistThemeConfig(): Promise<void> {
    if (!this.projectState?.id || !this.projectState.themeConfig) return;
    try {
      await apiJson(`/projects/${this.projectState.id}/theme`, {
        method: 'PUT',
        body: JSON.stringify({ themeConfig: this.projectState.themeConfig }),
        token: authStore.token,
      });
    } catch (err) {
      console.error('[editor] failed to persist themeConfig:', err);
    }
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

  /**
   * Cmd+0：按当前 Screen 的 Frame 真实尺寸适配到编辑区。
   *
   * Frame / Viewport / Canvas 三层解耦后，Frame 高度由内容自然撑开（可能远大于 viewport.height）。
   * 优先按 DOM 实测的 Frame `offsetHeight` 计算，兜底用 viewport.height —— 让长页面也能"一眼看全貌"。
   */
  fitCanvasToViewport(): void {
    const vp = this.currentViewport;
    if (!vp || this.canvasViewportWidth <= 0) return;
    const pad = 48;
    const aw = Math.max(1, this.canvasViewportWidth - pad);
    const ah = Math.max(1, this.canvasViewportHeight - pad);

    // 优先用 DOM 实测高度（Frame 内容撑开后的实际高度）
    let frameW = vp.width;
    let frameH = vp.height;
    if (typeof document !== 'undefined') {
      const frameEl = document.querySelector('[data-frame]') as HTMLElement | null;
      if (frameEl && frameEl.offsetHeight > 0) {
        frameW = frameEl.offsetWidth || frameW;
        frameH = frameEl.offsetHeight;
      }
    }

    const s = Math.min(aw / frameW, ah / frameH, 4);
    const scale = Math.max(0.1, s);
    const scaledW = frameW * scale;
    const scaledH = frameH * scale;
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

  /**
   * 编辑态画布视图缓存：进入预览时备份，退出时还原。
   * Frame / Viewport / Canvas 三层解耦后，预览态需要按 viewport 居中（模拟真机），
   * 不能复用编辑态可能任意平移/缩放过的视图。
   */
  private editorCanvasViewBackup: { scale: number; panX: number; panY: number } | null = null;

  setPreviewMode(preview: boolean): void {
    const wasPreview = this.previewMode;
    this.previewMode = preview;
    if (preview && this.activeScreenId) {
      this.previewNavStackIds = [this.activeScreenId];
      // 进入预览：备份编辑视图，按 viewport 大小居中显示
      if (!wasPreview) {
        this.editorCanvasViewBackup = {
          scale: this.canvasScale,
          panX: this.canvasPanX,
          panY: this.canvasPanY,
        };
        this.fitCanvasToActiveViewport();
      }
    } else if (!preview) {
      this.previewNavStackIds = [];
      // 退出预览：还原编辑视图
      if (wasPreview && this.editorCanvasViewBackup) {
        const b = this.editorCanvasViewBackup;
        runInAction(() => {
          this.canvasScale = b.scale;
          this.canvasPanX = b.panX;
          this.canvasPanY = b.panY;
        });
        this.editorCanvasViewBackup = null;
        this.persistCanvasView();
      }
    }
  }

  /**
   * 按当前 Viewport（设备首屏）居中显示。预览态默认调用 —— 让用户看到的就是
   * "手机尺寸的取景窗口居中浮在画布中央"，跟真机预览的心智一致。
   */
  fitCanvasToActiveViewport(): void {
    const vp = this.currentViewport;
    if (!vp || this.canvasViewportWidth <= 0) return;
    const pad = 48;
    const aw = Math.max(1, this.canvasViewportWidth - pad);
    const ah = Math.max(1, this.canvasViewportHeight - pad);
    const s = Math.min(aw / vp.width, ah / vp.height, 1);
    const scale = Math.max(0.1, s);
    const scaledW = vp.width * scale;
    const scaledH = vp.height * scale;
    runInAction(() => {
      this.canvasScale = scale;
      this.canvasPanX = (this.canvasViewportWidth - scaledW) / 2;
      this.canvasPanY = (this.canvasViewportHeight - scaledH) / 2;
    });
  }

  /** 切换状态预览缩略图条展开/折叠 */
  toggleStatePreviewStrip(): void {
    this.statePreviewStripExpanded = !this.statePreviewStripExpanded;
    try { localStorage.setItem('statePreviewStripExpanded', String(this.statePreviewStripExpanded)); } catch { /* ignore localStorage errors */ }
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

  setPreviewEffectEnv(env: 'mock' | 'http'): void {
    this.previewEffectEnv = env;
  }

  /** 打开素材编辑器弹窗（右键菜单 / 高级编辑按钮） */
  openMaterialEditor(
    nodeId?: string | null,
    tab?: 'gradient' | 'shadow' | 'filter' | 'canvas' | 'animation' | 'assets',
    options?: { materialProjectId?: string; slotName?: string; forceCreate?: boolean; cssTarget?: string },
  ): void {
    runInAction(() => {
      this.materialEditorOpen = true;
      this.materialEditorTargetNodeId = nodeId ?? this.selectedNodeIds[0] ?? null;
      this.materialEditorProjectId = options?.materialProjectId ?? null;
      this.materialEditorSlotName = options?.slotName ?? null;
      this.materialEditorForceCreate = options?.forceCreate ?? false;
      this.materialEditorCssTarget = options?.cssTarget ?? null;
      if (tab) this.materialEditorInitTab = tab;
    });
  }

  /** 关闭素材编辑器弹窗 */
  closeMaterialEditor(): void {
    runInAction(() => {
      this.materialEditorOpen = false;
      this.materialEditorProjectId = null;
      this.materialEditorSlotName = null;
      this.materialEditorForceCreate = false;
      this.materialEditorCssTarget = null;
    });
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
    const plain = toJS(node);
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
    // node.styles 在 v2 是 ExpressionStyles（每个值可为表达式或字面量）；
    // 复制时仅复制字面量值，过滤掉表达式串（粘贴到其他节点时可能上下文不存在）。
    const sourceStyles = node.styles ?? {};
    const styles: Partial<CSSProperties> = {};
    for (const [k, v] of Object.entries(sourceStyles)) {
      if (typeof v === 'string' || typeof v === 'number') {
        // 跳过 {{...}} 表达式（不能跨节点直接复用）
        if (typeof v === 'string' && v.includes('{{')) continue;
        (styles as Record<string, string | number>)[k] = v;
      }
    }
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
        type: 'style.update',
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
        type: 'style.reset',
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
    this.execute({ type: 'element.remove', params: { elementId: id } });
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { success: false, description: '剪贴板不是有效 JSON', affectedNodeIds: [] };
    }
    if (!isValidPasteSubtree(parsed)) {
      return { success: false, description: '剪贴板不是有效的节点树', affectedNodeIds: [] };
    }
    const subtree: ComponentNode = parsed;

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
      type: 'element.insertSubtree',
      params: { parentId, subtree, position },
    });
    if (r.success && r.affectedNodeIds[0]) {
      this.select(r.affectedNodeIds[0]);
    }
    return r;
  }

  /** Set a global state variable's current runtime value */
  setCurrentGlobalState(variableName: string, value: unknown): void {
    this.currentGlobalStates = { ...this.currentGlobalStates, [variableName]: value };
  }

  /** W6-042：一次应用全局状态组合（矩阵行） */
  applyGlobalStateCombo(valuesByName: Record<string, unknown>): void {
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

  /**
   * 初始化当前屏幕的 view 变量预览值（v2）：
   *   - 项目级 globalStateInit.view → defaultValue（先放）
   *   - 屏幕级 stateInit.view       → previewValue ?? defaultValue（后放，同名覆盖）
   *
   * 写入 currentGlobalStates 供画布渲染器作为 state.view.* 表达式作用域使用。
   * 注：v2 的 state.data.* 由 dataSource / effect.fetch 运行时驱动，本方法不预填。
   *
   * ★ v3 修复 Bug B：保留原始 JS 类型（boolean false / number 0 / null / object）
   * 不再 JSON.stringify —— 否则 `false` 变 "false" 字符串后到画布 dataContext 里
   * 在 `state.view.submitting ? '登录中...' : '登录'` 这类 ternary 里被判 truthy。
   */
  initGlobalStatesForScreen(): void {
    const screen = this.activeScreen;
    const project = this.project;
    if (!screen) return;
    const states: Record<string, unknown> = {};
    const fillFromDefs = (defs: Record<string, ViewVariableDef> | undefined, preferPreview: boolean) => {
      if (!defs) return;
      for (const def of Object.values(defs)) {
        const value = preferPreview && def.previewValue !== undefined ? def.previewValue : def.defaultValue;
        // 直接保留原始类型；任何对外的 string 展示需求由消费方自己 String(v) / JSON.stringify。
        states[def.name] = value;
      }
    };
    fillFromDefs(project?.globalStateInit?.view, true);
    fillFromDefs(screen.stateInit?.view, true);
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
    };
    this.collapsedSections = {};
    this.rightPanelScrollToSection = null;
    this.leftPanelView = 'elements';
    this.showCanvasContextBar = true;
    this.viewportOverflow = false;
    this.clipboardSubtreeJson = null;
    this.styleClipboard = null;
    this.materialEditorOpen = false;
    this.materialEditorTargetNodeId = null;
    this.materialEditorInitTab = 'gradient';
    this.materialEditorProjectId = null;
    this.materialEditorSlotName = null;
    this.materialEditorForceCreate = false;
    this.materialEditorCssTarget = null;
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
          const failedIdx = typeof err.body.failedOperationIndex === 'number' ? err.body.failedOperationIndex : 0;
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

  private takePendingOperations(): OperationLogEntry[] {
    const pending = [...this.pendingOperations];
    this.pendingOperations = [];
    return pending;
  }

}

function isValidPasteSubtree(n: unknown): n is ComponentNode {
  if (!n || typeof n !== 'object') return false;
  if (!('type' in n) || typeof n.type !== 'string') return false;
  if (!('children' in n) || !Array.isArray(n.children)) return false;
  for (const c of n.children) {
    if (!isValidPasteSubtree(c)) return false;
  }
  return true;
}

export const editorStore = new EditorStore();
