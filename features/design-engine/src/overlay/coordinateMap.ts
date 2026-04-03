/**
 * 坐标约定（W1-003 / 01-canvas §3）：
 *
 * 所有坐标图（CoordinateMap）以**逻辑像素**为单位，与设备 Schema 的 px 一致。
 *
 * - **屏幕坐标**：`clientX/clientY` 或 `getBoundingClientRect()` 与视口相关，已含祖先 CSS transform。
 * - **逻辑容器坐标**：`buildCoordinateMap` 自动检测祖先 `transform: scale()` 并将结果折算回
 *   逻辑像素（`offsetWidth / offsetHeight` 空间）；画布覆盖层 & 命中测试统一使用该坐标系。
 * - **Schema 局部坐标**：节点 `left/top` 相对定位父级；由「容器坐标减去父节点矩形原点」得到。
 *
 * `screenToCanvas` / `canvasToScreen` 用于「未套在统一 transform 内」的裸坐标换算；
 * 当前编辑器主画布以 DOM 层 + 覆盖层同容器为主路径。
 */

// ===== Coordinate Transform Types =====

export interface Point {
  x: number;
  y: number;
}

export interface CanvasViewState {
  /** Zoom level (0.1 ~ 4.0) */
  zoom: number;
  /** Pan offset X in screen pixels */
  panX: number;
  /** Pan offset Y in screen pixels */
  panY: number;
  /** Bounding rect of the canvas container element */
  containerRect: DOMRect;
}

// ===== Coordinate Transform Functions =====

/**
 * Convert screen (client) coordinates to canvas (logical) coordinates.
 * Removes container offset and pan, then divides by zoom.
 */
export function screenToCanvas(point: Point, viewState: CanvasViewState): Point {
  return {
    x: (point.x - viewState.containerRect.left - viewState.panX) / viewState.zoom,
    y: (point.y - viewState.containerRect.top - viewState.panY) / viewState.zoom,
  };
}

/**
 * Convert canvas (logical) coordinates to screen (client) coordinates.
 * Multiplies by zoom, then adds pan and container offset.
 */
export function canvasToScreen(point: Point, viewState: CanvasViewState): Point {
  return {
    x: point.x * viewState.zoom + viewState.panX + viewState.containerRect.left,
    y: point.y * viewState.zoom + viewState.panY + viewState.containerRect.top,
  };
}

/**
 * Convert canvas coordinates to viewport-local coordinates by subtracting
 * the viewport's own offset within the canvas.
 */
export function canvasToViewport(point: Point, viewportOffset: Point): Point {
  return { x: point.x - viewportOffset.x, y: point.y - viewportOffset.y };
}

/**
 * Convert a point from viewport coordinates to a parent node's local
 * coordinate space by subtracting the parent's position.
 */
export function viewportToParent(point: Point, parentRect: { x: number; y: number }): Point {
  return { x: point.x - parentRect.x, y: point.y - parentRect.y };
}

// ===== Node Rect =====

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
 * DOM 测量优先；缺失 id 用 fallback（如 Schema 推导）补齐。W7-025 视口虚拟化时保证命中与对齐一致。
 */
export function mergeCoordinateMaps(domMap: CoordinateMap, fallbackMap: CoordinateMap): CoordinateMap {
  const out = new Map(fallbackMap);
  for (const [k, v] of domMap) {
    out.set(k, v);
  }
  return out;
}

/**
 * 根节点 DOM 测量可能小于 `editor-canvas-stack`（仅 min-height:100% 时高度链未撑满、或内容收缩等），
 * 与设备白底/覆盖层 canvas 尺寸不一致，选框会「左上对齐、右下内收」。将 Root 在坐标图中对齐为整容器。
 * 使用 `offsetWidth/offsetHeight`（不受祖先 CSS transform 影响），与 buildCoordinateMap 同坐标系。
 */
export function expandRootRectToContainer(
  map: CoordinateMap,
  container: HTMLElement,
  rootNodeId: string,
): CoordinateMap {
  const out = new Map(map);
  if (!out.has(rootNodeId)) return out;
  out.set(rootNodeId, {
    x: 0,
    y: 0,
    width: container.offsetWidth,
    height: container.offsetHeight,
  });
  return out;
}

/**
 * Schema 推导结果（`buildSchemaLayoutMap`）为设备逻辑像素；`buildCoordinateMap` 现在也返回逻辑像素。
 * 用 `offsetWidth/offsetHeight`（不受 CSS transform 影响）计算容器 ↔ 视口的缩放比，
 * 让 fallback 与 DOM 坐标图处于同一坐标系。
 */
export function scaleCoordinateMapToLayoutContainer(
  map: CoordinateMap,
  container: HTMLElement,
  layoutViewportWidth: number,
  layoutViewportHeight: number,
): CoordinateMap {
  const sx = container.offsetWidth / Math.max(1, layoutViewportWidth);
  const sy = container.offsetHeight / Math.max(1, layoutViewportHeight);
  const out: CoordinateMap = new Map();
  for (const [id, r] of map) {
    out.set(id, {
      x: r.x * sx,
      y: r.y * sy,
      width: r.width * sx,
      height: r.height * sy,
    });
  }
  return out;
}

/**
 * Build a coordinate map by scanning all DOM elements with `data-node-id`.
 *
 * Returns **逻辑像素**（与 `offsetWidth/offsetHeight` 同空间）。
 * 自动检测容器上的祖先 CSS `transform: scale()` 并补偿，
 * 保证覆盖层 canvas（也在同一 transform 内）绘制坐标与 DOM 完全对齐。
 *
 * @param container - The container element (usually the viewport div)
 * @returns A Map of nodeId to NodeRect in logical pixels
 */
export function buildCoordinateMap(container: HTMLElement): CoordinateMap {
  const map: CoordinateMap = new Map();
  const containerRect = container.getBoundingClientRect();

  const effectiveScale =
    container.offsetWidth > 0
      ? containerRect.width / container.offsetWidth
      : 1;

  const elements = container.querySelectorAll<HTMLElement>('[data-node-id]');
  elements.forEach((el) => {
    const nodeId = el.getAttribute('data-node-id');
    if (!nodeId) return;

    const rect = el.getBoundingClientRect();
    map.set(nodeId, {
      x: (rect.left - containerRect.left) / effectiveScale,
      y: (rect.top - containerRect.top) / effectiveScale,
      width: rect.width / effectiveScale,
      height: rect.height / effectiveScale,
    });
  });

  return map;
}

/**
 * Hit-test a point against the coordinate map.
 *
 * Returns the nodeId of the smallest element that contains the point.
 * If multiple nodes overlap, the smallest area wins; **equal area** ties break
 * toward **later** entries in the map — `buildCoordinateMap` uses
 * `querySelectorAll` tree order (ancestor before descendant), so the **child**
 * wins when parent and child share the same bounding rect (e.g. both 100%×100%).
 */
export function hitTest(
  map: CoordinateMap,
  x: number,
  y: number,
  /** W7-023：跳过这些 id（如画布上不可选的锁定节点） */
  skipIds?: Set<string>,
): string | null {
  let bestId: string | null = null;
  let bestArea = Infinity;

  for (const [nodeId, rect] of map) {
    if (skipIds?.has(nodeId)) continue;
    if (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    ) {
      const area = rect.width * rect.height;
      // Strictly smaller wins; same area → last in document order wins (deeper node).
      if (area < bestArea || area === bestArea) {
        bestArea = area;
        bestId = nodeId;
      }
    }
  }

  return bestId;
}

/**
 * 返回包含该点的所有节点 id，按包围盒面积 **升序**（越小越靠前，通常更深）。
 * 用于 Cmd+点击在叠层间循环选择。
 */
export function hitTestAll(map: CoordinateMap, x: number, y: number, skipIds?: Set<string>): string[] {
  const hits: { id: string; area: number }[] = [];
  for (const [nodeId, rect] of map) {
    if (skipIds?.has(nodeId)) continue;
    if (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    ) {
      hits.push({ id: nodeId, area: rect.width * rect.height });
    }
  }
  hits.sort((a, b) => a.area - b.area);
  return hits.map((h) => h.id);
}
