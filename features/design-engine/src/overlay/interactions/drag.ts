import type { CoordinateMap, NodeRect } from '../coordinateMap';

export interface DragState {
  /** Node being dragged */
  nodeId: string;
  /** Starting mouse X in canvas coords */
  startX: number;
  /** Starting mouse Y in canvas coords */
  startY: number;
  /** Original rect of the node */
  originalRect: NodeRect;
  /** Current delta X */
  deltaX: number;
  /** Current delta Y */
  deltaY: number;
}

/**
 * Begin a drag operation.
 * Returns a DragState or null if the node is not in the coordinate map.
 */
export function beginDrag(
  map: CoordinateMap,
  nodeId: string,
  startX: number,
  startY: number,
): DragState | null {
  const rect = map.get(nodeId);
  if (!rect) return null;

  return {
    nodeId,
    startX,
    startY,
    originalRect: { ...rect },
    deltaX: 0,
    deltaY: 0,
  };
}

/**
 * Update a drag operation with new mouse position.
 * Returns an updated DragState.
 */
export function updateDrag(
  state: DragState,
  currentX: number,
  currentY: number,
): DragState {
  return {
    ...state,
    deltaX: currentX - state.startX,
    deltaY: currentY - state.startY,
  };
}

/**
 * Draw a drag preview (translucent rectangle at the new position).
 */
export function drawDragPreview(
  ctx: CanvasRenderingContext2D,
  state: DragState,
): void {
  const { originalRect, deltaX, deltaY } = state;

  ctx.save();

  // Draw ghost of original position
  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(originalRect.x, originalRect.y, originalRect.width, originalRect.height);

  // Draw preview at new position
  ctx.fillStyle = 'rgba(22, 119, 255, 0.08)';
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  const newX = originalRect.x + deltaX;
  const newY = originalRect.y + deltaY;
  ctx.fillRect(newX, newY, originalRect.width, originalRect.height);
  ctx.strokeRect(newX, newY, originalRect.width, originalRect.height);

  ctx.restore();
}
