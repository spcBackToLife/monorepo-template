/**
 * MaterialEditorContext — 素材编辑器核心上下文
 *
 * 管理：
 *   - MaterialProjectSchema 状态
 *   - MaterialOperationExecutor 实例
 *   - 选中对象 / hover 对象
 *   - 当前工具
 *   - 缩放与平移
 *   - 操作分发（execute → Executor → 回调通知）
 */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  MaterialOperationExecutor,
  type MaterialProjectSchema,
  type MaterialOperation,
  type MaterialObject,
  type OperationResult,
} from '@globallink/material-operations';

// ===== 工具类型 =====

export type MaterialToolType =
  | 'select'
  | 'hand'
  | 'rect'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'path'     // 钢笔工具 — 单击放锚点，拖拽出贝塞尔曲线控制手柄
  | 'pencil'   // 铅笔工具 — 自由绘制
  | 'text'
  | 'image';

// ===== 编辑器状态 =====

export interface MaterialEditorState {
  /** 当前 Schema */
  project: MaterialProjectSchema;
  /** 选中的对象 ID 列表 */
  selectedIds: string[];
  /** hover 的对象 ID */
  hoveredId: string | null;
  /** 当前工具 */
  tool: MaterialToolType;
  /** 缩放 */
  zoom: number;
  /** 视口偏移 X */
  panX: number;
  /** 视口偏移 Y */
  panY: number;
  /** undo 可用 */
  canUndo: boolean;
  /** redo 可用 */
  canRedo: boolean;
}

// ===== Actions =====

type EditorAction =
  | { type: 'SET_PROJECT'; project: MaterialProjectSchema }
  | { type: 'SET_SELECTED'; ids: string[] }
  | { type: 'SET_HOVERED'; id: string | null }
  | { type: 'SET_TOOL'; tool: MaterialToolType }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'SET_HISTORY'; canUndo: boolean; canRedo: boolean };

function reducer(state: MaterialEditorState, action: EditorAction): MaterialEditorState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.project };
    case 'SET_SELECTED':
      return { ...state, selectedIds: action.ids };
    case 'SET_HOVERED':
      return { ...state, hoveredId: action.id };
    case 'SET_TOOL':
      return { ...state, tool: action.tool };
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(10, action.zoom)) };
    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y };
    case 'SET_HISTORY':
      return { ...state, canUndo: action.canUndo, canRedo: action.canRedo };
    default:
      return state;
  }
}

// ===== Context 值类型 =====

export interface MaterialEditorContextValue {
  state: MaterialEditorState;
  /** 执行操作 → 更新 Schema → 通知外部 */
  execute: (op: MaterialOperation) => OperationResult;
  /** 批量执行 */
  executeBatch: (ops: MaterialOperation[]) => OperationResult[];
  /** 撤销 */
  undo: () => OperationResult;
  /** 重做 */
  redo: () => OperationResult;
  /** 设置选中对象 */
  setSelected: (ids: string[]) => void;
  /** 设置 hover 对象 */
  setHovered: (id: string | null) => void;
  /** 设置工具 */
  setTool: (tool: MaterialToolType) => void;
  /** 设置缩放 */
  setZoom: (zoom: number) => void;
  /** 设置平移 */
  setPan: (x: number, y: number) => void;
  /** 替换整个 project（从服务器加载） */
  setProject: (project: MaterialProjectSchema) => void;
  /** 获取当前选中的对象列表 */
  getSelectedObjects: () => MaterialObject[];
  /** 获取 Executor 实例（高级用途） */
  getExecutor: () => MaterialOperationExecutor;
}

const MaterialEditorCtx = createContext<MaterialEditorContextValue | null>(null);

// ===== Provider =====

export interface MaterialEditorProviderProps {
  /** 初始 Schema */
  initialProject: MaterialProjectSchema;
  /** 操作执行后的回调（用于同步到后端） */
  onOperation?: (op: MaterialOperation, result: OperationResult) => void;
  /** 操作执行后的回调（批量） */
  onBatch?: (ops: MaterialOperation[], results: OperationResult[]) => void;
  /** undo/redo 后的回调 */
  onUndoRedo?: (type: 'undo' | 'redo', result: OperationResult) => void;
  children: ReactNode;
}

export function MaterialEditorProvider({
  initialProject,
  onOperation,
  onBatch,
  onUndoRedo,
  children,
}: MaterialEditorProviderProps) {
  const executorRef = useRef<MaterialOperationExecutor>(
    new MaterialOperationExecutor(initialProject),
  );

  const [state, dispatch] = useReducer(reducer, {
    project: initialProject,
    selectedIds: [],
    hoveredId: null,
    tool: 'select',
    zoom: 1,
    panX: 0,
    panY: 0,
    canUndo: false,
    canRedo: false,
  });

  const syncHistory = useCallback(() => {
    const executor = executorRef.current;
    dispatch({
      type: 'SET_HISTORY',
      canUndo: executor.canUndo(),
      canRedo: executor.canRedo(),
    });
  }, []);

  const syncProject = useCallback(() => {
    const executor = executorRef.current;
    dispatch({ type: 'SET_PROJECT', project: executor.getProject() });
    syncHistory();
  }, [syncHistory]);

  const execute = useCallback(
    (op: MaterialOperation): OperationResult => {
      const result = executorRef.current.execute(op);
      if (result.success) {
        syncProject();
        onOperation?.(op, result);
      }
      return result;
    },
    [syncProject, onOperation],
  );

  const executeBatch = useCallback(
    (ops: MaterialOperation[]): OperationResult[] => {
      const results = executorRef.current.executeBatch(ops);
      const allSuccess = results.every((r: OperationResult) => r.success);
      if (allSuccess) {
        syncProject();
        onBatch?.(ops, results);
      }
      return results;
    },
    [syncProject, onBatch],
  );

  const undo = useCallback((): OperationResult => {
    const result = executorRef.current.undo();
    if (result.success) {
      syncProject();
      onUndoRedo?.('undo', result);
    }
    return result;
  }, [syncProject, onUndoRedo]);

  const redo = useCallback((): OperationResult => {
    const result = executorRef.current.redo();
    if (result.success) {
      syncProject();
      onUndoRedo?.('redo', result);
    }
    return result;
  }, [syncProject, onUndoRedo]);

  const setSelected = useCallback((ids: string[]) => {
    dispatch({ type: 'SET_SELECTED', ids });
  }, []);

  const setHovered = useCallback((id: string | null) => {
    dispatch({ type: 'SET_HOVERED', id });
  }, []);

  const setTool = useCallback((tool: MaterialToolType) => {
    dispatch({ type: 'SET_TOOL', tool });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', zoom });
  }, []);

  const setPan = useCallback((x: number, y: number) => {
    dispatch({ type: 'SET_PAN', x, y });
  }, []);

  const setProject = useCallback(
    (project: MaterialProjectSchema) => {
      executorRef.current.setProject(project);
      syncProject();
    },
    [syncProject],
  );

  const getSelectedObjects = useCallback((): MaterialObject[] => {
    const proj = executorRef.current.getProject();
    return proj.objects.filter((o: MaterialObject) => state.selectedIds.includes(o.id));
  }, [state.selectedIds]);

  const getExecutor = useCallback(() => executorRef.current, []);

  const value = useMemo<MaterialEditorContextValue>(
    () => ({
      state,
      execute,
      executeBatch,
      undo,
      redo,
      setSelected,
      setHovered,
      setTool,
      setZoom,
      setPan,
      setProject,
      getSelectedObjects,
      getExecutor,
    }),
    [
      state,
      execute,
      executeBatch,
      undo,
      redo,
      setSelected,
      setHovered,
      setTool,
      setZoom,
      setPan,
      setProject,
      getSelectedObjects,
      getExecutor,
    ],
  );

  return (
    <MaterialEditorCtx.Provider value={value}>
      {children}
    </MaterialEditorCtx.Provider>
  );
}

// ===== Hook =====

export function useMaterialEditor(): MaterialEditorContextValue {
  const ctx = useContext(MaterialEditorCtx);
  if (!ctx) {
    throw new Error(
      'useMaterialEditor must be used within a <MaterialEditorProvider>',
    );
  }
  return ctx;
}
