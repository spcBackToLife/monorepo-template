import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ComponentNode,
  ComponentTemplate,
  Screen,
  ToastType,
  ToastPosition,
  Action,
  NavTransitionAnimation,
} from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { PrimitiveRenderer } from '../renderers/PrimitiveRenderer';
import { resolveNodeStyles } from '../styles/resolveStyles';
import { resolveNodeProps, resolvePropsForRender } from '../styles/resolveProps';
import { resolveComponentInstance } from '../assets/resolveInstance';
import { DataContextProvider, useDataContext } from '../data/DataContextProvider';
import { StaticAssetOriginProvider, useStaticAssetOrigin } from '../renderer/StaticAssetOriginContext';
import { rewriteMediaSrc, rewriteStyleObjectUrls } from '../assets/rewriteLocalAssetRefs';
import type { DataContext } from '../data/dataContext';
import { buildScreenDataContext, buildEditorPreviewState } from '../data/dataContext';
import { ListRenderer } from '../data/ListRenderer';
import { CSSPseudoInjector } from './CSSPseudoInjector';
import { ToastRenderer, type ToastItem } from './ToastRenderer';
import {
  createStore,
  createEmptyState,
  Dispatcher,
  EffectExecutor,
  MockDriver,
  HttpDriver,
  type HostAdapters,
  type Env,
} from '../state';

export interface PreviewRendererProps {
  screen: Screen;
  assets?: ComponentTemplate[];
  /**
   * 切换运行环境：'mock' 走 mock scenarios（默认）；'http' 走 HttpDriver 真实接口
   */
  env?: Env;
  /** 静态资源根 origin（与 SchemaRenderer.staticAssetOrigin 一致） */
  staticAssetOrigin?: string;
  /** 嵌在编辑器视口内时去掉外层灰底，避免与设备框叠两层底色 */
  embedded?: boolean;
  /** 跳转回调（宿主决定如何切屏） */
  onNavigate?: (screenId: string, animation?: NavTransitionAnimation) => void;
  /** 宿主调用此函数以触发 navigateBack 生命周期事件；返回 true 表示已处理（阻止默认后退） */
  onNavigateBackRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
}

/**
 * 预览模式：
 *   - 内部建一个 Store + EffectExecutor + Dispatcher
 *   - state.* 写入 Store；
 *   - effect.fetch 由 EffectExecutor 走 mock/http；
 *   - nav/ui/node/custom 通过 host adapters 委托
 */
export function PreviewRenderer(props: PreviewRendererProps) {
  return <PreviewInteractiveShell {...props} />;
}

function PreviewInteractiveShell({
  screen,
  assets = [],
  env = 'mock',
  staticAssetOrigin,
  embedded = false,
  onNavigate,
  onNavigateBackRef,
}: PreviewRendererProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pseudoRef = useRef(new CSSPseudoInjector());

  // 预览态运行时容器（每个 screen 独立一份）
  const storeRef = useRef(createStore(buildEditorPreviewState(screen) ?? createEmptyState()));
  const effectsRef = useRef(new EffectExecutor({ mock: new MockDriver(), http: new HttpDriver() }, env));
  /** 节点 activeState 覆盖（来自 node.setVisualState） */
  const [runtimeNodeStates, setRuntimeNodeStates] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  /** 让外部可以"重画"（store.subscribe 后 forceUpdate） */
  const [, forceTick] = useState(0);

  // 订阅 store 变化重新 render
  useEffect(() => {
    const unsub = storeRef.current.subscribe(() => forceTick((n) => n + 1));
    return unsub;
  }, []);

  // 切屏时重置 store + state 覆盖
  useEffect(() => {
    storeRef.current.setState(() => buildEditorPreviewState(screen));
    setRuntimeNodeStates({});
    setToasts([]);
  }, [screen.id]);

  // env 切换
  useEffect(() => {
    effectsRef.current.setEnv(env);
  }, [env]);

  // CSS 伪类注入
  useEffect(() => {
    pseudoRef.current.inject(screen.rootNode);
    return () => pseudoRef.current.clear();
  }, [screen.rootNode]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration: number, position?: ToastPosition) => {
      const id = `toast-${++toastIdRef.current}`;
      setToasts((prev) => [...prev, { id, type, message, duration, position: position ?? 'top-center' }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 构造 host adapters
  const hostAdaptersRef = useRef<HostAdapters>({});
  useEffect(() => {
    hostAdaptersRef.current = {
      onNavGo: (id, anim) => onNavigate?.(id, anim as NavTransitionAnimation | undefined),
      onShowToast: ({ toastType, message, duration, position }) => {
        addToast(toastType, message, duration ?? 3000, position);
      },
      onOpenUrl: (url, openInNewTab) => {
        if (openInNewTab) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = url;
        }
      },
      onSetVisualState: (nodeId, stateName, autoRevertMs) => {
        if (!nodeId) return;
        setRuntimeNodeStates((prev) => ({ ...prev, [nodeId]: stateName }));
        if (autoRevertMs && autoRevertMs > 0) {
          setTimeout(() => {
            setRuntimeNodeStates((prev) => {
              const next = { ...prev };
              delete next[nodeId];
              return next;
            });
          }, autoRevertMs);
        }
      },
      // onNavBack / onCustomAction 留给宿主在外层注入
      onNavBack: () => onNavigate?.(''),
    };
  }, [onNavigate, addToast]);

  // dataSource resolver
  const dataSources = useMemo(() => {
    const map = new Map(screen.dataSources?.map((ds) => [ds.id, ds]) ?? []);
    return (id: string) => map.get(id);
  }, [screen.dataSources]);

  const dispatcher = useMemo(
    () =>
      new Dispatcher({
        store: storeRef.current,
        effects: effectsRef.current,
        dataSources,
        host: {
          onNavGo: (id, anim) => hostAdaptersRef.current.onNavGo?.(id, anim),
          onNavBack: () => hostAdaptersRef.current.onNavBack?.(),
          onShowToast: (args) => hostAdaptersRef.current.onShowToast?.(args),
          onOpenUrl: (url, openInNewTab) => hostAdaptersRef.current.onOpenUrl?.(url, openInNewTab),
          onSetVisualState: (nodeId, state, ms) =>
            hostAdaptersRef.current.onSetVisualState?.(nodeId, state, ms),
          onCustomAction: (h, p) => hostAdaptersRef.current.onCustomAction?.(h, p),
        },
      }),
    [dataSources],
  );

  /** 当前 ScreenState → DataContext */
  const previewDataContext: DataContext = useMemo(
    () => buildScreenDataContext(screen, storeRef.current.getState()),
    // 依赖 forceTick 让 subscribe 后重新计算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screen, storeRef.current.getState()],
  );

  // ===== 生命周期事件 =====
  const getLifecycleEvents = useCallback(
    (trigger: string) => {
      return (screen.rootNode.events ?? []).filter((e) => e.trigger === trigger && !e.disabled);
    },
    [screen.rootNode.events],
  );

  const fireLifecycleEvents = useCallback(
    async (trigger: string) => {
      const events = getLifecycleEvents(trigger);
      if (events.length === 0) return;
      for (const event of events) {
        await dispatcher.run(event.actions as Action[]);
      }
    },
    [getLifecycleEvents, dispatcher],
  );

  // screenEnter
  const screenEnterFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (screenEnterFiredRef.current === screen.id) return;
    const enterEvents = getLifecycleEvents('screenEnter');
    if (enterEvents.length === 0) return;
    screenEnterFiredRef.current = screen.id;
    fireLifecycleEvents('screenEnter');
  }, [screen.id, getLifecycleEvents, fireLifecycleEvents]);

  // 自动 fetch：autoFetchOnEnter 的 api 数据源
  useEffect(() => {
    for (const ds of screen.dataSources ?? []) {
      if (ds.type === 'api' && ds.autoFetchOnEnter !== false) {
        dispatcher.run([{ type: 'effect.fetch', dataSourceId: ds.id }]);
      }
    }
  }, [screen.id, screen.dataSources, dispatcher]);

  // screenVisible / screenHidden
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

  // scrollReachBottom / scrollReachTop
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const scrollContainer = el.closest('[data-preview-root]') as HTMLElement | null;
    if (!scrollContainer) return;

    const bottomEvents = getLifecycleEvents('scrollReachBottom');
    const topEvents = getLifecycleEvents('scrollReachTop');
    if (bottomEvents.length === 0 && topEvents.length === 0) return;

    const scrollEvent = [...bottomEvents, ...topEvents][0];
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

        if (bottomEvents.length > 0 && scrollHeight - scrollTop - clientHeight < threshold) {
          if (now - lastBottomFire > debounceMs) {
            lastBottomFire = now;
            fireLifecycleEvents('scrollReachBottom');
          }
        }
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

  // navigateBack — 暴露给宿主
  useEffect(() => {
    if (!onNavigateBackRef) return;
    onNavigateBackRef.current = async () => {
      const backEvents = getLifecycleEvents('navigateBack');
      if (backEvents.length === 0) return false;
      await fireLifecycleEvents('navigateBack');
      return true;
    };
    return () => {
      if (onNavigateBackRef) onNavigateBackRef.current = null;
    };
  }, [onNavigateBackRef, getLifecycleEvents, fireLifecycleEvents]);

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
              dispatcher={dispatcher}
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
  rootNodeId: string;
  assets: ComponentTemplate[];
  dispatcher: Dispatcher;
  runtimeNodeStates: Record<string, string>;
  isListItem?: boolean;
}

function applyListContainerStyleOverrides(styles: React.CSSProperties): React.CSSProperties {
  return {
    ...styles,
    display: 'flex',
    flexDirection: 'column',
    height: undefined,
    minHeight: styles.height ?? styles.minHeight,
  };
}

function applyListItemStyleOverrides(styles: React.CSSProperties): React.CSSProperties {
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
  dispatcher,
  runtimeNodeStates,
  isListItem = false,
}: PreviewNodeRendererProps) {
  const dataContext = useDataContext();
  const staticOrigin = useStaticAssetOrigin();

  const node = isComponentInstanceType(rawNode.type)
    ? resolveComponentInstance(rawNode, assets)
    : rawNode;

  if (node.type === 'annotation') return null;

  // 运行时 visualState 覆盖
  const runtimeState = runtimeNodeStates[node.id];
  const effectiveNode = runtimeState && runtimeState !== node.activeState
    ? { ...node, activeState: runtimeState }
    : node;

  const { props: mergedProps, visible } = resolveNodeProps(effectiveNode, dataContext);
  const resolvedProps = resolvePropsForRender(mergedProps, dataContext);

  if (visible === false) return null;

  const baseStyles = resolveNodeStyles(effectiveNode, dataContext);
  const isListContainer = effectiveNode.repeat !== undefined;
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

  if (isListContainer) reactStyles = applyListContainerStyleOverrides(reactStyles);
  if (isListItem) reactStyles = applyListItemStyleOverrides(reactStyles);

  if (staticOrigin) {
    reactStyles = rewriteStyleObjectUrls(
      reactStyles as Record<string, unknown>,
      staticOrigin,
    ) as React.CSSProperties;
  }

  // ===== 事件绑定 =====
  // 受控双向绑定：bind.path 存在时把 value 注入 props，并加 onChange 写回 store
  const bindPath = effectiveNode.bind?.path;
  let propsForRender: Record<string, unknown> = resolvedProps;
  if (bindPath) {
    const segs = bindPath.split('.');
    let cur: unknown = dataContext.state;
    for (const s of segs) {
      if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[s];
      else { cur = undefined; break; }
    }
    propsForRender = {
      ...resolvedProps,
      value: cur ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const newValue = e.target.value;
        dispatcher.run([{ type: 'state.set', path: bindPath, value: newValue }]);
      },
    };
  }

  // 节点级事件（click / change / focus / blur 等）
  const handlers: Record<string, (e: React.SyntheticEvent) => void> = {};
  for (const event of effectiveNode.events ?? []) {
    if (event.disabled) continue;
    if (event.trigger === 'click') {
      const prev = handlers.onClick;
      handlers.onClick = (e) => {
        prev?.(e);
        dispatcher.run(event.actions as Action[]);
      };
    } else if (event.trigger === 'doubleClick') {
      handlers.onDoubleClick = () => dispatcher.run(event.actions as Action[]);
    } else if (event.trigger === 'focus') {
      handlers.onFocus = () => dispatcher.run(event.actions as Action[]);
    } else if (event.trigger === 'blur') {
      handlers.onBlur = () => dispatcher.run(event.actions as Action[]);
    } else if (event.trigger === 'change') {
      const prev = propsForRender.onChange as ((e: React.ChangeEvent) => void) | undefined;
      propsForRender = {
        ...propsForRender,
        onChange: (e: React.ChangeEvent) => {
          prev?.(e);
          dispatcher.run(event.actions as Action[]);
        },
      };
    } else if (event.trigger === 'submit') {
      handlers.onSubmit = (e) => {
        e.preventDefault();
        dispatcher.run(event.actions as Action[]);
      };
    }
    // hover / longPress / 其它在 PrimitiveRenderer 内更合适，由 CSSPseudoInjector + 后续 B.2 处理
  }

  const previewStyles: React.CSSProperties = {
    ...reactStyles,
    pointerEvents: 'auto',
  };

  if (staticOrigin && effectiveNode.type === 'img' && typeof propsForRender.src === 'string') {
    propsForRender = { ...propsForRender, src: rewriteMediaSrc(propsForRender.src, staticOrigin) ?? propsForRender.src };
  }

  // children 渲染
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
            dispatcher={dispatcher}
            runtimeNodeStates={runtimeNodeStates}
            isListItem
          />
        )}
      />
    );
  } else {
    const activeStateDef = effectiveNode.states?.find((s) => s.name === (effectiveNode.activeState ?? 'default'));
    const cvMap = activeStateDef?.childrenVisibility;
    const implicitDefaultCvMap = !activeStateDef && (effectiveNode.activeState ?? 'default') === 'default'
      ? buildImplicitDefaultVisibility(effectiveNode)
      : undefined;
    const effectiveCvMap = cvMap ?? implicitDefaultCvMap;

    children = effectiveNode.children
      ?.filter((child) => !(effectiveCvMap && effectiveCvMap[child.id] === false))
      .map((child) => (
        <PreviewNodeRenderer
          key={child.id}
          node={child}
          rootNodeId={rootNodeId}
          assets={assets}
          dispatcher={dispatcher}
          runtimeNodeStates={runtimeNodeStates}
        />
      ));
  }

  return (
    <PrimitiveRenderer
      node={effectiveNode}
      style={previewStyles}
      resolvedProps={{ ...propsForRender, ...handlers }}
      interactive
    >
      {children}
    </PrimitiveRenderer>
  );
}

/**
 * default 状态下未显式定义 default visualState 时，从其它态的 childrenVisibility
 * 推导出 default 应隐藏哪些子节点（与 SchemaRenderer 同语义）。
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
