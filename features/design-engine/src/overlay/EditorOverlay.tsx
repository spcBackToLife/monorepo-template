import React, { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import {
  buildCoordinateMap,
  mergeCoordinateMaps,
  scaleCoordinateMapToLayoutContainer,
  expandRootRectToContainer,
  getEditorCoordinateRoot,
  getRectForInteraction,
  hitTestAll,
  hitTestAt,
  type CoordinateMap,
} from './coordinateMap';
import type { BoundingRect } from './BoundingBoxCache';
import { drawSelection, normalizeNodeRectForOverlay } from './interactions/select';
import { drawHover } from './interactions/hover';
import {
  beginDrag,
  updateDragWithSnap,
  drawDragPreview,
  type DragState,
} from './interactions/drag';
import {
  hitTestHandle,
  beginResize,
  updateResizeWithSnap,
  computeResizeFrame,
  drawResizeHandles,
  drawResizePreview,
  type ResizeState,
  type ResizeModifiers,
} from './interactions/resize';
import {
  beginMarquee,
  updateMarquee,
  getMarqueeRect,
  findNodesInMarquee,
  drawMarquee,
  type MarqueeState,
} from './interactions/marquee';
import {
  beginDraw,
  updateDraw,
  finalizeDraw,
  drawDrawPreview,
  type DrawState,
  type DrawBounds,
} from './interactions/draw';
import type { AlignmentGuide } from './alignment';
import { drawSpacingHints } from './spacingHints';

/** 与 snapping / alignment 模块共用：由当前坐标图生成包围盒列表 */
function coordMapToBoundingRects(map: CoordinateMap): BoundingRect[] {
  const rects: BoundingRect[] = [];
  for (const [instanceKey, entry] of map.entries()) {
    const r = entry.rect;
    rects.push({
      nodeId: entry.nodeId,
      instanceKey,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
    });
  }
  return rects;
}

/**
 * Draw alignment guides on the canvas overlay as red dashed lines.
 * Vertical guides are drawn as full-height vertical lines,
 * horizontal guides as full-width horizontal lines.
 */
/** W6-050：列表绑定（__listData）节点左上角 ≡ 标记 */
function drawListBindingBadges(
  ctx: CanvasRenderingContext2D,
  map: CoordinateMap,
  nodeIds: string[],
): void {
  const idSet = new Set(nodeIds);
  for (const [, entry] of map) {
    if (!idSet.has(entry.nodeId)) continue;
    const r = entry.rect;
    const bx = r.x + 4;
    const by = r.y + 4;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
    ctx.strokeStyle = '#0e7490';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx + 9, by + 9, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#164e63';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('≡', bx + 9, by + 9);
    ctx.restore();
  }
}

function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
  canvasWidth: number,
  canvasHeight: number,
): void {
  if (guides.length === 0) return;

  ctx.save();
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Deduplicate guides by axis + position to avoid drawing on top of each other
  const drawn = new Set<string>();

  for (const guide of guides) {
    const key = `${guide.axis}:${guide.position}`;
    if (drawn.has(key)) continue;
    drawn.add(key);

    if (guide.axis === 'vertical') {
      ctx.beginPath();
      ctx.moveTo(guide.position, 0);
      ctx.lineTo(guide.position, canvasHeight);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, guide.position);
      ctx.lineTo(canvasWidth, guide.position);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw a pixel grid at high zoom levels (>200%) to help with precise positioning.
 * Each grid cell represents one CSS pixel.
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  zoomLevel: number,
): void {
  if (zoomLevel < 2.0) return; // Only show at 200%+ zoom

  const gridSize = 1; // In logical coordinate space, 1 grid cell = 1 CSS pixel

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 0.5;

  // Vertical lines
  for (let x = 0; x < canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, canvasHeight);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y < canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(canvasWidth, Math.round(y) + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

/** W2：8px（或自定义）对齐栅格线，与吸附开关独立 */
function drawSnapGridOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  gridPx: number,
): void {
  const g = Math.max(4, Math.min(64, gridPx));
  ctx.save();
  ctx.strokeStyle = 'rgba(22, 119, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvasWidth; x += g) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= canvasHeight; y += g) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(canvasWidth, Math.round(y) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

export type OverlayToolMode = 'select' | 'container' | 'element' | 'text' | 'hand' | 'component' | 'annotation';

const TEXT_EDIT_NODE_TYPES = new Set<string>(['p', 'span', 'h1', 'h2', 'h3', 'a']);

export interface EditorOverlayProps {
  containerRef: React.RefObject<HTMLElement | null>;
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  onSelect?: (nodeId: string | null) => void;
  /** Called when marquee selection finishes — provides all node IDs inside the rectangle */
  onMarqueeSelect?: (nodeIds: string[]) => void;
  onHover?: (nodeId: string | null) => void;
  /** groupIds 存在时表示多选同步移动 */
  onDrag?: (nodeId: string, deltaX: number, deltaY: number, groupIds?: string[]) => void;
  /** 画布容器坐标系下的目标外接矩形（用于写回 left/top/width/height） */
  onResize?: (
    nodeId: string,
    containerRect: { x: number; y: number; width: number; height: number },
  ) => void;
  /** Called when the draw tool finishes — provides bounds for element creation */
  onDrawCreate?: (bounds: DrawBounds) => void;
  /** Active tool mode — determines mouse behaviour */
  activeTool?: OverlayToolMode;
  zoomLevel?: number;
  /** 对齐线吸附之后是否再吸附 8px 栅格 */
  snapToGridEnabled?: boolean;
  gridSizePx?: number;
  /** 显示编辑栅格（浅蓝线） */
  showGridOverlay?: boolean;
  /** 文本节点双击行内编辑（覆盖层在上，需在 overlay 处理） */
  onNodeDoubleClick?: (nodeId: string) => void;
  /** 非文本节点双击：例如在容器内插入文案（由宿主实现） */
  onNonTextDoubleClick?: (nodeId: string) => void;
  /** 配置了 __listData 列表绑定的节点 id（画布 ≡ 角标） */
  nodeIdsWithListBinding?: string[];
  /** W7-023：画布上不可选/拖/缩放的节点（含祖先锁定子树） */
  lockedNodeIds?: Set<string>;
  /** W7-024：拾取时跳过已有注释节点 id，便于点在标记下的图层上 */
  annotationNodeIds?: Set<string>;
  /** 注释落在空白处时的父节点（通常为 screen.rootNode.id） */
  rootNodeId?: string;
  /** 注释工具：在画布坐标系下放置一条 addAnnotation */
  onAnnotationPlace?: (args: { parentId: string; canvasX: number; canvasY: number }) => void;
  /** W7-025：与 Schema 推导布局合并，未挂载 DOM 的节点仍可命中 */
  coordinateLayoutFallback?: CoordinateMap;
  /**
   * 与 fallback 同源的设备逻辑宽高；与 layoutSyncKey 一起变，用于将 fallback 缩放到容器 CSS 像素
   */
  layoutViewportWidth?: number;
  layoutViewportHeight?: number;
  /**
   * 视口宽高等变化时传入新值，强制与 DOM 布局后再算坐标（切手机/桌面、改缩放后避免选框漂移）
   */
  layoutSyncKey?: string | number;
}

/**
 * Transparent Canvas overlay that renders editor UI (selection, hover, drag, resize)
 * on top of the SchemaRenderer DOM layer.
 *
 * Architecture:
 * - Rebuilds the coordinate map from DOM on every render frame
 * - Draws selection rectangles, hover highlights, drag previews, resize handles
 * - Handles all mouse interactions (click, move, drag, resize)
 */
export function EditorOverlay({
  containerRef,
  selectedNodeIds,
  hoveredNodeId,
  onSelect,
  onMarqueeSelect,
  onHover,
  onDrag,
  onResize,
  onDrawCreate,
  activeTool = 'select',
  zoomLevel = 1.0,
  snapToGridEnabled = true,
  gridSizePx = 8,
  showGridOverlay = false,
  onNodeDoubleClick,
  onNonTextDoubleClick,
  nodeIdsWithListBinding = [],
  lockedNodeIds,
  annotationNodeIds,
  rootNodeId,
  onAnnotationPlace,
  coordinateLayoutFallback,
  layoutViewportWidth,
  layoutViewportHeight,
  layoutSyncKey,
}: EditorOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coordMapRef = useRef<CoordinateMap>(new Map());
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const resizeModifiersRef = useRef<ResizeModifiers>({});
  const deepSelectKeyRef = useRef<string>('');
  const deepSelectIdxRef = useRef(0);
  const marqueeStateRef = useRef<MarqueeState | null>(null);
  const drawStateRef = useRef<DrawState | null>(null);
  /** 列表多实例：最近一次命中/悬停的实例键，用于缩放手柄与吸附排除自身 */
  const interactionInstanceKeyRef = useRef<string | null>(null);
  const hoverInstanceKeyRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMarquee, setIsMarquee] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  /** W2-023：Alt 按住时显示粉色间距标注 */
  const [altKeyHeld, setAltKeyHeld] = useState(false);

  useEffect(() => {
    const syncAlt = (e: KeyboardEvent) => {
      setAltKeyHeld(e.altKey);
    };
    window.addEventListener('keydown', syncAlt);
    window.addEventListener('keyup', syncAlt);
    return () => {
      window.removeEventListener('keydown', syncAlt);
      window.removeEventListener('keyup', syncAlt);
    };
  }, []);

  // ===== Coordinate map refresh =====

  const refreshCoordMap = useCallback(() => {
    const stack = containerRef.current;
    if (!stack) return;
    const coordRoot = getEditorCoordinateRoot(stack);
    const domMap = buildCoordinateMap(coordRoot);
    let merged: CoordinateMap;
    if (coordinateLayoutFallback && coordinateLayoutFallback.size > 0) {
      const vw = layoutViewportWidth ?? 375;
      const vh = layoutViewportHeight ?? 812;
      const scaled = scaleCoordinateMapToLayoutContainer(
        coordinateLayoutFallback,
        coordRoot,
        vw,
        vh,
      );
      merged = mergeCoordinateMaps(domMap, scaled);
    } else {
      merged = domMap;
    }
    coordMapRef.current =
      rootNodeId != null && rootNodeId !== ''
        ? expandRootRectToContainer(merged, coordRoot, rootNodeId)
        : merged;
  }, [
    containerRef,
    coordinateLayoutFallback,
    layoutViewportWidth,
    layoutViewportHeight,
    rootNodeId,
  ]);

  // ===== Canvas drawing =====

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const stack = containerRef.current;
    if (!canvas || !stack) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // canvas 大小 = stack 的 offsetWidth/offsetHeight（CSS 逻辑像素，不受祖先 transform 影响）。
    // canvas 在 stack 的 (0,0)；coordRoot（[data-screen-id]）始终与 stack 共享 (0,0) 与尺寸，
    // 不需要额外 offset；保持与 React inline style 一致，避免 React 与 imperative DOM 打架。
    const logicalW = stack.offsetWidth;
    const logicalH = stack.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    canvas.style.width = `${logicalW}px`;
    canvas.style.height = `${logicalH}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, logicalW, logicalH);

    // Draw pixel grid at high zoom levels
    drawGrid(ctx, logicalW, logicalH, zoomLevel);

    if (showGridOverlay) {
      drawSnapGridOverlay(ctx, logicalW, logicalH, gridSizePx);
    }

    const map = coordMapRef.current;

    // Draw hover highlight
    drawHover(ctx, map, hoveredNodeId, selectedNodeIds, hoverInstanceKeyRef.current);

    if (altKeyHeld && hoveredNodeId) {
      drawSpacingHints(ctx, map, hoveredNodeId, logicalW, logicalH, hoverInstanceKeyRef.current);
    }

    // Draw selection
    drawSelection(ctx, map, selectedNodeIds, zoomLevel);

    if (nodeIdsWithListBinding.length > 0) {
      drawListBindingBadges(ctx, map, nodeIdsWithListBinding);
    }

    // Draw resize handles for single selection
    if (selectedNodeIds.length === 1 && !isDragging) {
      const rect = getRectForInteraction(
        map,
        selectedNodeIds[0]!,
        interactionInstanceKeyRef.current,
      );
      if (rect) {
        drawResizeHandles(ctx, normalizeNodeRectForOverlay(rect), zoomLevel);
      }
    }

    // Draw drag preview
    if (isDragging && dragStateRef.current) {
      drawDragPreview(ctx, dragStateRef.current);
    }

    // Draw resize preview
    if (isResizing && resizeStateRef.current) {
      drawResizePreview(ctx, resizeStateRef.current, resizeModifiersRef.current);
    }

    // Draw marquee preview
    if (isMarquee && marqueeStateRef.current) {
      drawMarquee(ctx, marqueeStateRef.current);
    }

    // Draw draw-tool preview
    if (isDrawing && drawStateRef.current) {
      drawDrawPreview(ctx, drawStateRef.current);
    }

    // Draw alignment guides from drag or resize state
    const activeGuides: AlignmentGuide[] =
      (isDragging && dragStateRef.current?.guides) ||
      (isResizing && resizeStateRef.current?.guides) ||
      [];
    drawAlignmentGuides(ctx, activeGuides, logicalW, logicalH);
  }, [
    nodeIdsWithListBinding,
    selectedNodeIds,
    hoveredNodeId,
    isDragging,
    isResizing,
    isMarquee,
    isDrawing,
    containerRef,
    zoomLevel,
    showGridOverlay,
    gridSizePx,
    altKeyHeld,
  ]);

  // ===== Refresh and draw on every relevant change =====

  /** 双 rAF：等 flex/视口换尺寸后布局稳定再测 getBoundingClientRect */
  const scheduleRefresh = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refreshCoordMap();
        draw();
      });
    });
  }, [refreshCoordMap, draw]);

  useEffect(() => {
    scheduleRefresh();
  }, [scheduleRefresh, layoutSyncKey]);

  /** 切换选中后必须立即重绘，否则 canvas 仍保留上一帧选区（表现为框粘在 (0,0) 或与 DOM 错位） */
  const selectedKey = selectedNodeIds.join('\u0000');
  useLayoutEffect(() => {
    refreshCoordMap();
    draw();
  }, [selectedKey, refreshCoordMap, draw]);

  useEffect(() => {
    window.addEventListener('resize', scheduleRefresh);

    const container = containerRef.current;
    let mutationObserver: MutationObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const scrollRoots: HTMLElement[] = [];

    if (container) {
      mutationObserver = new MutationObserver(scheduleRefresh);
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'data-node-instance-key'],
      });
      resizeObserver = new ResizeObserver(scheduleRefresh);
      resizeObserver.observe(container);
      const coordRoot = getEditorCoordinateRoot(container);
      if (coordRoot !== container) {
        resizeObserver.observe(coordRoot);
      }

      let scrollEl: HTMLElement | null = container.closest('[data-viewport-container]') as HTMLElement | null;
      if (scrollEl) {
        scrollEl.addEventListener('scroll', scheduleRefresh, { passive: true });
        scrollRoots.push(scrollEl);
      }
    }

    return () => {
      window.removeEventListener('resize', scheduleRefresh);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      for (const el of scrollRoots) {
        el.removeEventListener('scroll', scheduleRefresh);
      }
    };
  }, [scheduleRefresh, containerRef]);

  // ===== Get canvas-local coordinates =====

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const stack = containerRef.current;
      if (!stack) return null;
      const coordRoot = getEditorCoordinateRoot(stack);
      const rect = coordRoot.getBoundingClientRect();
      const effectiveScale =
        coordRoot.offsetWidth > 0 ? rect.width / coordRoot.offsetWidth : 1;
      return {
        x: (e.clientX - rect.left) / effectiveScale,
        y: (e.clientY - rect.top) / effectiveScale,
      };
    },
    [containerRef],
  );

  // ===== Mouse handlers =====

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'hand') return;
      const coords = getCanvasCoords(e);
      if (!coords) return;

      refreshCoordMap();
      const map = coordMapRef.current;
      const skipLocked = lockedNodeIds && lockedNodeIds.size > 0 ? lockedNodeIds : undefined;

      // Annotation tool — place note (W7-024)
      if (activeTool === 'annotation' && onAnnotationPlace && rootNodeId) {
        const skipPlacement = new Set<string>();
        lockedNodeIds?.forEach((id) => skipPlacement.add(id));
        annotationNodeIds?.forEach((id) => skipPlacement.add(id));
        const skipPlacementArg = skipPlacement.size > 0 ? skipPlacement : undefined;
        const hitId = hitTestAt(map, coords.x, coords.y, skipPlacementArg)?.nodeId ?? null;
        const parentId = hitId ?? rootNodeId;
        onAnnotationPlace({ parentId, canvasX: coords.x, canvasY: coords.y });
        return;
      }

      // Draw tool — start drawing a rectangle for element creation
      if (activeTool === 'container' || activeTool === 'element' || activeTool === 'text') {
        drawStateRef.current = beginDraw(coords.x, coords.y);
        setIsDrawing(true);
        return;
      }

      // Select tool (default)
      // Check if we're clicking on a resize handle
      if (selectedNodeIds.length === 1 && !skipLocked?.has(selectedNodeIds[0])) {
        const rect = getRectForInteraction(
          map,
          selectedNodeIds[0],
          interactionInstanceKeyRef.current,
        );
        if (rect) {
          const handle = hitTestHandle(normalizeNodeRectForOverlay(rect), coords.x, coords.y, zoomLevel);
          if (handle) {
            resizeModifiersRef.current = { shiftKey: e.shiftKey, altKey: e.altKey };
            const state = beginResize(
              map,
              selectedNodeIds[0],
              handle,
              coords.x,
              coords.y,
              interactionInstanceKeyRef.current,
            );
            if (state) {
              resizeStateRef.current = state;
              setIsResizing(true);
              return;
            }
          }
        }
      }

      // Cmd/Ctrl+点击：同点叠层循环
      if (e.metaKey || e.ctrlKey) {
        const hits = hitTestAll(map, coords.x, coords.y, skipLocked);
        if (hits.length > 0) {
          const key = `${Math.round(coords.x)}:${Math.round(coords.y)}`;
          if (deepSelectKeyRef.current !== key) {
            deepSelectKeyRef.current = key;
            deepSelectIdxRef.current = 0;
          }
          const pick = hits[deepSelectIdxRef.current % hits.length] ?? null;
          deepSelectIdxRef.current += 1;
          onSelect?.(pick);
          return;
        }
      }
      deepSelectKeyRef.current = '';
      deepSelectIdxRef.current = 0;

      const hat = hitTestAt(map, coords.x, coords.y, skipLocked);
      const hitNodeId = hat?.nodeId ?? null;
      if (hitNodeId) {
        interactionInstanceKeyRef.current = hat!.instanceKey;
      } else {
        interactionInstanceKeyRef.current = null;
      }
      onSelect?.(hitNodeId);

      // Start drag if we hit a node
      if (hitNodeId) {
        let dragIds =
          selectedNodeIds.length > 1 && selectedNodeIds.includes(hitNodeId)
            ? selectedNodeIds
            : undefined;
        if (dragIds?.some((id) => lockedNodeIds?.has(id))) {
          dragIds = undefined;
        }
        const state = beginDrag(map, hitNodeId, coords.x, coords.y, dragIds, hat?.instanceKey);
        if (state) {
          dragStateRef.current = state;
        }
      } else {
        interactionInstanceKeyRef.current = null;
        // Empty canvas click — start marquee selection
        marqueeStateRef.current = beginMarquee(coords.x, coords.y);
      }
    },
    [
      getCanvasCoords,
      refreshCoordMap,
      selectedNodeIds,
      onSelect,
      activeTool,
      zoomLevel,
      lockedNodeIds,
      annotationNodeIds,
      rootNodeId,
      onAnnotationPlace,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e);
      if (!coords) return;

      // Draw tool in progress
      if (isDrawing && drawStateRef.current) {
        drawStateRef.current = updateDraw(drawStateRef.current, coords.x, coords.y);
        draw();
        return;
      }

      // Handle resize in progress（带对齐吸附与红线，见 updateResizeWithSnap）
      if (isResizing && resizeStateRef.current) {
        refreshCoordMap();
        resizeModifiersRef.current = { shiftKey: e.shiftKey, altKey: e.altKey };
        const allRects = coordMapToBoundingRects(coordMapRef.current);
        resizeStateRef.current = updateResizeWithSnap(
          resizeStateRef.current,
          coords.x,
          coords.y,
          allRects,
          5,
          resizeModifiersRef.current,
        );
        draw();
        return;
      }

      // Handle marquee in progress
      if (marqueeStateRef.current) {
        const dx = coords.x - marqueeStateRef.current.startX;
        const dy = coords.y - marqueeStateRef.current.startY;
        if (!isMarquee && Math.abs(dx) + Math.abs(dy) > 3) {
          setIsMarquee(true);
        }
        if (isMarquee || Math.abs(dx) + Math.abs(dy) > 3) {
          marqueeStateRef.current = updateMarquee(marqueeStateRef.current, coords.x, coords.y);
          draw();
          return;
        }
      }

      // Handle drag in progress
      if (dragStateRef.current) {
        const dx = coords.x - dragStateRef.current.startX;
        const dy = coords.y - dragStateRef.current.startY;

        if (!isDragging && Math.abs(dx) + Math.abs(dy) > 3) {
          setIsDragging(true);
        }

        if (isDragging) {
          refreshCoordMap();
          const allRects = coordMapToBoundingRects(coordMapRef.current);
          const gridSnap = snapToGridEnabled ? gridSizePx : null;
          dragStateRef.current = updateDragWithSnap(
            dragStateRef.current,
            coords.x,
            coords.y,
            allRects,
            gridSnap,
          );
          draw();
          return;
        }
      }

      // Normal hover
      refreshCoordMap();
      const skipLocked = lockedNodeIds && lockedNodeIds.size > 0 ? lockedNodeIds : undefined;
      const hat = hitTestAt(coordMapRef.current, coords.x, coords.y, skipLocked);
      hoverInstanceKeyRef.current = hat?.instanceKey ?? null;
      const hoveredId = hat?.nodeId ?? null;
      onHover?.(hoveredId);
      draw();
    },
    [
      getCanvasCoords,
      isDragging,
      isResizing,
      isMarquee,
      isDrawing,
      draw,
      refreshCoordMap,
      onHover,
      snapToGridEnabled,
      gridSizePx,
      lockedNodeIds,
    ],
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      // Finish draw tool
      if (isDrawing && drawStateRef.current) {
        const bounds = finalizeDraw(drawStateRef.current);
        if (bounds) {
          onDrawCreate?.(bounds);
        }
        drawStateRef.current = null;
        setIsDrawing(false);
        return;
      }

      // Finish resize
      if (isResizing && resizeStateRef.current) {
        const state = resizeStateRef.current;
        const mods = resizeModifiersRef.current;
        const frame = computeResizeFrame(
          {
            originalRect: state.originalRect,
            handle: state.handle,
            currentWidth: state.currentWidth,
            currentHeight: state.currentHeight,
          },
          mods,
        );
        onResize?.(state.nodeId, frame);
        resizeStateRef.current = null;
        setIsResizing(false);
        return;
      }

      // Finish marquee
      if (isMarquee && marqueeStateRef.current) {
        refreshCoordMap();
        const rect = getMarqueeRect(marqueeStateRef.current);
        const skipLocked = lockedNodeIds && lockedNodeIds.size > 0 ? lockedNodeIds : undefined;
        const ids = findNodesInMarquee(coordMapRef.current, rect, skipLocked);
        onMarqueeSelect?.(ids);
        marqueeStateRef.current = null;
        setIsMarquee(false);
        return;
      }
      marqueeStateRef.current = null;

      // Finish drag
      if (isDragging && dragStateRef.current) {
        const state = dragStateRef.current;
        onDrag?.(state.nodeId, state.deltaX, state.deltaY, state.dragGroupIds);
      }

      dragStateRef.current = null;
      setIsDragging(false);
    },
    [isDragging, isResizing, isMarquee, isDrawing, onDrag, onResize, onMarqueeSelect, onDrawCreate, refreshCoordMap, lockedNodeIds],
  );

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      dragStateRef.current = null;
      setIsDragging(false);
    }
    if (isResizing) {
      resizeStateRef.current = null;
      setIsResizing(false);
    }
    if (isMarquee) {
      marqueeStateRef.current = null;
      setIsMarquee(false);
    }
    if (isDrawing) {
      drawStateRef.current = null;
      setIsDrawing(false);
    }
    onHover?.(null);
  }, [isDragging, isResizing, isMarquee, isDrawing, onHover]);

  // ===== Cursor style =====

  const getCursor = useCallback((): string => {
    if (activeTool === 'hand') return 'grab';
    if (isDrawing) return 'crosshair';
    if (activeTool === 'annotation') return 'crosshair';
    if (activeTool === 'container' || activeTool === 'element' || activeTool === 'text') return 'crosshair';
    if (isResizing && resizeStateRef.current) {
      const handle = resizeStateRef.current.handle;
      const cursors: Record<string, string> = {
        'top-left': 'nwse-resize',
        top: 'ns-resize',
        'top-right': 'nesw-resize',
        right: 'ew-resize',
        'bottom-right': 'nwse-resize',
        bottom: 'ns-resize',
        'bottom-left': 'nesw-resize',
        left: 'ew-resize',
      };
      return cursors[handle] ?? 'default';
    }
    if (isDragging) return 'grabbing';
    if (isMarquee) return 'crosshair';
    return 'default';
  }, [isDragging, isResizing, isMarquee, isDrawing, activeTool]);

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== 'select') return;
      if (!onNodeDoubleClick && !onNonTextDoubleClick) return;
      e.preventDefault();
      const coords = getCanvasCoords(e);
      if (!coords) return;
      refreshCoordMap();
      const map = coordMapRef.current;
      const skipLocked = lockedNodeIds && lockedNodeIds.size > 0 ? lockedNodeIds : undefined;
      const hitId = hitTestAt(map, coords.x, coords.y, skipLocked)?.nodeId ?? null;
      if (!hitId) return;
      const container = containerRef.current;
      const el = container?.querySelector(`[data-node-id="${hitId}"]`) as HTMLElement | null;
      const t = el?.getAttribute('data-node-type');
      if (t && TEXT_EDIT_NODE_TYPES.has(t)) {
        onNodeDoubleClick?.(hitId);
      } else if (onNonTextDoubleClick) {
        onNonTextDoubleClick(hitId);
      }
    },
    [
      activeTool,
      getCanvasCoords,
      refreshCoordMap,
      containerRef,
      onNodeDoubleClick,
      onNonTextDoubleClick,
      lockedNodeIds,
    ],
  );

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        cursor: getCursor(),
        zIndex: 10,
      }}
      data-editor-overlay
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleCanvasDoubleClick}
    />
  );
}
