# 04 - Design Engine: Canvas Interaction System

> **模块定位**：画布交互系统 — 坐标变换、命中测试、对齐吸附、Overlay 反馈
> **状态**：Draft
> **最后更新**：2026-03-28

---

## 1. 第一性原理 | First Principles

本模块解决的核心问题：

> **"How to let users spatially interact with Schema nodes?"**
>
> 用户在无限画布上看到的是渲染后的 DOM 元素，但操作的对象是 Schema 节点。
> 所有画布交互（选中、移动、缩放、绘制）都需要三项基础能力：
>
> 1. **坐标系统** — 在屏幕像素与逻辑画布之间双向转换
> 2. **命中测试** — 确定鼠标/触摸点落在哪个 Schema 节点上
> 3. **视觉 Overlay 反馈** — 选中框、对齐线、吸附提示等实时可视化

这三项能力构成了画布交互的最小闭环：事件进来 → 坐标转换 → 命中判定 → 状态变更 → Overlay 绘制 → 用户看到反馈。

---

## 2. 来自产品需求 | Product Requirements

| 产品需求文档 | 相关能力 |
|---|---|
| **01-canvas** | 双层架构（渲染层 + Overlay 层）、坐标变换、命中测试 |
| **02-toolbar** | 工具模式决定交互行为（选择工具 vs 绘制工具 vs 手形工具） |
| **08-layer-tree** | 选中状态双向同步：画布点选 ↔ 图层树高亮 |

---

## 3. 坐标系统 | Coordinate System

画布交互涉及 **4 套坐标空间**，必须在它们之间精确转换。

### 3.1 四套坐标空间

| 坐标空间 | 说明 | 原点 |
|---|---|---|
| **Screen** | 浏览器窗口像素坐标 (`event.clientX/Y`) | 浏览器窗口左上角 |
| **Canvas** | 无限画布逻辑坐标，受 pan/zoom 影响 | 画布原点 (0,0) |
| **Viewport** | 相对于设备视口容器（如 iPhone frame） | 视口容器左上角 |
| **Parent-relative** | 相对于父节点的 content box | 父节点内容区左上角 |

转换链路：

```
Screen → Canvas → Viewport → Parent-relative
  (pan/zoom)  (viewport offset)  (parent offset)
```

### 3.2 ViewState 与转换函数

```typescript
interface CanvasViewState {
  zoom: number;        // 0.1 ~ 4.0
  panX: number;        // canvas offset X in screen pixels
  panY: number;        // canvas offset Y in screen pixels
  containerRect: DOMRect; // the canvas container's position in screen
}

// ---- Screen ↔ Canvas ----

function screenToCanvas(point: Point, viewState: CanvasViewState): Point {
  return {
    x: (point.x - viewState.containerRect.left - viewState.panX) / viewState.zoom,
    y: (point.y - viewState.containerRect.top - viewState.panY) / viewState.zoom,
  };
}

function canvasToScreen(point: Point, viewState: CanvasViewState): Point {
  return {
    x: point.x * viewState.zoom + viewState.panX + viewState.containerRect.left,
    y: point.y * viewState.zoom + viewState.panY + viewState.containerRect.top,
  };
}

// ---- Canvas → Viewport ----

function canvasToViewport(point: Point, viewportOffset: Point): Point {
  return {
    x: point.x - viewportOffset.x,
    y: point.y - viewportOffset.y,
  };
}

// ---- Viewport → Parent-relative ----

function viewportToParent(point: Point, parentRect: BoundingRect): Point {
  return {
    x: point.x - parentRect.x,
    y: point.y - parentRect.y,
  };
}
```

### 3.3 设计要点

- `coordinateMap.ts` 已存在基础实现，需扩展为完整的 4 套转换。
- 所有交互模块统一通过 `coordinateMap` 做转换，禁止各处自行计算。
- `CanvasViewState` 由画布 pan/zoom 控制器维护，作为 single source of truth。

---

## 4. BoundingBoxCache + hitTest | 包围盒缓存与命中测试

### 4.1 BoundingBoxCache

Schema 节点渲染成 DOM 后，我们需要缓存其几何信息用于命中测试和对齐计算。

```typescript
interface BoundingRect {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

class BoundingBoxCache {
  /** 更新单个节点的包围盒（由 ResizeObserver 触发） */
  update(nodeId: string, rect: DOMRect): void;

  /** 获取单个节点的缓存包围盒 */
  get(nodeId: string): BoundingRect | null;

  /** 失效指定节点（不传参则全部失效） */
  invalidate(nodeIds?: string[]): void;

  /** 点命中测试：返回最顶层被击中的节点 */
  hitTest(point: Point, zoom: number): HitTestResult | null;

  /** resize handle 命中测试 */
  hitTestResizeHandle(
    point: Point,
    selectedNodeId: string,
    zoom: number
  ): ResizeHandle | null;
}
```

### 4.2 HitTest 结果类型

```typescript
interface HitTestResult {
  nodeId: string;
  depth: number; // tree depth for z-ordering
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
```

### 4.3 命中测试算法

```
hitTest(point, zoom):
  1. 遍历 BoundingBoxCache 中所有条目，按 depth 降序排列（最深 = 最前）
  2. 对每个条目：
     a. 跳过 locked / invisible 节点
     b. 根据 zoom 计算容差（tolerance = BASE_TOLERANCE / zoom）
     c. 检查 point 是否在 rect ± tolerance 内
     d. 若有 rotation，先将 point 反向旋转再检查
  3. 返回第一个匹配（即视觉上最顶层的元素）
  4. 无匹配则返回 null
```

**Resize handle 命中测试**遵循类似逻辑，但只检查已选中节点的 8 个控制点区域，handle 命中优先级高于节点命中。

---

## 5. EditorOverlay 扩展 | Overlay Extension

### 5.1 现有 Overlay（已实现）

| Overlay | 来源文件 | 说明 |
|---|---|---|
| Selection box | `interactions/select.ts` | 选中节点的蓝色边框 + 8 个 handle |
| Hover highlight | `interactions/hover.ts` | 鼠标悬停时的高亮边框 |
| Drag preview | `interactions/drag.ts` | 拖拽时的半透明预览 |
| Resize handles | `interactions/resize.ts` | 缩放时的控制点 |

### 5.2 新增 Overlay

| Overlay | 说明 | 触发时机 |
|---|---|---|
| **选区框 (Marquee)** | 点击空白处拖拽，绘制矩形框选多个元素 | 选择工具 + 空白处 mousedown + drag |
| **绘制预览 (Draw preview)** | 使用绘制工具（容器/元素/文本）时显示矩形预览 | 绘制工具激活 + drag |
| **栅格 (Grid)** | 高 zoom 级别下显示像素网格辅助对齐 | zoom > 4x 时自动显示，可手动开关 |
| **距离标注 (Distance annotations)** | 显示选中元素到相邻元素的距离 | 选中元素 + 按住 Alt/Option |
| **对齐线 (Alignment guides)** | 拖拽/缩放时显示吸附对齐参考线 | drag / resize 过程中 |

### 5.3 Overlay 渲染架构

```
EditorOverlay.tsx
├── <canvas> element (full-size, pointer-events: none)
├── 每帧通过 requestAnimationFrame 重绘
├── 渲染顺序（后绘制的在上层）：
│   1. Grid（最底层）
│   2. Alignment guides
│   3. Distance annotations
│   4. Marquee / Draw preview
│   5. Hover highlight
│   6. Selection box + Resize handles（最顶层）
```

---

## 6. 对齐线算法 | Alignment Guide Algorithm

### 6.1 数据结构

```typescript
interface AlignmentGuide {
  axis: 'horizontal' | 'vertical';
  position: number;     // canvas coordinate
  type: 'edge' | 'center';
  sourceNodeId: string;  // 正在移动的节点
  targetNodeId: string;  // 对齐目标节点
}

function computeAlignmentGuides(
  movingRect: BoundingRect,
  allRects: BoundingRect[],
  threshold: number       // default 5px at current zoom
): AlignmentGuide[];
```

### 6.2 对齐检查维度

对于**水平轴**（vertical position），检查 6 种对齐关系：

| 移动元素边 | 目标元素边 | 类型 |
|---|---|---|
| top | top | edge |
| top | center | edge-center |
| top | bottom | edge |
| center | center | center |
| bottom | top | edge |
| bottom | center | edge-center |
| bottom | bottom | edge |

对于**垂直轴**（horizontal position），同理检查 left/center/right 的 6 种组合。

> 总计每对节点最多检查 **12 条**潜在对齐线（水平 6 + 垂直 6），取 distance < threshold 的。

### 6.3 等间距检测 | Equal Spacing Detection

```
equalSpacingDetection(movingRect, allRects, axis):
  1. 将 allRects 按 axis 方向排序
  2. 找出连续 3+ 个元素间距相等的分组
  3. 若 movingRect 插入后也满足等间距，生成 spacing annotation
  4. 返回 SpacingGuide[]
```

```typescript
interface SpacingGuide {
  axis: 'horizontal' | 'vertical';
  gap: number;
  nodeIds: string[];  // 参与等间距的节点 ID 列表
}
```

---

## 7. 吸附算法 | Snapping Algorithm

### 7.1 接口定义

```typescript
interface SnapResult {
  snappedX: number;
  snappedY: number;
  guides: AlignmentGuide[];
}

function computeSnap(
  position: Point,
  movingRect: BoundingRect,
  allRects: BoundingRect[],
  gridSize: number | null,
  threshold: number
): SnapResult;
```

### 7.2 吸附优先级

```
1. Alignment guide snap（对齐线吸附）  — 最高优先
   ↓ 无匹配时降级
2. Grid snap（栅格吸附）
   ↓ 无匹配时降级
3. No snap（无吸附，使用原始坐标）
```

### 7.3 算法流程

```
computeSnap(position, movingRect, allRects, gridSize, threshold):
  1. 将 movingRect 临时移动到 position
  2. 调用 computeAlignmentGuides() 获取对齐线
  3. 若存在对齐线：
     a. X 轴：取最近的 vertical guide 的 position 作为 snappedX
     b. Y 轴：取最近的 horizontal guide 的 position 作为 snappedY
     c. 返回 { snappedX, snappedY, guides }
  4. 若无对齐线且 gridSize != null：
     a. snappedX = round(position.x / gridSize) * gridSize
     b. snappedY = round(position.y / gridSize) * gridSize
     c. 返回 { snappedX, snappedY, guides: [] }
  5. 返回 { snappedX: position.x, snappedY: position.y, guides: [] }
```

---

## 8. 性能优化 | Performance Optimization

| 优化策略 | 说明 |
|---|---|
| **空间索引** | BoundingBoxCache 内部维护 quadtree 或 simple grid index，将 hitTest 从 O(n) 降至 O(log n) |
| **惰性对齐计算** | 对齐线仅在 drag/resize 活动帧内计算，不在每次 mousemove 上都执行 |
| **rAF 合并** | Overlay 重绘统一走 `requestAnimationFrame`，同一帧内多次状态变更只触发一次绘制 |
| **距离标注节流** | 距离标注更新做 throttle（~60ms），避免高频重算 |
| **脏标记** | BoundingBoxCache 仅在 `invalidate()` 被调用后重建空间索引，避免无效重建 |
| **视口裁剪** | hitTest 和 alignment 计算时，先排除完全不在可视区域内的节点 |

---

## 9. 影响的文件路径 | Affected File Paths

```
features/design-engine/src/
├── overlay/
│   ├── coordinateMap.ts        ← 扩展（4 套坐标转换）
│   ├── BoundingBoxCache.ts     ← 🆕（或扩展现有）
│   ├── hitTest.ts              ← 🆕 独立 hitTest 逻辑
│   ├── alignment.ts            ← 🆕 对齐线算法
│   ├── snapping.ts             ← 🆕 吸附算法
│   ├── EditorOverlay.tsx       ← 扩展（选区框、栅格、距离标注）
│   └── interactions/
│       ├── select.ts           ← 已有
│       ├── hover.ts            ← 已有
│       ├── drag.ts             ← 扩展（对齐线 + 吸附）
│       ├── resize.ts           ← 扩展（对齐线 + 吸附）
│       ├── marquee.ts          ← 🆕 选区框交互
│       └── draw.ts             ← 🆕 绘制工具交互
```

---

## 10. 依赖关系 | Dependencies

```
                ┌─────────────────────┐
                │  01-schema-extensions │
                └──────────┬──────────┘
                           │ 依赖
                           ▼
              ┌────────────────────────┐
              │  04-engine-canvas (本文档) │
              └────────────┬───────────┘
                           │ 被依赖
                           ▼
                ┌──────────────────────┐
                │  07-frontend-canvas   │
                └──────────────────────┘
```

- **依赖** `01-schema-extensions`：节点类型定义、节点树结构用于 depth 排序和 parent-relative 计算。
- **被依赖于** `07-frontend-canvas`：前端画布组件消费本模块的坐标转换、hitTest、Overlay 组件。

---

## 11. MVP vs 后期 | Phasing

### Phase 1（MVP）

- [x] 坐标系统：4 套空间 + 全部转换函数
- [x] BoundingBoxCache：基础缓存 + invalidation
- [x] hitTest：基于遍历的命中测试（O(n)，足够应对 MVP 规模）
- [x] 基础对齐线：edge + center 对齐
- [x] 基础吸附：alignment guide snap + grid snap

### Phase 4（增强）

- [ ] 选区框 (Marquee) 交互
- [ ] 绘制工具 (Draw) 交互
- [ ] 栅格 (Grid) Overlay
- [ ] 等间距检测 (Equal spacing detection)
- [ ] 距离标注 (Distance annotations)
- [ ] 空间索引优化（quadtree）

---

## 12. 核心技术决策 | Key Technical Decisions

### Decision 1: Canvas overlay, not SVG

**选择**：使用 `<canvas>` 元素绘制所有 overlay。

**理由**：
- SVG 在大量对齐线 + 选区框 + 距离标注同时渲染时 DOM 节点膨胀，性能下降明显。
- Canvas 2D API 在同一帧内绘制几十条线段几乎无性能开销。
- Overlay 本质是临时视觉反馈，不需要 DOM 交互能力。

### Decision 2: BoundingBoxCache 独立于 React 渲染周期

**选择**：BoundingBoxCache 通过 `ResizeObserver` + `MutationObserver` 监听 DOM 变化并更新，不走 React state/rerender。

**理由**：
- 包围盒信息变化频率高（拖拽时每帧都变），走 React 会导致不必要的重渲染。
- hitTest 需要同步访问最新的几何数据，不能等待 React 调度。
- 保持 overlay 系统与渲染系统解耦，降低复杂度。

### Decision 3: 对齐线惰性计算

**选择**：仅在 drag/resize 激活状态下计算对齐线，idle 状态不计算。

**理由**：
- 对齐线计算是 O(n²)（移动节点 vs 所有其他节点），不应在 mousemove 空闲时运行。
- 在 drag 开始时预过滤候选节点（视口内 + 非锁定），减小 n 的规模。
- 计算结果缓存到当前帧，同一帧内 snap 和 overlay 共享同一份 guides。
