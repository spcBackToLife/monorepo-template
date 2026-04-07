/**
 * 参考框系统 — Phase F: 画布模式重设计
 *
 * 核心概念：
 *   画布工作区 ≠ 元素尺寸。工作区是一个较大的空间，
 *   元素实际尺寸以一个参考框标示在画布中央。
 *   参考框背景矩形是画布上一个**真正的元素**（最底层）：
 *     - 可选中，可设置填充色/透明度
 *     - 可与其他元素做布尔运算（交集/并集/补等）
 *     - 在图层面板中显示（名称: "参考框"）
 *     - 导出时只导出这个元素范围大小的图
 *     - 不能移动/缩放/旋转/删除/改变大小形状
 *   虚线边框和尺寸标注由辅助对象（不可交互）渲染。
 *
 * 视觉层次（从底到顶）：
 *   1. Canvas 背景色（灰色 #f0f1f3）
 *   2. 参考框背景矩形（真实可交互元素，最底层）
 *   3. 用户创建的图形/图层
 *   4. 虚线边框 + 四角标记（不可交互辅助）
 *   5. 参考框外区域半透明遮罩（CanvasGrid SVG）
 *   6. 尺寸标注文字（afterRender 钩子）
 */

import {
  Rect,
  Line,
  type Canvas as FabricCanvas,
  type FabricObject,
} from 'fabric';

/** 参考框配置 */
export interface ReferenceFrameConfig {
  /** 参考框宽度（= 元素实际渲染宽度） */
  width: number;
  /** 参考框高度（= 元素实际渲染高度） */
  height: number;
  /** 参考框在画布中的位置 X（默认居中） */
  x?: number;
  /** 参考框在画布中的位置 Y（默认居中） */
  y?: number;
  /** 参考框边框颜色 */
  borderColor?: string;
  /** 参考框边框样式（虚线间隔） */
  borderDash?: number[];
  /** 参考框内背景色 */
  innerBackground?: string;
  /** 是否显示尺寸标注 */
  showDimensions?: boolean;
}

/** 默认参考框配置 */
const DEFAULT_CONFIG: Required<Omit<ReferenceFrameConfig, 'x' | 'y'>> = {
  width: 320,
  height: 200,
  borderColor: '#9ca3af',
  borderDash: [6, 4],
  innerBackground: '#ffffff',
  showDimensions: true,
};

/** 参考框辅助对象名称前缀（虚线边框、四角标记等不可交互辅助元素） */
const FRAME_PREFIX = '__reference_frame__';

/** 参考框背景矩形的名称（这是真正的画布元素，可交互） */
const FRAME_BG_NAME = '参考框';

/**
 * 计算画布工作区尺寸
 *
 * 工作区 = max(参考框尺寸 × paddingRatio, 最小工作区)
 * 参考框居中放置在工作区中
 */
export function computeWorkspaceSize(
  elementWidth: number,
  elementHeight: number,
  options?: {
    minWorkspace?: number;
    paddingRatio?: number;
  },
): {
  canvasWidth: number;
  canvasHeight: number;
  frameX: number;
  frameY: number;
} {
  const minWS = options?.minWorkspace ?? 800;
  const ratio = options?.paddingRatio ?? 2.5;

  const canvasWidth = Math.max(elementWidth * ratio, minWS);
  const canvasHeight = Math.max(elementHeight * ratio, minWS);

  // 参考框居中
  const frameX = (canvasWidth - elementWidth) / 2;
  const frameY = (canvasHeight - elementHeight) / 2;

  return { canvasWidth, canvasHeight, frameX, frameY };
}

/**
 * 参考框类
 *
 * 在 Fabric.js Canvas 上渲染一个不可交互的虚线矩形，
 * 标示元素的实际边界。
 */
export class ReferenceFrame {
  private canvas: FabricCanvas;
  private config: Required<ReferenceFrameConfig>;
  private frameObjects: FabricObject[] = [];
  private _disposed = false;
  /** 内部背景矩形的引用（用于设置/获取填充色） */
  private innerBgRect: FabricObject | null = null;

  constructor(canvas: FabricCanvas, config: ReferenceFrameConfig) {
    this.canvas = canvas;

    // 计算参考框位置（默认居中）
    const canvasW = canvas.getWidth();
    const canvasH = canvas.getHeight();
    const x = config.x ?? (canvasW - config.width) / 2;
    const y = config.y ?? (canvasH - config.height) / 2;

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      x,
      y,
    };

    this.render();
  }

  /**
   * 渲染参考框
   *
   * 创建以下元素：
   * 1. 参考框背景矩形（真实画布元素，可选中/填充，不可移动/缩放/删除）
   * 2. 虚线边框矩形（不可交互辅助）
   * 3. 四角标记线（不可交互辅助）
   * 4. 尺寸标注文字（afterRender 钩子）
   */
  private render(): void {
    this.clear();
    const { x, y, width, height, borderColor, borderDash, innerBackground, showDimensions } = this.config;

    // 1. 参考框背景矩形 — 真正的画布元素
    //    可选中（设置填充色/透明度/与其他元素做布尔运算等）
    //    不可移动/缩放/旋转/删除/改变大小
    const innerBg = new Rect({
      left: x,
      top: y,
      width,
      height,
      fill: innerBackground,
      stroke: 'transparent',
      strokeWidth: 0,
      selectable: true,
      evented: true,
      // 禁止所有变换操作
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,      // 不显示缩放控制点
      hasBorders: true,        // 选中时显示边框
      excludeFromExport: false, // 导出时包含（它就是素材的底板）
    });
    // 使用可识别的名称（图层面板中会展示此名称）
    (innerBg as unknown as Record<string, unknown>).name = FRAME_BG_NAME;
    this.innerBgRect = innerBg;
    this.frameObjects.push(innerBg);
    this.canvas.add(innerBg);
    // 发送到最底层
    this.canvas.sendObjectToBack(innerBg);

    // 2. 虚线边框
    const border = new Rect({
      left: x,
      top: y,
      width,
      height,
      fill: 'transparent',
      stroke: borderColor,
      strokeWidth: 1,
      strokeDashArray: borderDash,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    (border as unknown as Record<string, unknown>).name = `${FRAME_PREFIX}border`;
    this.frameObjects.push(border);
    this.canvas.add(border);

    // 3. 四角标记（小十字线，增强可见性）
    const markSize = 8;
    const markColor = borderColor;
    const corners = [
      { cx: x, cy: y },                          // 左上
      { cx: x + width, cy: y },                   // 右上
      { cx: x, cy: y + height },                  // 左下
      { cx: x + width, cy: y + height },           // 右下
    ];
    for (const corner of corners) {
      // 水平线
      const hLine = new Line(
        [corner.cx - markSize, corner.cy, corner.cx + markSize, corner.cy],
        {
          stroke: markColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        },
      );
      (hLine as unknown as Record<string, unknown>).name = `${FRAME_PREFIX}corner`;
      this.frameObjects.push(hLine);
      this.canvas.add(hLine);

      // 垂直线
      const vLine = new Line(
        [corner.cx, corner.cy - markSize, corner.cx, corner.cy + markSize],
        {
          stroke: markColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        },
      );
      (vLine as unknown as Record<string, unknown>).name = `${FRAME_PREFIX}corner`;
      this.frameObjects.push(vLine);
      this.canvas.add(vLine);
    }

    // 4. 尺寸标注（参考框底部居中，显示 "W × H"）
    if (showDimensions) {
      // 使用 Fabric.js 原生绘制 — 通过 afterRender 回调渲染文字
      // 这里用一个不可见的占位矩形 + afterRender 钩子
      this.setupDimensionLabel();
    }

    this.canvas.renderAll();
  }

  /**
   * 设置尺寸标注 — 通过 Canvas afterRender 事件绘制
   * 避免创建可交互的 Textbox 对象
   */
  private setupDimensionLabel(): void {
    const { x, y, width, height } = this.config;
    const labelText = `${width} × ${height}`;
    const labelX = x + width / 2;
    const labelY = y + height + 16;

    const handler = (ctx: { ctx: CanvasRenderingContext2D }) => {
      if (this._disposed) return;
      const c = ctx.ctx;
      c.save();
      c.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      c.fillStyle = '#9ca3af';
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillText(labelText, labelX, labelY);
      c.restore();
    };

    this.canvas.on('after:render', handler as unknown as (...args: unknown[]) => void);

    // 保存 handler 以便清理
    (this as unknown as Record<string, unknown>)._dimensionHandler = handler;
  }

  /** 清除所有参考框辅助元素 */
  private clear(): void {
    for (const obj of this.frameObjects) {
      this.canvas.remove(obj);
    }
    this.frameObjects = [];
    this.innerBgRect = null;

    // 移除 afterRender 事件监听
    const handler = (this as unknown as Record<string, unknown>)._dimensionHandler;
    if (handler) {
      this.canvas.off('after:render', handler as (...args: unknown[]) => void);
      (this as unknown as Record<string, unknown>)._dimensionHandler = null;
    }
  }

  /** 更新参考框尺寸 */
  resize(width: number, height: number): void {
    const canvasW = this.canvas.getWidth();
    const canvasH = this.canvas.getHeight();

    this.config.width = width;
    this.config.height = height;
    this.config.x = (canvasW - width) / 2;
    this.config.y = (canvasH - height) / 2;

    this.render();
  }

  /** 获取参考框区域（用于裁切导出和对齐计算） */
  getClipRect(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.config.x,
      y: this.config.y,
      width: this.config.width,
      height: this.config.height,
    };
  }

  /** 获取参考框中心点 */
  getCenter(): { x: number; y: number } {
    return {
      x: this.config.x + this.config.width / 2,
      y: this.config.y + this.config.height / 2,
    };
  }

  /** 获取参考框配置 */
  getConfig(): Readonly<Required<ReferenceFrameConfig>> {
    return { ...this.config };
  }

  /** 获取参考框内部背景矩形 */
  getInnerBgRect(): FabricObject | null {
    return this.innerBgRect;
  }

  /** 设置参考框内部背景色 */
  setInnerBackground(color: string): void {
    this.config.innerBackground = color;
    if (this.innerBgRect) {
      this.innerBgRect.set('fill', color);
      this.canvas.renderAll();
    }
  }

  /** 获取参考框内部背景色 */
  getInnerBackground(): string {
    return this.config.innerBackground;
  }

  /** 判断对象是否为参考框系统的任何元素（辅助 + 背景） */
  static isFrameObject(obj: FabricObject): boolean {
    const name = (obj as unknown as Record<string, string>).name;
    if (typeof name !== 'string') return false;
    return name.startsWith(FRAME_PREFIX) || name === FRAME_BG_NAME;
  }

  /** 判断对象是否为参考框背景矩形（真正的画布元素） */
  static isFrameBg(obj: FabricObject): boolean {
    return (obj as unknown as Record<string, string>).name === FRAME_BG_NAME;
  }

  /** 判断对象是否为参考框辅助元素（虚线框、四角标记等，不可交互） */
  static isFrameHelper(obj: FabricObject): boolean {
    const name = (obj as unknown as Record<string, string>).name;
    return typeof name === 'string' && name.startsWith(FRAME_PREFIX);
  }

  /**
   * 创建参考框的替身矩形（用于布尔运算）
   *
   * 当布尔运算的参与者之一是参考框背景时，不能直接用参考框本身参与运算
   * （否则运算后参考框会被删除/替换）。此方法创建一个与参考框外形完全一致
   * 的临时 Rect 对象，用它代替参考框参与布尔运算。
   *
   * 复制的属性：位置(left/top)、尺寸(width/height)、圆角(rx/ry)、填充色(fill)
   *
   * @returns 临时替身矩形（不添加到画布，由调用者管理）
   */
  createProxyRect(): FabricObject | null {
    if (!this.innerBgRect) return null;

    const bg = this.innerBgRect as Rect;

    // 调试：打印原始参考框背景的关键属性
    console.log('[createProxyRect] bg:', {
      left: bg.left, top: bg.top,
      width: bg.width, height: bg.height,
      scaleX: bg.scaleX, scaleY: bg.scaleY,
      originX: bg.originX, originY: bg.originY,
      matrix: bg.calcTransformMatrix(),
    });

    const proxy = new Rect({
      left: bg.left ?? this.config.x,
      top: bg.top ?? this.config.y,
      width: bg.width ?? this.config.width,
      height: bg.height ?? this.config.height,
      rx: (bg as unknown as Record<string, number>).rx ?? 0,
      ry: (bg as unknown as Record<string, number>).ry ?? 0,
      fill: bg.fill ?? this.config.innerBackground,
      stroke: bg.stroke ?? 'transparent',
      strokeWidth: bg.strokeWidth ?? 0,
      scaleX: bg.scaleX ?? 1,
      scaleY: bg.scaleY ?? 1,
      angle: bg.angle ?? 0,
      selectable: true,
      evented: true,
    });

    // 关键：调用 setCoords() 确保内部坐标缓存正确
    proxy.setCoords();

    // 调试：打印替身矩形的关键属性
    console.log('[createProxyRect] proxy:', {
      left: proxy.left, top: proxy.top,
      width: proxy.width, height: proxy.height,
      scaleX: proxy.scaleX, scaleY: proxy.scaleY,
      originX: proxy.originX, originY: proxy.originY,
      matrix: proxy.calcTransformMatrix(),
    });

    return proxy;
  }

  /** 销毁 */
  dispose(): void {
    this._disposed = true;
    this.clear();
  }
}
