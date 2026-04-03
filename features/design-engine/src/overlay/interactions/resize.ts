import type { CoordinateMap, NodeRect } from '../coordinateMap';
import type { AlignmentGuide } from '../alignment';
import { computeAlignmentGuides } from '../alignment';
import type { BoundingRect } from '../BoundingBoxCache';

/** Which resize handle is being dragged */
export type ResizeHandlePosition =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export interface ResizeHandle {
  position: ResizeHandlePosition;
  x: number;
  y: number;
  cursor: string;
}

export interface ResizeModifiers {
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface ResizeState {
  nodeId: string;
  handle: ResizeHandlePosition;
  startX: number;
  startY: number;
  originalRect: NodeRect;
  currentWidth: number;
  currentHeight: number;
  /** Active alignment guides (populated when snapping is enabled) */
  guides: AlignmentGuide[];
}

const HANDLE_SIZE = 8;

/** 与 01-canvas §13 边界表一致：最小尺寸 1×1px */
const MIN_SIZE_PX = 1;

/**
 * 手柄在 **画布容器坐标系** 中的边长。外层 DOM 整体被 `scale(zoom)` 变换后，
 * 使用 `8/zoom` 可使屏幕上约保持 8px，避免极小缩放时手柄不可点。
 */
export function resizeHandleCanvasPx(zoomLevel: number): number {
  const z = Math.max(0.1, Math.min(4, zoomLevel));
  return Math.max(4, Math.min(18, HANDLE_SIZE / z));
}

/**
 * Get the 8 resize handles for a node's bounding rect.
 */
export function getResizeHandles(rect: NodeRect): ResizeHandle[] {
  const { x, y, width, height } = rect;
  const mx = x + width / 2;
  const my = y + height / 2;

  return [
    { position: 'top-left', x, y, cursor: 'nwse-resize' },
    { position: 'top', x: mx, y, cursor: 'ns-resize' },
    { position: 'top-right', x: x + width, y, cursor: 'nesw-resize' },
    { position: 'right', x: x + width, y: my, cursor: 'ew-resize' },
    { position: 'bottom-right', x: x + width, y: y + height, cursor: 'nwse-resize' },
    { position: 'bottom', x: mx, y: y + height, cursor: 'ns-resize' },
    { position: 'bottom-left', x, y: y + height, cursor: 'nesw-resize' },
    { position: 'left', x, y: my, cursor: 'ew-resize' },
  ];
}

/**
 * Check if a point hits a resize handle.
 * Returns the handle position if hit, or null.
 */
export function hitTestHandle(
  rect: NodeRect,
  canvasX: number,
  canvasY: number,
  zoomLevel: number = 1,
): ResizeHandlePosition | null {
  const handles = getResizeHandles(rect);
  const half = resizeHandleCanvasPx(zoomLevel) / 2 + 2;

  for (const handle of handles) {
    if (
      canvasX >= handle.x - half &&
      canvasX <= handle.x + half &&
      canvasY >= handle.y - half &&
      canvasY <= handle.y + half
    ) {
      return handle.position;
    }
  }
  return null;
}

/**
 * Begin a resize operation.
 */
export function beginResize(
  map: CoordinateMap,
  nodeId: string,
  handle: ResizeHandlePosition,
  startX: number,
  startY: number,
): ResizeState | null {
  const rect = map.get(nodeId);
  if (!rect) return null;

  return {
    nodeId,
    handle,
    startX,
    startY,
    originalRect: { ...rect },
    currentWidth: rect.width,
    currentHeight: rect.height,
    guides: [],
  };
}

/**
 * 缩放后的节点在画布容器坐标系中的外接矩形（用于预览与写回 left/top/width/height）。
 */
export function computeResizeFrame(
  state: Pick<ResizeState, 'originalRect' | 'handle' | 'currentWidth' | 'currentHeight'>,
  modifiers?: ResizeModifiers,
): { x: number; y: number; width: number; height: number } {
  const { originalRect, handle, currentWidth, currentHeight } = state;
  const w = currentWidth;
  const h = currentHeight;
  if (modifiers?.altKey) {
    const cx = originalRect.x + originalRect.width / 2;
    const cy = originalRect.y + originalRect.height / 2;
    return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
  }
  let newX = originalRect.x;
  let newY = originalRect.y;
  if (handle.includes('left')) {
    newX = originalRect.x + originalRect.width - w;
  }
  if (handle.includes('top')) {
    newY = originalRect.y + originalRect.height - h;
  }
  return { x: newX, y: newY, width: w, height: h };
}

/**
 * Update a resize operation with new mouse position.
 */
export function updateResize(
  state: ResizeState,
  currentX: number,
  currentY: number,
  modifiers?: ResizeModifiers,
): ResizeState {
  const dx = currentX - state.startX;
  const dy = currentY - state.startY;
  const { originalRect } = state;
  let newWidth = originalRect.width;
  let newHeight = originalRect.height;

  const handle = state.handle;

  const isCorner =
    handle === 'top-left' ||
    handle === 'top-right' ||
    handle === 'bottom-left' ||
    handle === 'bottom-right';

  if (modifiers?.shiftKey && isCorner) {
    const ratio = originalRect.width / Math.max(MIN_SIZE_PX, originalRect.height);
    let nw = originalRect.width;
    if (handle.includes('right')) {
      nw = Math.max(MIN_SIZE_PX, originalRect.width + dx);
    } else if (handle.includes('left')) {
      nw = Math.max(MIN_SIZE_PX, originalRect.width - dx);
    }
    newWidth = nw;
    newHeight = Math.max(MIN_SIZE_PX, nw / ratio);
  } else {
    if (handle.includes('right')) {
      newWidth = Math.max(MIN_SIZE_PX, originalRect.width + dx);
    } else if (handle.includes('left')) {
      newWidth = Math.max(MIN_SIZE_PX, originalRect.width - dx);
    }
    if (handle.includes('bottom')) {
      newHeight = Math.max(MIN_SIZE_PX, originalRect.height + dy);
    } else if (handle.includes('top')) {
      newHeight = Math.max(MIN_SIZE_PX, originalRect.height - dy);
    }
  }

  return {
    ...state,
    currentWidth: newWidth,
    currentHeight: newHeight,
    guides: [],
  };
}

/**
 * Update a resize operation with alignment snapping.
 *
 * Computes the resulting bounding rect after resize, checks for
 * alignment guides against other rects, and snaps edges if within threshold.
 */
export function updateResizeWithSnap(
  state: ResizeState,
  currentX: number,
  currentY: number,
  allRects: BoundingRect[],
  threshold: number = 5,
  modifiers?: ResizeModifiers,
): ResizeState {
  const base = updateResize(state, currentX, currentY, modifiers);

  const { originalRect, handle } = state;

  const frame = computeResizeFrame(
    {
      originalRect,
      handle,
      currentWidth: base.currentWidth,
      currentHeight: base.currentHeight,
    },
    modifiers,
  );
  let newX = frame.x;
  let newY = frame.y;

  const virtualRect: BoundingRect = {
    nodeId: state.nodeId,
    x: newX,
    y: newY,
    width: base.currentWidth,
    height: base.currentHeight,
  };

  const guides = computeAlignmentGuides(virtualRect, allRects, threshold);

  // Apply snapping to width/height based on guides
  let snappedWidth = base.currentWidth;
  let snappedHeight = base.currentHeight;

  for (const guide of guides) {
    if (guide.axis === 'vertical') {
      const rEdge = guide.position;
      // Snap the right edge if dragging right handles
      if (handle.includes('right')) {
        const rightEdge = newX + snappedWidth;
        if (Math.abs(rightEdge - rEdge) <= threshold) {
          snappedWidth = Math.max(MIN_SIZE_PX, rEdge - newX);
        }
      }
      // Snap the left edge if dragging left handles
      if (handle.includes('left')) {
        const leftEdge = newX;
        if (Math.abs(leftEdge - rEdge) <= threshold) {
          snappedWidth = Math.max(MIN_SIZE_PX, originalRect.x + originalRect.width - rEdge);
        }
      }
    } else {
      const rEdge = guide.position;
      if (handle.includes('bottom')) {
        const bottomEdge = newY + snappedHeight;
        if (Math.abs(bottomEdge - rEdge) <= threshold) {
          snappedHeight = Math.max(MIN_SIZE_PX, rEdge - newY);
        }
      }
      if (handle.includes('top')) {
        const topEdge = newY;
        if (Math.abs(topEdge - rEdge) <= threshold) {
          snappedHeight = Math.max(MIN_SIZE_PX, originalRect.y + originalRect.height - rEdge);
        }
      }
    }
  }

  return {
    ...state,
    currentWidth: snappedWidth,
    currentHeight: snappedHeight,
    guides,
  };
}

/**
 * Draw resize handles for a selected node.
 */
export function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  rect: NodeRect,
  zoomLevel: number = 1,
): void {
  const handles = getResizeHandles(rect);
  const size = resizeHandleCanvasPx(zoomLevel);
  const half = size / 2;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1.5;

  for (const handle of handles) {
    ctx.fillRect(handle.x - half, handle.y - half, size, size);
    ctx.strokeRect(handle.x - half, handle.y - half, size, size);
  }

  ctx.restore();
}

/**
 * Draw a resize preview (the new size outline).
 */
export function drawResizePreview(
  ctx: CanvasRenderingContext2D,
  state: ResizeState,
  modifiers?: ResizeModifiers,
): void {
  const { originalRect, currentWidth, currentHeight } = state;

  const { x: newX, y: newY, width: rw, height: rh } = computeResizeFrame(
    {
      originalRect,
      handle: state.handle,
      currentWidth,
      currentHeight,
    },
    modifiers,
  );

  ctx.save();

  // Translucent fill
  ctx.fillStyle = 'rgba(22, 119, 255, 0.06)';
  ctx.fillRect(newX, newY, rw, rh);

  // Border
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(newX, newY, rw, rh);

  // Size label
  ctx.setLineDash([]);
  ctx.fillStyle = '#1677ff';
  ctx.font = '11px monospace';
  ctx.fillText(
    `${Math.round(rw)} × ${Math.round(rh)}`,
    newX + rw / 2 - 30,
    newY + rh + 16,
  );

  ctx.restore();
}
