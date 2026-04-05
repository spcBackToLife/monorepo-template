import React, { useCallback, useMemo } from 'react';
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
import type { CoordinateMap } from '../overlay/coordinateMap';
import { buildSchemaLayoutMap, expandCullRect } from '../overlay/schemaLayoutMap';
import { SchemaVirtualizeContext, shouldVirtualizeCullNode, useSchemaVirtualize } from './SchemaVirtualizeContext';

/** W6-042：编辑画布上对单个节点临时叠加交互状态（不写入 Schema） */
export type InteractionPreview = { nodeId: string; state: string };

export interface SchemaRendererProps {
  /** The screen to render */
  screen: Screen;
  /** Component template assets (for resolving component instances) */
  assets?: ComponentTemplate[];
  /** Runtime global state values (variableName → current value) */
  globalStates?: Record<string, string>;
  /** External data context (optional, overrides active dataset) */
  dataContext?: DataContext;
  /** 对选中节点临时预览 hover/active 等（与 setActiveState 独立） */
  interactionPreview?: InteractionPreview | null;
  /** Called when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Called when mouse enters/leaves a node */
  onNodeHover?: (nodeId: string | null) => void;
  /** 文本类 primitive 双击（编辑入口，W2） */
  onNodeDoubleClick?: (nodeId: string) => void;
  /**
   * W7-021 画布性能：对整页根容器施加 `contain: layout`，缩小样式/布局重算范围。
   * 编辑画布默认开启；若与宿主样式冲突可关。
   */
  editorCanvasOptimize?: boolean;
  /**
   * W7-025：设备框外不挂载 DOM（与 buildSchemaLayoutMap + mergeCoordinateMaps 同方案）。
   * 开启时建议由宿主传入 schemaLayoutMap，避免重复 walk。
   */
  virtualizeOutsideDeviceFrame?: boolean;
  /** 与 virtualize 配套；未传时内部用 375×812 兜底 */
  virtualizeViewportWidth?: number;
  virtualizeViewportHeight?: number;
  /** 设备框外扩 margin（px），减少平移时边缘闪烁 */
  virtualizeMarginPx?: number;
  /** 宿主预计算的布局图（与 EditorOverlay coordinateLayoutFallback 同源） */
  schemaLayoutMap?: CoordinateMap | null;
}

/**
 * Core renderer that recursively converts a Screen's ComponentNode tree
 * into a real React DOM tree.
 *
 * Features:
 * - Resolves component instances from the asset library
 * - 4-layer style/props merge (base → global state → business state → interaction)
 * - Visibility resolution through all layers
 * - Converts schema CSSProperties to React-compatible styles
 * - Injects data-node-id on every rendered element
 * - Resolves data binding expressions ({{data.xxx}}) from active dataset
 * - Supports list rendering via __listData prop
 */
export function SchemaRenderer({
  screen,
  assets = [],
  globalStates = {},
  dataContext,
  interactionPreview = null,
  onNodeClick,
  onNodeHover,
  onNodeDoubleClick,
  editorCanvasOptimize = true,
  virtualizeOutsideDeviceFrame = false,
  virtualizeViewportWidth,
  virtualizeViewportHeight,
  virtualizeMarginPx = 240,
  schemaLayoutMap: schemaLayoutMapProp = null,
}: SchemaRendererProps) {
  // Build data context from active dataset if not provided externally
  const activeDataContext: DataContext = dataContext ?? buildDataContextFromScreen(screen);

  const virtualizeCtx = useMemo(() => {
    const vw = virtualizeViewportWidth ?? 375;
    const vh = virtualizeViewportHeight ?? 812;
    const layoutMap =
      virtualizeOutsideDeviceFrame && schemaLayoutMapProp
        ? schemaLayoutMapProp
        : virtualizeOutsideDeviceFrame
          ? buildSchemaLayoutMap(screen, {
              viewportWidth: vw,
              viewportHeight: vh,
              globalStates,
              assets,
              interactionPreview,
              dataContext: activeDataContext,
            })
          : new Map();
    const cullRect = expandCullRect(vw, vh, virtualizeMarginPx);
    return {
      enabled: virtualizeOutsideDeviceFrame,
      layoutMap,
      cullRect,
      cullDisabledForSubtree: false,
    };
  }, [
    virtualizeOutsideDeviceFrame,
    schemaLayoutMapProp,
    screen,
    virtualizeViewportWidth,
    virtualizeViewportHeight,
    virtualizeMarginPx,
    globalStates,
    assets,
    interactionPreview,
    activeDataContext,
  ]);

  // 页面底色：根节点样式优先（用户改 Root 背景即期望整页变色）；否则用 Screen 元数据（与 updateStyle 同步根背景到 screen 后两者一致）
  const rootBg = screen.rootNode.styles?.backgroundColor;
  const pageBackground =
    typeof rootBg === 'string' && rootBg !== ''
      ? rootBg
      : (screen.backgroundColor ?? 'transparent');

  function renderSingleNode(
    node: ComponentNode,
    assetsArg: ComponentTemplate[],
    globalStatesArg: Record<string, string>,
    onNodeClickArg?: (nodeId: string) => void,
    onNodeHoverArg?: (nodeId: string | null) => void,
    onNodeDoubleClickArg?: (nodeId: string) => void,
  ): React.ReactNode {
    const nodeWithoutListData: ComponentNode = {
      ...node,
      props: { ...node.props },
    };
    delete nodeWithoutListData.props.__listData;

    return (
      <NodeRenderer
        node={nodeWithoutListData}
        assets={assetsArg}
        globalStates={globalStatesArg}
        interactionPreview={interactionPreview}
        renderListNode={renderSingleNode}
        onNodeClick={onNodeClickArg}
        onNodeHover={onNodeHoverArg}
        onNodeDoubleClick={onNodeDoubleClickArg}
      />
    );
  }

  return (
    <DataContextProvider value={activeDataContext}>
      <SchemaVirtualizeContext.Provider value={virtualizeCtx}>
        <div
          data-screen-id={screen.id}
          style={{
            width: '100%',
            minHeight: '100%',
            height: '100%',
            boxSizing: 'border-box',
            backgroundColor: pageBackground,
            position: 'relative' as const,
            ...(editorCanvasOptimize ? { contain: 'layout' as const } : {}),
          }}
        >
          <NodeRenderer
            node={screen.rootNode}
            rootNodeId={screen.rootNode.id}
            assets={assets}
            globalStates={globalStates}
            interactionPreview={interactionPreview}
            renderListNode={renderSingleNode}
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
            onNodeDoubleClick={onNodeDoubleClick}
          />
        </div>
      </SchemaVirtualizeContext.Provider>
    </DataContextProvider>
  );
}

/** Build a DataContext：合并各数据源活跃场景数据（替代旧 dataSets / activeDataSetId） */
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

function buildDataContextFromScreen(screen: Screen): DataContext {
  return {
    data: getActiveData(screen),
  };
}

// ===== Internal: Recursive Node Renderer =====

const TEXT_PRIMITIVE_TYPES = new Set<string>(['p', 'span', 'h1', 'h2', 'h3', 'a']);

export type RenderListNodeFn = (
  node: ComponentNode,
  assets: ComponentTemplate[],
  globalStates: Record<string, string>,
  onNodeClick?: (nodeId: string) => void,
  onNodeHover?: (nodeId: string | null) => void,
  onNodeDoubleClick?: (nodeId: string) => void,
) => React.ReactNode;

interface NodeRendererProps {
  node: ComponentNode;
  /** 当前 Screen 的根节点 id：用于默认铺满视口，避免根上设置的背景色被视口白底盖住 */
  rootNodeId?: string;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  interactionPreview?: InteractionPreview | null;
  /** 列表项渲染（与 NodeRenderer 同逻辑，需传入以闭包捕获 interactionPreview） */
  renderListNode: RenderListNodeFn;
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

function resolveInteractionForNode(
  nodeId: string,
  interactionPreview: InteractionPreview | null | undefined,
): string | null {
  if (!interactionPreview || interactionPreview.nodeId !== nodeId) return null;
  const s = interactionPreview.state;
  if (!s || s === 'default' || s === 'normal') return null;
  return s;
}

function NodeRenderer({
  node: rawNode,
  rootNodeId,
  assets,
  globalStates,
  interactionPreview = null,
  renderListNode,
  onNodeClick,
  onNodeHover,
  onNodeDoubleClick,
}: NodeRendererProps) {
  const dataContext = useDataContext();
  const vctx = useSchemaVirtualize();

  // Step 1: Resolve component instances
  const node = isComponentInstanceType(rawNode.type)
    ? resolveComponentInstance(rawNode, assets)
    : rawNode;

  const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);

  // Step 1.5: Check for list rendering (__listData prop)
  if (hasExpression(node.props.__listData)) {
    return (
      <ListRenderer
        node={node}
        assets={assets}
        globalStates={globalStates}
        renderNode={renderListNode}
        onNodeClick={onNodeClick}
        onNodeHover={onNodeHover}
        onNodeDoubleClick={onNodeDoubleClick}
      />
    );
  }

  if (shouldVirtualizeCullNode(vctx, { nodeId: node.id, rootNodeId })) {
    return null;
  }

  // Step 2: Resolve props + visibility through 4-layer merge
  const { props: mergedProps, visible } = resolveNodeProps(node, globalStates, interactionForNode);

  // Step 2.5: Resolve data binding expressions in props
  const resolvedProps = resolveDataExpressions(mergedProps, dataContext);

  // Step 3: Skip only when explicitly hidden (undefined defaults to visible in resolveNodeProps)
  if (visible === false) {
    return null;
  }

  // Step 4: Resolve styles through 4-layer merge and convert to React.CSSProperties
  const baseStyles = resolveNodeStyles(node, globalStates, interactionForNode, dataContext);
  const reactStyles =
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

  // Step 5: Event handlers
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeClick?.(node.id);
    },
    [node.id, onNodeClick],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeHover?.(node.id);
    },
    [node.id, onNodeHover],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeHover?.(null);
    },
    [onNodeHover],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (TEXT_PRIMITIVE_TYPES.has(node.type) && onNodeDoubleClick) {
        onNodeDoubleClick(node.id);
      }
    },
    [node.id, node.type, onNodeDoubleClick],
  );

  // Step 6: Recursively render children
  const children = node.children?.map((child) => (
    <NodeRenderer
      key={child.id}
      node={child}
      rootNodeId={rootNodeId}
      assets={assets}
      globalStates={globalStates}
      interactionPreview={interactionPreview}
      renderListNode={renderListNode}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  ));

  // Step 7: Wrap with click/hover handlers
  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'contents' }}
    >
      <PrimitiveRenderer
        node={node}
        style={reactStyles}
        resolvedProps={resolvedProps}
      >
        {children}
      </PrimitiveRenderer>
    </div>
  );
}

/** Resolve data expressions in a props object using the current data context */
function resolveDataExpressions(
  props: Record<string, unknown>,
  context: DataContext,
): Record<string, unknown> {
  // Quick check: does any prop have an expression?
  const hasAnyExpression = Object.values(props).some(hasExpression);
  if (!hasAnyExpression) {
    return props;
  }
  return resolvePropsExpressions(props, context);
}

