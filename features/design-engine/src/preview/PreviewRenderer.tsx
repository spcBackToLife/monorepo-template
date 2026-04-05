import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentNode, ComponentTemplate, Screen, ToastType, ToastPosition } from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { PrimitiveRenderer } from '../renderers/PrimitiveRenderer';
import { resolveNodeStyles } from '../styles/resolveStyles';
import { resolveNodeProps } from '../styles/resolveProps';
import { resolveComponentInstance } from '../assets/resolveInstance';
import { DataContextProvider, useDataContext } from '../data/DataContext';
import type { DataContext } from '../data/resolveExpression';
import { hasExpression, resolvePropsExpressions } from '../data/resolveExpression';
import { ListRenderer } from '../data/ListRenderer';
import {
  EventExecutionEngine,
  type PreviewContext,
  type TransitionAnimation,
} from './EventExecutionEngine';
import { CSSPseudoInjector } from './CSSPseudoInjector';
import { ToastRenderer, type ToastItem } from './ToastRenderer';
import { MockExecutor } from './MockExecutor';

export interface PreviewRendererProps {
  screen: Screen;
  assets?: ComponentTemplate[];
  globalStates?: Record<string, string>;
  /** 可选：仅使用该数据源的活跃场景数据；不传则合并全部已加载数据源 */
  currentDataSet?: string;
  onNavigate?: (screenId: string, animation?: TransitionAnimation) => void;
  /** 预览内切换数据源生命周期阶段（由宿主写入可观察 screen） */
  onSwitchDataSourcePhase?: (dataSourceId: string, phase: string) => void;
  /** 嵌在编辑器视口内时去掉外层灰底，避免与设备框叠两层底色 */
  embedded?: boolean;
}

/**
 * 预览模式：无编辑 Overlay，DOM 可交互；数据绑定与编辑态共用 DataContext；
 * 挂载 EventExecutionEngine（点击/跳转等）与 CSSPseudoInjector（:hover 等交互态样式）。
 */
export function PreviewRenderer({
  screen,
  assets = [],
  globalStates = {},
  currentDataSet,
  onNavigate,
  onSwitchDataSourcePhase,
  embedded = false,
}: PreviewRendererProps) {
  const activeDataContext: DataContext = useMemo(
    () => buildDataContextFromScreen(screen, currentDataSet),
    [screen, currentDataSet],
  );

  return (
    <DataContextProvider value={activeDataContext}>
      <PreviewInteractiveShell
        screen={screen}
        assets={assets}
        globalStates={globalStates}
        onNavigate={onNavigate}
        onSwitchDataSourcePhase={onSwitchDataSourcePhase}
        embedded={embedded}
      />
    </DataContextProvider>
  );
}

/** 合并所有数据源中处于 loaded 相且对应活跃场景的数据（替代旧 dataSets / activeDataSetId） */
function getActiveData(screen: Screen): Record<string, unknown> {
  const mergedData: Record<string, unknown> = {};
  for (const ds of screen.dataSources ?? []) {
    if (ds.activePhase !== 'loaded') continue;
    const scenarios = ds.scenarios ?? [];
    const scenario = scenarios.find((s) => s.id === ds.activeScenarioId);
    if (scenario?.data != null && typeof scenario.data === 'object') {
      Object.assign(mergedData, scenario.data);
    }
  }
  return mergedData;
}

function buildDataContextFromScreen(screen: Screen, currentDataSourceId?: string): DataContext {
  const sources = screen.dataSources ?? [];
  if (currentDataSourceId) {
    const ds = sources.find((s) => s.id === currentDataSourceId);
    if (ds && ds.activePhase === 'loaded') {
      const scenarios = ds.scenarios ?? [];
      const scenario = scenarios.find((s) => s.id === ds.activeScenarioId);
      return { data: { ...(scenario?.data ?? {}) } };
    }
  }
  return { data: getActiveData(screen) };
}

function PreviewInteractiveShell({
  screen,
  assets,
  globalStates,
  onNavigate,
  onSwitchDataSourcePhase,
  embedded,
}: {
  screen: Screen;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  onNavigate?: (screenId: string, animation?: TransitionAnimation) => void;
  onSwitchDataSourcePhase?: (dataSourceId: string, phase: string) => void;
  embedded: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new EventExecutionEngine());
  const pseudoRef = useRef(new CSSPseudoInjector());
  const mockRef = useRef(new MockExecutor());
  const [runtimeGlobals, setRuntimeGlobals] = useState<Record<string, string>>(() => ({
    ...globalStates,
  }));
  /** 预览内节点的运行时 activeState 覆盖（setState action 修改） */
  const [runtimeNodeStates, setRuntimeNodeStates] = useState<Record<string, string>>({});
  /** 预览内 toggleVisible 切换的节点 id（与 schema 可见性叠加，再次切换可恢复） */
  const [previewHiddenIds, setPreviewHiddenIds] = useState<Set<string>>(() => new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string, duration: number, position?: ToastPosition) => {
    const id = `toast-${++toastIdRef.current}`;
    setToasts((prev) => [...prev, { id, type, message, duration, position: position ?? 'top-center' }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const togglePreviewVisible = useCallback((nodeId: string) => {
    setPreviewHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  useEffect(() => {
    setPreviewHiddenIds(new Set());
  }, [screen.id]);

  useEffect(() => {
    setRuntimeGlobals({ ...globalStates });
  }, [globalStates]);

  useEffect(() => {
    pseudoRef.current.inject(screen.rootNode);
    return () => pseudoRef.current.clear();
  }, [screen.rootNode]);

  useEffect(() => {
    mockRef.current.load(screen.apiEndpoints ?? []);
  }, [screen.apiEndpoints]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const engine = engineRef.current;
    const mock = mockRef.current;
    const merge = (name: string, value: string) => {
      setRuntimeGlobals((g) => ({ ...g, [name]: value }));
    };
    const ctx: PreviewContext = {
      currentScreenId: screen.id,
      globalStates: runtimeGlobals,
      onNavigate: (id, anim) => onNavigate?.(id, anim),
      onSetState: (nodeId, stateName) => {
        setRuntimeNodeStates((prev) => ({ ...prev, [nodeId]: stateName }));
      },
      onSetGlobalState: merge,
      onSetDomainState: merge,
      onSetEnvironmentState: merge,
      onSwitchDataSourcePhase,
      onToggleVisible: togglePreviewVisible,
      getNodeState: (nodeId: string) => runtimeNodeStates[nodeId] ?? 'default',
      onShowToast: addToast,
      onApiRequest: (requestId, _paramOverrides) => mock.execute(requestId),
    };
    engine.bind(el, screen.rootNode, ctx);
    return () => engine.unbind();
  }, [screen, screen.rootNode, runtimeGlobals, onNavigate, onSwitchDataSourcePhase, togglePreviewVisible, addToast]);

  const fillViewport = embedded;
  return (
    <div
      data-preview-root
      style={{
        width: '100%',
        minHeight: '100%',
        ...(fillViewport ? { height: '100%', boxSizing: 'border-box' as const } : {}),
        backgroundColor: embedded ? 'transparent' : '#2C2C2C',
        position: 'relative' as const,
        overflow: embedded ? 'hidden' : 'auto',
      }}
    >
      <div
        ref={rootRef}
        data-screen-id={screen.id}
        style={{
          width: '100%',
          minHeight: '100%',
          ...(fillViewport ? { height: '100%', boxSizing: 'border-box' as const } : {}),
          backgroundColor: screen.backgroundColor,
          position: 'relative' as const,
        }}
      >
        <PreviewNodeRenderer
          node={screen.rootNode}
          rootNodeId={screen.rootNode.id}
          assets={assets}
          globalStates={runtimeGlobals}
          onNavigate={onNavigate}
          previewHiddenIds={previewHiddenIds}
          runtimeNodeStates={runtimeNodeStates}
        />
        <ToastRenderer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}

interface PreviewNodeRendererProps {
  node: ComponentNode;
  /** 与编辑态 SchemaRenderer 一致：根节点铺满设备视口，避免 flex 子项在 overflow:hidden 下高度塌陷导致整页空白 */
  rootNodeId: string;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  onNavigate?: (screenId: string) => void;
  previewHiddenIds: ReadonlySet<string>;
  /** 运行时节点 activeState 覆盖（来自 setState action） */
  runtimeNodeStates?: Record<string, string>;
  /** 标记当前节点是列表容器的直接子项（被重复渲染），需覆盖定位样式 */
  isListItem?: boolean;
}

/**
 * 列表容器样式覆盖：当节点绑定了 __listData，强制 flex column 布局，
 * 使重复渲染的子项能自动纵向排列，而不是因 absolute 叠在一起。
 */
function applyListContainerStyleOverrides(
  styles: React.CSSProperties,
): React.CSSProperties {
  return {
    ...styles,
    display: 'flex',
    flexDirection: 'column',
    height: undefined,
    minHeight: styles.height ?? styles.minHeight,
  };
}

/**
 * 列表子项样式覆盖：将被重复渲染的直接子元素从 absolute 切换到
 * relative，使其参与父容器的 flex 流式布局。
 */
function applyListItemStyleOverrides(
  styles: React.CSSProperties,
): React.CSSProperties {
  if (styles.position !== 'absolute') return styles;
  return {
    ...styles,
    position: 'relative',
    left: undefined,
    top: undefined,
    right: undefined,
    bottom: undefined,
  };
}

function PreviewNodeRenderer({
  node: rawNode,
  rootNodeId,
  assets,
  globalStates,
  onNavigate,
  previewHiddenIds,
  runtimeNodeStates,
  isListItem = false,
}: PreviewNodeRendererProps) {
  const dataContext = useDataContext();

  const node = isComponentInstanceType(rawNode.type)
    ? resolveComponentInstance(rawNode, assets)
    : rawNode;

  if (node.type === 'annotation') {
    return null;
  }

  if (previewHiddenIds.has(node.id)) {
    return null;
  }

  // 运行时 activeState 覆盖（来自 setState action）
  const runtimeState = runtimeNodeStates?.[node.id];
  const effectiveNode = runtimeState && runtimeState !== node.activeState
    ? { ...node, activeState: runtimeState }
    : node;

  const isListContainer = hasExpression(effectiveNode.props?.__listData);
  const nodeForProps: ComponentNode = isListContainer
    ? { ...effectiveNode, props: { ...effectiveNode.props, __listData: undefined } }
    : effectiveNode;
  const { props: mergedProps, visible } = resolveNodeProps(nodeForProps, globalStates);
  const resolvedProps = resolveDataExpressions(mergedProps, dataContext);

  if (visible === false) {
    return null;
  }

  const baseStyles = resolveNodeStyles(effectiveNode, globalStates, undefined, dataContext);
  let reactStyles =
    rootNodeId && node.id === rootNodeId
      ? {
          ...baseStyles,
          left: undefined,
          top: undefined,
          right: undefined,
          bottom: undefined,
          minHeight: baseStyles.minHeight ?? '100%',
          height: baseStyles.height ?? '100%',
          width: baseStyles.width ?? '100%',
          boxSizing: 'border-box' as const,
        }
      : baseStyles;

  // 列表容器：强制 flex column，让重复子项自动排列
  if (isListContainer) {
    reactStyles = applyListContainerStyleOverrides(reactStyles);
  }
  // 列表子项：从 absolute 切到 relative，参与父容器 flex 流
  if (isListItem) {
    reactStyles = applyListItemStyleOverrides(reactStyles);
  }

  const previewStyles: React.CSSProperties = {
    ...reactStyles,
    pointerEvents: 'auto',
  };

  // Render children — if this node has __listData, repeat children per list item
  let children: React.ReactNode;
  if (isListContainer) {
    children = (
      <ListRenderer
        node={effectiveNode}
        renderChild={(child, listIndex) => (
          <PreviewNodeRenderer
            key={`${child.id}-${listIndex}`}
            node={child}
            rootNodeId={rootNodeId}
            assets={assets}
            globalStates={globalStates}
            onNavigate={onNavigate}
            previewHiddenIds={previewHiddenIds}
            runtimeNodeStates={runtimeNodeStates}
            isListItem
          />
        )}
      />
    );
  } else {
    const runtimeState = runtimeNodeStates?.[node.id] ?? 'default';
    const activeStateDef = effectiveNode.states?.find((s) => s.name === runtimeState);
    const cvMap = activeStateDef?.childrenVisibility;

    // 对于 default 状态且没有显式的 default 状态定义时，
    // 需要从其他状态的 childrenVisibility 推导出哪些子节点应被隐藏：
    // 如果某子节点在任何自定义状态中被显式设为 false，说明它是条件可见的，
    // 在 default 状态下应当隐藏。
    const implicitDefaultCvMap = !activeStateDef && runtimeState === 'default'
      ? buildImplicitDefaultVisibility(effectiveNode)
      : undefined;
    const effectiveCvMap = cvMap ?? implicitDefaultCvMap;

    children = node.children?.filter((child) => {
      if (effectiveCvMap && effectiveCvMap[child.id] === false) return false;
      return true;
    }).map((child) => (
      <PreviewNodeRenderer
        key={child.id}
        node={child}
        rootNodeId={rootNodeId}
        assets={assets}
        globalStates={globalStates}
        onNavigate={onNavigate}
        previewHiddenIds={previewHiddenIds}
        runtimeNodeStates={runtimeNodeStates}
      />
    ));
  }

  return (
    <PrimitiveRenderer node={effectiveNode} style={previewStyles} resolvedProps={resolvedProps} interactive>
      {children}
    </PrimitiveRenderer>
  );
}

/**
 * 当节点处于 default 状态且 states 数组中没有显式 default 条目时，
 * 从所有自定义状态推导出隐式的 childrenVisibility。
 * 逻辑：如果某个子节点在任何状态的 childrenVisibility 中被设为 false，
 * 说明它是条件可见的，在 default 状态下应被隐藏。
 */
function buildImplicitDefaultVisibility(
  node: ComponentNode,
): Record<string, boolean> | undefined {
  const states = node.states;
  if (!states || states.length === 0) return undefined;

  const result: Record<string, boolean> = {};
  let hasAny = false;

  for (const state of states) {
    const cv = state.childrenVisibility;
    if (!cv) continue;
    for (const [childId, visible] of Object.entries(cv)) {
      if (visible === false) {
        result[childId] = false;
        hasAny = true;
      }
    }
  }

  return hasAny ? result : undefined;
}

function resolveDataExpressions(
  props: Record<string, unknown>,
  context: DataContext,
): Record<string, unknown> {
  const hasAnyExpression = Object.values(props).some(hasExpression);
  if (!hasAnyExpression) {
    return props;
  }
  return resolvePropsExpressions(props, context);
}
