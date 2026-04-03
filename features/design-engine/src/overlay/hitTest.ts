import type { BoundingRect, BoundingBoxCache } from './BoundingBoxCache';
import type { Point } from './coordinateMap';

export interface HitTestResult {
  nodeId: string;
  depth: number;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Find the topmost (deepest / smallest-area) node at a given canvas point.
 *
 * Iterates all cached rects, checks point-in-rect, skips locked and hidden
 * nodes, and returns the match with the smallest area (assumed to be the
 * deepest in the visual tree).
 */
export function hitTest(
  point: Point,
  cache: BoundingBoxCache,
  zoom: number,
  lockedIds?: Set<string>,
  hiddenIds?: Set<string>,
): HitTestResult | null {
  const allRects = cache.getAll();

  let bestResult: HitTestResult | null = null;
  let bestArea = Infinity;
  let depthCounter = 0;

  for (const rect of allRects) {
    depthCounter++;

    // Skip locked or hidden nodes
    if (lockedIds?.has(rect.nodeId)) continue;
    if (hiddenIds?.has(rect.nodeId)) continue;

    // Point-in-rect check (rects are already in canvas coordinates)
    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    ) {
      const area = rect.width * rect.height;
      if (area < bestArea) {
        bestArea = area;
        bestResult = { nodeId: rect.nodeId, depth: depthCounter };
      }
    }
  }

  return bestResult;
}

/**
 * Check whether a point falls on one of the 8 resize handles around a
 * selected node's bounding rect. Returns the handle identifier or null.
 *
 * Handle positions:
 *   nw --- n --- ne
 *   |             |
 *   w             e
 *   |             |
 *   sw --- s --- se
 */
export function hitTestResizeHandle(
  point: Point,
  selectedRect: BoundingRect,
  zoom: number,
  handleSize: number = 8,
): ResizeHandle | null {
  const { x, y, width, height } = selectedRect;
  const mx = x + width / 2;
  const my = y + height / 2;

  const handles: { id: ResizeHandle; hx: number; hy: number }[] = [
    { id: 'nw', hx: x, hy: y },
    { id: 'n', hx: mx, hy: y },
    { id: 'ne', hx: x + width, hy: y },
    { id: 'e', hx: x + width, hy: my },
    { id: 'se', hx: x + width, hy: y + height },
    { id: 's', hx: mx, hy: y + height },
    { id: 'sw', hx: x, hy: y + height },
    { id: 'w', hx: x, hy: my },
  ];

  // Tolerance scales inversely with zoom so handles stay easy to grab
  const tolerance = (handleSize / 2 + 2) / zoom;

  for (const handle of handles) {
    if (
      Math.abs(point.x - handle.hx) <= tolerance &&
      Math.abs(point.y - handle.hy) <= tolerance
    ) {
      return handle.id;
    }
  }

  return null;
}
