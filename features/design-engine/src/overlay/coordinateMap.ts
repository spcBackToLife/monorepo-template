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
 *
 * **坐标根（第一性原理）**：`editor-canvas-stack` 与内部 `[data-screen-id]` 在部分布局下
 * 可能不完全重合（设备框、安全区、嵌套包装等）。凡 `buildCoordinateMap` / 放置 / 命中
 * 应以 `getEditorCoordinateRoot(stack)` 为原点，与 Schema 设备内容区一致。
 *
 * **实例键（根治列表重复 DOM）**：`node.repeat` 展开时多个 DOM 共用同一 `data-node-id`。
 * 坐标图必须以 `data-node-instance-key` 为 Map 键，值为 `{ nodeId, rect }`；命中仍返回 Schema `nodeId`，
 * 拖拽/缩放用 `hitTestAt` 得到的 `instanceKey` 锁定具体那一块 DOM。
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

/** 与 DOM `data-node-instance-key` 一致；无列表上下文时等于 `nodeId` */
export interface CoordinateMapEntry {
  nodeId: string;
  rect: NodeRect;
}

/** Map 键 = 实例键；`nodeId` 在 entry 内，供选中/写回 Schema */
export type CoordinateMap = Map<string, CoordinateMapEntry>;

export const DATA_NODE_INSTANCE_KEY_ATTR = 'data-node-instance-key';

function fallbackMapEntry(key: string, val: NodeRect | CoordinateMapEntry): CoordinateMapEntry {
  if ('rect' in val && 'nodeId' in val && typeof (val as CoordinateMapEntry).rect?.x === 'number') {
    return val as CoordinateMapEntry;
  }
  return { nodeId: key, rect: val as NodeRect };
}

function fallbackRectFromMap(map: CoordinateMap | null | undefined, parentId: string): NodeRect | null {
  if (!map) return null;
  const direct = map.get(parentId);
  if (direct) return direct.rect;
  for (const v of map.values()) {
    if (v.nodeId === parentId) return v.rect;
  }
  return null;
}

/** 拖拽/缩放：优先 `preferredInstanceKey` 对应块，否则任选一个该 nodeId 的实例（通常仅单例） */
export function getRectForInteraction(
  map: CoordinateMap,
  nodeId: string,
  preferredInstanceKey?: string | null,
): NodeRect | null {
  if (preferredInstanceKey) {
    const e = map.get(preferredInstanceKey);
    if (e?.nodeId === nodeId) return e.rect;
  }
  const selfKeyed = map.get(nodeId);
  if (selfKeyed?.nodeId === nodeId) return selfKeyed.rect;
  for (const v of map.values()) {
    if (v.nodeId === nodeId) return v.rect;
  }
  return null;
}

export function mapHasNodeId(map: CoordinateMap, nodeId: string): boolean {
  return getRectForInteraction(map, nodeId) != null;
}

/** 绘制多选区/列表模板：同一 nodeId 的多块 DOM 各画一层选框 */
export function collectRectsForNodeId(map: CoordinateMap, nodeId: string): NodeRect[] {
  const out: NodeRect[] = [];
  for (const v of map.values()) {
    if (v.nodeId === nodeId) out.push(v.rect);
  }
  return out;
}

/**
 * 编辑画布：返回 Schema 内容根（`SchemaRenderer` / `PreviewRenderer` 外层 `data-screen-id`）。
 * 不存在时回退为 `host`（如尚未挂载或空画布）。
 */
export function getEditorCoordinateRoot(host: HTMLElement): HTMLElement {
  return host.querySelector<HTMLElement>('[data-screen-id]') ?? host;
}

/**
 * DOM 测量优先；缺失 id 用 fallback（如 Schema 推导）补齐。W7-025 视口虚拟化时保证命中与对齐一致。
 * 凡某 `nodeId` 已在 DOM 图中有任一实例，则丢弃 fallback 中同 `nodeId` 的估算盒，避免与列表多实例打架。
 */
export function mergeCoordinateMaps(domMap: CoordinateMap, fallbackMap: CoordinateMap): CoordinateMap {
  const domNodeIds = new Set(Array.from(domMap.values()).map((e) => e.nodeId));
  const out = new Map<string, CoordinateMapEntry>();
  for (const [k, v] of fallbackMap) {
    const entry = fallbackMapEntry(k, v as NodeRect | CoordinateMapEntry);
    if (domNodeIds.has(entry.nodeId)) continue;
    out.set(k, entry);
  }
  for (const [k, v] of domMap) {
    out.set(k, v);
  }
  return out;
}

/**
 * 根节点 DOM 测量可能小于坐标根（仅 min-height:100% 时高度链未撑满、或内容收缩等），
 * 与设备白底/覆盖层 canvas 尺寸不一致，选框会「左上对齐、右下内收」。将 Root 在坐标图中对齐为整容器。
 * 使用 `offsetWidth/offsetHeight`（不受祖先 CSS transform 影响），与 buildCoordinateMap 同坐标系。
 * @param coordSpaceRoot - 与 `buildCoordinateMap(coordSpaceRoot)` 同一元素，通常为 `getEditorCoordinateRoot(stack)`。
 */
export function expandRootRectToContainer(
  map: CoordinateMap,
  coordSpaceRoot: HTMLElement,
  rootNodeId: string,
): CoordinateMap {
  const out = new Map(map);
  let rootKey: string | null = null;
  for (const [k, v] of out) {
    if (v.nodeId === rootNodeId) {
      rootKey = k;
      break;
    }
  }
  if (rootKey == null) return out;
  const prev = out.get(rootKey)!;
  out.set(rootKey, {
    nodeId: prev.nodeId,
    rect: {
      x: 0,
      y: 0,
      width: coordSpaceRoot.offsetWidth,
      height: coordSpaceRoot.offsetHeight,
    },
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
  coordSpaceRoot: HTMLElement,
  layoutViewportWidth: number,
  layoutViewportHeight: number,
): CoordinateMap {
  const sx = coordSpaceRoot.offsetWidth / Math.max(1, layoutViewportWidth);
  const sy = coordSpaceRoot.offsetHeight / Math.max(1, layoutViewportHeight);
  const out: CoordinateMap = new Map();
  for (const [id, entry] of map) {
    const r = entry.rect;
    out.set(id, {
      nodeId: entry.nodeId,
      rect: {
        x: r.x * sx,
        y: r.y * sy,
        width: r.width * sx,
        height: r.height * sy,
      },
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
 * @param container - 坐标空间根（通常为 `getEditorCoordinateRoot(stack)`）
 * @returns Map 键为 `data-node-instance-key`，值为 `{ nodeId, rect }`
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

    const instanceKey =
      el.getAttribute(DATA_NODE_INSTANCE_KEY_ATTR) ?? nodeId;

    const rect = el.getBoundingClientRect();
    map.set(instanceKey, {
      nodeId,
      rect: {
        x: (rect.left - containerRect.left) / effectiveScale,
        y: (rect.top - containerRect.top) / effectiveScale,
        width: rect.width / effectiveScale,
        height: rect.height / effectiveScale,
      },
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
export function hitTestAt(
  map: CoordinateMap,
  x: number,
  y: number,
  skipIds?: Set<string>,
): { nodeId: string; instanceKey: string } | null {
  let bestKey: string | null = null;
  let bestNodeId: string | null = null;
  let bestArea = Infinity;

  for (const [instanceKey, entry] of map) {
    const { nodeId, rect } = entry;
    if (skipIds?.has(nodeId)) continue;
    if (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    ) {
      const area = rect.width * rect.height;
      if (area < bestArea || area === bestArea) {
        bestArea = area;
        bestKey = instanceKey;
        bestNodeId = nodeId;
      }
    }
  }

  return bestKey != null && bestNodeId != null
    ? { nodeId: bestNodeId, instanceKey: bestKey }
    : null;
}

export function hitTest(
  map: CoordinateMap,
  x: number,
  y: number,
  skipIds?: Set<string>,
): string | null {
  return hitTestAt(map, x, y, skipIds)?.nodeId ?? null;
}

/**
 * 返回包含该点的所有节点 id，按包围盒面积 **升序**（越小越靠前，通常更深）。
 * 用于 Cmd+点击在叠层间循环选择。
 */
export function hitTestAll(map: CoordinateMap, x: number, y: number, skipIds?: Set<string>): string[] {
  const hits: { id: string; area: number }[] = [];
  for (const [, entry] of map) {
    const { nodeId, rect } = entry;
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

const BOUNDS_CONTAIN_EPS = 0.5;

/** `outer` 是否完全包含 `inner`（逻辑像素，容差处理浮点） */
export function rectFullyContains(
  outer: NodeRect,
  inner: { x: number; y: number; width: number; height: number },
  eps = BOUNDS_CONTAIN_EPS,
): boolean {
  return (
    inner.x >= outer.x - eps &&
    inner.y >= outer.y - eps &&
    inner.x + inner.width <= outer.x + outer.width + eps &&
    inner.y + inner.height <= outer.y + outer.height + eps
  );
}

/**
 * 返回其包围盒**完全包含**给定矩形的所有节点 id，按面积**升序**（越小越靠前）。
 * 用于拖拽绘制：优先把新节点挂到「能包住整段绘制框」的最小容器上，避免仅用中心点命中到按钮等小节点导致落点错位。
 */
export function hitTestAllContainingBounds(
  map: CoordinateMap,
  bounds: { x: number; y: number; width: number; height: number },
  skipIds?: Set<string>,
): string[] {
  const hits: { id: string; area: number }[] = [];
  for (const [, entry] of map) {
    const { nodeId, rect } = entry;
    if (skipIds?.has(nodeId)) continue;
    if (rectFullyContains(rect, bounds)) {
      hits.push({ id: nodeId, area: rect.width * rect.height });
    }
  }
  hits.sort((a, b) => a.area - b.area);
  return hits.map((h) => h.id);
}

/**
 * 设备内容区在逻辑像素下的整框矩形（与 expandRootRectToContainer 同一坐标根）。
 * @param stack - `editor-canvas-stack`；实际尺寸取自 `getEditorCoordinateRoot(stack)`。
 */
export function getRootStackPlacementRect(stack: HTMLElement): NodeRect {
  return getEditorContentRootRect(getEditorCoordinateRoot(stack));
}

/** 与 `buildCoordinateMap(coordRoot)` 原点一致的内容根矩形 */
export function getEditorContentRootRect(coordRoot: HTMLElement): NodeRect {
  return {
    x: 0,
    y: 0,
    width: coordRoot.offsetWidth,
    height: coordRoot.offsetHeight,
  };
}

/**
 * 定位父级在**容器逻辑坐标**下的 padding-edge 矩形。
 *
 * **第一性原理**：CSS absolute 子元素的 (0,0) = 包含块的 padding edge。
 *
 * 关键量纲：
 * - `getBoundingClientRect()` 返回的是**视口 / 屏幕像素**，已乘以祖先 CSS transform scale。
 * - `clientLeft / clientTop / clientWidth / clientHeight` 是**CSS 布局像素**，不受 transform 影响。
 *
 * 必须先把 `getBoundingClientRect` 差值除以 scale 得到**逻辑偏移**，再加上 CSS 布局像素的 border 修正；
 * `clientWidth/clientHeight` 本身已是逻辑像素，不可再除以 scale。
 */
export function getParentContentRectInContainer(
  container: HTMLElement,
  parentEl: HTMLElement,
): NodeRect {
  const containerRect = container.getBoundingClientRect();
  const scale =
    container.offsetWidth > 0 ? containerRect.width / container.offsetWidth : 1;
  const r = parentEl.getBoundingClientRect();
  const borderBoxX = (r.left - containerRect.left) / scale;
  const borderBoxY = (r.top - containerRect.top) / scale;
  return {
    x: borderBoxX + parentEl.clientLeft,
    y: borderBoxY + parentEl.clientTop,
    width: parentEl.clientWidth,
    height: parentEl.clientHeight,
  };
}

/**
 * 屏幕坐标 → 与 `buildCoordinateMap(getEditorCoordinateRoot(stack))` 一致的逻辑坐标（含祖先 scale 补偿）。
 * `stack` 传 `editor-canvas-stack`；原点为 Schema 内容根 `[data-screen-id]`（若存在）。
 */
export function screenToContainerLogical(
  stack: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const coordRoot = getEditorCoordinateRoot(stack);
  const containerRect = coordRoot.getBoundingClientRect();
  const scale =
    coordRoot.offsetWidth > 0 ? containerRect.width / coordRoot.offsetWidth : 1;
  return {
    x: (clientX - containerRect.left) / scale,
    y: (clientY - containerRect.top) / scale,
  };
}

/**
 * 放置运算用的父级矩形。
 *
 * **必须优先用真实 DOM（含 Root）**：`position:absolute` 的 left/top 相对父级 **padding 边**；
 * 若 Root 在栈内与 (0,0) 有偏差、或仅用整栈 offset 而忽略 Root 边框，会出现「绘制点与落点差一大截」。
 * 仅当拿不到对应 DOM（如虚拟化裁切）时再回退整栈或坐标图。
 */
export function getPlacementParentRect(
  stack: HTMLElement,
  parentId: string,
  rootId: string,
  parentEl: HTMLElement | null,
  mapFallback?: CoordinateMap | null,
): NodeRect {
  const coordRoot = getEditorCoordinateRoot(stack);
  if (parentId === rootId) {
    return getEditorContentRootRect(coordRoot);
  }
  if (parentEl) {
    return getParentContentRectInContainer(coordRoot, parentEl);
  }
  return fallbackRectFromMap(mapFallback ?? null, parentId) ?? getEditorContentRootRect(coordRoot);
}

/**
 * 解析放置父级对应的真实 DOM。列表重复渲染时同一 `data-node-id` 会出现多个节点：
 * 若给出 `preferLogicalPoint`（容器逻辑坐标），优先选**包含该点**的实例；否则取**面积最大**的实例。
 */
export function resolvePlacementParentElement(
  stack: HTMLElement,
  parentId: string,
  preferLogicalPoint?: { x: number; y: number },
): HTMLElement | null {
  const coordRoot = getEditorCoordinateRoot(stack);
  const matches: HTMLElement[] = [];
  coordRoot.querySelectorAll<HTMLElement>('[data-node-id]').forEach((el) => {
    if (el.getAttribute('data-node-id') === parentId) matches.push(el);
  });
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const pt = preferLogicalPoint;
  if (pt) {
    for (const el of matches) {
      const r = getParentContentRectInContainer(coordRoot, el);
      const eps = 1;
      if (
        pt.x >= r.x - eps &&
        pt.x <= r.x + r.width + eps &&
        pt.y >= r.y - eps &&
        pt.y <= r.y + r.height + eps
      ) {
        return el;
      }
    }
  }

  let best: HTMLElement | null = null;
  let bestArea = -1;
  for (const el of matches) {
    const r = getParentContentRectInContainer(coordRoot, el);
    const a = r.width * r.height;
    if (a > bestArea) {
      bestArea = a;
      best = el;
    }
  }
  return best;
}
