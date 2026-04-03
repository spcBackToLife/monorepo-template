import type { CoordinateMap } from '../coordinateMap';
import { hitTest } from '../coordinateMap';

/**
 * Handle hover by hit-testing the current mouse position.
 * Returns the nodeId under the cursor, or null.
 */
export function getHoveredNode(
  map: CoordinateMap,
  canvasX: number,
  canvasY: number,
  skipIds?: Set<string>,
): string | null {
  return hitTest(map, canvasX, canvasY, skipIds);
}

/**
 * Draw a hover highlight (blue border) around the hovered node.
 */
export function drawHover(
  ctx: CanvasRenderingContext2D,
  map: CoordinateMap,
  hoveredNodeId: string | null,
  selectedNodeIds: string[],
): void {
  if (!hoveredNodeId) return;

  // Don't draw hover on already-selected nodes
  if (selectedNodeIds.includes(hoveredNodeId)) return;

  const rect = map.get(hoveredNodeId);
  if (!rect) return;

  ctx.save();
  ctx.strokeStyle = '#69b1ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}
