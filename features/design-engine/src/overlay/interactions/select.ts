import type { CoordinateMap, NodeRect } from '../coordinateMap';
import { hitTest } from '../coordinateMap';

/** 与 drawResizeHandles 共用：极小的 DOM 选区仍显示可操作的框 */
export function normalizeNodeRectForOverlay(rect: NodeRect): NodeRect {
  const w = Math.max(rect.width, 2);
  const h = Math.max(rect.height, 2);
  const ox = rect.width < 2 ? rect.x - (w - rect.width) / 2 : rect.x;
  const oy = rect.height < 2 ? rect.y - (h - rect.height) / 2 : rect.y;
  return { x: ox, y: oy, width: w, height: h };
}

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
  zoomLevel: number = 1,
): void {
  ctx.save();
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 2;

  const z = Math.max(0.1, Math.min(4, zoomLevel));
  const cornerSize = Math.max(4, Math.min(12, 6 / z));

  for (const nodeId of selectedNodeIds) {
    const rect = map.get(nodeId);
    if (!rect) continue;

    const { x: ox, y: oy, width: w, height: h } = normalizeNodeRectForOverlay(rect);

    ctx.strokeRect(ox, oy, w, h);

    // Draw small filled squares at corners (selection handles indicator)
    const handleSize = cornerSize;
    ctx.fillStyle = '#1677ff';
    const corners = [
      [ox, oy],
      [ox + w, oy],
      [ox, oy + h],
      [ox + w, oy + h],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    }
  }

  ctx.restore();
}
