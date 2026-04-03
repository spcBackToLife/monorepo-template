import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentNode, ComponentTemplate, Screen } from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { PrimitiveRenderer } from '../renderers/PrimitiveRenderer';
import { resolveNodeStyles } from '../styles/resolveStyles';
import { resolveNodeProps } from '../styles/resolveProps';
import { resolveComponentInstance } from '../assets/resolveInstance';
import { DataContextProvider, useDataContext } from '../data/DataContext';
import type { DataContext } from '../data/resolveExpression';
import { hasExpression, resolvePropsExpressions } from '../data/resolveExpression';
import { ListRenderer } from '../data/ListRenderer';
import { EventExecutionEngine, type PreviewContext } from './EventExecutionEngine';
import { CSSPseudoInjector } from './CSSPseudoInjector';

export interface PreviewRendererProps {
  screen: Screen;
  assets?: ComponentTemplate[];
  globalStates?: Record<string, string>;
  /** 可选：仅使用该数据源的活跃场景数据；不传则合并全部已加载数据源 */
  currentDataSet?: string;
  onNavigate?: (screenId: string) => void;
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
    const scenario = ds.scenarios.find((s) => s.id === ds.activeScenarioId);
    if (scenario) {
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
      const scenario = ds.scenarios.find((s) => s.id === ds.activeScenarioId);
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
  embedded,
}: {
  screen: Screen;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  onNavigate?: (screenId: string) => void;
  embedded: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new EventExecutionEngine());
  const pseudoRef = useRef(new CSSPseudoInjector());
  const [runtimeGlobals, setRuntimeGlobals] = useState<Record<string, string>>(() => ({
    ...globalStates,
  }));
  /** 预览内 toggleVisible 切换的节点 id（与 schema 可见性叠加，再次切换可恢复） */
  const [previewHiddenIds, setPreviewHiddenIds] = useState<Set<string>>(() => new Set());

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
    const el = rootRef.current;
    if (!el) return;
    const engine = engineRef.current;
    const ctx: PreviewContext = {
      currentScreenId: screen.id,
      globalStates: runtimeGlobals,
      onNavigate: (id) => onNavigate?.(id),
      onSetState: (nodeId, stateName) => {
        const el = rootRef.current?.querySelector(`[data-node-id="${nodeId}"]`);
        if (el instanceof HTMLElement) {
          el.setAttribute('data-active-state', stateName);
        }
      },
      onSetGlobalState: (name, value) => {
        setRuntimeGlobals((g) => ({ ...g, [name]: value }));
      },
      onToggleVisible: togglePreviewVisible,
    };
    engine.bind(el, screen.rootNode, ctx);
    return () => engine.unbind();
  }, [screen, screen.rootNode, runtimeGlobals, onNavigate, togglePreviewVisible]);

  return (
    <div
      data-preview-root
      style={{
        width: '100%',
        minHeight: '100%',
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
          backgroundColor: screen.backgroundColor,
          position: 'relative' as const,
        }}
      >
        <PreviewNodeRenderer
          node={screen.rootNode}
          assets={assets}
          globalStates={runtimeGlobals}
          onNavigate={onNavigate}
          previewHiddenIds={previewHiddenIds}
        />
      </div>
    </div>
  );
}

interface PreviewNodeRendererProps {
  node: ComponentNode;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  onNavigate?: (screenId: string) => void;
  previewHiddenIds: ReadonlySet<string>;
}

function PreviewNodeRenderer({
  node: rawNode,
  assets,
  globalStates,
  onNavigate,
  previewHiddenIds,
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

  if (hasExpression(node.props.__listData)) {
    return (
      <ListRenderer
        node={node}
        assets={assets}
        globalStates={globalStates}
        renderNode={(n, a, g, _c, _h, _d) =>
          renderSinglePreviewNode(n, a, g, onNavigate, previewHiddenIds)
        }
      />
    );
  }

  const { props: mergedProps, visible } = resolveNodeProps(node, globalStates);
  const resolvedProps = resolveDataExpressions(mergedProps, dataContext);

  if (visible === false) {
    return null;
  }

  const reactStyles = resolveNodeStyles(node, globalStates, undefined, dataContext);
  const previewStyles: React.CSSProperties = {
    ...reactStyles,
    pointerEvents: 'auto',
  };

  const children = node.children?.map((child) => (
    <PreviewNodeRenderer
      key={child.id}
      node={child}
      assets={assets}
      globalStates={globalStates}
      onNavigate={onNavigate}
      previewHiddenIds={previewHiddenIds}
    />
  ));

  return (
    <PrimitiveRenderer node={node} style={previewStyles} resolvedProps={resolvedProps}>
      {children}
    </PrimitiveRenderer>
  );
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

function renderSinglePreviewNode(
  node: ComponentNode,
  assets: ComponentTemplate[],
  globalStates: Record<string, string>,
  onNavigate: ((screenId: string) => void) | undefined,
  previewHiddenIds: ReadonlySet<string>,
): React.ReactNode {
  const nodeWithoutListData: ComponentNode = {
    ...node,
    props: { ...node.props },
  };
  delete nodeWithoutListData.props.__listData;

  return (
    <PreviewNodeRenderer
      node={nodeWithoutListData}
      assets={assets}
      globalStates={globalStates}
      onNavigate={onNavigate}
      previewHiddenIds={previewHiddenIds}
    />
  );
}
