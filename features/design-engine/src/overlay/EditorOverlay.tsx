import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  buildCoordinateMap,
  type CoordinateMap,
} from './coordinateMap';
import { createSelectHandler, drawSelection } from './interactions/select';
import { getHoveredNode, drawHover } from './interactions/hover';
import {
  beginDrag,
  updateDrag,
  drawDragPreview,
  type DragState,
} from './interactions/drag';
import {
  hitTestHandle,
  beginResize,
  updateResize,
  drawResizeHandles,
  drawResizePreview,
  type ResizeState,
} from './interactions/resize';

export interface EditorOverlayProps {
  /** Reference to the viewport container DOM element (source for coordinate map) */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Currently selected node IDs */
  selectedNodeIds: string[];
  /** Currently hovered node ID */
  hoveredNodeId: string | null;
  /** Called when a node is selected */
  onSelect?: (nodeId: string | null) => void;
  /** Called when hovering over a node */
  onHover?: (nodeId: string | null) => void;
  /** Called when a node is dragged */
  onDrag?: (nodeId: string, deltaX: number, deltaY: number) => void;
  /** Called when a node is resized */
  onResize?: (nodeId: string, newWidth: number, newHeight: number) => void;
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
  onHover,
  onDrag,
  onResize,
}: EditorOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coordMapRef = useRef<CoordinateMap>(new Map());
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const selectHandler = useRef(createSelectHandler());

  // ===== Coordinate map refresh =====

  const refreshCoordMap = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    coordMapRef.current = buildCoordinateMap(container);
  }, [containerRef]);

  // ===== Canvas drawing =====

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container
    const containerRect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerRect.width * dpr;
    canvas.height = containerRect.height * dpr;
    canvas.style.width = `${containerRect.width}px`;
    canvas.style.height = `${containerRect.height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, containerRect.width, containerRect.height);

    const map = coordMapRef.current;

    // Draw hover highlight
    drawHover(ctx, map, hoveredNodeId, selectedNodeIds);

    // Draw selection
    drawSelection(ctx, map, selectedNodeIds);

    // Draw resize handles for single selection
    if (selectedNodeIds.length === 1 && !isDragging) {
      const rect = map.get(selectedNodeIds[0]);
      if (rect) {
        drawResizeHandles(ctx, rect);
      }
    }

    // Draw drag preview
    if (isDragging && dragStateRef.current) {
      drawDragPreview(ctx, dragStateRef.current);
    }

    // Draw resize preview
    if (isResizing && resizeStateRef.current) {
      drawResizePreview(ctx, resizeStateRef.current);
    }
  }, [selectedNodeIds, hoveredNodeId, isDragging, isResizing, containerRef]);

  // ===== Refresh and draw on every relevant change =====

  useEffect(() => {
    refreshCoordMap();
    draw();
  }, [refreshCoordMap, draw]);

  // Also refresh on window resize and periodically for DOM changes
  useEffect(() => {
    const refresh = () => {
      refreshCoordMap();
      draw();
    };

    window.addEventListener('resize', refresh);

    // Use a MutationObserver to detect DOM changes in the container
    const container = containerRef.current;
    let observer: MutationObserver | undefined;
    if (container) {
      observer = new MutationObserver(refresh);
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    return () => {
      window.removeEventListener('resize', refresh);
      observer?.disconnect();
    };
  }, [refreshCoordMap, draw, containerRef]);

  // ===== Get canvas-local coordinates =====

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  // ===== Mouse handlers =====

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e);
      if (!coords) return;

      refreshCoordMap();
      const map = coordMapRef.current;

      // Check if we're clicking on a resize handle
      if (selectedNodeIds.length === 1) {
        const rect = map.get(selectedNodeIds[0]);
        if (rect) {
          const handle = hitTestHandle(rect, coords.x, coords.y);
          if (handle) {
            const state = beginResize(map, selectedNodeIds[0], handle, coords.x, coords.y);
            if (state) {
              resizeStateRef.current = state;
              setIsResizing(true);
              return;
            }
          }
        }
      }

      // Check for select
      const hitNodeId = selectHandler.current.handleClick(map, coords.x, coords.y);
      onSelect?.(hitNodeId);

      // Start drag if we hit a node
      if (hitNodeId) {
        const state = beginDrag(map, hitNodeId, coords.x, coords.y);
        if (state) {
          dragStateRef.current = state;
          // Don't set isDragging yet — wait for some movement
        }
      }
    },
    [getCanvasCoords, refreshCoordMap, selectedNodeIds, onSelect],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e);
      if (!coords) return;

      // Handle resize in progress
      if (isResizing && resizeStateRef.current) {
        resizeStateRef.current = updateResize(resizeStateRef.current, coords.x, coords.y);
        draw();
        return;
      }

      // Handle drag in progress
      if (dragStateRef.current) {
        const dx = coords.x - dragStateRef.current.startX;
        const dy = coords.y - dragStateRef.current.startY;

        // Threshold before starting drag (3px)
        if (!isDragging && Math.abs(dx) + Math.abs(dy) > 3) {
          setIsDragging(true);
        }

        if (isDragging) {
          dragStateRef.current = updateDrag(dragStateRef.current, coords.x, coords.y);
          draw();
          return;
        }
      }

      // Normal hover
      refreshCoordMap();
      const hoveredId = getHoveredNode(coordMapRef.current, coords.x, coords.y);
      onHover?.(hoveredId);
    },
    [getCanvasCoords, isDragging, isResizing, draw, refreshCoordMap, onHover],
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      // Finish resize
      if (isResizing && resizeStateRef.current) {
        const state = resizeStateRef.current;
        onResize?.(state.nodeId, state.currentWidth, state.currentHeight);
        resizeStateRef.current = null;
        setIsResizing(false);
        return;
      }

      // Finish drag
      if (isDragging && dragStateRef.current) {
        const state = dragStateRef.current;
        onDrag?.(state.nodeId, state.deltaX, state.deltaY);
      }

      dragStateRef.current = null;
      setIsDragging(false);
    },
    [isDragging, isResizing, onDrag, onResize],
  );

  const handleMouseLeave = useCallback(() => {
    // Cancel operations on mouse leave
    if (isDragging) {
      dragStateRef.current = null;
      setIsDragging(false);
    }
    if (isResizing) {
      resizeStateRef.current = null;
      setIsResizing(false);
    }
    onHover?.(null);
  }, [isDragging, isResizing, onHover]);

  // ===== Cursor style =====

  const getCursor = useCallback((): string => {
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
    return 'default';
  }, [isDragging, isResizing]);

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
    />
  );
}
