# 16 - 素材编辑器画布增强方案

> **对照文档**：
> - 产品设计：`design_docs/02-product/editor/12-material-editor/README.md`
> - 技术方案：`design_docs/03-tech/editor/15-material-editor.md`
> - 实施路线：`design_docs/03-tech/editor/15-material-editor-ROADMAP.md`
>
> **核心问题**：当前素材编辑器画布直接等于组件宽高，用户操作空间受限；缺少智能对齐线、
> 网格吸附等专业编辑器必备的辅助工具；布尔运算等图形操作不够完善。

---

## 一、第一性原理回顾

### 1.1 素材编辑器的定位

```
素材编辑器 = "CSS 视觉效果构建器 + 轻量图形编辑器"
（不是 Figma，不是 Illustrator，但要满足 90% 日常 UI 素材创作需求）
```

### 1.2 用户反馈的核心痛点

```
痛点 1: 画布 = 元素尺寸 → 操作空间不够
  · 当组件只有 32×32（如图标），画布就只有那么大
  · 没法在元素边界之外做设计操作（如出血、阴影预览）
  · 应该是"可以看到元素边界，但画布比元素大"

痛点 2: 缺少专业编辑器的辅助工具
  · 没有智能对齐线（element-to-element snapping）
  · 现有网格只是视觉参考，缺少对齐线吸附
  · 缺少尺寸标注、间距标注

痛点 3: 图形操作能力不完善
  · 布尔运算是基于像素合成的（BooleanOps.ts），精度不够
  · 缺少"展开路径"、"路径偏移"等专业操作
  · 缺少对齐/分布操作（左对齐、居中、等间距）
```

### 1.3 设计原则

```
原则 1: 参考框模式 — "看得到边界，画得超边界"
  画布是无限大的工作区（或固定的较大空间），
  元素的实际尺寸以一个不可编辑的虚线框标示在画布中央，
  用户围绕这个框做设计。

原则 2: 与主编辑器一致的辅助体验
  主编辑器已有完善的 alignment + snapping + spacing hints 体系
  （design-engine/src/overlay/ 下 alignment.ts、snapping.ts、spacingHints.ts），
  素材编辑器的画布内应该提供类似体验（对齐线 + 间距标注 + 吸附）。

原则 3: 从像素到矢量的布尔运算升级
  当前 BooleanOps.ts 基于 Canvas globalCompositeOperation 做像素级合成，
  结果是位图而非矢量路径。应升级为基于 SVG 路径的布尔运算，
  保留矢量可编辑性。

原则 4: 渐进增强，不破坏现有功能
  所有增强作为新能力叠加，现有栅格、钢笔工具、图层系统等保持不变。
```

---

## 二、画布模式重设计 —— 参考框（Artboard Reference Frame）

### 2.1 核心概念

```
┌───────────────────────────────────────────────────────────────┐
│                        画布工作区                               │
│                   (固定大小 或 可缩放)                          │
│                                                               │
│         ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐                 │
│         ╎                                  ╎                 │
│         ╎     元素参考框                    ╎                 │
│         ╎     (不可操作，仅标示边界)         ╎                 │
│         ╎     与实际组件同宽同高             ╎                 │
│         ╎                                  ╎                 │
│         ╎         320 × 48 px              ╎                 │
│         ╎                                  ╎                 │
│         └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘                 │
│                                                               │
│     ← 用户可在参考框内外任意位置创建图形/图层 →                  │
│                                                               │
│   [撤销] [重做] [缩放: 100%]  [参考框: 320×48] [网格: ON]      │
└───────────────────────────────────────────────────────────────┘
```

**关键设计：**

| 属性 | 当前行为 | 新行为 |
|------|---------|--------|
| Fabric Canvas 尺寸 | = 元素宽高 | 固定工作区域（如 1200×900），不随元素变化 |
| 元素尺寸表达 | 画布整体就是元素 | 在画布中央绘制一个"参考框"（虚线矩形） |
| 参考框交互 | 不存在 | 不可选中、不可移动、不响应鼠标事件 |
| 导出时裁切 | 导出画布全部 | 导出参考框区域内的内容（可选"含出血"） |
| 画布背景 | 白色 | 参考框内白色/自定义色，参考框外灰色棋盘格 |

### 2.2 技术方案

#### 2.2.1 参考框渲染

```typescript
// features/material-editor/src/canvas/ReferenceFrame.ts

export interface ReferenceFrameConfig {
  /** 参考框宽度（= 元素实际渲染宽度） */
  width: number;
  /** 参考框高度（= 元素实际渲染高度） */
  height: number;
  /** 参考框在画布中的位置（默认居中） */
  x?: number;
  y?: number;
  /** 参考框边框颜色 */
  borderColor?: string;
  /** 参考框边框样式 */
  borderDash?: number[];
  /** 参考框内背景色 */
  innerBackground?: string;
  /** 参考框外背景色 */
  outerBackground?: string;
  /** 是否显示尺寸标注 */
  showDimensions?: boolean;
}

export class ReferenceFrame {
  private config: ReferenceFrameConfig;
  private fabricObjects: FabricObject[] = [];

  constructor(canvas: FabricCanvas, config: ReferenceFrameConfig) {
    this.config = config;
    this.render(canvas);
  }

  /**
   * 渲染参考框
   *
   * 实现方式：
   * 1. 在 Fabric Canvas 的最底层添加参考框矩形（虚线 + 不可交互）
   * 2. 使用 Fabric 的 afterRender 事件在 Canvas 底层绘制外部区域遮罩
   * 3. 参考框矩形设置为 selectable: false, evented: false
   */
  render(canvas: FabricCanvas): void {
    // ... 渲染逻辑见下文
  }

  /** 更新参考框尺寸 */
  resize(width: number, height: number): void { /* ... */ }

  /** 获取参考框区域（用于裁切导出） */
  getClipRect(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.config.x ?? 0,
      y: this.config.y ?? 0,
      width: this.config.width,
      height: this.config.height,
    };
  }
}
```

#### 2.2.2 画布工作区尺寸策略

```typescript
/**
 * 画布工作区尺寸策略 — 参考框模式
 *
 * 画布工作区 = max(元素尺寸 × 2.5, 最小工作区)
 * 参考框居中放置在工作区中
 */
function computeWorkspaceSize(
  elementWidth: number,
  elementHeight: number,
): { canvasWidth: number; canvasHeight: number; frameX: number; frameY: number } {
  const MIN_WORKSPACE = 800;
  const PADDING_RATIO = 2.5;  // 参考框周围留 1.5 倍空间

  const canvasWidth = Math.max(
    elementWidth * PADDING_RATIO,
    MIN_WORKSPACE,
  );
  const canvasHeight = Math.max(
    elementHeight * PADDING_RATIO,
    MIN_WORKSPACE,
  );

  // 参考框居中
  const frameX = (canvasWidth - elementWidth) / 2;
  const frameY = (canvasHeight - elementHeight) / 2;

  return { canvasWidth, canvasHeight, frameX, frameY };
}
```

#### 2.2.3 参考框外区域视觉处理

```
参考框内区域：白色/用户自定义背景色 + 网格
参考框外区域：半透明棋盘格图案（类似 Photoshop 透明区域）

视觉层次（从底到顶）：
  1. Canvas 背景色（灰色 #f5f5f5）
  2. 参考框外区域棋盘格（pointer-events: none）
  3. 参考框内背景（白色矩形，最底层图层）
  4. 参考框虚线边框
  5. 用户创建的图形/图层
  6. 网格覆盖层（pointer-events: none）
  7. 对齐线覆盖层（pointer-events: none）
  8. 标尺（pointer-events: none）
```

#### 2.2.4 导出裁切

```typescript
/**
 * 导出时按参考框裁切
 *
 * 用户在参考框外绘制的内容在导出时可选择：
 * A) 仅导出参考框内 — 按参考框区域裁切（默认）
 * B) 含出血导出 — 参考框 + 周围指定 padding
 * C) 导出全部 — 导出整个画布（含参考框外内容）
 */
interface ExportOptions {
  mode: 'clip-to-frame' | 'with-bleed' | 'full-canvas';
  bleedSize?: number;  // 出血尺寸（仅 with-bleed 模式）
  format: 'png' | 'svg' | 'webp';
  multiplier?: number;
}

function exportWithClip(
  canvas: FabricCanvas,
  frame: ReferenceFrame,
  options: ExportOptions,
): string | Blob {
  const clipRect = frame.getClipRect();

  switch (options.mode) {
    case 'clip-to-frame':
      return canvas.toDataURL({
        left: clipRect.x,
        top: clipRect.y,
        width: clipRect.width,
        height: clipRect.height,
        format: options.format,
        multiplier: options.multiplier ?? 2,
      });
    case 'with-bleed': {
      const bleed = options.bleedSize ?? 10;
      return canvas.toDataURL({
        left: clipRect.x - bleed,
        top: clipRect.y - bleed,
        width: clipRect.width + bleed * 2,
        height: clipRect.height + bleed * 2,
        format: options.format,
        multiplier: options.multiplier ?? 2,
      });
    }
    case 'full-canvas':
      return canvas.toDataURL({
        format: options.format,
        multiplier: options.multiplier ?? 2,
      });
  }
}
```

---

## 三、智能对齐线与吸附系统（Smart Guides）

### 3.1 当前状态对比

```
主编辑器（design-engine/src/overlay/）：
  ✅ computeAlignmentGuides() — 元素间对齐线
  ✅ computeSnap() — 对齐线吸附 + 网格吸附
  ✅ computeEqualSpacing() — 等间距检测
  ✅ drawSpacingHints() — 间距标注
  ✅ updateDragWithSnap() — 拖拽时吸附
  ✅ updateResizeWithSnap() — 缩放时吸附

素材编辑器（material-editor）：
  ✅ 栅格渲染（CanvasGrid.tsx — SVG 覆盖层）
  ✅ 栅格吸附（object:moving 事件 snap to grid）
  ❌ 元素间对齐线（不存在）
  ❌ 元素间间距标注（不存在）
  ❌ 参考框对齐（不存在）
  ❌ 等间距分布（不存在）
```

### 3.2 对齐线系统设计

```
对齐线类型：
  1. 元素 ↔ 元素：移动图形时，与其他图形的边缘/中线对齐
  2. 元素 ↔ 参考框：与参考框的边缘/中线对齐
  3. 元素 ↔ 画布中心：与画布中心线对齐

对齐触发点（每个元素 5 个）：
  · 左边缘、水平中心、右边缘
  · 上边缘、垂直中心、下边缘

吸附阈值：5px（与主编辑器一致）
对齐线颜色：#ff4d9f（粉色，与主编辑器一致）
```

#### 3.2.1 核心算法

```typescript
// features/material-editor/src/canvas/SmartGuides.ts

export interface SmartGuide {
  axis: 'horizontal' | 'vertical';
  position: number;
  type: 'edge' | 'center' | 'frame';
  /** 对齐线起点（沿垂直方向延伸） */
  from: number;
  /** 对齐线终点 */
  to: number;
}

export interface SmartGuideConfig {
  /** 吸附阈值（px） */
  threshold: number;
  /** 是否对齐其他元素 */
  alignToObjects: boolean;
  /** 是否对齐参考框 */
  alignToFrame: boolean;
  /** 是否对齐画布中心 */
  alignToCanvasCenter: boolean;
  /** 是否显示间距标注 */
  showSpacing: boolean;
}

/**
 * 智能对齐线引擎
 *
 * 在 Fabric Canvas 的 object:moving 事件中调用，
 * 计算当前移动对象与所有参考对象（其他图形 + 参考框）的对齐关系，
 * 返回需要吸附的偏移量和需要渲染的对齐线。
 */
export class SmartGuideEngine {
  private canvas: FabricCanvas;
  private config: SmartGuideConfig;
  private referenceFrame: ReferenceFrame | null;
  private guideLines: FabricObject[] = [];

  constructor(
    canvas: FabricCanvas,
    config: SmartGuideConfig,
    referenceFrame?: ReferenceFrame,
  ) {
    this.canvas = canvas;
    this.config = config;
    this.referenceFrame = referenceFrame ?? null;
    this.setupMovingListener();
  }

  private setupMovingListener(): void {
    this.canvas.on('object:moving', (e) => {
      if (!e.target) return;
      this.clearGuideLines();

      const movingObj = e.target;
      const allObjects = this.canvas.getObjects().filter(
        (o) => o !== movingObj && this.isUserObject(o),
      );

      // 收集所有参考矩形
      const refRects = this.collectReferenceRects(allObjects);

      // 如果启用参考框对齐，把参考框也加进去
      if (this.config.alignToFrame && this.referenceFrame) {
        const frameRect = this.referenceFrame.getClipRect();
        refRects.push({
          id: '__reference_frame__',
          left: frameRect.x,
          top: frameRect.y,
          width: frameRect.width,
          height: frameRect.height,
        });
      }

      // 如果启用画布中心对齐
      if (this.config.alignToCanvasCenter) {
        const cw = this.canvas.getWidth();
        const ch = this.canvas.getHeight();
        refRects.push({
          id: '__canvas_center__',
          left: cw / 2 - 0.5,
          top: ch / 2 - 0.5,
          width: 1,
          height: 1,
        });
      }

      // 计算对齐和吸附
      const result = this.computeAlignment(movingObj, refRects);

      // 应用吸附
      if (result.snapX !== undefined) {
        movingObj.set('left', result.snapX);
      }
      if (result.snapY !== undefined) {
        movingObj.set('top', result.snapY);
      }

      // 渲染对齐线
      this.renderGuideLines(result.guides);
    });

    // 移动结束时清除对齐线
    this.canvas.on('object:modified', () => {
      this.clearGuideLines();
    });
  }

  private computeAlignment(
    movingObj: FabricObject,
    refRects: Rect[],
  ): { snapX?: number; snapY?: number; guides: SmartGuide[] } {
    // 获取移动对象的包围盒
    const bound = movingObj.getBoundingRect();
    const mLeft = movingObj.left ?? 0;
    const mTop = movingObj.top ?? 0;
    const mRight = mLeft + bound.width;
    const mCenterX = mLeft + bound.width / 2;
    const mBottom = mTop + bound.height;
    const mCenterY = mTop + bound.height / 2;

    const threshold = this.config.threshold;
    const guides: SmartGuide[] = [];
    let snapX: number | undefined;
    let snapY: number | undefined;
    let bestDx = threshold + 1;
    let bestDy = threshold + 1;

    for (const ref of refRects) {
      const rLeft = ref.left;
      const rRight = ref.left + ref.width;
      const rCenterX = ref.left + ref.width / 2;
      const rTop = ref.top;
      const rBottom = ref.top + ref.height;
      const rCenterY = ref.top + ref.height / 2;

      // --- 垂直对齐线（x 轴） ---
      const vPairs = [
        { moving: mLeft, ref: rLeft, type: 'edge' as const },
        { moving: mLeft, ref: rCenterX, type: 'center' as const },
        { moving: mLeft, ref: rRight, type: 'edge' as const },
        { moving: mCenterX, ref: rCenterX, type: 'center' as const },
        { moving: mRight, ref: rLeft, type: 'edge' as const },
        { moving: mRight, ref: rRight, type: 'edge' as const },
      ];

      for (const pair of vPairs) {
        const dist = Math.abs(pair.moving - pair.ref);
        if (dist <= threshold && dist < bestDx) {
          bestDx = dist;
          snapX = mLeft + (pair.ref - pair.moving);
          guides.push({
            axis: 'vertical',
            position: pair.ref,
            type: pair.type,
            from: Math.min(mTop, rTop) - 20,
            to: Math.max(mBottom, rBottom) + 20,
          });
        }
      }

      // --- 水平对齐线（y 轴） ---
      const hPairs = [
        { moving: mTop, ref: rTop, type: 'edge' as const },
        { moving: mTop, ref: rCenterY, type: 'center' as const },
        { moving: mTop, ref: rBottom, type: 'edge' as const },
        { moving: mCenterY, ref: rCenterY, type: 'center' as const },
        { moving: mBottom, ref: rTop, type: 'edge' as const },
        { moving: mBottom, ref: rBottom, type: 'edge' as const },
      ];

      for (const pair of hPairs) {
        const dist = Math.abs(pair.moving - pair.ref);
        if (dist <= threshold && dist < bestDy) {
          bestDy = dist;
          snapY = mTop + (pair.ref - pair.moving);
          guides.push({
            axis: 'horizontal',
            position: pair.ref,
            type: pair.type,
            from: Math.min(mLeft, rLeft) - 20,
            to: Math.max(mRight, rRight) + 20,
          });
        }
      }
    }

    return { snapX, snapY, guides };
  }

  /** 渲染对齐线 */
  private renderGuideLines(guides: SmartGuide[]): void {
    for (const guide of guides) {
      const line = guide.axis === 'vertical'
        ? new Line([guide.position, guide.from, guide.position, guide.to], {
            stroke: '#ff4d9f',
            strokeWidth: 1,
            strokeDashArray: [4, 3],
            selectable: false,
            evented: false,
          })
        : new Line([guide.from, guide.position, guide.to, guide.position], {
            stroke: '#ff4d9f',
            strokeWidth: 1,
            strokeDashArray: [4, 3],
            selectable: false,
            evented: false,
          });

      (line as any).name = '__smart_guide__';
      this.guideLines.push(line);
      this.canvas.add(line);
    }
    this.canvas.renderAll();
  }

  /** 清除对齐线 */
  clearGuideLines(): void {
    for (const line of this.guideLines) {
      this.canvas.remove(line);
    }
    this.guideLines = [];
  }

  /** 判断是否为用户创建的对象（排除辅助元素） */
  private isUserObject(obj: FabricObject): boolean {
    const name = (obj as any).name as string;
    if (!name) return true;
    return !name.startsWith('__');
  }
}
```

### 3.3 间距标注

```typescript
/**
 * 间距标注 — 选中对象后按住 Alt 键显示到相邻对象/参考框的间距
 *
 * 复用主编辑器 spacingHints 的设计语言：
 * - 粉色虚线连接两个对象
 * - 在虚线中点显示像素距离数字
 * - 按住 Alt 激活，松开消失
 */
export class SpacingAnnotator {
  // 监听 Alt 键 + 选中状态
  // 计算到最近邻对象和参考框的四个方向距离
  // 绘制粉色虚线 + 数字标注
}
```

---

## 四、对齐与分布操作

### 4.1 对齐操作

当选中多个对象时，提供以下对齐操作（工具栏或右键菜单）：

```
┌─────────────────────────────────────────────────┐
│  对齐操作:                                        │
│  [←] 左对齐   [↔] 水平居中   [→] 右对齐          │
│  [↑] 顶对齐   [↕] 垂直居中   [↓] 底对齐          │
│                                                   │
│  分布操作（选中 3 个以上时可用）:                    │
│  [⇔] 水平等间距   [⇕] 垂直等间距                   │
│                                                   │
│  相对于:                                           │
│  ○ 选区包围盒（默认）                               │
│  ○ 参考框                                          │
└─────────────────────────────────────────────────┘
```

#### 4.1.1 技术实现

```typescript
// features/material-editor/src/canvas/AlignDistribute.ts

export type AlignType =
  | 'align-left'
  | 'align-center-h'
  | 'align-right'
  | 'align-top'
  | 'align-center-v'
  | 'align-bottom';

export type DistributeType =
  | 'distribute-h'    // 水平等间距
  | 'distribute-v';   // 垂直等间距

export type AlignRelativeTo =
  | 'selection'       // 相对于选区包围盒
  | 'frame';          // 相对于参考框

/**
 * 对齐操作
 */
export function alignObjects(
  canvas: FabricCanvas,
  objects: FabricObject[],
  type: AlignType,
  relativeTo: AlignRelativeTo,
  frame?: ReferenceFrame,
): void {
  if (objects.length < 2 && relativeTo === 'selection') return;
  if (objects.length < 1) return;

  // 计算参考边界
  let refBound: { left: number; top: number; width: number; height: number };

  if (relativeTo === 'frame' && frame) {
    refBound = frame.getClipRect();
  } else {
    // 使用所有选中对象的联合包围盒
    const bounds = objects.map((o) => o.getBoundingRect());
    const left = Math.min(...bounds.map((b) => b.left));
    const top = Math.min(...bounds.map((b) => b.top));
    const right = Math.max(...bounds.map((b) => b.left + b.width));
    const bottom = Math.max(...bounds.map((b) => b.top + b.height));
    refBound = { left, top, width: right - left, height: bottom - top };
  }

  // 执行对齐
  for (const obj of objects) {
    const bound = obj.getBoundingRect();
    switch (type) {
      case 'align-left':
        obj.set('left', (obj.left ?? 0) + (refBound.left - bound.left));
        break;
      case 'align-center-h':
        obj.set('left', (obj.left ?? 0) +
          (refBound.left + refBound.width / 2 - (bound.left + bound.width / 2)));
        break;
      case 'align-right':
        obj.set('left', (obj.left ?? 0) +
          (refBound.left + refBound.width - (bound.left + bound.width)));
        break;
      case 'align-top':
        obj.set('top', (obj.top ?? 0) + (refBound.top - bound.top));
        break;
      case 'align-center-v':
        obj.set('top', (obj.top ?? 0) +
          (refBound.top + refBound.height / 2 - (bound.top + bound.height / 2)));
        break;
      case 'align-bottom':
        obj.set('top', (obj.top ?? 0) +
          (refBound.top + refBound.height - (bound.top + bound.height)));
        break;
    }
    obj.setCoords();
  }

  canvas.renderAll();
}

/**
 * 等间距分布
 */
export function distributeObjects(
  canvas: FabricCanvas,
  objects: FabricObject[],
  type: DistributeType,
): void {
  if (objects.length < 3) return;

  const bounds = objects.map((obj, idx) => ({
    idx,
    obj,
    bound: obj.getBoundingRect(),
  }));

  if (type === 'distribute-h') {
    bounds.sort((a, b) => a.bound.left - b.bound.left);
    const totalWidth = bounds.reduce((sum, b) => sum + b.bound.width, 0);
    const containerLeft = bounds[0].bound.left;
    const containerRight = bounds[bounds.length - 1].bound.left
                           + bounds[bounds.length - 1].bound.width;
    const gap = (containerRight - containerLeft - totalWidth) / (bounds.length - 1);

    let x = containerLeft;
    for (const item of bounds) {
      item.obj.set('left', (item.obj.left ?? 0) + (x - item.bound.left));
      item.obj.setCoords();
      x += item.bound.width + gap;
    }
  } else {
    bounds.sort((a, b) => a.bound.top - b.bound.top);
    const totalHeight = bounds.reduce((sum, b) => sum + b.bound.height, 0);
    const containerTop = bounds[0].bound.top;
    const containerBottom = bounds[bounds.length - 1].bound.top
                            + bounds[bounds.length - 1].bound.height;
    const gap = (containerBottom - containerTop - totalHeight) / (bounds.length - 1);

    let y = containerTop;
    for (const item of bounds) {
      item.obj.set('top', (item.obj.top ?? 0) + (y - item.bound.top));
      item.obj.setCoords();
      y += item.bound.height + gap;
    }
  }

  canvas.renderAll();
}
```

---

## 五、布尔运算增强

### 5.1 当前问题

```
当前实现（BooleanOps.ts）：
  · 基于 Canvas globalCompositeOperation 的像素级合成
  · 结果是位图（PNG DataURL → FabricImage），不是矢量
  · 无法对结果再次编辑路径
  · 精度受画布分辨率限制

目标：
  · 基于 SVG 路径的矢量布尔运算
  · 结果保持为 Fabric.js Path 对象（可再编辑）
  · 保留矢量可缩放性
```

### 5.2 升级方案：基于 paper.js 的 SVG 路径布尔运算

```typescript
// features/material-editor/src/canvas/VectorBooleanOps.ts

/**
 * 矢量布尔运算 — 基于 paper.js 的路径合成
 *
 * paper.js 内置了完善的路径布尔运算：
 *   path.unite(other)     — 合并（Union）
 *   path.subtract(other)  — 减去（Subtract）
 *   path.intersect(other) — 相交（Intersect）
 *   path.exclude(other)   — 排除（Exclude / XOR）
 *   path.divide(other)    — 分割（得到所有子区域）
 *
 * 技术方案：
 *   1. 将 Fabric.js 对象转换为 SVG path d 字符串
 *   2. 在 paper.js 离屏 canvas 中创建 Path 对象
 *   3. 执行布尔运算
 *   4. 将结果 path 的 d 字符串转回 Fabric.js Path 对象
 *
 * 依赖：paper (npm package，~450KB uncompressed，仅用于布尔运算)
 * 可以用 dynamic import 按需加载，不影响首屏体积。
 */

import type { BooleanOpType } from './BooleanOps';

export type VectorBooleanOpType = BooleanOpType | 'divide';

/**
 * 将 Fabric.js 对象转为 SVG path d 字符串
 *
 * 支持的对象类型：
 * - Rect → 转为矩形路径（含圆角）
 * - Ellipse → 转为椭圆路径
 * - Polygon → 转为多边形路径
 * - Path → 直接使用 path.d
 * - Group → 递归合并
 */
function fabricObjectToSVGPath(obj: FabricObject): string {
  // ... 根据 obj.type 分别转换
}

/**
 * 执行矢量布尔运算
 *
 * @returns Fabric.js Path 对象（矢量可编辑）
 */
export async function performVectorBooleanOp(
  canvas: FabricCanvas,
  objA: FabricObject,
  objB: FabricObject,
  operation: VectorBooleanOpType,
): Promise<FabricObject | FabricObject[] | null> {
  // 1. 动态导入 paper.js
  const paper = await import('paper');

  // 2. 创建离屏 paper.js 画布
  const paperCanvas = document.createElement('canvas');
  paper.setup(paperCanvas);

  // 3. 将 Fabric 对象转为 paper.js Path
  const svgA = fabricObjectToSVGPath(objA);
  const svgB = fabricObjectToSVGPath(objB);
  const pathA = new paper.CompoundPath(svgA);
  const pathB = new paper.CompoundPath(svgB);

  // 4. 执行布尔运算
  let result: paper.PathItem;
  switch (operation) {
    case 'union':     result = pathA.unite(pathB);     break;
    case 'subtract':  result = pathA.subtract(pathB);  break;
    case 'intersect': result = pathA.intersect(pathB); break;
    case 'exclude':   result = pathA.exclude(pathB);   break;
    case 'divide': {
      // divide 返回多个子路径
      const divided = pathA.divide(pathB);
      // 转为多个 Fabric.js Path 对象
      const results: FabricObject[] = [];
      if (divided instanceof paper.CompoundPath) {
        for (const child of divided.children) {
          const d = child.pathData;
          results.push(createFabricPath(d, objA));
        }
      }
      return results;
    }
  }

  // 5. 将结果转回 Fabric.js Path
  const resultD = result.pathData;
  return createFabricPath(resultD, objA);
}

function createFabricPath(d: string, reference: FabricObject): FabricObject {
  const path = new Path(d, {
    fill: reference.fill,
    stroke: reference.stroke,
    strokeWidth: reference.strokeWidth,
    selectable: true,
    evented: true,
  });
  (path as any).name = '布尔运算结果';
  return path;
}
```

### 5.3 布尔运算 UI 入口

```
位置 1: 工具栏上方菜单
  选中 2 个对象 → 工具栏顶部显示布尔运算按钮组：
  [⊕ 合并] [⊖ 减去] [⊗ 相交] [⊘ 排除] [⊞ 分割]

位置 2: 右键菜单
  选中 2 个对象 → 右键 → "布尔运算" 子菜单

位置 3: 快捷键
  Ctrl/⌘ + Shift + U — 合并
  Ctrl/⌘ + Shift + S — 减去
  Ctrl/⌘ + Shift + I — 相交
  Ctrl/⌘ + Shift + E — 排除
```

### 5.4 回退策略

```
矢量布尔运算在以下情况下回退到像素合成：
  1. paper.js 加载失败（网络问题）
  2. 对象类型不支持矢量转换（如 FabricImage）
  3. 路径转换出错

回退时使用现有的 BooleanOps.ts 像素合成方案，
并在 UI 上提示："当前使用像素合成，结果为位图"
```

---

## 六、路径高级操作

### 6.1 新增路径操作

```
┌────────────────────────────────────────────────────────────────┐
│  路径操作（右键菜单 / 顶部工具栏）                                │
│                                                                │
│  基础操作（已有）：                                              │
│  ✅ 钢笔工具绘制（直线段 + 贝塞尔曲线）                          │
│  ✅ 路径编辑模式（双击进入，拖拽锚点和控制手柄）                  │
│  ✅ 闭合/开放路径                                               │
│                                                                │
│  新增操作：                                                     │
│  · 展开描边（Outline Stroke）                                   │
│    将有描边的路径转换为填充路径                                   │
│    stroke + path → filled compound path                         │
│                                                                │
│  · 路径偏移（Offset Path）                                      │
│    生成等距偏移路径（内/外偏移）                                  │
│    常用于制作边框效果、内发光轮廓等                               │
│                                                                │
│  · 路径简化（Simplify Path）                                    │
│    减少路径锚点数量，保持形状近似                                 │
│    常用于清理铅笔工具绘制的过度密集锚点                           │
│                                                                │
│  · 路径平滑（Smooth Path）                                      │
│    将直线段锚点转为曲线锚点                                      │
│    自动添加合理的控制手柄                                        │
│                                                                │
│  · 翻转路径方向（Reverse Path）                                  │
│    翻转路径的绘制方向（影响文字沿路径排列方向）                   │
│                                                                │
│  · 拆解路径（Break Apart）                                      │
│    将复合路径拆分为多个独立子路径                                 │
│                                                                │
│  · 连接路径（Join Paths）                                       │
│    选中两个开放路径，首尾相连合为一条                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 展开描边实现

```typescript
// features/material-editor/src/canvas/PathOperations.ts

/**
 * 展开描边 — 将有描边宽度的路径转换为填充的封闭路径
 *
 * 原理：使用 paper.js 的 path.expand(strokeWidth) 方法，
 * 或手动沿法线方向偏移路径点。
 */
export async function outlineStroke(
  pathObj: Path,
  strokeWidth?: number,
): Promise<Path | null> {
  const paper = await import('paper');
  const paperCanvas = document.createElement('canvas');
  paper.setup(paperCanvas);

  const sw = strokeWidth ?? (pathObj.strokeWidth ?? 1);
  const d = getPathD(pathObj);
  const paperPath = new paper.Path(d);
  paperPath.strokeWidth = sw;

  // paper.js 的展开描边
  const expanded = PaperOffset.offset(paperPath, sw / 2, { join: 'round' });

  if (!expanded) return null;

  const resultD = expanded.pathData;
  const result = new Path(resultD, {
    fill: pathObj.stroke ?? '#333',
    stroke: 'transparent',
    strokeWidth: 0,
    selectable: true,
    evented: true,
  });
  (result as any).name = '展开描边';
  return result;
}
```

---

## 七、实施路线图

### Phase F：参考框模式（优先级最高）

> **核心目标**：解决"画布 = 元素大小"的根本问题

| 任务 | 描述 | 估时 | 状态 |
|------|------|------|------|
| F.1.1 | `ReferenceFrame.ts` — 参考框类，渲染虚线矩形 + 尺寸标注 | 4h | ⬜ |
| F.1.2 | `computeWorkspaceSize()` — 画布工作区尺寸计算 | 1h | ⬜ |
| F.1.3 | 修改 `MaterialEditorCore` 构造函数，支持工作区 + 参考框双尺寸 | 2h | ⬜ |
| F.1.4 | 参考框外区域视觉处理（半透明棋盘格遮罩） | 2h | ⬜ |
| F.1.5 | 修改 `MaterialEditorModal` 初始化流程，使用新的尺寸策略 | 2h | ⬜ |
| F.1.6 | 导出裁切 — 按参考框区域裁切导出 | 2h | ⬜ |
| F.1.7 | 参考框尺寸手动调整（底部工具栏输入框） | 1h | ⬜ |

### Phase G：智能对齐线

> **核心目标**：提供与主编辑器一致的辅助体验

| 任务 | 描述 | 估时 | 状态 |
|------|------|------|------|
| G.1.1 | `SmartGuideEngine` — 对齐线计算引擎 | 4h | ⬜ |
| G.1.2 | 对齐线渲染（粉色虚线 + 端点标记） | 2h | ⬜ |
| G.1.3 | 参考框对齐（元素 ↔ 参考框边缘/中线） | 1h | ⬜ |
| G.1.4 | `SpacingAnnotator` — Alt 键间距标注 | 3h | ⬜ |
| G.1.5 | 网格吸附 + 对齐线吸附优先级合并 | 1h | ⬜ |
| G.1.6 | 对齐线开关（画布工具栏） | 0.5h | ⬜ |

### Phase H：对齐与分布

> **核心目标**：多选对象的精确排列

| 任务 | 描述 | 估时 | 状态 |
|------|------|------|------|
| H.1.1 | `AlignDistribute.ts` — 6 种对齐 + 2 种分布 | 3h | ⬜ |
| H.1.2 | 对齐操作 UI — 工具栏按钮组（选中多个对象时显示） | 2h | ⬜ |
| H.1.3 | 右键菜单集成 | 1h | ⬜ |
| H.1.4 | "相对于参考框"对齐模式 | 1h | ⬜ |

### Phase I：布尔运算增强

> **核心目标**：从像素合成升级为矢量布尔运算

| 任务 | 描述 | 估时 | 状态 |
|------|------|------|------|
| I.1.1 | 添加 `paper` 依赖（动态导入，不增加首屏体积） | 1h | ⬜ |
| I.1.2 | `VectorBooleanOps.ts` — Fabric → paper → Fabric 转换管道 | 6h | ⬜ |
| I.1.3 | 支持 divide（分割）操作 | 2h | ⬜ |
| I.1.4 | 回退策略（paper.js 不可用时回退到像素合成） | 1h | ⬜ |
| I.1.5 | 布尔运算 UI 入口（工具栏 + 右键菜单 + 快捷键） | 2h | ⬜ |
| I.1.6 | 修改 `MaterialEditorCore.performBooleanOp()` 使用新实现 | 2h | ⬜ |

### Phase J：路径高级操作

> **核心目标**：提供专业级的路径编辑能力

| 任务 | 描述 | 估时 | 状态 |
|------|------|------|------|
| J.1.1 | `PathOperations.ts` — 路径操作工具集 | 6h | ⬜ |
| J.1.2 | 展开描边（Outline Stroke） | 3h | ⬜ |
| J.1.3 | 路径偏移（Offset Path） | 3h | ⬜ |
| J.1.4 | 路径简化（Simplify Path） | 2h | ⬜ |
| J.1.5 | 路径平滑（Smooth Path） | 2h | ⬜ |
| J.1.6 | 连接路径 / 拆解路径 | 2h | ⬜ |
| J.1.7 | 路径操作 UI 入口 | 2h | ⬜ |

---

## 八、文件改动清单

### 8.1 新增文件

| 文件 | 功能 |
|------|------|
| `features/material-editor/src/canvas/ReferenceFrame.ts` | 参考框系统 |
| `features/material-editor/src/canvas/SmartGuides.ts` | 智能对齐线引擎 |
| `features/material-editor/src/canvas/SpacingAnnotator.ts` | 间距标注 |
| `features/material-editor/src/canvas/AlignDistribute.ts` | 对齐与分布操作 |
| `features/material-editor/src/canvas/VectorBooleanOps.ts` | 矢量布尔运算 |
| `features/material-editor/src/canvas/PathOperations.ts` | 路径高级操作 |

### 8.2 修改文件

| 文件 | 改动内容 |
|------|---------|
| `MaterialEditorCore.ts` | 新增参考框支持、集成 SmartGuides、升级布尔运算 |
| `MaterialEditorModal.tsx` | 初始化流程适配参考框模式、工作区尺寸策略 |
| `CanvasEditor.tsx` | 渲染参考框外区域视觉处理 |
| `CanvasGrid.tsx` | 网格范围限定在参考框内 |
| `ExportBar.tsx` | 导出裁切模式选择（参考框内/含出血/全画布） |
| `LeftToolbar.tsx` | 新增对齐/分布按钮组、布尔运算按钮 |
| `RightPropertyPanel.tsx` | 路径操作菜单入口 |
| `types.ts` | 新增 VectorBooleanOpType、AlignType 等类型 |
| `package.json` | 新增 paper 依赖（动态导入） |

---

## 九、风险评估与决策点

### 9.1 paper.js 依赖

```
pros:
  · 路径布尔运算经过多年验证，精度高
  · 支持 CompoundPath 等复杂路径
  · 动态导入不影响首屏

cons:
  · 增加 ~450KB（压缩后 ~120KB）包体积
  · paper.js 有自己的 Canvas，需要创建离屏实例

替代方案:
  · clipper-lib（仅做路径布尔，更轻量 ~40KB）
  · 手写路径布尔（工程量极大，不推荐）

决策: 推荐使用 paper.js，性价比最高。
      如果对包体积敏感，可考虑 clipper-lib + 自研路径偏移。
```

### 9.2 参考框模式的迁移

```
风险: 现有保存的工程文件假设画布 = 元素尺寸
      改为参考框模式后需要兼容旧工程

方案: 在 CanvasProjectFile 中新增 version: 3 字段
      v2 工程文件加载时自动转换为参考框模式：
      · 画布尺寸 → 参考框尺寸
      · 工作区 → 根据参考框计算
      · 现有对象位置 → 平移到参考框中心
```

### 9.3 性能考量

```
智能对齐线需要在每次 object:moving 事件中计算，
当画布上有大量对象（>50）时可能有性能问题。

优化策略:
  1. 空间索引：使用四叉树(Quadtree)快速查找附近对象
  2. 可见区域过滤：只计算视口内的对象
  3. 阈值过滤：先用大阈值快速排除不可能对齐的对象
  4. debounce：适度降低计算频率（requestAnimationFrame）
```

---

## 十、快捷键汇总

| 快捷键 | 功能 | 阶段 |
|--------|------|------|
| `Alt` + 移动 | 显示间距标注 | Phase G |
| `Ctrl/⌘ + Shift + ;` | 切换对齐线开关 | Phase G |
| `Ctrl/⌘ + Shift + '` | 切换网格吸附开关 | 已有 |
| `Ctrl/⌘ + Shift + U` | 布尔运算 — 合并 | Phase I |
| `Ctrl/⌘ + Shift + S` | 布尔运算 — 减去 | Phase I |
| `Ctrl/⌘ + Shift + I` | 布尔运算 — 相交 | Phase I |
| `Ctrl/⌘ + Shift + E` | 布尔运算 — 排除 | Phase I |
| `Ctrl/⌘ + Alt + ←` | 左对齐 | Phase H |
| `Ctrl/⌘ + Alt + →` | 右对齐 | Phase H |
| `Ctrl/⌘ + Alt + ↑` | 顶对齐 | Phase H |
| `Ctrl/⌘ + Alt + ↓` | 底对齐 | Phase H |
| `Ctrl/⌘ + Alt + C` | 水平居中 | Phase H |
| `Ctrl/⌘ + Alt + M` | 垂直居中 | Phase H |

---

## 十一、验收标准

### Phase F 验收：

- [ ] 打开素材编辑器后，画布工作区明显大于元素实际尺寸
- [ ] 可看到带虚线的参考框，标注元素实际宽高
- [ ] 参考框不可选中、不可移动、不响应鼠标
- [ ] 参考框外区域显示棋盘格半透明遮罩
- [ ] 用户可在参考框内外任意位置绘制图形
- [ ] 导出时默认裁切到参考框区域
- [ ] 可手动修改参考框尺寸
- [ ] 旧工程文件加载后自动转换为参考框模式

### Phase G 验收：

- [ ] 移动对象时，自动出现粉色对齐线（与其他对象/参考框对齐）
- [ ] 对齐时有明确的吸附手感（自动跳到对齐位置）
- [ ] 按住 Alt 时显示到相邻对象/参考框的间距数字
- [ ] 对齐线可通过工具栏开关关闭
- [ ] 对齐线与网格吸附可同时工作（对齐线优先级更高）

### Phase H 验收：

- [ ] 选中 2+ 对象时，工具栏显示对齐/分布按钮
- [ ] 6 种对齐操作正确（左/中/右/上/中/下）
- [ ] 3+ 对象可执行水平/垂直等间距分布
- [ ] 可切换"相对于选区"和"相对于参考框"两种模式

### Phase I 验收：

- [ ] 布尔运算结果为矢量 Path 对象（可进入路径编辑模式）
- [ ] 合并/减去/相交/排除/分割 5 种操作均正确
- [ ] paper.js 不可用时自动回退到像素合成
- [ ] 布尔运算有工具栏入口、右键菜单入口、快捷键

---

*文档版本: v1.0 | 创建日期: 2026-04-07 | 作者: AI + 产品反馈*
