import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentNode, ComponentTemplate, Screen, ToastType, ToastPosition } from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { PrimitiveRenderer } from '../renderers/PrimitiveRenderer';
import { resolveNodeStyles } from '../styles/resolveStyles';
import { resolveNodeProps } from '../styles/resolveProps';
import { resolveComponentInstance } from '../assets/resolveInstance';
import { DataContextProvider, useDataContext } from '../data/DataContext';
import { StaticAssetOriginProvider, useStaticAssetOrigin } from '../renderer/StaticAssetOriginContext';
import { rewriteMediaSrc, rewriteStyleObjectUrls } from '../assets/rewriteLocalAssetRefs';
import type { DataContext } from '../data/resolveExpression';
import { buildScreenDataContext, hasExpression, resolvePropsExpressions } from '../data/resolveExpression';
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
  /** 宿主调用此函数以触发 navigateBack 生命周期事件；返回 true 表示已处理（阻止默认后退） */
  onNavigateBackRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  /** 与 SchemaRenderer.staticAssetOrigin 一致：补全 `/uploads/` 等资源 URL */
  staticAssetOrigin?: string;
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
  onNavigateBackRef,
  staticAssetOrigin,
}: PreviewRendererProps) {
  return (
    <PreviewInteractiveShell
      screen={screen}
      assets={assets}
      globalStates={globalStates}
      currentDataSet={currentDataSet}
      onNavigate={onNavigate}
      onSwitchDataSourcePhase={onSwitchDataSourcePhase}
      embedded={embedded}
      onNavigateBackRef={onNavigateBackRef}
      staticAssetOrigin={staticAssetOrigin}
    />
  );
}

function PreviewInteractiveShell({
  screen,
  assets,
  globalStates,
  currentDataSet,
  onNavigate,
  onSwitchDataSourcePhase,
  embedded,
  onNavigateBackRef,
  staticAssetOrigin,
}: {
  screen: Screen;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  currentDataSet?: string;
  onNavigate?: (screenId: string, animation?: TransitionAnimation) => void;
  onSwitchDataSourcePhase?: (dataSourceId: string, phase: string) => void;
  embedded: boolean;
  onNavigateBackRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  staticAssetOrigin?: string;
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

  const previewDataContext: DataContext = useMemo(
    () => buildScreenDataContext(screen, runtimeGlobals, currentDataSet),
    [screen, runtimeGlobals, currentDataSet],
  );

  useEffect(() => {
    pseudoRef.current.inject(screen.rootNode);
    return () => pseudoRef.current.clear();
  }, [screen.rootNode]);

  useEffect(() => {
    mockRef.current.load(screen.apiEndpoints ?? []);
  }, [screen.apiEndpoints]);

  // ===== Helper: build a PreviewContext (avoid repeating this everywhere) =====
  const buildCtx = useCallback((): PreviewContext => {
    const mock = mockRef.current;
    const merge = (name: string, value: string) => {
      setRuntimeGlobals((g) => ({ ...g, [name]: value }));
    };
    return {
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
      onCancelApiRequest: (requestId) => mock.cancel(requestId),
    };
  }, [screen.id, runtimeGlobals, onNavigate, onSwitchDataSourcePhase, togglePreviewVisible, addToast, runtimeNodeStates]);

  /** Helper: find lifecycle events by trigger name on rootNode */
  const getLifecycleEvents = useCallback((trigger: string) => {
    return (screen.rootNode.events ?? []).filter(
      (e: { trigger: string; disabled?: boolean }) => e.trigger === trigger && !e.disabled,
    );
  }, [screen.rootNode.events]);

  /** Helper: execute all events of a given trigger */
  const fireLifecycleEvents = useCallback(async (trigger: string) => {
    const events = getLifecycleEvents(trigger);
    if (events.length === 0) return;
    const engine = engineRef.current;
    const ctx = buildCtx();
    for (const event of events) {
      const actions = (event as { actions?: unknown[] }).actions ?? [];
      await engine.executeActionsAsync(actions as never[], ctx);
    }
  }, [getLifecycleEvents, buildCtx]);

  // ===== screenEnter: auto-execute on page mount / navigate =====
  const screenEnterFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (screenEnterFiredRef.current === screen.id) return;
    const enterEvents = getLifecycleEvents('screenEnter');
    if (enterEvents.length === 0) return;
    screenEnterFiredRef.current = screen.id;
    fireLifecycleEvents('screenEnter');
  }, [screen.id, getLifecycleEvents, fireLifecycleEvents]);

  // ===== screenExit: execute before navigating away =====
  // We wrap onNavigate to intercept and run screenExit first
  const screenExitNavigateRef = useRef(onNavigate);
  screenExitNavigateRef.current = onNavigate;
  const wrappedOnNavigate = useCallback(async (targetId: string, animation?: TransitionAnimation) => {
    const exitEvents = getLifecycleEvents('screenExit');
    if (exitEvents.length > 0) {
      // Execute screenExit with a 2s timeout to prevent blocking
      const engine = engineRef.current;
      const ctx = buildCtx();
      const exitPromise = (async () => {
        for (const event of exitEvents) {
          const actions = (event as { actions?: unknown[] }).actions ?? [];
          await engine.executeActionsAsync(actions as never[], ctx);
        }
      })();
      await Promise.race([
        exitPromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
    // Reset screenEnter ref so it fires again on return
    screenEnterFiredRef.current = null;
    screenExitNavigateRef.current?.(targetId, animation);
  }, [getLifecycleEvents, buildCtx]);

  // ===== screenVisible / screenHidden: tab visibility change =====
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fireLifecycleEvents('screenVisible');
      } else {
        fireLifecycleEvents('screenHidden');
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [fireLifecycleEvents]);

  // ===== scrollReachBottom / scrollReachTop: scroll detection =====
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Find the scrollable container (rootRef's parent with overflow:auto, or rootRef itself)
    const scrollContainer = el.closest('[data-preview-root]') as HTMLElement | null;
    if (!scrollContainer) return;

    const bottomEvents = getLifecycleEvents('scrollReachBottom');
    const topEvents = getLifecycleEvents('scrollReachTop');
    if (bottomEvents.length === 0 && topEvents.length === 0) return;

    // Get scroll config from the first scroll event
    const scrollEvent = [...bottomEvents, ...topEvents][0] as { scrollConfig?: { threshold?: number; debounce?: number } } | undefined;
    const threshold = scrollEvent?.scrollConfig?.threshold ?? 100;
    const debounceMs = scrollEvent?.scrollConfig?.debounce ?? 300;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastBottomFire = 0;
    let lastTopFire = 0;

    const handler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const now = Date.now();

        // scrollReachBottom
        if (bottomEvents.length > 0 && scrollHeight - scrollTop - clientHeight < threshold) {
          if (now - lastBottomFire > debounceMs) {
            lastBottomFire = now;
            fireLifecycleEvents('scrollReachBottom');
          }
        }

        // scrollReachTop
        if (topEvents.length > 0 && scrollTop === 0) {
          if (now - lastTopFire > debounceMs) {
            lastTopFire = now;
            fireLifecycleEvents('scrollReachTop');
          }
        }
      }, 50);
    };

    scrollContainer.addEventListener('scroll', handler, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handler);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [getLifecycleEvents, fireLifecycleEvents]);

  // ===== navigateBack: expose handler for host to call =====
  useEffect(() => {
    if (!onNavigateBackRef) return;
    onNavigateBackRef.current = async () => {
      const backEvents = getLifecycleEvents('navigateBack');
      if (backEvents.length === 0) return false; // no handler, let host proceed
      await fireLifecycleEvents('navigateBack');
      return true; // handled — host should NOT auto-back
    };
    return () => {
      if (onNavigateBackRef) onNavigateBackRef.current = null;
    };
  }, [onNavigateBackRef, getLifecycleEvents, fireLifecycleEvents]);

  // ===== DOM event binding (existing — use wrappedOnNavigate for screenExit) =====
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const engine = engineRef.current;
    const ctx = buildCtx();
    // Override onNavigate in ctx to use wrappedOnNavigate for screenExit support
    ctx.onNavigate = (id, anim) => wrappedOnNavigate(id, anim);
    engine.bind(el, screen.rootNode, ctx);
    return () => engine.unbind();
  }, [screen, screen.rootNode, buildCtx, wrappedOnNavigate]);

  const fillViewport = embedded;
  return (
    <StaticAssetOriginProvider origin={staticAssetOrigin}>
      <DataContextProvider value={previewDataContext}>
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
      </DataContextProvider>
    </StaticAssetOriginProvider>
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
  const staticOrigin = useStaticAssetOrigin();

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

  if (staticOrigin) {
    reactStyles = rewriteStyleObjectUrls(
      reactStyles as Record<string, unknown>,
      staticOrigin,
    ) as React.CSSProperties;
  }

  const previewStyles: React.CSSProperties = {
    ...reactStyles,
    pointerEvents: 'auto',
  };

  const propsForRender =
    staticOrigin && effectiveNode.type === 'img' && typeof resolvedProps.src === 'string'
      ? { ...resolvedProps, src: rewriteMediaSrc(resolvedProps.src, staticOrigin) ?? resolvedProps.src }
      : resolvedProps;

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
    <PrimitiveRenderer node={effectiveNode} style={previewStyles} resolvedProps={propsForRender} interactive>
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
