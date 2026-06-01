import React, { useCallback, useMemo } from 'react';
import type {
  ComponentNode,
  ComponentTemplate,
  Screen,
} from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { PrimitiveRenderer } from '../renderers/PrimitiveRenderer';
import { resolveNodeStyles } from '../styles/resolveStyles';
import { resolveNodeProps, resolvePropsForRender } from '../styles/resolveProps';
import { computeAutoActivatedState } from '../styles/autoActivatedState';
import { generatePresetKeyframesCSS } from '../styles/presetAnimations';
import { mergeStateMaps } from '../styles/mergeStateMaps';
import { resolveComponentInstance } from '../assets/resolveInstance';
import { DataContextProvider, useDataContext } from '../data/DataContextProvider';
import type { DataContext } from '../data/dataContext';
import { useThemeConfig } from './ThemeConfigContext';
import { buildScreenDataContext, buildEditorPreviewState } from '../data/dataContext';
import { ListRenderer } from '../data/ListRenderer';
import type { CoordinateMap } from '../overlay/coordinateMap';
import { buildSchemaLayoutMap, expandCullRect } from '../overlay/schemaLayoutMap';
import { SchemaVirtualizeContext, shouldVirtualizeCullNode, useSchemaVirtualize } from './SchemaVirtualizeContext';
import { StaticAssetOriginProvider, useStaticAssetOrigin } from './StaticAssetOriginContext';
import { rewriteMediaSrc, rewriteStyleObjectUrls } from '../assets/rewriteLocalAssetRefs';

/** W6-042：编辑画布上对单个节点临时叠加交互状态（不写入 Schema） */
export type InteractionPreview = { nodeId: string; state: string };

export interface SchemaRendererProps {
  /** The screen to render */
  screen: Screen;
  /** Component template assets (for resolving component instances) */
  assets?: ComponentTemplate[];
  /**
   * v2 渲染期 ctx —— 含 ScreenState；不传时由 buildEditorPreviewState 从
   * screen.dataSources（static 与 api mock）生成最小 state。
   */
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
  /**
   * 静态资源根（如 `http://127.0.0.1:3001`），用于把 `url("/uploads/...")`、`/uploads/...` 补成绝对地址。
   * 不传则不做重写（依赖宿主同源代理等）。
   */
  staticAssetOrigin?: string;
}

/**
 * Core renderer that recursively converts a Screen's ComponentNode tree
 * into a real React DOM tree.
 *
 * 渲染模型：
 * - styles/props 字段含 `{{ }}` 表达式时由 expression 引擎在 dataContext 下求值
 * - `visibleWhen: Expression<boolean>` 驱动节点可见性
 * - 列表容器用 `node.repeat: Expression<unknown[]>` 渲染重复子项
 */
export function SchemaRenderer({
  screen,
  assets = [],
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
  staticAssetOrigin,
}: SchemaRendererProps) {
  const activeDataContext: DataContext = useMemo(
    () => dataContext ?? buildScreenDataContext(screen, buildEditorPreviewState(screen)),
    [dataContext, screen],
  );

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
    assets,
    interactionPreview,
    activeDataContext,
  ]);

  // 页面底色：根节点样式优先（用户改 Root 背景即期望整页变色）；否则用 Screen 元数据
  const rootBg = screen.rootNode.styles?.backgroundColor;
  const pageBackground =
    typeof rootBg === 'string' && rootBg !== ''
      ? rootBg
      : (screen.backgroundColor ?? 'transparent');

  return (
    <StaticAssetOriginProvider origin={staticAssetOrigin}>
      <DataContextProvider value={activeDataContext}>
        <SchemaVirtualizeContext.Provider value={virtualizeCtx}>
          {/* 预置 CSS 动画 keyframes 注入 */}
          <style dangerouslySetInnerHTML={{ __html: generatePresetKeyframesCSS() }} />
          <div
            data-screen-id={screen.id}
            style={{
              width: '100%',
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
              interactionPreview={interactionPreview}
              hideGhostNodes={hideGhostNodes}
              onNodeClick={onNodeClick}
              onNodeHover={onNodeHover}
              onNodeDoubleClick={onNodeDoubleClick}
            />
          </div>
        </SchemaVirtualizeContext.Provider>
      </DataContextProvider>
    </StaticAssetOriginProvider>
  );
}

// ===== Internal: Recursive Node Renderer =====

const TEXT_PRIMITIVE_TYPES = new Set<string>(['p', 'span', 'h1', 'h2', 'h3', 'a']);

/**
 * 列表子项样式覆盖：absolute → relative，让 template 根节点参与父容器的 flex/grid 流
 * （绝对定位在列表场景下几乎总是错的；保留为 relative 让设计师用容器的 display 决定排布）。
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
  const staticOrigin = useStaticAssetOrigin();
  const themeConfig = useThemeConfig();

  // Step 1: Resolve component instances
  const node = isComponentInstanceType(rawNode.type)
    ? resolveComponentInstance(rawNode, assets)
    : rawNode;

  const interactionForNode = resolveInteractionForNode(node.id, interactionPreview);

  if (shouldVirtualizeCullNode(vctx, { nodeId: node.id, rootNodeId })) {
    return null;
  }

  // Step 2: Resolve props + visibility
  const { props: mergedProps, visible } = resolveNodeProps(
    node,
    dataContext,
    interactionForNode,
    parentStateOverride,
  );
  const resolvedProps = resolvePropsForRender(mergedProps, dataContext);

  if (visible === false) {
    return null;
  }

  // Step 3: Resolve styles
  const baseStyles = resolveNodeStyles(node, dataContext, interactionForNode, parentStateOverride, themeConfig);
  const isListContainer = node.repeat !== undefined;
  let reactStyles =
    rootNodeId && node.id === rootNodeId
      ? {
          ...baseStyles,
          left: undefined,
          top: undefined,
          right: undefined,
          bottom: undefined,
          height: baseStyles.height ?? '100%',
          width: baseStyles.width ?? '100%',
          boxSizing: 'border-box' as const,
        }
      : baseStyles;

  // v2.1：列表容器自身正常渲染，不再强制 flex column。设计师自由决定排布（row/column/grid/...）。
  if (isListItem) {
    reactStyles = applyListItemStyleOverrides(reactStyles);
  }

  if (staticOrigin) {
    reactStyles = rewriteStyleObjectUrls(
      reactStyles as Record<string, unknown>,
      staticOrigin,
    ) as React.CSSProperties;
  }

  // Step 4: Event handlers
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

  // Step 5: Render children — 统一"静态 children 先渲染"，再在 list container 情况下追加 N 份 template
  // 默认 + delta 合并 visualState 的 childrenVisibility / childrenStates
  const rawPreviewState = interactionPreview && interactionPreview.nodeId === node.id
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
    // ★ Bug A 修复：与 resolveStyles 保持一致 —— 优先用 autoActivatedState（activeWhen 自动激活）
    // 此前只读 node.activeState，导致父节点 visualState 通过 activeWhen 自动激活后，
    // 其 childrenVisibility / childrenStates 不生效（典型场景：勾选 ✓ 永远不显示）。
    const autoActivatedState = computeAutoActivatedState(node, dataContext);
    const effectiveActiveState = autoActivatedState ?? node.activeState ?? 'default';
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

  const staticChildren = node.children?.map((child) => {
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
        interactionPreview={interactionPreview}
        hideGhostNodes={hideGhostNodes}
        parentStateOverride={childStateOverride}
        onNodeClick={onNodeClick}
        onNodeHover={onNodeHover}
        onNodeDoubleClick={onNodeDoubleClick}
      />
    );
  });

  const children: React.ReactNode = isListContainer ? (
    <>
      {staticChildren}
      <ListRenderer
        node={node}
        renderTemplate={(template, listIndex) => (
          <NodeRenderer
            key={`${template.id}-${listIndex}`}
            node={template}
            rootNodeId={rootNodeId}
            assets={assets}
            interactionPreview={interactionPreview}
            hideGhostNodes={hideGhostNodes}
            isListItem
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
            onNodeDoubleClick={onNodeDoubleClick}
          />
        )}
      />
    </>
  ) : (
    staticChildren
  );

  const propsForRender =
    staticOrigin && node.type === 'img' && typeof resolvedProps.src === 'string'
      ? { ...resolvedProps, src: rewriteMediaSrc(resolvedProps.src, staticOrigin) ?? resolvedProps.src }
      : resolvedProps;

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
        resolvedProps={propsForRender}
      >
        {children}
      </PrimitiveRenderer>
    </div>
  );
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
