import type { CoordinateMap, NodeRect } from '../coordinateMap';

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

export interface ResizeState {
  nodeId: string;
  handle: ResizeHandlePosition;
  startX: number;
  startY: number;
  originalRect: NodeRect;
  currentWidth: number;
  currentHeight: number;
}

const HANDLE_SIZE = 8;

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
): ResizeHandlePosition | null {
  const handles = getResizeHandles(rect);
  const half = HANDLE_SIZE / 2 + 2; // slight padding for easier click

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
  };
}

/**
 * Update a resize operation with new mouse position.
 */
export function updateResize(
  state: ResizeState,
  currentX: number,
  currentY: number,
): ResizeState {
  const dx = currentX - state.startX;
  const dy = currentY - state.startY;
  const { originalRect } = state;
  let newWidth = originalRect.width;
  let newHeight = originalRect.height;

  const handle = state.handle;

  // Horizontal
  if (handle.includes('right')) {
    newWidth = Math.max(20, originalRect.width + dx);
  } else if (handle.includes('left')) {
    newWidth = Math.max(20, originalRect.width - dx);
  }

  // Vertical
  if (handle.includes('bottom')) {
    newHeight = Math.max(20, originalRect.height + dy);
  } else if (handle.includes('top')) {
    newHeight = Math.max(20, originalRect.height - dy);
  }

  return {
    ...state,
    currentWidth: newWidth,
    currentHeight: newHeight,
  };
}

/**
 * Draw resize handles for a selected node.
 */
export function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  rect: NodeRect,
): void {
  const handles = getResizeHandles(rect);
  const half = HANDLE_SIZE / 2;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1.5;

  for (const handle of handles) {
    ctx.fillRect(handle.x - half, handle.y - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(handle.x - half, handle.y - half, HANDLE_SIZE, HANDLE_SIZE);
  }

  ctx.restore();
}

/**
 * Draw a resize preview (the new size outline).
 */
export function drawResizePreview(
  ctx: CanvasRenderingContext2D,
  state: ResizeState,
): void {
  const { originalRect, handle, currentWidth, currentHeight } = state;

  let newX = originalRect.x;
  let newY = originalRect.y;

  // Adjust origin based on which handle is being dragged
  if (handle.includes('left')) {
    newX = originalRect.x + originalRect.width - currentWidth;
  }
  if (handle.includes('top')) {
    newY = originalRect.y + originalRect.height - currentHeight;
  }

  ctx.save();

  // Translucent fill
  ctx.fillStyle = 'rgba(22, 119, 255, 0.06)';
  ctx.fillRect(newX, newY, currentWidth, currentHeight);

  // Border
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(newX, newY, currentWidth, currentHeight);

  // Size label
  ctx.setLineDash([]);
  ctx.fillStyle = '#1677ff';
  ctx.font = '11px monospace';
  ctx.fillText(
    `${Math.round(currentWidth)} × ${Math.round(currentHeight)}`,
    newX + currentWidth / 2 - 30,
    newY + currentHeight + 16,
  );

  ctx.restore();
}
