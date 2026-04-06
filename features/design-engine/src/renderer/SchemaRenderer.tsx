import React, { useCallback, useMemo } from 'react';
import type { ComponentNode, ComponentTemplate, Screen } from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { PrimitiveRenderer } from '../renderers/PrimitiveRenderer';
import { resolveNodeStyles } from '../styles/resolveStyles';
import { resolveNodeProps } from '../styles/resolveProps';
import { mergeStateMaps } from '../styles/mergeStateMaps';
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
  /**
   * 全景/预览模式：childrenVisibility 隐藏的节点不渲染 GhostWrapper，而是真正不渲染。
   * 编辑模式下为 false（显示 ghost 便于设计师看到节点存在）。
   * 全景/预览模式下为 true（展示真实最终效果）。
   */
  hideGhostNodes?: boolean;
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
  hideGhostNodes = false,
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
            hideGhostNodes={hideGhostNodes}
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
    // 固定 height 会截断列表项，改为最小高度
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

interface NodeRendererProps {
  node: ComponentNode;
  rootNodeId?: string;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  interactionPreview?: InteractionPreview | null;
  hideGhostNodes?: boolean;
  /** State override from parent's childrenStates mapping */
  parentStateOverride?: string | null;
  isListItem?: boolean;
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
  hideGhostNodes = false,
  parentStateOverride = null,
  isListItem = false,
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

  if (shouldVirtualizeCullNode(vctx, { nodeId: node.id, rootNodeId })) {
    return null;
  }

  // Step 2: Resolve props + visibility through 4-layer merge
  const nodeForProps: ComponentNode = hasExpression(node.props?.__listData)
    ? { ...node, props: { ...node.props, __listData: undefined } }
    : node;
  const { props: mergedProps, visible } = resolveNodeProps(nodeForProps, globalStates, interactionForNode, parentStateOverride);

  // Step 2.5: Resolve data binding expressions in props
  const resolvedProps = resolveDataExpressions(mergedProps, dataContext);

  // Step 3: Skip only when explicitly hidden (undefined defaults to visible in resolveNodeProps)
  if (visible === false) {
    return null;
  }

  // Step 4: Resolve styles through 4-layer merge and convert to React.CSSProperties
  const baseStyles = resolveNodeStyles(node, globalStates, interactionForNode, dataContext, parentStateOverride);
  const isListContainer = hasExpression(node.props?.__listData);
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

  // Step 6: Render children — if this node has __listData, repeat children per list item
  let children: React.ReactNode;
  if (isListContainer) {
    children = (
      <ListRenderer
        node={node}
        renderChild={(child, listIndex) => (
          <NodeRenderer
            key={`${child.id}-${listIndex}`}
            node={child}
            rootNodeId={rootNodeId}
            assets={assets}
            globalStates={globalStates}
            interactionPreview={interactionPreview}
            hideGhostNodes={hideGhostNodes}
            isListItem
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
            onNodeDoubleClick={onNodeDoubleClick}
          />
        )}
      />
    );
  } else {
    // Determine childrenVisibility and childrenStates using the
    // "default + delta" merge model: the default state provides the
    // baseline; the active/preview state's map is merged on top so
    // that only explicitly overridden keys differ from default.
    const rawPreviewState = interactionPreview?.nodeId === node.id
      ? interactionPreview.state
      : null;

    const defaultStateDef = node.states?.find((s) => s.name === 'default');

    let cvMap: Record<string, boolean> | undefined;
    let csMap: Record<string, string> | undefined;

    if (rawPreviewState) {
      if (rawPreviewState === 'default' || rawPreviewState === 'normal') {
        cvMap = defaultStateDef?.childrenVisibility;
        csMap = defaultStateDef?.childrenStates;
      } else {
        const previewStateDef = node.states?.find((s) => s.name === rawPreviewState);
        cvMap = mergeStateMaps(
          defaultStateDef?.childrenVisibility,
          previewStateDef?.childrenVisibility,
        );
        csMap = mergeStateMaps(
          defaultStateDef?.childrenStates,
          previewStateDef?.childrenStates,
        );
      }
    } else {
      const effectiveActiveState = node.activeState ?? 'default';
      if (effectiveActiveState === 'default') {
        cvMap = defaultStateDef?.childrenVisibility;
        csMap = defaultStateDef?.childrenStates;
      } else {
        const activeStateDef = node.states?.find((s) => s.name === effectiveActiveState);
        cvMap = mergeStateMaps(
          defaultStateDef?.childrenVisibility,
          activeStateDef?.childrenVisibility,
        );
        csMap = mergeStateMaps(
          defaultStateDef?.childrenStates,
          activeStateDef?.childrenStates,
        );
      }
    }

    children = node.children?.map((child) => {
      const hiddenInState = cvMap ? cvMap[child.id] === false : false;
      const childStateOverride = csMap?.[child.id] ?? null;
      if (hiddenInState) {
        if (hideGhostNodes) {
          return null;
        }
        return (
          <GhostWrapper key={child.id} node={child} visibleStates={getVisibleStateNames(node, child.id)}>
            <NodeRenderer
              key={child.id}
              node={child}
              rootNodeId={rootNodeId}
              assets={assets}
              globalStates={globalStates}
              interactionPreview={interactionPreview}
              hideGhostNodes={hideGhostNodes}
              parentStateOverride={childStateOverride}
              onNodeClick={onNodeClick}
              onNodeHover={onNodeHover}
              onNodeDoubleClick={onNodeDoubleClick}
            />
          </GhostWrapper>
        );
      }
      return (
        <NodeRenderer
          key={child.id}
          node={child}
          rootNodeId={rootNodeId}
          assets={assets}
          globalStates={globalStates}
          interactionPreview={interactionPreview}
          hideGhostNodes={hideGhostNodes}
          parentStateOverride={childStateOverride}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          onNodeDoubleClick={onNodeDoubleClick}
        />
      );
    });
  }

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

// ===== childrenVisibility: Ghost Wrapper for state-hidden components =====

function getVisibleStateNames(parent: ComponentNode, childId: string): string[] {
  return (parent.states ?? [])
    .filter((s) => s.childrenVisibility?.[childId] !== false)
    .map((s) => s.name);
}

function GhostWrapper({
  node,
  visibleStates,
  children,
}: {
  node: ComponentNode;
  visibleStates: string[];
  children: React.ReactNode;
}) {
  const label = visibleStates.length > 0 ? visibleStates.join(', ') : '(无)';
  return (
    <div
      data-ghost-node={node.id}
      style={{
        opacity: 0.2,
        pointerEvents: 'auto',
        position: 'relative',
        outline: '1px dashed rgba(99,102,241,0.4)',
        outlineOffset: '-1px',
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: 'rgba(99,102,241,0.85)',
          color: '#fff',
          fontSize: '9px',
          lineHeight: '14px',
          padding: '0 4px',
          borderBottomLeftRadius: '3px',
          pointerEvents: 'none',
          zIndex: 1,
          whiteSpace: 'nowrap',
        }}
      >
        👁 {label}
      </div>
    </div>
  );
}
