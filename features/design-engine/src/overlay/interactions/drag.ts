import type { CoordinateMap, NodeRect } from '../coordinateMap';
import type { AlignmentGuide } from '../alignment';
import type { BoundingRect } from '../BoundingBoxCache';
import { computeSnap } from '../snapping';

export interface DragState {
  /** Node being dragged */
  nodeId: string;
  /** 多选时一并移动的节点 id（均含于 coordinate map） */
  dragGroupIds?: string[];
  /** 各节点拖拽前矩形（多选时用） */
  originalRects?: Record<string, NodeRect>;
  /** Starting mouse X in canvas coords */
  startX: number;
  /** Starting mouse Y in canvas coords */
  startY: number;
  /** Original rect of the primary node */
  originalRect: NodeRect;
  /** Current delta X */
  deltaX: number;
  /** Current delta Y */
  deltaY: number;
  /** Active alignment guides (populated when snapping is enabled) */
  guides: AlignmentGuide[];
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
  dragGroupIds?: string[],
): DragState | null {
  const rect = map.get(nodeId);
  if (!rect) return null;

  const ids =
    dragGroupIds && dragGroupIds.length > 0
      ? [...new Set(dragGroupIds)].filter((id) => map.has(id))
      : [nodeId];
  const originals: Record<string, NodeRect> = {};
  for (const id of ids) {
    const r = map.get(id);
    if (r) originals[id] = { ...r };
  }

  return {
    nodeId,
    dragGroupIds: ids.length > 1 ? ids : undefined,
    originalRects: ids.length > 1 ? originals : undefined,
    startX,
    startY,
    originalRect: { ...rect },
    deltaX: 0,
    deltaY: 0,
    guides: [],
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
    guides: [],
  };
}

/**
 * Update a drag operation with alignment snapping.
 *
 * Computes the proposed new position, runs it through the snap engine,
 * and returns the snapped deltas together with any active alignment guides.
 */
export function updateDragWithSnap(
  state: DragState,
  currentX: number,
  currentY: number,
  allRects: BoundingRect[],
  gridSize: number | null = null,
  threshold: number = 5,
): DragState {
  const rawDx = currentX - state.startX;
  const rawDy = currentY - state.startY;

  const movingRect: BoundingRect = {
    nodeId: state.nodeId,
    x: state.originalRect.x,
    y: state.originalRect.y,
    width: state.originalRect.width,
    height: state.originalRect.height,
  };

  const proposedPosition = {
    x: state.originalRect.x + rawDx,
    y: state.originalRect.y + rawDy,
  };

  const snap = computeSnap(proposedPosition, movingRect, allRects, gridSize, threshold);

  return {
    ...state,
    deltaX: snap.snappedX - state.originalRect.x,
    deltaY: snap.snappedY - state.originalRect.y,
    guides: snap.guides,
  };
}

/**
 * Draw a drag preview (translucent rectangle at the new position).
 */
export function drawDragPreview(
  ctx: CanvasRenderingContext2D,
  state: DragState,
): void {
  const { originalRect, deltaX, deltaY, dragGroupIds, originalRects } = state;

  const rects =
    dragGroupIds && dragGroupIds.length > 1 && originalRects
      ? dragGroupIds.map((id) => originalRects[id]).filter(Boolean)
      : [originalRect];

  ctx.save();
  for (const r of rects) {
    ctx.strokeStyle = '#d9d9d9';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(r.x, r.y, r.width, r.height);

    ctx.fillStyle = 'rgba(22, 119, 255, 0.08)';
    ctx.strokeStyle = '#1677ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    const newX = r.x + deltaX;
    const newY = r.y + deltaY;
    ctx.fillRect(newX, newY, r.width, r.height);
    ctx.strokeRect(newX, newY, r.width, r.height);
  }
  ctx.restore();
}
