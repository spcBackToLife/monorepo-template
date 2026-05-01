# 01 - 中央画布（渲染区）

> **根本问题：如何将 Schema 变成用户能看到、能操作的视觉界面？**
>
> ← [返回总纲](../README.md)
>
> 相关技术文档：
> - [design-engine — 双层渲染引擎](../../../03-tech/design-engine.md)
> - [design-schema — UI Schema 协议](../../../03-tech/design-schema.md)
> - [design-operations — 操作集合](../../../03-tech/design-operations.md)

---

## 一、第一性原理：渲染区解决什么根本问题？

### 1.1 本质推导

```
编辑器的目的 = 让人高效地构建和调整 Schema
画布的目的   = 让人"看到" Schema + "操作" Schema

进一步拆分：
  "看到" → 内容预览：Schema 变成可视化的 UI（所见即所得）
  "操作" → 编辑交互：在 UI 之上叠加选区、拖拽、缩放等编辑控件

关键矛盾：
  内容预览需要"真实 DOM 渲染"（CSS 布局、文本排版、组件嵌套）
  编辑交互需要"精确几何操作"（像素级选区、亚像素对齐线、坐标变换）
  两者的技术需求完全不同 → 必须分层
```

### 1.2 为什么是双层而非纯 Canvas？

| 方案 | 优势 | 致命问题 |
|------|------|---------|
| **纯 Canvas 渲染** | 完全控制渲染，无 DOM 限制 | 必须自己实现 CSS 布局、文本排版、Flex/Grid ——等于重写浏览器。工程量不可接受，且永远不如浏览器精确 |
| **纯 DOM 渲染** | CSS 原生支持，所见即所得 | DOM 事件冒泡与编辑交互冲突；难以绘制跨元素的对齐线、选区框等几何图形 |
| **双层架构** ✅ | 各层用最适合的技术 | 需要坐标映射（可控的额外复杂度） |

> **核心原则：内容层用产品的真实技术渲染（DOM），编辑层用最适合几何操作的技术（Canvas）。**

### 1.3 画布的三个身份

画布在不同场景下扮演不同身份：

```
编辑模式 → 画布 = 内容预览器 + 编辑交互层
  用户看到 UI 的样子，同时可以选中、拖拽、resize

预览模式 → 画布 = 纯内容预览器（Canvas 覆盖层消失）
  用户与 UI 真实交互，点击按钮跳转页面、hover 显示效果

代码视图 → 画布 = 只读预览 + 代码面板
  用户看到 UI 并对照代码
```

---

## 二、双层架构详细设计

### 2.1 层叠结构

```
┌─────────────────────────────────────────────────────┐
│                 画布容器 (CanvasContainer)            │
│  position: relative; overflow: hidden;              │
│  宽高 = 编辑器中央区域可用空间                          │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Canvas 覆盖层 (EditorOverlay)                │  │
│  │  position: absolute; inset: 0; z-index: 10;  │  │
│  │  pointer-events: all;                        │  │  ← 拦截所有鼠标事件
│  │                                               │  │
│  │  绘制内容：                                    │  │
│  │  · 选中元素的蓝色边框 + 8 个 resize handles    │  │
│  │  · hover 元素的浅蓝色边框                      │  │
│  │  · 框选矩形（半透明蓝色）                      │  │
│  │  · 拖拽时的位移预览（虚线轮廓）                 │  │
│  │  · 对齐辅助线（红色虚线）                      │  │
│  │  · 间距标注（粉色数字 + 线段）                  │  │
│  │  · 尺寸标注（拖拽绘制时的宽高数字）             │  │
│  │  · 栅格点（可选，8px 间距）                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  视口容器 (ViewportContainer)                  │  │
│  │  position: absolute; z-index: 1;              │  │
│  │  宽高 = 当前设备视口尺寸 × 缩放比              │  │
│  │  transform-origin: 0 0;                       │  │
│  │  transform: scale(zoom) translate(panX, panY);│  │
│  │  pointer-events: none;                        │  │  ← 不接收事件
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  React DOM 渲染层 (SchemaRenderer)      │  │  │
│  │  │  Schema → 真实 React 组件树              │  │  │
│  │  │  CSS 1:1 渲染                           │  │  │
│  │  │  pointer-events: none;                  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 事件流

```
用户鼠标/触控事件
       │
       ▼
  Canvas 覆盖层（EditorOverlay）接收所有事件
       │
       ├── 鼠标坐标 → 屏幕坐标转画布坐标（见第三节）
       │
       ├── hitTest：画布坐标与 DOM 层的元素边界匹配
       │   │
       │   ├── 命中元素 → 根据当前工具决定行为
       │   │   ├── 选择工具 + 单击 → 选中该元素
       │   │   ├── 选择工具 + 拖拽 → 移动该元素
       │   │   ├── resize handle + 拖拽 → 调整尺寸
       │   │   └── 绘制工具 + 拖拽 → 创建新元素
       │   │
       │   └── 未命中 → 根据当前工具决定行为
       │       ├── 选择工具 + 单击空白 → 取消选中
       │       ├── 选择工具 + 拖拽空白 → 框选
       │       └── 绘制工具 + 拖拽空白 → 在根容器中创建新元素
       │
       └── Canvas 重绘：更新选区框 / 对齐线 / 高亮 等视觉反馈
```

### 2.3 hitTest 机制

Canvas 覆盖层需要知道"鼠标下面是哪个 Schema 节点"。核心方法：

```
hitTest 实现方案：

方案 A（推荐）：维护一份节点包围盒缓存
  · Schema 每次渲染后，遍历所有节点对应的 DOM 元素
  · 调用 getBoundingClientRect() 获取屏幕坐标
  · 转换为画布坐标后缓存到 Map<nodeId, BoundingRect>
  · hitTest 时逆序遍历（z-index 从高到低），找到第一个包含鼠标坐标的节点
  · 触发时机：Schema 变更 / 视口切换 / 缩放变化 / 窗口 resize

方案 B（备选）：使用 document.elementFromPoint
  · 临时将 Canvas 覆盖层设为 pointer-events: none
  · 调用 document.elementFromPoint(clientX, clientY)
  · 通过 DOM 节点上的 data-node-id 属性反查 Schema 节点
  · 恢复 pointer-events: all
  · 缺点：有闪烁风险，性能差（每次都要改 CSS 属性）

推荐方案 A：
  · 性能好（查缓存 O(n)，n = 可见节点数，通常 < 200）
  · 无副作用（不改 DOM 属性）
  · 可做更细粒度的命中判断（如 8 个 resize handle 的热区）
```

### 2.4 渲染同步策略

```
Schema 变更 → 触发重渲染的时序：

  OperationExecutor.execute(op)
       │
       ├──(1) MobX Store 更新 Schema
       │        │
       │        ▼
       │   SchemaRenderer 响应式重渲染（React）
       │        │
       │        ▼
       │   DOM 更新完成（useLayoutEffect / MutationObserver）
       │        │
       │        ▼
       │   (2) 更新节点包围盒缓存
       │        │
       │        ▼
       │   (3) Canvas 覆盖层重绘（选区/对齐线等）
       │
       └──(4) 异步持久化（不阻塞渲染，见总纲 2.3 数据流）

关键约束：
  · (2) 必须在 (1) 之后 → 用 useLayoutEffect 确保 DOM 已更新
  · (3) 必须在 (2) 之后 → 包围盒缓存更新后立即触发 Canvas 重绘
  · (4) 异步执行，不参与渲染链路
```

---

## 三、坐标系统

### 3.1 三套坐标

画布中存在三套坐标系，所有交互操作都依赖它们之间的正确转换。

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. 屏幕坐标 (Screen Coordinates)                           │
│     原点：浏览器窗口左上角                                   │
│     单位：CSS 像素                                          │
│     来源：MouseEvent.clientX / clientY                      │
│     用途：接收原始输入                                       │
│                                                             │
│  2. 画布坐标 (Canvas Coordinates)                           │
│     原点：画布容器（CanvasContainer）左上角                   │
│     单位：CSS 像素，已消除页面滚动偏移                        │
│     来源：屏幕坐标 - 画布容器的 getBoundingClientRect()      │
│     用途：Canvas 覆盖层绘制、hitTest                         │
│                                                             │
│  3. 视口坐标 / 设计坐标 (Viewport Coordinates)              │
│     原点：视口容器（ViewportContainer）左上角                 │
│     单位：逻辑像素，与 Schema 中的 CSS 值一致                 │
│     来源：(画布坐标 - panOffset) / zoom                     │
│     用途：Schema 中元素的 left/top/width/height 值           │
│                                                             │
│  4. 父容器坐标 (Parent-Relative Coordinates)                │
│     原点：当前选中父容器的左上角                              │
│     单位：逻辑像素                                          │
│     来源：视口坐标 - 父容器在视口中的 left/top               │
│     用途：新建元素的 position:absolute 定位值                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 坐标转换公式

```typescript
// ===== 核心状态 =====
interface CanvasViewState {
  zoom: number;          // 缩放比例，1.0 = 100%
  panX: number;          // 水平平移量（画布坐标像素）
  panY: number;          // 垂直平移量（画布坐标像素）
  containerRect: DOMRect; // 画布容器在屏幕中的位置
}

// ===== 屏幕坐标 → 画布坐标 =====
function screenToCanvas(screenX: number, screenY: number, state: CanvasViewState) {
  return {
    canvasX: screenX - state.containerRect.left,
    canvasY: screenY - state.containerRect.top,
  };
}

// ===== 画布坐标 → 视口坐标（设计坐标）=====
function canvasToViewport(canvasX: number, canvasY: number, state: CanvasViewState) {
  return {
    viewportX: (canvasX - state.panX) / state.zoom,
    viewportY: (canvasY - state.panY) / state.zoom,
  };
}

// ===== 视口坐标 → 父容器坐标 =====
function viewportToParent(
  viewportX: number, viewportY: number,
  parentRect: { left: number; top: number }  // 父容器在视口中的位置
) {
  return {
    localX: viewportX - parentRect.left,
    localY: viewportY - parentRect.top,
  };
}

// ===== 完整链路：鼠标事件 → 元素定位值 =====
function mouseToElementPosition(
  event: MouseEvent,
  state: CanvasViewState,
  parentRect: { left: number; top: number }
) {
  const canvas = screenToCanvas(event.clientX, event.clientY, state);
  const viewport = canvasToViewport(canvas.canvasX, canvas.canvasY, state);
  const local = viewportToParent(viewport.viewportX, viewport.viewportY, parentRect);
  return { left: local.localX, top: local.localY };
}

// ===== 反向：Schema 坐标 → Canvas 绘制坐标 =====
// 用于在 Canvas 覆盖层上绘制选区框等
function viewportToCanvas(viewportX: number, viewportY: number, state: CanvasViewState) {
  return {
    canvasX: viewportX * state.zoom + state.panX,
    canvasY: viewportY * state.zoom + state.panY,
  };
}
```

### 3.3 坐标转换示意

```
示例：zoom = 0.8, panX = 50, panY = 30

屏幕坐标 (clientX=400, clientY=300)
  │
  │  减去画布容器偏移 (containerRect.left=200, top=100)
  ▼
画布坐标 (canvasX=200, canvasY=200)
  │
  │  减去平移量，除以缩放：(200-50)/0.8, (200-30)/0.8
  ▼
视口坐标 (viewportX=187.5, viewportY=212.5)
  │
  │  减去父容器偏移 (parent.left=20, top=50)
  ▼
父容器坐标 (localX=167.5, localY=162.5)  → 写入 Schema: left: 167.5px
```

---

## 四、缩放与平移

### 4.1 缩放（Zoom）

```
触发方式：
  · Cmd + 滚轮 / Ctrl + 滚轮    → 连续缩放
  · Cmd + 0                       → 适配画布（计算最优 zoom 使视口完整可见）
  · Cmd + 1                       → 重置为 100%
  · 顶部工具栏缩放控件             → 点击 +/- 或直接输入百分比

缩放范围：10% ~ 800%

缩放中心点策略（关键交互细节）：
  · 滚轮缩放 → 以鼠标指针位置为中心
  · 工具栏 +/- → 以画布中心为中心
  · Cmd+0 / Cmd+1 → 视口居中显示
```

**以鼠标为中心缩放的数学：**

```typescript
function zoomAtPoint(
  canvasX: number, canvasY: number,  // 鼠标在画布上的位置
  oldZoom: number, newZoom: number,
  oldPanX: number, oldPanY: number
) {
  // 保持鼠标指向的视口点不变
  // 即 (canvasX - panX) / zoom 在缩放前后相等
  return {
    panX: canvasX - (canvasX - oldPanX) * (newZoom / oldZoom),
    panY: canvasY - (canvasY - oldPanY) * (newZoom / oldZoom),
  };
}
```

**适配画布（Zoom to Fit）：**

```typescript
function zoomToFit(
  containerWidth: number, containerHeight: number,  // 画布容器尺寸
  viewportWidth: number, viewportHeight: number,    // 设备视口尺寸
  padding: number = 40  // 四周留白
) {
  const scaleX = (containerWidth - padding * 2) / viewportWidth;
  const scaleY = (containerHeight - padding * 2) / viewportHeight;
  const zoom = Math.min(scaleX, scaleY, 1);  // 不超过 100%

  // 居中
  const panX = (containerWidth - viewportWidth * zoom) / 2;
  const panY = (containerHeight - viewportHeight * zoom) / 2;

  return { zoom, panX, panY };
}
```

### 4.2 平移（Pan）

```
触发方式：
  · Space + 鼠标拖拽          → 抓手模式（最常用）
  · 鼠标中键拖拽              → 直接平移
  · 触控板双指滑动             → 平移（不按 Cmd 时）

Space 抓手模式的状态机：
  Space 按下 → 光标变为"抓手" → 鼠标按下并拖拽 → panX/panY 更新 → 光标变为"攥拳"
  Space 松开 → 恢复之前的工具（如选择工具）

边界约束：
  · 不限制平移范围（允许将视口完全拖出可见区域）
  · 但 "适配画布" (Cmd+0) 随时可用，作为"找回"的安全网
```

### 4.3 缩放级别对 Canvas 覆盖层的影响

```
Canvas 覆盖层的绘制必须考虑 zoom：

  选区框线宽 = 1px / zoom          → 保证视觉上始终 1px 宽
  resize handle 大小 = 8px / zoom  → 保证视觉上始终 8px 方块
  对齐线宽度 = 1px / zoom
  间距标注文字大小 = 12px / zoom

目的：无论 zoom 多少，编辑控件的视觉大小始终一致。
```

---

## 五、定位模型

### 5.1 核心原则

**元素的位置相对于其父容器。** 这是从"导出代码质量"倒推的决策。

```
如果用绝对屏幕坐标：
  导出 → position: absolute; left: 387px; top: 142px;
  → 无意义的魔法数字，脆弱，不响应式

如果用相对父级坐标：
  导出 → position: absolute; left: 20px; top: 16px; (相对父容器)
  → 或更好：display: flex; gap: 8px; (流式布局)
  → 语义清晰，可维护
```

### 5.2 两阶段定位策略

```
阶段一：自由放置（默认）
  ┌─────────────────────────────────────────────────┐
  │  新建元素的初始定位方式                            │
  │                                                  │
  │  position: absolute                              │
  │  left: <dropLocalX>px     ← 鼠标松手点相对父容器   │
  │  top:  <dropLocalY>px                            │
  │  width: <拖拽宽度 | 默认200>px                    │
  │  height: <拖拽高度 | 默认50>px                    │
  │                                                  │
  │  行为：                                           │
  │  · 拖拽画新元素 → 用拖拽起止点计算 left/top/w/h    │
  │  · 从组件库拖入 → 用鼠标落点计算 left/top          │
  │  · 点击创建（文本工具）→ 用点击位置作 left/top     │
  └─────────────────────────────────────────────────┘

阶段二：布局流（进阶，Phase B/C）
  ┌─────────────────────────────────────────────────┐
  │  当用户将元素拖入 Flex/Grid 容器时                  │
  │                                                  │
  │  系统提示："转为流式布局？"                         │
  │  ┌──────────────────────────────────┐            │
  │  │  该容器已启用 Flex 布局。           │            │
  │  │  ● 作为流式子元素插入 (推荐)       │            │
  │  │  ○ 保持绝对定位（悬浮在容器上方）   │            │
  │  └──────────────────────────────────┘            │
  │                                                  │
  │  选择"流式插入"后：                                │
  │  · 去掉 position: absolute + left/top            │
  │  · 位置由 Flex 属性决定（order / gap / align）     │
  │  · 拖拽行为变为"调整 order"（插入点指示器）         │
  └─────────────────────────────────────────────────┘
```

### 5.3 拖拽落点计算

```
鼠标松手时，新元素的定位值计算：

输入：
  · mouseEvent.clientX / clientY          ← 鼠标屏幕坐标
  · canvasViewState { zoom, panX, panY }  ← 画布缩放/平移状态
  · parentNode                            ← 当前选中的父容器

计算：
  step 1: 屏幕 → 画布 → 视口坐标
  step 2: 获取 parentNode 在视口中的位置
          parentRect = nodeRectCache.get(parentNode.id)
  step 3: 视口坐标 → 父容器坐标
          localX = viewportX - parentRect.left
          localY = viewportY - parentRect.top
  step 4: （可选）栅格吸附
          localX = Math.round(localX / gridSize) * gridSize
          localY = Math.round(localY / gridSize) * gridSize

输出 Operation：
  {
    type: "addElement",
    params: {
      parentId: parentNode.id,
      tag: "div",
      styles: {
        position: "absolute",
        left: `${localX}px`,
        top: `${localY}px`,
        width: "200px",
        height: "50px"
      }
    }
  }
```

### 5.4 "先选父容器才能添加子元素"

这是一个关键交互原则，需要明确定义"当前父容器"的确定规则：

```
确定当前父容器的规则（优先级从高到低）：

1. 用户明确选中了一个容器元素 → 该元素就是父容器
2. 用户选中了一个非容器元素 → 该元素的 parent 就是父容器
3. 没有选中任何元素 → 当前页面的 rootNode 就是父容器
4. 用户用绘制工具在某容器范围内拖拽 → 那个容器就是父容器

"容器"的判定：
  · 元素的 display 为 flex / grid / block → 是容器
  · 元素的 children 不为空 → 是容器
  · 所有 div / section / nav / header / footer / main / ul / ol → 默认是容器
  · button / span / p / h1-h3 / a / img / input → 默认不是容器
    （但如果手动添加了 children → 也视为容器）
```

---

## 六、元素选中与编辑交互

### 6.1 选中行为

```
┌────────────────────────────────────────────────────────────────┐
│  选中交互矩阵                                                   │
├──────────────────┬─────────────────────────────────────────────┤
│  操作            │  行为                                        │
├──────────────────┼─────────────────────────────────────────────┤
│  单击元素        │  选中该元素                                   │
│                  │  · 清除之前的选中                              │
│                  │  · 显示蓝色边框 + 8 个 resize handles         │
│                  │  · 右侧面板切换到该元素的属性                   │
│                  │  · 组件树高亮对应节点                          │
├──────────────────┼─────────────────────────────────────────────┤
│  双击元素        │  深层选择：进入该元素，选中其第一个子元素         │
│                  │  · 相当于按 Enter                             │
│                  │  · 如果没有子元素 → 进入文本编辑（如果是文本）   │
├──────────────────┼─────────────────────────────────────────────┤
│  Cmd + 单击      │  多选：将该元素加入/移出选中集合                │
│                  │  · 已选中 → 取消选中                          │
│                  │  · 未选中 → 加入选中                          │
│                  │  · 多选时右侧面板显示"多选属性"（交集可编辑）   │
├──────────────────┼─────────────────────────────────────────────┤
│  拖拽空白区域    │  框选：矩形区域内的元素全部选中                 │
│                  │  · 实时显示半透明蓝色框选矩形                   │
│                  │  · 松手后选中矩形范围内的所有同级元素            │
├──────────────────┼─────────────────────────────────────────────┤
│  单击空白区域    │  取消所有选中                                  │
├──────────────────┼─────────────────────────────────────────────┤
│  Enter          │  选中当前元素的第一个子元素（深入一层）          │
├──────────────────┼─────────────────────────────────────────────┤
│  Escape         │  选中当前元素的父元素（退出一层）               │
│                  │  · 如果已是 rootNode → 取消所有选中            │
└──────────────────┴─────────────────────────────────────────────┘
```

### 6.2 选中视觉反馈

```
选中元素的视觉效果（Canvas 覆盖层绘制）：

  ┌────────────────────────────────┐
  │  选中效果                       │
  │                                │
  │  ◻───────────────────────────◻ │   ◻ = resize handle (8×8px 蓝色方块)
  │  │                           │ │   ─ = 选中边框 (1px 蓝色实线 #0D99FF)
  │  │      被选中的元素           │ │
  │  │      (内容正常显示)         │ │
  │  │                           │ │
  │  ◻───────────────────────────◻ │
  │                                │
  │  四边中点也有 resize handle     │
  │  共 8 个：四角 + 四边中点       │
  │                                │
  │  选中元素上方显示信息条：        │
  │  ┌──────────────────────┐     │
  │  │ div.header  200×50   │     │   元素类型.名称 + 尺寸
  │  └──────────────────────┘     │
  │                                │
  └────────────────────────────────┘

hover 效果（未选中时 hover）：
  · 浅蓝色边框 (1px 蓝色虚线)
  · 元素名称 tooltip

多选效果：
  · 每个选中元素单独显示蓝色边框
  · 所有选中元素的外接矩形显示一个虚线大框
  · 大框的 resize handles 可以整体缩放
```

### 6.3 拖拽移动

```
拖拽移动交互流程：

  mousedown 在选中元素上
       │
       ├── 记录起始位置 startViewportX/Y
       │
       ▼
  mousemove（拖拽中）
       │
       ├── 计算 deltaX/Y = currentViewport - startViewport
       ├── 实时更新 Canvas 覆盖层：虚线轮廓在新位置
       ├── 显示对齐辅助线（如果命中兄弟元素的边缘/中心）
       ├── 显示间距标注（如果命中等距参考）
       └── 吸附处理（见第七节）
       │
       ▼
  mouseup
       │
       ├── 计算最终的 deltaX/Y（考虑吸附偏移）
       ├── 生成 Operation:
       │     {
       │       type: "updateStyle",
       │       params: {
       │         nodeId: selectedNode.id,
       │         styles: {
       │           left: `${originalLeft + deltaX}px`,
       │           top: `${originalTop + deltaY}px`
       │         }
       │       }
       │     }
       └── 执行 Operation → Schema 更新 → 画布重渲染

多选拖拽：
  · 所有选中元素同步移动相同的 deltaX/Y
  · 生成 batch Operation（多个 updateStyle）
  · 对齐线只参考选中集合的外接矩形
```

### 6.4 Resize 交互

```
Resize handles 布局（共 8 个）：

  NW ──── N ──── NE
  │                │
  W     content     E
  │                │
  SW ──── S ──── SE

各 handle 的 resize 行为：

  NW: 改 left + top + width + height（锚点：右下角不动）
  N:  改 top + height（锚点：底边不动）
  NE: 改 top + width + height（锚点：左下角不动）
  E:  改 width（锚点：左边不动）
  SE: 改 width + height（锚点：左上角不动）← 最常用
  S:  改 height（锚点：顶边不动）
  SW: 改 left + width + height（锚点：右上角不动）
  W:  改 left + width（锚点：右边不动）

约束键：
  · 按住 Shift → 等比缩放（保持宽高比）
  · 按住 Alt   → 以中心点为锚点缩放（双向同步拉伸）
  · Shift + Alt → 等比 + 中心点缩放

最小尺寸：width/height 不小于 1px
```

---

## 七、对齐与吸附系统

### 7.1 智能对齐线

```
拖动元素时，Canvas 覆盖层实时检测并绘制对齐线：

检测目标（与谁对齐）：
  · 同级兄弟元素的 4 条边 + 2 条中心线（水平中心、垂直中心）
  · 父容器的 4 条边 + 2 条中心线
  · （不检测非同级元素，避免干扰）

对齐方向（6 种）：
  · 左边对齐（被拖元素的 left = 参考元素的 left）
  · 右边对齐（被拖元素的 right = 参考元素的 right）
  · 水平居中对齐（被拖元素的 centerX = 参考元素的 centerX）
  · 顶部对齐（被拖元素的 top = 参考元素的 top）
  · 底部对齐（被拖元素的 bottom = 参考元素的 bottom）
  · 垂直居中对齐（被拖元素的 centerY = 参考元素的 centerY）

吸附阈值：5px（视口坐标）
  · 当被拖元素的某条边距离参考线 < 5px 时 → 吸附到该线
  · 多条线同时触发时 → 取最近的

视觉表现：
  · 对齐线：红色虚线（1px，从参考元素延伸到被拖元素）
  · 吸附时：被拖元素自动跳到对齐位置（微小偏移）
```

### 7.2 等距标注

```
当拖动元素时，如果与两个兄弟元素形成等距排列：

  ┌──────┐    ┌──────┐    ┌──────┐
  │  A   │←20→│ 拖拽  │←20→│  B   │
  └──────┘    └──────┘    └──────┘
                ↑
            粉色数字 "20"

检测方式：
  · 计算被拖元素与左邻居的间距 gapLeft
  · 计算被拖元素与右邻居的间距 gapRight
  · 如果 |gapLeft - gapRight| < 5px → 显示等距标注 + 吸附到等距位置
  · 上下方向同理
```

### 7.3 栅格吸附

```
栅格吸附（可选功能，用户可开关）：

  默认栅格大小：8px
  吸附规则：left/top 四舍五入到 gridSize 的整数倍
    snappedX = Math.round(localX / gridSize) * gridSize

  可在顶部工具栏/设置中调整：
    · 栅格大小：4 / 8 / 16 / 自定义
    · 栅格显示：关闭 / 点状 / 线状
    · 吸附开关：开 / 关

  与对齐线的优先级：
    对齐线吸附 > 栅格吸附
    即：如果同时触发对齐线和栅格，以对齐线为准
```

### 7.4 间距标注（Alt + Hover）

```
选中元素 A 后，按住 Alt 键并 hover 元素 B：

  ┌──────────┐
  │    A     │
  │ (选中)   │
  └──────────┘
       ↕ 24px    ← 粉色标注，显示垂直间距
  ┌──────────┐
  │    B     │
  │ (hover)  │
  └──────────┘
  ←── 16px ──→   ← 如果有水平间距也同时显示

标注内容：
  · A 到 B 的水平间距（A.right → B.left 或 A.left → B.right）
  · A 到 B 的垂直间距（A.bottom → B.top 或 A.top → B.bottom）
  · 用粉色数字 + 线段 + 箭头显示

这等价于 Figma 中 "选中一个元素后按 Alt hover 另一个" 的行为。
```

---

## 八、元素绘制交互

### 8.1 通用绘制流程

当用户从底部工具栏选择了绘制工具（容器/方块/文本等），在画布上拖拽创建元素：

```
工具激活后：
  · 鼠标光标变为十字准星 (+)
  · Canvas 覆盖层进入"绘制模式"

  mousedown（按下）
       │
       ├── 记录起始点 (startViewportX, startViewportY)
       ├── 确定父容器（见 5.4 的规则）
       │
       ▼
  mousemove（拖拽中）
       │
       ├── 计算当前矩形：
       │     x = min(startX, currentX)
       │     y = min(startY, currentY)
       │     w = |currentX - startX|
       │     h = |currentY - startY|
       │
       ├── Canvas 覆盖层实时绘制：
       │     · 半透明蓝色矩形（预览）
       │     · 右下角显示尺寸标注 "200 × 120"
       │
       └── 按住 Shift → 正方形约束（w = h = min(w, h)）
       │
       ▼
  mouseup（松手）
       │
       ├── 如果 w < 2 && h < 2 → 视为"点击创建"
       │     · 使用默认尺寸（200×50）
       │     · left/top = 点击位置
       │
       ├── 否则 → 使用拖拽的矩形
       │     · left/top/width/height = 拖拽计算值
       │
       ├── 转换为父容器坐标
       │
       ├── 生成 addElement Operation
       │
       ├── 新元素自动选中
       │
       └── 工具自动切回选择工具（V）
           （避免连续创建大量元素。按住工具快捷键可保持工具不切换）
```

### 8.2 各工具的创建行为

| 工具 | 快捷键 | 创建的 Schema 节点 | 默认样式 |
|------|--------|-------------------|---------|
| 容器 # | F | `div` | `display:flex; width:拖拽宽; height:拖拽高; background:#F5F5F5;` |
| 方块 □ | R | `div` | `position:absolute; width:拖拽宽; height:拖拽高; background:#E5E5E5;` |
| 文本 T | T | `span` 或 `p` | 点击创建 `span`（行内），拖拽创建 `p`（定宽段落，`width:拖拽宽`） |
| 组件 ◇ | — | 按选择的子类型 | `button: padding:8px 16px;` `input: width:200px; height:36px;` 等 |
| 注释 💬 | C | 注释节点（非渲染） | 不在 DOM 层渲染，仅 Canvas 覆盖层显示 📌 图标 |

### 8.3 从组件库拖入

```
从左侧/组件库面板拖入组件资产到画布：

  dragstart（组件库面板）
       │
       ├── 携带 templateId + 组件缩略图
       │
       ▼
  drag over 画布（Canvas 覆盖层）
       │
       ├── 显示组件缩略图跟随鼠标
       ├── 高亮当前 hover 的容器（可能的父容器）
       ├── 如果 hover 在 Flex 容器上 → 显示插入点指示器
       │
       ▼
  drop（松手）
       │
       ├── 确定父容器
       ├── 计算父容器坐标
       ├── 生成 instantiateTemplate Operation
       └── 新组件实例自动选中
```

---

## 九、Frame / Viewport / Canvas 三层模型

> 本节描述当前架构。完整方案与历史背景见
> [Frame / Viewport / Canvas 三层解耦 — 产品方案](./frame-viewport-canvas-redesign.md)
> 与 [技术实现](../../../03-tech/editor/frame-viewport-canvas-redesign.md)。

### 9.1 三层关系

```
画布（Canvas）= 编辑器中央那块"无限工作台"，支持平移/缩放
Frame        = Schema 自带的"物理舞台"，宽固定（设计基准），高自适应内容
Viewport     = 在 Frame 上叠的"观察窗口"，决定"按某个设备看哪一段"

  ┌─────────────────────────────────────────┐
  │  Canvas（灰色背景，平移缩放）             │
  │                                         │
  │       ┌──────────────────────┐          │
  │       │ Frame  width=375     │          │
  │       │ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ │  ← Viewport（虚线）
  │       │ ╎ Schema 内容       ╎ │     375×812
  │       │ ╎ （首屏）           ╎ │     仅观察用，不裁剪
  │       │ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ │          │
  │       │   下方还有更多内容    │          │
  │       │   设计师能直接看见    │          │
  │       │   并直接编辑          │          │
  │       └──────────────────────┘          │
  └─────────────────────────────────────────┘
```

核心约束：

- **Frame 宽度固定，高度由内容自然撑开**（`Screen.frame: { width, minHeight? }`）
- **Viewport 不裁剪 Frame**——它只是画布上一个虚线"取景框"，标识当前选中设备的首屏边界
- **Schema 完全独立于 Viewport**——切设备只换观察窗口，不动数据

### 9.2 视口切换行为

```
切换 Viewport（如 iPhone 15 → iPad Air）：

  1. 取景框（虚线）尺寸更新
  2. Frame 与 Schema 不变
  3. 顶部尺寸标识更新（带 ⓘ 提示，强调 Viewport 是观察窗口）
  4. 进入预览模式时按新 Viewport 模拟真机滚动

切换 Viewport ≠ 响应式适配（那是代码层面的事），
而是"换一只眼睛看同一块 Frame"。
```

### 9.3 节点角色（`node.role`）

为了让"产品意图"独立于 CSS：

| role | 含义 | 视图层处理 |
|---|---|---|
| `scroll-container` | 这块是滚动容器 | 预览/导出时 overflow:auto |
| `sticky-bottom` | 锚定到 Viewport 底部 | 编辑器把节点钉到 Viewport 取景框底部，导出代码翻成 `position: sticky; bottom: 0` |
| `sticky-top` | 锚定到 Viewport 顶部 | 同上，钉到顶 |

第一阶段渲染层只特殊处理 `sticky-bottom`，其他 role 字段写入 schema 但渲染不变。

### 9.4 越界节点

旧文案"超出视口范围 → 警告 ⚠️"已废弃。

新模型下"长内容超出 Viewport 首屏"是**正常状态**（长页面就是这样），编辑器顶部 `超出 Viewport` 角标只作信息提示，不再是错误。如需真机模拟裁剪，进入预览模式即可。

---

## 十、右键菜单

```
在选中元素上右键：

┌──────────────────────────────┐
│  复制                  Cmd+C │
│  粘贴                  Cmd+V │
│  复制副本              Cmd+D │
│  删除                Delete  │
│  ──────────────────────────  │
│  包裹为容器            Cmd+G │
│  解除包裹         Cmd+Shift+G│
│  ──────────────────────────  │
│  保存为组件资产...            │
│  分离组件实例                 │  ← 仅组件实例可见
│  ──────────────────────────  │
│  设计素材...                  │  → 打开素材设计子面板
│  ──────────────────────────  │
│  移到最前              ]     │
│  移到最后              [     │
│  上移一层           Cmd+]    │
│  下移一层           Cmd+[    │
└──────────────────────────────┘

在空白区域右键：

┌──────────────────────────────┐
│  粘贴                  Cmd+V │
│  ──────────────────────────  │
│  缩放到 100%          Cmd+1 │
│  适配画布             Cmd+0 │
│  ──────────────────────────  │
│  显示栅格                    │
│  栅格大小 ▸ [4] [8] [16]    │
└──────────────────────────────┘
```

---

## 十一、与其他子系统的接口约定

### 11.1 画布 → 工具栏 (02-toolbar)

```typescript
// 画布向工具栏暴露的接口
interface CanvasAPI {
  // 当前缩放/平移状态
  getViewState(): CanvasViewState;
  setZoom(zoom: number, centerX?: number, centerY?: number): void;
  zoomToFit(): void;

  // 当前工具
  getActiveTool(): ToolType;
  setActiveTool(tool: ToolType): void;

  // 选中状态
  getSelectedNodeIds(): string[];
  selectNodes(nodeIds: string[]): void;
  clearSelection(): void;
}
```

### 11.2 画布 → 属性面板 (03-property-panel)

```typescript
// 选中变化时通知属性面板
interface SelectionChangeEvent {
  selectedNodeIds: string[];
  selectedNodes: ComponentNode[];    // 完整节点数据
  commonStyles: Partial<CSSProperties>;  // 多选时的样式交集
}

// 属性面板编辑后通知画布
// → 通过 OperationExecutor 执行 updateStyle → Schema 更新 → 画布自动重渲染
// → 画布不需要接收属性面板的直接通知
```

### 11.3 画布 → 组件树 (08-layer-tree)

```typescript
// 双向联动
interface CanvasTreeSync {
  // 画布选中 → 组件树高亮
  onSelectionChange(nodeIds: string[]): void;

  // 组件树选中 → 画布高亮 + 滚动到可见
  scrollToNode(nodeId: string): void;

  // 画布 hover → 组件树高亮（轻量级）
  onHoverChange(nodeId: string | null): void;
}
```

### 11.4 画布 → 状态系统 (04-state-system)

```typescript
// 状态切换时画布需要做什么
// → 状态切换通过 Operation 更新 Schema
// → SchemaRenderer 自动响应 activeState 变化重渲染
// → 画布只需更新包围盒缓存 + 重绘 Canvas 覆盖层

// 画布需要知道当前的状态上下文，用于在 Canvas 覆盖层显示状态标记
interface StateContext {
  activeGlobalStates: Record<string, string>;  // 全局状态当前值
  activeComponentState: string;                // 选中组件的当前业务状态
  activeInteractionState: string;              // 选中组件的当前交互状态
}
```

---

## 十二、Schema / Operations 扩展需求

### 本子系统需要的已有 Operations

| Operation | 用途 |
|-----------|------|
| `addElement` | 绘制工具创建新元素 |
| `removeElement` | 删除元素 |
| `moveElement` | 拖拽改变父子关系（组件树调整） |
| `duplicateElement` | 复制副本 |
| `updateStyle` | 拖拽移动/resize/属性面板编辑 |
| `instantiateTemplate` | 从组件库拖入 |

### 本子系统需要新增的 Operations

| Operation | 说明 |
|-----------|------|
| `wrapInContainer` | 将选中元素包裹进新容器（Cmd+G） |
| `unwrapContainer` | 解除容器包裹（Cmd+Shift+G） |
| `reorderElement` | 调整元素在兄弟中的顺序（移到最前/最后/上移/下移） |
| `batchUpdateStyle` | 多选拖拽时的批量样式更新 |

### Schema 扩展

```
本子系统对 Schema 的影响很小，主要使用已有的 ComponentNode.styles。

唯一可能的扩展：
  · ComponentNode 增加 `locked: boolean` → 锁定后不可选中/拖拽
  · ComponentNode 增加 `visible: boolean` → 隐藏后不渲染（但组件树可见）
  · 这两个属性在组件树（08-layer-tree）中也会用到
```

---

## 十三、边界情况与异常处理

### 13.1 边界 case 清单

| 场景 | 预期行为 |
|------|---------|
| 画布为空（新建项目）| 显示空视口框 + 中心提示 "从工具栏拖入元素开始设计" |
| 选中元素被删除（被 AI 操作删除）| 自动清除选中状态，属性面板切到空状态 |
| 拖拽到视口外 | 允许（不强制约束），但 Canvas 覆盖层在视口边界显示虚线警告 |
| Resize 到 0×0 | 限制最小尺寸 1×1px |
| 极深层级嵌套（>10 层）| 允许但显示性能警告 |
| 极多元素（>500 个）| 虚拟化渲染：只渲染视口内可见的节点。对齐线只检测同级兄弟（不遍历全部） |
| 高 DPI 屏幕 | Canvas 覆盖层使用 `devicePixelRatio` 确保清晰度 |
| 浏览器窗口 resize | 重新计算 containerRect + zoomToFit（可选） |
| 元素有 overflow:hidden | 子元素超出部分在 DOM 层被裁切（正确行为）；Canvas 覆盖层仍可绘制选区 |
| 组件实例 hover | 整体高亮组件实例边界，不深入子元素（除非双击进入） |
| 文本工具点击 | 创建文本元素并立即进入文本编辑模式（光标闪烁、可输入） |

### 13.2 性能优化策略

```
关键性能指标：
  · 拖拽帧率 ≥ 60fps
  · hitTest 延迟 < 2ms
  · Schema 变更 → 画布更新 < 16ms（1 帧内）

优化手段：
  1. 节点包围盒缓存 → 避免每次 hitTest 都遍历 DOM
  2. Canvas 覆盖层用 requestAnimationFrame 节流
  3. 对齐线计算只检测同级兄弟（通常 < 20 个）
  4. 大量节点时启用虚拟化（只渲染视口内 + 缓冲区的节点）
  5. 拖拽时 Schema 不立即更新（只更新 Canvas 覆盖层的视觉预览）
     松手后才生成 Operation 更新 Schema
```

---

## 十四、MVP 与后期功能分界

### MVP（Phase 1，2 周）

- [x] 双层架构搭建（React DOM 渲染层 + Canvas 覆盖层）
- [x] SchemaRenderer：递归渲染 ComponentNode → DOM <!-- W1 -->
- [x] EditorOverlay：Canvas 覆盖层基础框架 <!-- W1 -->
- [x] 坐标系统：三套坐标转换 <!-- W1 -->
- [x] 选择工具：单击选中 + 拖拽移动 + 框选 <!-- W1 -->
- [x] 选中视觉反馈：蓝色边框 + resize handles <!-- W1 -->
- [x] Resize 交互：8 个 handle + Shift 等比缩放 <!-- W1/W2 -->
- [x] 方块工具：拖拽画 div <!-- W1 -->
- [x] 容器工具：拖拽画 Flex 容器 <!-- W1 -->
- [x] 缩放：Cmd+滚轮 + Cmd+0 + Cmd+1 <!-- W1 -->
- [x] 平移：Space+拖拽 <!-- W1 -->
- [x] 视口容器：显示设备视口边框 <!-- W1 -->
- [x] hitTest：节点包围盒缓存 + 点击命中判定 <!-- W1 -->

### Phase 2（增强编辑体验）

- [x] 对齐辅助线（兄弟元素边缘/中心对齐） <!-- W2 -->
- [x] 栅格吸附（8px 默认） <!-- W2 -->
- [x] 等距标注 <!-- W2 -->
- [x] 间距标注（Alt + Hover） <!-- W2 -->
- [x] 右键菜单 <!-- W2 -->
- [x] Shift 等比缩放 / Alt 中心缩放 <!-- W2 -->
- [x] 多选拖拽 / 多选 resize <!-- W2 -->
- [x] 深层选择（双击进入子元素） <!-- W2 Cmd+点击循环命中 -->
- [x] 文本工具：创建 + 行内编辑 <!-- W2 -->

### Phase 3（高级功能）

- [x] 从组件库拖入 <!-- W4 -->
- [ ] 布局流模式（Flex 容器内的拖拽排序）
- [x] 视口溢出检测与警告 <!-- W7-022 -->
- [x] 大量节点的虚拟化渲染 <!-- W7-021/W7-025 -->
- [x] 锁定/隐藏元素 <!-- W7-023 -->
- [x] 注释工具 <!-- W7-024 -->
- [x] 高 DPI 优化 <!-- W7-021 translateZ(0) + contain:layout -->

---

## 十五、核心设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 渲染方案？ | 双层架构（DOM + Canvas） | DOM 天然支持 CSS；Canvas 天然支持几何操作。分工明确 |
| hitTest 方案？ | 包围盒缓存（方案 A） | 性能好、无副作用、可扩展 |
| 事件分发？ | Canvas 层拦截所有事件 | 避免 DOM 事件冒泡与编辑交互冲突 |
| 定位模型？ | 相对父级的 absolute → 可转 flex | 保证导出代码质量 |
| 缩放中心点？ | 鼠标位置 | 符合 Figma/Sketch 的用户习惯 |
| Canvas 绘制大小？ | 固定视觉大小（除以 zoom） | 无论缩放如何，编辑控件保持一致的视觉尺寸 |
| 绘制后自动切工具？ | 切回选择工具 | 避免误操作连续创建，Figma 同理 |
| 父容器确定规则？ | 选中容器 > 选中元素的 parent > rootNode | 直觉且可预测 |
| 视口溢出？ | 不限制，仅警告 | 真实 CSS 允许 overflow，不应强制限制设计自由度 |
