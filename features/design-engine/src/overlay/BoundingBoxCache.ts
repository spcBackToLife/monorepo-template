export interface BoundingRect {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Caches bounding rectangles for all tracked nodes.
 * Can be built from the DOM by scanning `data-node-id` attributes,
 * or updated individually.
 */
export class BoundingBoxCache {
  private cache = new Map<string, BoundingRect>();

  /** Update (or insert) a single node's bounding rect. */
  update(nodeId: string, rect: DOMRect): void {
    this.cache.set(nodeId, {
      nodeId,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }

  /** Get a single node's cached rect, or null if not present. */
  get(nodeId: string): BoundingRect | null {
    return this.cache.get(nodeId) ?? null;
  }

  /** Return all cached rects as an array. */
  getAll(): BoundingRect[] {
    return Array.from(this.cache.values());
  }

  /**
   * Invalidate cached entries.
   * If `nodeIds` is provided, only those entries are removed.
   * If omitted, the entire cache is cleared.
   */
  invalidate(nodeIds?: string[]): void {
    if (nodeIds) {
      for (const id of nodeIds) {
        this.cache.delete(id);
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Build the cache from a container element by reading `data-node-id`
   * attributes on all descendant elements. Positions are stored relative
   * to the container's top-left corner.
   */
  buildFromContainer(container: HTMLElement): void {
    this.cache.clear();
    const containerRect = container.getBoundingClientRect();

    const elements = container.querySelectorAll<HTMLElement>('[data-node-id]');
    elements.forEach((el) => {
      const nodeId = el.getAttribute('data-node-id');
      if (!nodeId) return;

      const rect = el.getBoundingClientRect();
      this.cache.set(nodeId, {
        nodeId,
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      });
    });
  }
}
