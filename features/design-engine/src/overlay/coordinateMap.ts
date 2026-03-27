/** Rectangle in viewport coordinates */
export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Map from node ID to its bounding rectangle */
export type CoordinateMap = Map<string, NodeRect>;

/**
 * Build a coordinate map by scanning all DOM elements with `data-node-id`.
 *
 * Iterates over all elements inside the given container that have
 * `data-node-id` attributes, calls getBoundingClientRect on each,
 * and builds a map of nodeId → { x, y, width, height } relative
 * to the container's top-left corner.
 *
 * @param container - The container element (usually the viewport div)
 * @returns A Map of nodeId to NodeRect
 */
export function buildCoordinateMap(container: HTMLElement): CoordinateMap {
  const map: CoordinateMap = new Map();
  const containerRect = container.getBoundingClientRect();

  const elements = container.querySelectorAll<HTMLElement>('[data-node-id]');
  elements.forEach((el) => {
    const nodeId = el.getAttribute('data-node-id');
    if (!nodeId) return;

    const rect = el.getBoundingClientRect();
    map.set(nodeId, {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    });
  });

  return map;
}

/**
 * Hit-test a point against the coordinate map.
 *
 * Returns the nodeId of the smallest (deepest) element that contains the point.
 * If multiple nodes overlap, the one with the smallest area wins.
 */
export function hitTest(
  map: CoordinateMap,
  x: number,
  y: number,
): string | null {
  let bestId: string | null = null;
  let bestArea = Infinity;

  for (const [nodeId, rect] of map) {
    if (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    ) {
      const area = rect.width * rect.height;
      if (area < bestArea) {
        bestArea = area;
        bestId = nodeId;
      }
    }
  }

  return bestId;
}
