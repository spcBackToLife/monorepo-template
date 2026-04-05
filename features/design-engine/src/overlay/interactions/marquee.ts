import type { CoordinateMap } from '../coordinateMap';

export interface MarqueeState {
  /** Starting X position in canvas coordinates */
  startX: number;
  /** Starting Y position in canvas coordinates */
  startY: number;
  /** Current X position in canvas coordinates */
  currentX: number;
  /** Current Y position in canvas coordinates */
  currentY: number;
}

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Begin a marquee (lasso) selection.
 */
export function beginMarquee(startX: number, startY: number): MarqueeState {
  return { startX, startY, currentX: startX, currentY: startY };
}

/**
 * Update the marquee selection as the mouse moves.
 */
export function updateMarquee(
  state: MarqueeState,
  currentX: number,
  currentY: number,
): MarqueeState {
  return { ...state, currentX, currentY };
}

/**
 * Compute the normalized rectangle from the marquee state.
 * Handles negative-direction drags (right-to-left, bottom-to-top).
 */
export function getMarqueeRect(state: MarqueeState): MarqueeRect {
  const x = Math.min(state.startX, state.currentX);
  const y = Math.min(state.startY, state.currentY);
  const width = Math.abs(state.currentX - state.startX);
  const height = Math.abs(state.currentY - state.startY);
  return { x, y, width, height };
}

/**
 * Find all node IDs whose bounding rectangles are fully contained
 * within the marquee selection rectangle.
 */
export function findNodesInMarquee(
  map: CoordinateMap,
  marquee: MarqueeRect,
  skipIds?: Set<string>,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const mRight = marquee.x + marquee.width;
  const mBottom = marquee.y + marquee.height;

  for (const [, entry] of map.entries()) {
    if (skipIds?.has(entry.nodeId)) continue;
    const rect = entry.rect;
    const nodeRight = rect.x + rect.width;
    const nodeBottom = rect.y + rect.height;

    // Check if the node rect is fully contained within the marquee
    if (
      rect.x >= marquee.x &&
      rect.y >= marquee.y &&
      nodeRight <= mRight &&
      nodeBottom <= mBottom
    ) {
      if (!seen.has(entry.nodeId)) {
        seen.add(entry.nodeId);
        result.push(entry.nodeId);
      }
    }
  }

  return result;
}

/**
 * Find all node IDs whose bounding rectangles intersect (overlap)
 * with the marquee selection rectangle.
 */
export function findNodesIntersectingMarquee(
  map: CoordinateMap,
  marquee: MarqueeRect,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const mRight = marquee.x + marquee.width;
  const mBottom = marquee.y + marquee.height;

  for (const [, entry] of map.entries()) {
    const rect = entry.rect;
    const nodeRight = rect.x + rect.width;
    const nodeBottom = rect.y + rect.height;

    // Check for intersection (not disjoint)
    const disjoint =
      nodeRight < marquee.x ||
      rect.x > mRight ||
      nodeBottom < marquee.y ||
      rect.y > mBottom;

    if (!disjoint && !seen.has(entry.nodeId)) {
      seen.add(entry.nodeId);
      result.push(entry.nodeId);
    }
  }

  return result;
}

/**
 * Draw the marquee selection rectangle on the canvas overlay.
 */
export function drawMarquee(
  ctx: CanvasRenderingContext2D,
  state: MarqueeState,
): void {
  const rect = getMarqueeRect(state);

  ctx.save();

  // Fill with semi-transparent blue
  ctx.fillStyle = 'rgba(22, 119, 255, 0.1)';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  // Stroke with solid blue
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  ctx.restore();
}
