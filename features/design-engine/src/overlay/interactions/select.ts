import type { CoordinateMap } from '../coordinateMap';
import { hitTest } from '../coordinateMap';

export interface SelectHandler {
  /**
   * Handle a click event on the canvas overlay.
   * Returns the nodeId that was hit, or null.
   */
  handleClick(
    map: CoordinateMap,
    canvasX: number,
    canvasY: number,
  ): string | null;
}

/**
 * Create a select interaction handler.
 *
 * On click, performs hit-testing against the coordinate map
 * and returns the deepest node at the click position.
 */
export function createSelectHandler(): SelectHandler {
  return {
    handleClick(map, canvasX, canvasY) {
      return hitTest(map, canvasX, canvasY);
    },
  };
}

/**
 * Draw selection rectangles for the selected nodes.
 */
export function drawSelection(
  ctx: CanvasRenderingContext2D,
  map: CoordinateMap,
  selectedNodeIds: string[],
): void {
  ctx.save();
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 2;

  for (const nodeId of selectedNodeIds) {
    const rect = map.get(nodeId);
    if (!rect) continue;

    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    // Draw small filled squares at corners (selection handles indicator)
    const handleSize = 6;
    ctx.fillStyle = '#1677ff';
    const corners = [
      [rect.x, rect.y],
      [rect.x + rect.width, rect.y],
      [rect.x, rect.y + rect.height],
      [rect.x + rect.width, rect.y + rect.height],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    }
  }

  ctx.restore();
}
