/**
 * 素材编辑器核心引擎 — Fabric.js Canvas 封装
 *
 * Phase 3: 轻量图形编辑器
 *   - 画布初始化 + 缩放/平移
 *   - 基础图形绘制（矩形/椭圆/多边形/星形/线段）
 *   - 钢笔/铅笔自由绘制
 *   - 选择/移动/缩放/旋转
 *   - 填充 + 描边设置
 *   - 撤销/重做
 *   - 导出 SVG / PNG
 *   - 图层面板数据同步
 *
 * Phase 4: 图层合成与特效
 *   - 图片图层（导入图片 + 裁切 + 调整）
 *   - 文字工具（字体/大小/粗细/颜色/行高）
 *   - 混合模式支持（16 种 CSS 混合模式）
 *   - 图案纹理层（平铺纹理）
 *   - 图层蒙版（裁切蒙版）
 *   - Canvas 滤镜（噪点/像素化/锐化/浮雕）
 *   - 布尔运算（合并/减去/相交/排除）
 *   - 工程文件保存/加载
 */

import {
  Canvas as FabricCanvas,
  Rect,
  Ellipse,
  Polygon,
  Line,
  PencilBrush,
  type TPointerEvent,
  type TPointerEventInfo,
  type FabricObject,
  ActiveSelection,
  Path,
  FabricImage,
  Textbox,
  Pattern,
  Group,
  Gradient as FabricGradient,
  Shadow as FabricShadow,
} from 'fabric';
import type { MaterialToolType, BlendMode, Point } from '../types';
import { HistoryManager } from './HistoryManager';
import type { CanvasFilterConfig } from './CanvasFilters';
import { applyNoise, applyPixelate, applySharpen, applyEmboss } from './CanvasFilters';
import { performBooleanOp, type BooleanOpType } from './BooleanOps';
import { ReferenceFrame, computeWorkspaceSize, type ReferenceFrameConfig } from './ReferenceFrame';
import { SmartGuideEngine, type SmartGuideConfig } from './SmartGuides';
import { alignObjects, distributeObjects, type AlignType, type DistributeType, type AlignRelativeTo } from './AlignDistribute';
import { performVectorBooleanOp, type VectorBooleanOpType } from './VectorBooleanOps';

/**
 * 钢笔工具锚点 — 支持贝塞尔曲线控制手柄
 *
 * 如果 handleOut 为 undefined，则该锚点生成直线段 (L)。
 * 如果前一个锚点有 handleOut 且当前锚点有 handleIn，则生成三次贝塞尔 (C)。
 */
interface PenAnchor {
  /** 锚点坐标 */
  point: Point;
  /** 入方向控制手柄（到达此锚点的曲线的控制点2） */
  handleIn?: Point;
  /** 出方向控制手柄（从此锚点离开的曲线的控制点1） */
  handleOut?: Point;
}

/** 图形编辑器事件 */
export interface CanvasEditorEvents {
  /** 选中对象变化 */
  selectionChanged: (objects: FabricObject[]) => void;
  /** 画布内容变化（图层更新通知） */
  contentChanged: () => void;
  /** 工具切换 */
  toolChanged: (tool: MaterialToolType) => void;
  /** 撤销/重做状态变化 */
  historyChanged: (canUndo: boolean, canRedo: boolean) => void;
  /** 缩放变化 */
  zoomChanged: (zoom: number) => void;
  /** 文字编辑开始 */
  textEditingStarted: (textObj: FabricObject) => void;
  /** 文字编辑结束 */
  textEditingEnded: () => void;
}

/** 16 种 CSS 混合模式 */
export const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay',
  'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity',
];

/** 混合模式中文标签 */
export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  normal: '正常', multiply: '正片叠底', screen: '滤色', overlay: '叠加',
  darken: '变暗', lighten: '变亮', 'color-dodge': '颜色减淡', 'color-burn': '颜色加深',
  'hard-light': '强光', 'soft-light': '柔光', difference: '差值', exclusion: '排除',
  hue: '色相', saturation: '饱和度', color: '颜色', luminosity: '明度',
};

/** 工程文件格式 */
export interface CanvasProjectFile {
  version: 2 | 3;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasJSON: object;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
  /** v3: 参考框尺寸（参考框模式下保存元素实际尺寸） */
  referenceFrameWidth?: number;
  referenceFrameHeight?: number;
}

/** 星形顶点生成 */
function createStarPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  numPoints: number,
): Point[] {
  const points: Point[] = [];
  const angle = Math.PI / numPoints;

  for (let i = 0; i < 2 * numPoints; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const theta = i * angle - Math.PI / 2;
    points.push({
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
    });
  }
  return points;
}

/** 正多边形顶点生成 */
function createRegularPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
): Point[] {
  const points: Point[] = [];
  const angle = (2 * Math.PI) / sides;

  for (let i = 0; i < sides; i++) {
    const theta = i * angle - Math.PI / 2;
    points.push({
      x: cx + radius * Math.cos(theta),
      y: cy + radius * Math.sin(theta),
    });
  }
  return points;
}

export interface MaterialEditorCoreConfig {
  /** 画布容器 DOM 元素 */
  container: HTMLCanvasElement;
  /** 画布宽度（参考框模式下为参考框宽度） */
  width: number;
  /** 画布高度（参考框模式下为参考框高度） */
  height: number;
  /** 事件回调 */
  events?: Partial<CanvasEditorEvents>;

  // ===== Phase F: 参考框模式 =====
  /** 是否启用参考框模式（默认 true） */
  referenceFrameEnabled?: boolean;
  /** 参考框配置 */
  referenceFrameConfig?: Partial<ReferenceFrameConfig>;

  // ===== Phase G: 智能对齐线 =====
  /** 是否启用智能对齐线（默认 true） */
  smartGuidesEnabled?: boolean;
  /** 智能对齐线配置 */
  smartGuidesConfig?: Partial<SmartGuideConfig>;
}

export class MaterialEditorCore {
  private canvas: FabricCanvas;
  private historyManager: HistoryManager;
  private currentTool: MaterialToolType = 'select';
  private events: Partial<CanvasEditorEvents>;

  // 绘制状态
  private isDrawing = false;
  private drawStartPoint: Point | null = null;
  private tempObject: FabricObject | null = null;

  // 默认样式
  private fillColor = '#4A90D9';
  private strokeColor = '#333333';
  private strokeWidth = 1;

  // 多边形参数
  private polygonSides = 6;
  private starPoints = 5;
  private starInnerRatio = 0.4;

  // ===== B.1.2: 栅格吸附 =====
  private gridSnapEnabled = true;
  private gridSnapSize = 10;

  // ===== Phase F: 参考框 =====
  private referenceFrame: ReferenceFrame | null = null;
  private referenceFrameEnabled: boolean;
  /** 参考框的元素实际尺寸（区别于画布工作区尺寸） */
  private elementWidth: number;
  private elementHeight: number;

  // ===== Phase G: 智能对齐线 =====
  private smartGuideEngine: SmartGuideEngine | null = null;

  // ===== C.1: 钢笔工具状态（支持贝塞尔曲线） =====
  /** 钢笔锚点数组 — 每个锚点含坐标和可选的控制手柄 */
  private penAnchors: PenAnchor[] = [];
  private penTempLine: FabricObject | null = null;
  private penPathGroup: FabricObject[] = [];
  private penIsDrawing = false;
  /** 拖拽状态：用于在 mouseDown→mouseDrag→mouseUp 中创建控制手柄 */
  private penDragStart: Point | null = null;
  private penIsDragging = false;
  /** 当前锚点的出控制手柄预览线 */
  private penHandleLine1: FabricObject | null = null;
  private penHandleLine2: FabricObject | null = null;
  private penHandleDot1: FabricObject | null = null;
  private penHandleDot2: FabricObject | null = null;
  /** 原生事件绑定（钢笔拖拽用），避免 Fabric.js 拦截 */
  private _penNativeMoveBound: ((e: PointerEvent) => void) | null = null;
  private _penNativeUpBound: ((e: PointerEvent) => void) | null = null;

  constructor(config: MaterialEditorCoreConfig) {
    this.events = config.events ?? {};
    this.referenceFrameEnabled = config.referenceFrameEnabled !== false;
    this.elementWidth = config.width;
    this.elementHeight = config.height;

    // Phase F: 参考框模式 — 计算工作区尺寸
    let canvasW: number;
    let canvasH: number;

    if (this.referenceFrameEnabled) {
      const ws = computeWorkspaceSize(config.width, config.height);
      canvasW = ws.canvasWidth;
      canvasH = ws.canvasHeight;
    } else {
      canvasW = config.width;
      canvasH = config.height;
    }

    // 初始化 Fabric.js Canvas
    // 防御：React StrictMode 下 effect 双重执行，同一 canvas 元素可能已被 Fabric 标记
    const el = config.container as HTMLCanvasElement & { __fabric?: FabricCanvas };
    if (el.__fabric) {
      try { el.__fabric.dispose(); } catch { /* ignore */ }
    }
    this.canvas = new FabricCanvas(config.container, {
      width: canvasW,
      height: canvasH,
      backgroundColor: this.referenceFrameEnabled ? '#f0f1f3' : '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      renderOnAddRemove: true,
    });

    this.historyManager = new HistoryManager(50);

    // 绑定事件
    this.setupEventListeners();

    // 初始化栅格吸附
    this.setupSnapToGrid();

    // Phase F: 创建参考框
    if (this.referenceFrameEnabled) {
      this.referenceFrame = new ReferenceFrame(this.canvas, {
        width: config.width,
        height: config.height,
        ...config.referenceFrameConfig,
      });
    }

    // Phase G: 初始化智能对齐线
    if (config.smartGuidesEnabled !== false) {
      this.smartGuideEngine = new SmartGuideEngine(
        this.canvas,
        config.smartGuidesConfig,
        this.referenceFrame ?? undefined,
      );
    }

    // C.1.2: 路径编辑模式（双击路径进入编辑）
    this.setupPathEditMode();

    // 保存初始状态
    this.saveState();

    // 初始化后自动选中参考框背景矩形，方便用户操作
    if (this.referenceFrame) {
      const bgRect = this.referenceFrame.getInnerBgRect();
      if (bgRect) {
        this.canvas.setActiveObject(bgRect);
        this.canvas.renderAll();
      }
    }
  }

  // ===== 画布事件 =====

  private setupEventListeners(): void {
    // 选择变化
    this.canvas.on('selection:created', () => this.handleSelectionChange());
    this.canvas.on('selection:updated', () => this.handleSelectionChange());
    this.canvas.on('selection:cleared', () => this.handleSelectionChange());

    // 对象修改后保存状态
    this.canvas.on('object:modified', () => {
      this.saveState();
      this.events.contentChanged?.();
    });

    // 鼠标事件（用于图形绘制）
    this.canvas.on('mouse:down', (e) => this.handleMouseDown(e));
    this.canvas.on('mouse:move', (e) => this.handleMouseMove(e));
    this.canvas.on('mouse:up', () => this.handleMouseUp());

    // 路径绘制完成（铅笔工具 free drawing 完成）
    this.canvas.on('path:created', () => {
      this.saveState();
      this.events.contentChanged?.();
      // 铅笔绘制完成后自动切回选择工具
      this.setTool('select');
    });

    // 撤销/重做状态变化
    this.historyManager.subscribe(() => {
      this.events.historyChanged?.(
        this.historyManager.canUndo,
        this.historyManager.canRedo,
      );
    });
  }

  private handleSelectionChange(): void {
    const active = this.canvas.getActiveObjects();
    this.events.selectionChanged?.(active);
  }

  // ===== B.1.2: 栅格吸附 =====

  private setupSnapToGrid(): void {
    this.canvas.on('object:moving', (e) => {
      if (!this.gridSnapEnabled || !e.target) return;
      // Phase G: 如果智能对齐线已经处理了吸附，则跳过网格吸附
      // 智能对齐线引擎在同一个 object:moving 事件中优先执行
      if (this.smartGuideEngine?.isEnabled()) return;

      const obj = e.target;
      const grid = this.gridSnapSize;
      obj.set({
        left: Math.round((obj.left ?? 0) / grid) * grid,
        top: Math.round((obj.top ?? 0) / grid) * grid,
      });
    });
  }

  /**
   * 设置栅格吸附
   * @param enabled — 是否启用吸附
   * @param size — 吸附栅格大小（默认 10px）
   */
  setGridSnap(enabled: boolean, size?: number): void {
    this.gridSnapEnabled = enabled;
    if (size !== undefined) {
      this.gridSnapSize = Math.max(1, size);
    }
  }

  /** 获取栅格吸附状态 */
  getGridSnap(): { enabled: boolean; size: number } {
    return { enabled: this.gridSnapEnabled, size: this.gridSnapSize };
  }

  // ===== 图形绘制鼠标事件 =====

  private handleMouseDown(opt: TPointerEventInfo<TPointerEvent>): void {
    // 文字工具：点击创建文字对象
    if (this.currentTool === 'text') {
      const pointer = this.canvas.getViewportPoint(opt.e);
      this.addTextAt(pointer.x, pointer.y);
      // 创建后切回选择工具
      this.setTool('select');
      return;
    }

    // C.1: 钢笔工具 — 点击/拖拽添加锚点（支持贝塞尔曲线）
    if (this.currentTool === 'path') {
      const pointer = this.canvas.getViewportPoint(opt.e);
      this.handlePenMouseDown(pointer);
      return;
    }

    if (this.currentTool === 'select' || this.currentTool === 'hand' || this.currentTool === 'pencil' || this.currentTool === 'image') {
      return;
    }

    const pointer = this.canvas.getViewportPoint(opt.e);
    this.isDrawing = true;
    this.drawStartPoint = { x: pointer.x, y: pointer.y };

    // 禁用选择
    this.canvas.selection = false;
    this.canvas.discardActiveObject();
  }

  private handleMouseMove(opt: TPointerEventInfo<TPointerEvent>): void {
    // C.1: 钢笔工具 — 非拖拽时绘制引导线（拖拽由原生 DOM 事件处理）
    if (this.currentTool === 'path') {
      // 拖拽中不处理引导线（由原生事件驱动 handlePenDragMove）
      if (this.penIsDragging) return;
      const pointer = this.canvas.getViewportPoint(opt.e);
      if (this.penIsDrawing && this.penAnchors.length > 0) {
        this.handlePenMouseMove(pointer);
      }
      return;
    }

    if (!this.isDrawing || !this.drawStartPoint) return;

    const pointer = this.canvas.getViewportPoint(opt.e);
    const startX = this.drawStartPoint.x;
    const startY = this.drawStartPoint.y;
    const width = Math.abs(pointer.x - startX);
    const height = Math.abs(pointer.y - startY);
    const left = Math.min(startX, pointer.x);
    const top = Math.min(startY, pointer.y);

    // 移除之前的临时对象
    if (this.tempObject) {
      this.canvas.remove(this.tempObject);
    }

    switch (this.currentTool) {
      case 'rect': {
        this.tempObject = new Rect({
          left,
          top,
          width,
          height,
          fill: this.fillColor,
          stroke: this.strokeColor,
          strokeWidth: this.strokeWidth,
          rx: 0,
          ry: 0,
        });
        break;
      }
      case 'ellipse': {
        this.tempObject = new Ellipse({
          left,
          top,
          rx: width / 2,
          ry: height / 2,
          fill: this.fillColor,
          stroke: this.strokeColor,
          strokeWidth: this.strokeWidth,
        });
        break;
      }
      case 'polygon': {
        const radius = Math.max(width, height) / 2;
        const cx = startX + (pointer.x - startX) / 2;
        const cy = startY + (pointer.y - startY) / 2;
        const points = createRegularPolygonPoints(0, 0, radius, this.polygonSides);
        this.tempObject = new Polygon(points, {
          left: cx - radius,
          top: cy - radius,
          fill: this.fillColor,
          stroke: this.strokeColor,
          strokeWidth: this.strokeWidth,
        });
        break;
      }
      case 'star': {
        const outerR = Math.max(width, height) / 2;
        const innerR = outerR * this.starInnerRatio;
        const cx2 = startX + (pointer.x - startX) / 2;
        const cy2 = startY + (pointer.y - startY) / 2;
        const starPts = createStarPoints(0, 0, outerR, innerR, this.starPoints);
        this.tempObject = new Polygon(starPts, {
          left: cx2 - outerR,
          top: cy2 - outerR,
          fill: this.fillColor,
          stroke: this.strokeColor,
          strokeWidth: this.strokeWidth,
        });
        break;
      }
      case 'line': {
        this.tempObject = new Line([startX, startY, pointer.x, pointer.y], {
          stroke: this.strokeColor,
          strokeWidth: Math.max(this.strokeWidth, 2),
        });
        break;
      }
      default:
        break;
    }

    if (this.tempObject) {
      this.canvas.add(this.tempObject);
      this.canvas.renderAll();
    }
  }

  private handleMouseUp(): void {
    // C.1: 钢笔工具拖拽结束由原生 pointerup 事件处理，这里直接跳过
    if (this.currentTool === 'path') return;

    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.drawStartPoint = null;

    if (this.tempObject) {
      // 标记为正式对象（给个名字便于图层面板展示）
      this.tempObject.set('name' as keyof FabricObject, this.getShapeName(this.currentTool));
      // 选中刚创建的对象
      this.canvas.setActiveObject(this.tempObject);
      this.tempObject = null;
      this.saveState();
      this.events.contentChanged?.();

      // 绘制完成后自动切回选择工具
      this.setTool('select');
    }

    // 恢复选择
    this.canvas.selection = true;
  }

  private getShapeName(tool: MaterialToolType): string {
    const names: Record<string, string> = {
      rect: '矩形',
      ellipse: '椭圆',
      polygon: `多边形(${this.polygonSides})`,
      star: `星形(${this.starPoints})`,
      line: '线段',
      path: '路径',
      pencil: '手绘',
      text: '文字',
      image: '图片',
    };
    return names[tool] ?? '图形';
  }

  /** 获取对象的显示名称 */
  private getObjectName(obj: FabricObject): string {
    const customName = (obj as unknown as Record<string, string>).name;
    if (customName) return customName;
    const typeNames: Record<string, string> = {
      rect: '矩形', ellipse: '椭圆', polygon: '多边形',
      line: '线段', path: '路径', textbox: '文字',
      image: '图片', group: '组',
    };
    return typeNames[obj.type ?? ''] ?? '图形';
  }

  // ===== 工具切换 =====

  setTool(tool: MaterialToolType): void {
    // 如果正在钢笔绘制中切换到其他工具，先自动完成路径
    if (this.currentTool === 'path' && tool !== 'path' && this.penIsDrawing) {
      if (this.penAnchors.length >= 2) {
        // 有足够的锚点，自动完成开放路径
        this._autoFinalizePenPath();
      } else {
        // 锚点太少，放弃
        this.cleanPenHelpers();
        this.penAnchors = [];
        this.penIsDrawing = false;
        this.penIsDragging = false;
        this.penDragStart = null;
      }
    }

    this.currentTool = tool;

    // 重置绘制状态
    this.isDrawing = false;
    this.drawStartPoint = null;
    this.tempObject = null;

    // 恢复 Fabric 默认的对象检测（钢笔工具会单独禁用）
    this.canvas.skipTargetFind = false;

    // 配置画布交互模式
    switch (tool) {
      case 'select':
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
        this.canvas.defaultCursor = 'default';
        break;

      case 'hand':
        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.canvas.defaultCursor = 'grab';
        break;

      case 'pencil': {
        this.canvas.isDrawingMode = true;
        const brush = new PencilBrush(this.canvas);
        brush.color = this.strokeColor;
        brush.width = Math.max(this.strokeWidth, 2);
        this.canvas.freeDrawingBrush = brush;
        break;
      }

      case 'text':
        // 文字工具：点击画布即创建文字对象
        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.canvas.defaultCursor = 'text';
        break;

      case 'image':
        // 图片工具：触发文件选择对话框
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
        this.canvas.defaultCursor = 'default';
        this.triggerImageImport();
        break;

      case 'path':
        // C.1: 钢笔工具 — 点击添加锚点，闭合或 Enter 完成
        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.canvas.skipTargetFind = true; // 禁止 Fabric 查找/拖拽对象，让鼠标事件全部交给钢笔逻辑
        this.canvas.defaultCursor = 'crosshair';
        // 不要重置钢笔状态——保留之前的绘制。只在全新开始时才重置
        // （resetPenTool 会清除所有锚点和辅助元素，导致已画的路径丢失）
        break;

      default:
        // 图形绘制工具
        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.canvas.defaultCursor = 'crosshair';
        break;
    }

    this.events.toolChanged?.(tool);
  }

  getTool(): MaterialToolType {
    return this.currentTool;
  }

  // ===== 样式设置 =====

  setFillColor(color: string): void {
    this.fillColor = color;
    // 同步到选中对象
    const active = this.canvas.getActiveObject();
    if (active) {
      active.set('fill', color);
      this.canvas.renderAll();
      this.saveState();
    }
  }

  setStrokeColor(color: string): void {
    this.strokeColor = color;
    const active = this.canvas.getActiveObject();
    if (active) {
      active.set('stroke', color);
      this.canvas.renderAll();
      this.saveState();
    }
    // 更新铅笔画笔颜色
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = color;
    }
  }

  setStrokeWidth(width: number): void {
    this.strokeWidth = width;
    const active = this.canvas.getActiveObject();
    if (active) {
      active.set('strokeWidth', width);
      this.canvas.renderAll();
      this.saveState();
    }
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.width = Math.max(width, 1);
    }
  }

  getFillColor(): string {
    return this.fillColor;
  }

  getStrokeColor(): string {
    return this.strokeColor;
  }

  getStrokeWidth(): number {
    return this.strokeWidth;
  }

  // ===== 多边形/星形参数 =====

  setPolygonSides(sides: number): void {
    this.polygonSides = Math.max(3, Math.min(12, sides));
  }

  setStarPointsCount(points: number): void {
    this.starPoints = Math.max(3, Math.min(12, points));
  }

  setStarInnerRatio(ratio: number): void {
    this.starInnerRatio = Math.max(0.1, Math.min(0.9, ratio));
  }

  // ===== 图层操作 =====

  /** 获取所有图层对象（用于图层面板，排除不可交互的辅助元素，但保留参考框背景） */
  getLayers(): Array<{
    id: string;
    name: string;
    type: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: string;
  }> {
    const objects = this.canvas.getObjects().filter((obj) => {
      // 排除辅助元素（虚线边框、四角标记、智能对齐线等）
      // 但保留参考框背景矩形（它是真正的画布元素）
      if (ReferenceFrame.isFrameHelper(obj)) return false;
      const name = (obj as unknown as Record<string, string>).name;
      // 排除钢笔工具辅助元素等其他 __ 前缀对象（参考框背景的名字是"参考框"，不带 __）
      if (typeof name === 'string' && name.startsWith('__')) return false;
      return true;
    });
    return objects.map((obj, idx) => ({
      id: String(idx),
      name: this.getObjectName(obj),
      type: obj.type ?? 'unknown',
      visible: obj.visible ?? true,
      locked: !obj.selectable,
      opacity: obj.opacity ?? 1,
      blendMode: (obj as unknown as Record<string, string>).globalCompositeOperation ?? 'source-over',
    }));
  }

  /** 选中指定图层 */
  selectLayer(index: number): void {
    const objects = this.canvas.getObjects();
    if (index >= 0 && index < objects.length) {
      this.canvas.setActiveObject(objects[index]);
      this.canvas.renderAll();
    }
  }

  /** 切换图层可见性 */
  toggleLayerVisibility(index: number): void {
    const objects = this.canvas.getObjects();
    if (index >= 0 && index < objects.length) {
      const obj = objects[index];
      obj.set('visible', !obj.visible);
      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();
    }
  }

  /** 切换图层锁定 */
  toggleLayerLock(index: number): void {
    const objects = this.canvas.getObjects();
    if (index >= 0 && index < objects.length) {
      const obj = objects[index];
      const isLocked = !obj.selectable;
      obj.set({
        selectable: isLocked,
        evented: isLocked,
      } as Partial<FabricObject>);
      this.canvas.renderAll();
      this.events.contentChanged?.();
    }
  }

  /** 图层上移 */
  moveLayerUp(index: number): void {
    const objects = this.canvas.getObjects();
    if (index < objects.length - 1) {
      const obj = objects[index];
      this.canvas.bringObjectForward(obj);
      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();
    }
  }

  /** 图层下移 */
  moveLayerDown(index: number): void {
    const objects = this.canvas.getObjects();
    if (index > 0) {
      const obj = objects[index];
      this.canvas.sendObjectBackwards(obj);
      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();
    }
  }

  /** 删除选中对象（参考框背景不可删除） */
  deleteSelected(): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    // 参考框背景矩形不可删除
    if (ReferenceFrame.isFrameBg(active)) return;

    if (active instanceof ActiveSelection) {
      const objects = active.getObjects().filter(
        (obj) => !ReferenceFrame.isFrameBg(obj),
      );
      this.canvas.discardActiveObject();
      for (const obj of objects) {
        this.canvas.remove(obj);
      }
    } else {
      this.canvas.remove(active);
    }

    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  /** 复制选中对象 */
  async duplicateSelected(): Promise<void> {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    const cloned = await active.clone();
    cloned.set({
      left: (cloned.left ?? 0) + 20,
      top: (cloned.top ?? 0) + 20,
    });
    this.canvas.add(cloned);
    this.canvas.setActiveObject(cloned);
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  // ===== 撤销/重做 =====

  undo(): void {
    const currentJSON = JSON.stringify(this.canvas.toJSON());
    const prevJSON = this.historyManager.undo(currentJSON);
    if (prevJSON) {
      this.restoreState(prevJSON);
    }
  }

  redo(): void {
    const currentJSON = JSON.stringify(this.canvas.toJSON());
    const nextJSON = this.historyManager.redo(currentJSON);
    if (nextJSON) {
      this.restoreState(nextJSON);
    }
  }

  get canUndo(): boolean {
    return this.historyManager.canUndo;
  }

  get canRedo(): boolean {
    return this.historyManager.canRedo;
  }

  private saveState(): void {
    const json = JSON.stringify(this.canvas.toJSON());
    this.historyManager.saveState(json);
  }

  private restoreState(json: string): void {
    this.historyManager.lock();
    this.canvas.loadFromJSON(json).then(() => {
      this.canvas.renderAll();
      this.historyManager.unlock();
      this.events.contentChanged?.();
    });
  }

  // ===== 缩放 =====

  setZoom(zoom: number): void {
    const clampedZoom = Math.max(0.1, Math.min(4, zoom));
    this.canvas.setZoom(clampedZoom);
    this.canvas.renderAll();
    this.events.zoomChanged?.(clampedZoom);
  }

  getZoom(): number {
    return this.canvas.getZoom();
  }

  zoomIn(): void {
    this.setZoom(this.getZoom() * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.getZoom() / 1.2);
  }

  resetZoom(): void {
    this.setZoom(1);
  }

  // ===== 导出 =====

  /** 导出为 SVG 字符串 */
  exportSVG(): string {
    return this.canvas.toSVG();
  }

  /** 导出为 PNG Data URL */
  exportPNG(options?: { multiplier?: number; format?: string; clipToFrame?: boolean }): string {
    const clipToFrame = options?.clipToFrame !== false && this.referenceFrame;

    if (clipToFrame && this.referenceFrame) {
      const clip = this.referenceFrame.getClipRect();
      return this.canvas.toDataURL({
        format: (options?.format ?? 'png') as 'png' | 'jpeg' | 'webp',
        multiplier: options?.multiplier ?? 2,
        left: clip.x,
        top: clip.y,
        width: clip.width,
        height: clip.height,
      });
    }

    return this.canvas.toDataURL({
      format: (options?.format ?? 'png') as 'png' | 'jpeg' | 'webp',
      multiplier: options?.multiplier ?? 2,
    });
  }

  /** 导出为 WebP Data URL */
  exportWebP(options?: { multiplier?: number; quality?: number }): string {
    return this.canvas.toDataURL({
      format: 'webp',
      multiplier: options?.multiplier ?? 2,
      quality: options?.quality ?? 0.9,
    });
  }

  /** 导出为 Blob（支持 PNG/JPEG/WebP） */
  async exportBlob(options?: {
    format?: 'png' | 'jpeg' | 'webp';
    multiplier?: number;
    quality?: number;
  }): Promise<Blob> {
    const format = options?.format ?? 'png';
    const dataUrl = this.canvas.toDataURL({
      format,
      multiplier: options?.multiplier ?? 2,
      quality: options?.quality,
    });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  /** 导出为 JSON（工程文件保存） */
  exportJSON(): object {
    return this.canvas.toJSON();
  }

  /** 从 JSON 加载（工程文件恢复） */
  async loadFromJSON(json: object): Promise<void> {
    await this.canvas.loadFromJSON(json);
    this.canvas.renderAll();
    this.historyManager.clear();
    this.saveState();
    this.events.contentChanged?.();
  }

  // ===== 画布尺寸 =====

  resize(width: number, height: number): void {
    this.canvas.setDimensions({ width, height });
    this.canvas.renderAll();
  }

  setBackgroundColor(color: string): void {
    // 设置参考框内部背景色（而非整个canvas背景）
    if (this.referenceFrame) {
      this.referenceFrame.setInnerBackground(color);
    } else {
      this.canvas.backgroundColor = color;
      this.canvas.renderAll();
    }
    this.saveState();
    this.events.contentChanged?.();
  }

  getBackgroundColor(): string {
    // 获取参考框内部背景色
    if (this.referenceFrame) {
      return this.referenceFrame.getInnerBackground();
    }
    return (this.canvas.backgroundColor ?? '#ffffff') as string;
  }

  // ===== 全选 =====

  selectAll(): void {
    this.canvas.discardActiveObject();
    const objects = this.canvas.getObjects().filter((o) =>
      o.selectable && !ReferenceFrame.isFrameBg(o) && !ReferenceFrame.isFrameHelper(o),
    );
    if (objects.length > 0) {
      const sel = new ActiveSelection(objects, { canvas: this.canvas });
      this.canvas.setActiveObject(sel);
      this.canvas.renderAll();
    }
  }

  // ===== 获取选中对象属性 =====

  getSelectedObjectProps(): {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    type?: string;
  } | null {
    const active = this.canvas.getActiveObject();
    if (!active) return null;
    return {
      fill: active.fill as string | undefined,
      stroke: active.stroke as string | undefined,
      strokeWidth: active.strokeWidth,
      opacity: active.opacity,
      type: active.type,
    };
  }

  /** 更新选中对象的属性 */
  updateSelectedObject(props: Record<string, unknown>): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;
    active.set(props as Partial<FabricObject>);
    this.canvas.renderAll();
    this.saveState();
  }

  // ================================================================
  // Phase 4: 图层合成与特效
  // ================================================================

  // ===== 图片图层 =====

  /**
   * 从 URL 导入图片到画布
   * @param url — 图片 URL 或 Data URL
   * @param options — 可选的位置和尺寸参数
   */
  async addImage(url: string, options?: {
    left?: number;
    top?: number;
    scaleToFit?: boolean;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<FabricObject | null> {
    try {
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

      // 默认居中放置
      const canvasW = this.canvas.getWidth();
      const canvasH = this.canvas.getHeight();

      if (options?.scaleToFit !== false) {
        const maxW = options?.maxWidth ?? canvasW * 0.8;
        const maxH = options?.maxHeight ?? canvasH * 0.8;
        const imgW = img.width ?? 100;
        const imgH = img.height ?? 100;
        const scale = Math.min(maxW / imgW, maxH / imgH, 1);
        img.scale(scale);
      }

      img.set({
        left: options?.left ?? (canvasW - (img.getScaledWidth())) / 2,
        top: options?.top ?? (canvasH - (img.getScaledHeight())) / 2,
      });

      (img as unknown as Record<string, string>).name = '图片';

      this.canvas.add(img);
      this.canvas.setActiveObject(img);
      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();

      return img;
    } catch {
      return null;
    }
  }

  /**
   * 从 File 对象导入图片
   */
  async addImageFromFile(file: File): Promise<FabricObject | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = await this.addImage(reader.result as string);
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  /**
   * 触发文件选择对话框导入图片
   */
  triggerImageImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        await this.addImageFromFile(file);
        // 导入后切回选择
        this.setTool('select');
      }
    };
    input.click();
  }

  // ===== 文字工具 =====

  /**
   * 在指定位置创建文字对象
   */
  addTextAt(x: number, y: number, text?: string): FabricObject {
    const textbox = new Textbox(text ?? '双击编辑文字', {
      left: x,
      top: y,
      width: 200,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fill: this.fillColor,
      editable: true,
    });

    (textbox as unknown as Record<string, string>).name = '文字';

    this.canvas.add(textbox);
    this.canvas.setActiveObject(textbox);
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();

    return textbox;
  }

  /**
   * 添加文字（预设参数）
   */
  addText(options?: {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fill?: string;
    left?: number;
    top?: number;
  }): FabricObject {
    const canvasW = this.canvas.getWidth();
    const canvasH = this.canvas.getHeight();

    const textbox = new Textbox(options?.text ?? '输入文字', {
      left: options?.left ?? canvasW / 4,
      top: options?.top ?? canvasH / 3,
      width: canvasW / 2,
      fontSize: options?.fontSize ?? 32,
      fontFamily: options?.fontFamily ?? 'Arial, sans-serif',
      fontWeight: options?.fontWeight ?? 'normal',
      fill: options?.fill ?? this.fillColor,
      editable: true,
      textAlign: 'center',
    });

    (textbox as unknown as Record<string, string>).name = '文字';

    this.canvas.add(textbox);
    this.canvas.setActiveObject(textbox);
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();

    return textbox;
  }

  /**
   * 更新选中文字对象的属性
   */
  updateTextProps(props: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    textAlign?: string;
    lineHeight?: number;
    underline?: boolean;
    fontStyle?: string;
  }): void {
    const active = this.canvas.getActiveObject();
    if (!active || active.type !== 'textbox') return;

    active.set(props as Partial<FabricObject>);
    this.canvas.renderAll();
    this.saveState();
  }

  /** 获取选中文字对象的属性 */
  getTextProps(): {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    textAlign?: string;
    lineHeight?: number;
  } | null {
    const active = this.canvas.getActiveObject();
    if (!active || active.type !== 'textbox') return null;
    const tb = active as Textbox;
    return {
      text: tb.text,
      fontSize: tb.fontSize,
      fontFamily: tb.fontFamily,
      fontWeight: tb.fontWeight,
      textAlign: tb.textAlign,
      lineHeight: tb.lineHeight,
    };
  }

  // ===== 混合模式 =====

  /**
   * 设置选中对象的混合模式
   */
  setBlendMode(mode: BlendMode): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    // Fabric.js 使用 globalCompositeOperation 实现混合模式
    const fabricMode = blendModeToCGO(mode);
    (active as unknown as Record<string, string>).globalCompositeOperation = fabricMode;

    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  /**
   * 获取选中对象的混合模式
   */
  getBlendMode(): BlendMode {
    const active = this.canvas.getActiveObject();
    if (!active) return 'normal';
    const cgo = (active as unknown as Record<string, string>).globalCompositeOperation ?? 'source-over';
    return cgoToBlendMode(cgo);
  }

  /**
   * 设置指定图层的混合模式
   */
  setLayerBlendMode(index: number, mode: BlendMode): void {
    const objects = this.canvas.getObjects();
    if (index < 0 || index >= objects.length) return;

    const obj = objects[index];
    (obj as unknown as Record<string, string>).globalCompositeOperation = blendModeToCGO(mode);

    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  // ===== 图案纹理 =====

  /**
   * 为选中对象设置图案纹理填充
   * @param imageUrl — 纹理图片 URL
   * @param repeat — 平铺模式
   */
  async setPatternFill(imageUrl: string, repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat' = 'repeat'): Promise<void> {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    try {
      const img = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
      const pattern = new Pattern({
        source: img.getElement() as HTMLImageElement,
        repeat,
      });

      active.set('fill', pattern);
      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();
    } catch {
      // 纹理加载失败，静默处理
    }
  }

  /**
   * 添加纹理矩形图层
   */
  async addPatternRect(imageUrl: string, options?: {
    width?: number;
    height?: number;
    repeat?: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
  }): Promise<FabricObject | null> {
    try {
      const img = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
      const pattern = new Pattern({
        source: img.getElement() as HTMLImageElement,
        repeat: options?.repeat ?? 'repeat',
      });

      const canvasW = this.canvas.getWidth();
      const canvasH = this.canvas.getHeight();

      const rect = new Rect({
        left: canvasW * 0.1,
        top: canvasH * 0.1,
        width: options?.width ?? canvasW * 0.8,
        height: options?.height ?? canvasH * 0.8,
        fill: pattern,
        stroke: '#ccc',
        strokeWidth: 1,
      });

      (rect as unknown as Record<string, string>).name = '纹理';

      this.canvas.add(rect);
      this.canvas.setActiveObject(rect);
      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();

      return rect;
    } catch {
      return null;
    }
  }

  // ===== Canvas 滤镜 =====

  /**
   * 对选中的图片对象应用 Canvas 增强滤镜
   */
  applyCanvasFiltersToSelected(filters: CanvasFilterConfig[]): void {
    const active = this.canvas.getActiveObject();
    if (!active || active.type !== 'image') return;

    const fabricImage = active as FabricImage;
    const element = fabricImage.getElement() as HTMLImageElement;

    // 创建临时 canvas 处理像素
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = element.naturalWidth ?? element.width;
    tempCanvas.height = element.naturalHeight ?? element.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(element, 0, 0);
    let imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // 依次应用滤镜
    const enabledFilters = filters.filter((f) => f.enabled);
    for (const filter of enabledFilters) {
      switch (filter.type) {
        case 'noise':
          imageData = applyNoise(imageData, filter.intensity);
          break;
        case 'pixelate':
          imageData = applyPixelate(imageData, filter.intensity);
          break;
        case 'sharpen':
          imageData = applySharpen(imageData, filter.intensity);
          break;
        case 'emboss':
          imageData = applyEmboss(imageData, filter.intensity);
          break;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 用处理后的 canvas 创建新 Image
    const newImg = new Image();
    newImg.src = tempCanvas.toDataURL();
    newImg.onload = () => {
      fabricImage.setElement(newImg);
      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();
    };
  }

  // ===== 布尔运算 =====

  /**
   * 对选中的两个对象执行布尔运算
   *
   * Phase I: 优先使用矢量布尔运算，失败时回退到像素合成
   *
   * 特殊处理 — 参考框参与布尔运算：
   *   当选中的两个对象中有一个是参考框背景时，不直接用参考框本身参与运算，
   *   而是创建一个与参考框外形完全一致（位置/宽高/圆角/填充色）的临时替身矩形，
   *   用替身参与运算。运算完成后：
   *     - 参考框保持不变（不被删除/替换）
   *     - 只删除另一个非参考框的对象
   *     - 运算结果作为新元素添加到画布
   */
  async performBooleanOp(operation: BooleanOpType | VectorBooleanOpType): Promise<boolean> {
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length !== 2) return false;

    // 关键：先取消 ActiveSelection，使所有对象恢复到世界坐标系
    // 否则 ActiveSelection 内的对象的 calcTransformMatrix() 会返回
    // 相对于选区 group 的变换矩阵，与新创建的 proxyRect 不在同一坐标系
    this.canvas.discardActiveObject();

    let [objA, objB] = activeObjects;

    // ——— 检测参考框参与布尔运算 ———
    const isAFrameBg = ReferenceFrame.isFrameBg(objA);
    const isBFrameBg = ReferenceFrame.isFrameBg(objB);

    // 两个都是参考框（不应该出现，但做防御）
    if (isAFrameBg && isBFrameBg) return false;

    // 标记参考框参与，并创建替身
    const frameBgInvolved = isAFrameBg || isBFrameBg;
    let proxyRect: FabricObject | null = null;
    /** 非参考框的那个对象（用于运算后删除） */
    let otherObj: FabricObject | null = null;

    if (frameBgInvolved && this.referenceFrame) {
      proxyRect = this.referenceFrame.createProxyRect();
      if (!proxyRect) return false;

      if (isAFrameBg) {
        // objA 是参考框 → 用替身代替 objA
        otherObj = objB;
        objA = proxyRect;
      } else {
        // objB 是参考框 → 用替身代替 objB
        otherObj = objA;
        objB = proxyRect;
      }
    }

    // ——— 执行布尔运算（矢量优先，像素回退） ———
    const result = await this._executeBooleanOp(objA, objB, operation);

    if (result) {
      this.canvas.discardActiveObject();

      if (frameBgInvolved && otherObj) {
        // 参考框模式：只删除非参考框的对象，参考框保留
        this.canvas.remove(otherObj);
      } else {
        // 普通模式：两个对象都删除
        this.canvas.remove(objA);
        this.canvas.remove(objB);
      }

      if (Array.isArray(result)) {
        for (const obj of result) {
          this.canvas.add(obj);
          obj.setCoords();
        }
        if (result.length > 0) {
          this.canvas.setActiveObject(result[0]);
        }
      } else {
        this.canvas.add(result);
        result.setCoords();
        this.canvas.setActiveObject(result);
      }

      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();
      return true;
    }

    return false;
  }

  /**
   * 内部布尔运算执行（矢量优先，像素回退）
   * 抽取出来复用，不涉及画布对象的增删
   */
  private async _executeBooleanOp(
    objA: FabricObject,
    objB: FabricObject,
    operation: BooleanOpType | VectorBooleanOpType,
  ): Promise<FabricObject | FabricObject[] | null> {
    // Phase I: 优先尝试矢量布尔运算
    try {
      const result = await performVectorBooleanOp(
        this.canvas,
        objA,
        objB,
        operation as VectorBooleanOpType,
      );
      if (result) return result;
    } catch {
      // 矢量运算失败，继续回退到像素合成
    }

    // 回退到像素合成（不支持 divide）
    if (operation === 'divide') return null;

    const pixelResult = performBooleanOp(this.canvas, objA, objB, operation as BooleanOpType);
    if (!pixelResult) return null;

    try {
      const resultImg = await FabricImage.fromURL(pixelResult.dataURL);
      // 将图片定位到正确的位置
      resultImg.set({
        left: pixelResult.left,
        top: pixelResult.top,
      });
      resultImg.setCoords();
      (resultImg as unknown as Record<string, string>).name = `布尔(${operation})`;
      return resultImg;
    } catch {
      return null;
    }
  }

  // ================================================================
  // Phase F: 参考框操作
  // ================================================================

  /** 获取参考框实例 */
  getReferenceFrame(): ReferenceFrame | null {
    return this.referenceFrame;
  }

  /** 获取参考框裁切区域 */
  getReferenceFrameClipRect(): { x: number; y: number; width: number; height: number } | null {
    return this.referenceFrame?.getClipRect() ?? null;
  }

  /** 更新参考框尺寸 */
  resizeReferenceFrame(width: number, height: number): void {
    if (!this.referenceFrame) return;
    this.elementWidth = width;
    this.elementHeight = height;
    this.referenceFrame.resize(width, height);
    this.canvas.renderAll();
  }

  /** 获取元素实际尺寸（参考框尺寸） */
  getElementSize(): { width: number; height: number } {
    return { width: this.elementWidth, height: this.elementHeight };
  }

  /** 是否启用了参考框模式 */
  isReferenceFrameEnabled(): boolean {
    return this.referenceFrameEnabled;
  }

  // ================================================================
  // Phase G: 智能对齐线操作
  // ================================================================

  /** 启用/禁用智能对齐线 */
  setSmartGuidesEnabled(enabled: boolean): void {
    this.smartGuideEngine?.setEnabled(enabled);
  }

  /** 获取智能对齐线启用状态 */
  isSmartGuidesEnabled(): boolean {
    return this.smartGuideEngine?.isEnabled() ?? false;
  }

  // ================================================================
  // Phase H: 对齐与分布操作
  // ================================================================

  /**
   * 对齐选中的对象
   * @param type — 对齐类型
   * @param relativeTo — 相对于选区 或 相对于参考框
   */
  alignSelected(type: AlignType, relativeTo: AlignRelativeTo = 'selection'): void {
    const objects = this.canvas.getActiveObjects();
    if (objects.length < 1) return;
    alignObjects(this.canvas, objects, type, relativeTo, this.referenceFrame ?? undefined);
    this.saveState();
    this.events.contentChanged?.();
  }

  /**
   * 等间距分布选中的对象
   * @param type — 分布类型
   */
  distributeSelected(type: DistributeType): void {
    const objects = this.canvas.getActiveObjects();
    if (objects.length < 3) return;
    distributeObjects(this.canvas, objects, type);
    this.saveState();
    this.events.contentChanged?.();
  }

  // ===== 图层蒙版（裁切蒙版） =====

  /**
   * 将第二个选中对象作为第一个对象的裁切蒙版
   * 需要先选中两个对象：底层对象 + 蒙版形状
   */
  applyClipMask(): boolean {
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length !== 2) return false;

    const [target, maskShape] = activeObjects;

    // 使用 clipPath 实现裁切蒙版
    this.canvas.discardActiveObject();
    this.canvas.remove(maskShape);

    // 克隆蒙版形状用作 clipPath
    maskShape.clone().then((cloned: FabricObject) => {
      // 调整 clipPath 的位置（相对于目标对象）
      const targetLeft = target.left ?? 0;
      const targetTop = target.top ?? 0;
      cloned.set({
        left: (cloned.left ?? 0) - targetLeft,
        top: (cloned.top ?? 0) - targetTop,
        absolutePositioned: false,
      } as Partial<FabricObject>);

      target.set('clipPath', cloned);
      (target as unknown as Record<string, string>).name =
        `${this.getObjectName(target)}(蒙版)`;

      this.canvas.renderAll();
      this.saveState();
      this.events.contentChanged?.();
    });

    return true;
  }

  /**
   * 移除选中对象的裁切蒙版
   */
  removeClipMask(): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    active.set('clipPath', undefined);
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  // ===== 编组操作 =====

  /**
   * 将选中的多个对象编为一组
   */
  groupSelected(): void {
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length < 2) return;

    this.canvas.discardActiveObject();

    const group = new Group(activeObjects, {});
    (group as unknown as Record<string, string>).name = '组';

    // 移除原始对象
    for (const obj of activeObjects) {
      this.canvas.remove(obj);
    }

    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  /**
   * 解散选中的组
   */
  ungroupSelected(): void {
    const active = this.canvas.getActiveObject();
    if (!active || active.type !== 'group') return;

    const group = active as Group;
    const objects = group.getObjects();

    this.canvas.remove(group);

    for (const obj of objects) {
      this.canvas.add(obj);
    }

    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  // ===== 工程文件保存/加载 =====

  /**
   * 保存为工程文件 JSON
   */
  saveProject(name?: string): CanvasProjectFile {
    return {
      version: 3,
      name: name ?? '未命名工程',
      canvasWidth: this.canvas.getWidth(),
      canvasHeight: this.canvas.getHeight(),
      canvasJSON: this.canvas.toJSON(),
      backgroundColor: (this.canvas.backgroundColor ?? '#ffffff') as string,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      referenceFrameWidth: this.elementWidth,
      referenceFrameHeight: this.elementHeight,
    };
  }

  /**
   * 从工程文件恢复
   */
  async loadProject(project: CanvasProjectFile): Promise<void> {
    // v2 → v3 兼容：旧工程文件没有参考框尺寸，使用画布尺寸作为参考框
    if (project.version === 2) {
      project.referenceFrameWidth = project.canvasWidth;
      project.referenceFrameHeight = project.canvasHeight;
    }

    // 恢复画布尺寸
    this.canvas.setDimensions({
      width: project.canvasWidth,
      height: project.canvasHeight,
    });

    // 恢复背景色
    this.canvas.backgroundColor = project.backgroundColor ?? '#ffffff';

    // 恢复内容
    await this.canvas.loadFromJSON(project.canvasJSON);
    this.canvas.renderAll();

    // 恢复参考框
    if (this.referenceFrameEnabled && project.referenceFrameWidth && project.referenceFrameHeight) {
      this.elementWidth = project.referenceFrameWidth;
      this.elementHeight = project.referenceFrameHeight;
      if (this.referenceFrame) {
        this.referenceFrame.resize(project.referenceFrameWidth, project.referenceFrameHeight);
      }
    }

    // 重置历史
    this.historyManager.clear();
    this.saveState();
    this.events.contentChanged?.();
  }

  /**
   * 导出工程文件为 JSON 字符串（用于下载）
   */
  exportProjectString(name?: string): string {
    return JSON.stringify(this.saveProject(name), null, 2);
  }

  /**
   * 从 JSON 字符串加载工程文件
   */
  async loadProjectString(jsonString: string): Promise<void> {
    const project = JSON.parse(jsonString) as CanvasProjectFile;
    await this.loadProject(project);
  }

  // ================================================================
  // C.1: 钢笔工具（贝塞尔曲线路径 — 拖拽创建控制手柄）
  // ================================================================

  /**
   * 钢笔工具 — 鼠标按下：记录锚点位置，开始拖拽检测
   *
   * 单击（无拖拽）：添加直角锚点（生成直线段 L）
   * 按住拖拽：创建曲线锚点（拖出控制手柄，生成三次贝塞尔 C）
   */
  private handlePenMouseDown(pointer: Point): void {
    const snapped = this.snapPoint(pointer);

    // 检查是否闭合路径（回到起点附近）
    if (this.penAnchors.length >= 3) {
      const first = this.penAnchors[0].point;
      const dist = Math.sqrt((snapped.x - first.x) ** 2 + (snapped.y - first.y) ** 2);
      if (dist < 12) {
        // 闭合路径
        this.finalizePenPath(true);
        return;
      }
    }

    // 记录拖拽起点
    this.penDragStart = snapped;
    this.penIsDragging = true;
    this.penIsDrawing = true;

    // 暂时先添加一个没有控制手柄的锚点（mouseUp 时确认是否有手柄）
    this.penAnchors.push({ point: snapped });

    // 绘制锚点标记
    this.drawPenAnchorPoint(snapped, this.penAnchors.length === 1);

    // ★ 使用原生 DOM 事件处理拖拽（绕过 Fabric.js 事件系统干扰）
    this._unbindPenNativeEvents(); // 清除之前可能残留的
    // 获取 canvas 的下层 DOM 元素用于坐标转换
    const canvasEl = this.canvas.getElement();
    this._penNativeMoveBound = (e: PointerEvent) => {
      e.preventDefault();
      // 将屏幕坐标转换为 canvas 逻辑坐标
      const rect = canvasEl.getBoundingClientRect();
      const vpt = this.canvas.viewportTransform;
      const x = (e.clientX - rect.left - vpt[4]) / vpt[0];
      const y = (e.clientY - rect.top - vpt[5]) / vpt[3];
      this.handlePenDragMove({ x, y });
    };
    this._penNativeUpBound = (e: PointerEvent) => {
      e.preventDefault();
      this.handlePenDragEnd();
      this._unbindPenNativeEvents();
    };
    // 在 document 上监听，确保即使鼠标移出 canvas 也能响应
    document.addEventListener('pointermove', this._penNativeMoveBound, { capture: true });
    document.addEventListener('pointerup', this._penNativeUpBound, { capture: true });
  }

  /** 解绑钢笔拖拽的原生事件 */
  private _unbindPenNativeEvents(): void {
    if (this._penNativeMoveBound) {
      document.removeEventListener('pointermove', this._penNativeMoveBound, { capture: true } as EventListenerOptions);
      this._penNativeMoveBound = null;
    }
    if (this._penNativeUpBound) {
      document.removeEventListener('pointerup', this._penNativeUpBound, { capture: true } as EventListenerOptions);
      this._penNativeUpBound = null;
    }
  }

  /**
   * 钢笔工具 — 拖拽移动中：实时更新控制手柄预览
   */
  private handlePenDragMove(pointer: Point): void {
    if (!this.penDragStart) return;

    const currentAnchorIdx = this.penAnchors.length - 1;
    const anchor = this.penAnchors[currentAnchorIdx];
    if (!anchor) return;

    const dx = pointer.x - anchor.point.x;
    const dy = pointer.y - anchor.point.y;

    // 只有在拖拽距离大于 2px 时才视为有效拖拽（创建曲线）— 降低阈值方便用户拖拽
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    // 设置出控制手柄（handleOut = 拖拽方向）
    anchor.handleOut = { x: pointer.x, y: pointer.y };
    // 入控制手柄 = 锚点关于鼠标的对称点（使曲线平滑）
    anchor.handleIn = {
      x: anchor.point.x - dx,
      y: anchor.point.y - dy,
    };

    // 更新控制手柄可视化
    this.drawPenHandles(anchor);

    // 更新路径预览
    this.updatePenPreviewPath();
  }

  /**
   * 钢笔工具 — 拖拽结束：确认控制手柄
   */
  private handlePenDragEnd(): void {
    this.penIsDragging = false;
    this.penDragStart = null;

    // 清除手柄预览线（锚点保留）
    this.clearPenHandlePreview();

    // 更新路径预览
    this.updatePenPreviewPath();
  }

  /** 钢笔工具 — 鼠标移动（非拖拽）：绘制临时引导线 */
  private handlePenMouseMove(pointer: Point): void {
    // 移除旧的临时线
    if (this.penTempLine) {
      this.canvas.remove(this.penTempLine);
      this.penTempLine = null;
    }

    const lastAnchor = this.penAnchors[this.penAnchors.length - 1];
    if (!lastAnchor) return;

    // 引导线从最后一个锚点到鼠标位置
    const fromPoint = lastAnchor.handleOut ?? lastAnchor.point;
    this.penTempLine = new Line(
      [lastAnchor.point.x, lastAnchor.point.y, pointer.x, pointer.y],
      {
        stroke: '#4A90D9',
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
      },
    );
    (this.penTempLine as unknown as Record<string, string>).name = '__pen_temp_line__';
    this.canvas.add(this.penTempLine);
    this.canvas.renderAll();
  }

  /** 绘制钢笔锚点 */
  private drawPenAnchorPoint(point: Point, isFirst: boolean): void {
    const anchor = new Ellipse({
      left: point.x - 4,
      top: point.y - 4,
      rx: 4,
      ry: 4,
      fill: isFirst ? '#ff4d4f' : '#4A90D9',
      stroke: '#fff',
      strokeWidth: 1.5,
      selectable: false,
      evented: false,
    });
    (anchor as unknown as Record<string, string>).name = '__pen_anchor__';
    this.penPathGroup.push(anchor);
    this.canvas.add(anchor);
    this.canvas.renderAll();
  }

  /** 绘制控制手柄预览线和手柄点 */
  private drawPenHandles(anchor: PenAnchor): void {
    this.clearPenHandlePreview();

    const pt = anchor.point;

    // handleOut 线 + 点
    if (anchor.handleOut) {
      this.penHandleLine1 = new Line(
        [pt.x, pt.y, anchor.handleOut.x, anchor.handleOut.y],
        { stroke: '#ff6b6b', strokeWidth: 1, strokeDashArray: [2, 2], selectable: false, evented: false },
      );
      (this.penHandleLine1 as unknown as Record<string, string>).name = '__pen_handle__';
      this.canvas.add(this.penHandleLine1);

      this.penHandleDot1 = new Ellipse({
        left: anchor.handleOut.x - 3,
        top: anchor.handleOut.y - 3,
        rx: 3, ry: 3,
        fill: '#ff6b6b',
        stroke: '#fff',
        strokeWidth: 1,
        selectable: false, evented: false,
      });
      (this.penHandleDot1 as unknown as Record<string, string>).name = '__pen_handle__';
      this.canvas.add(this.penHandleDot1);
    }

    // handleIn 线 + 点（对称方向）
    if (anchor.handleIn) {
      this.penHandleLine2 = new Line(
        [pt.x, pt.y, anchor.handleIn.x, anchor.handleIn.y],
        { stroke: '#339af0', strokeWidth: 1, strokeDashArray: [2, 2], selectable: false, evented: false },
      );
      (this.penHandleLine2 as unknown as Record<string, string>).name = '__pen_handle__';
      this.canvas.add(this.penHandleLine2);

      this.penHandleDot2 = new Ellipse({
        left: anchor.handleIn.x - 3,
        top: anchor.handleIn.y - 3,
        rx: 3, ry: 3,
        fill: '#339af0',
        stroke: '#fff',
        strokeWidth: 1,
        selectable: false, evented: false,
      });
      (this.penHandleDot2 as unknown as Record<string, string>).name = '__pen_handle__';
      this.canvas.add(this.penHandleDot2);
    }

    this.canvas.renderAll();
  }

  /** 清除控制手柄预览 */
  private clearPenHandlePreview(): void {
    if (this.penHandleLine1) { this.canvas.remove(this.penHandleLine1); this.penHandleLine1 = null; }
    if (this.penHandleLine2) { this.canvas.remove(this.penHandleLine2); this.penHandleLine2 = null; }
    if (this.penHandleDot1) { this.canvas.remove(this.penHandleDot1); this.penHandleDot1 = null; }
    if (this.penHandleDot2) { this.canvas.remove(this.penHandleDot2); this.penHandleDot2 = null; }
  }

  /**
   * 更新钢笔路径预览
   *
   * 根据 penAnchors 生成 SVG path d 字符串：
   * - 如果两个相邻锚点都无控制手柄 → L (直线段)
   * - 如果前一个锚点有 handleOut 或当前锚点有 handleIn → C (三次贝塞尔)
   */
  private updatePenPreviewPath(): void {
    // 移除旧的预览路径
    const existingPreview = this.canvas.getObjects().find(
      (o) => (o as unknown as Record<string, string>).name === '__pen_preview_path__',
    );
    if (existingPreview) {
      this.canvas.remove(existingPreview);
    }

    if (this.penAnchors.length < 2) return;

    const pathD = this.buildPathDFromAnchors(this.penAnchors, false);

    const previewPath = new Path(pathD, {
      fill: 'transparent',
      stroke: '#4A90D9',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    (previewPath as unknown as Record<string, string>).name = '__pen_preview_path__';
    this.canvas.add(previewPath);
    this.canvas.renderAll();
  }

  /**
   * 从 PenAnchor 数组构建 SVG path d 字符串
   */
  private buildPathDFromAnchors(anchors: PenAnchor[], closed: boolean): string {
    if (anchors.length < 2) return '';

    let pathD = `M ${anchors[0].point.x} ${anchors[0].point.y}`;

    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1];
      const curr = anchors[i];
      const prevHandleOut = prev.handleOut;
      const currHandleIn = curr.handleIn;

      if (prevHandleOut || currHandleIn) {
        // 三次贝塞尔曲线 C cp1x cp1y, cp2x cp2y, endX endY
        const cp1 = prevHandleOut ?? prev.point;
        const cp2 = currHandleIn ?? curr.point;
        pathD += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${curr.point.x} ${curr.point.y}`;
      } else {
        // 直线段
        pathD += ` L ${curr.point.x} ${curr.point.y}`;
      }
    }

    if (closed) {
      // 闭合：最后一个锚点回到第一个锚点
      const last = anchors[anchors.length - 1];
      const first = anchors[0];
      const lastHandleOut = last.handleOut;
      const firstHandleIn = first.handleIn;

      if (lastHandleOut || firstHandleIn) {
        const cp1 = lastHandleOut ?? last.point;
        const cp2 = firstHandleIn ?? first.point;
        pathD += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${first.point.x} ${first.point.y}`;
      }
      pathD += ' Z';
    }

    return pathD;
  }

  /**
   * 自动完成钢笔路径（内部用，切换工具时调用，不触发 setTool 避免递归）
   */
  private _autoFinalizePenPath(): void {
    if (this.penAnchors.length < 2) return;

    // 清理辅助元素
    this.cleanPenHelpers();

    // 构建最终路径
    const pathD = this.buildPathDFromAnchors(this.penAnchors, false);
    const finalPath = new Path(pathD, {
      fill: 'transparent',
      stroke: this.strokeColor,
      strokeWidth: Math.max(this.strokeWidth, 2),
      selectable: true,
      evented: true,
    });
    (finalPath as unknown as Record<string, string>).name = '开放路径';

    this.canvas.add(finalPath);
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();

    // 重置钢笔状态
    this.penAnchors = [];
    this.penIsDrawing = false;
    this.penIsDragging = false;
    this.penDragStart = null;
  }

  /**
   * 完成钢笔路径
   * @param closed — 是否闭合路径
   */
  finalizePenPath(closed = false): void {
    if (this.penAnchors.length < 2) {
      this.resetPenTool();
      // 点太少，直接切回选择工具
      this.setTool('select');
      return;
    }

    // 清理辅助元素（锚点 + 预览线 + 临时线 + 手柄预览）
    this.cleanPenHelpers();

    // 构建最终的 SVG path（可能含贝塞尔曲线 C 命令）
    const pathD = this.buildPathDFromAnchors(this.penAnchors, closed);

    const finalPath = new Path(pathD, {
      fill: closed ? this.fillColor : 'transparent',
      stroke: this.strokeColor,
      strokeWidth: Math.max(this.strokeWidth, 2),
      selectable: true,
      evented: true,
    });
    (finalPath as unknown as Record<string, string>).name = closed ? '闭合路径' : '开放路径';

    this.canvas.add(finalPath);
    this.canvas.setActiveObject(finalPath);
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();

    // 重置钢笔状态
    this.penAnchors = [];
    this.penIsDrawing = false;

    // 钢笔绘制完成后自动切回选择工具，确保路径可见可选
    this.setTool('select');
  }

  /** 取消当前钢笔绘制 */
  cancelPenPath(): void {
    this.cleanPenHelpers();
    this.penAnchors = [];
    this.penIsDrawing = false;
    this.penIsDragging = false;
    this.penDragStart = null;
    this._unbindPenNativeEvents();
    this.canvas.renderAll();
    // 取消后切回选择工具
    this.setTool('select');
  }

  /** 重置钢笔工具状态 */
  private resetPenTool(): void {
    this.cleanPenHelpers();
    this.penAnchors = [];
    this.penIsDrawing = false;
    this.penIsDragging = false;
    this.penDragStart = null;
    this.penTempLine = null;
    this._unbindPenNativeEvents();
  }

  /** 清理钢笔辅助元素 */
  private cleanPenHelpers(): void {
    // 移除锚点
    for (const anchor of this.penPathGroup) {
      this.canvas.remove(anchor);
    }
    this.penPathGroup = [];

    // 移除临时线
    if (this.penTempLine) {
      this.canvas.remove(this.penTempLine);
      this.penTempLine = null;
    }

    // 移除控制手柄预览
    this.clearPenHandlePreview();

    // 移除预览路径
    const preview = this.canvas.getObjects().find(
      (o) => (o as unknown as Record<string, string>).name === '__pen_preview_path__',
    );
    if (preview) {
      this.canvas.remove(preview);
    }

    // 移除所有手柄辅助元素
    const helpers = this.canvas.getObjects().filter(
      (o) => {
        const name = (o as unknown as Record<string, string>).name;
        return name === '__pen_handle__' || name === '__pen_temp_line__' || name === '__pen_anchor__';
      },
    );
    for (const h of helpers) {
      this.canvas.remove(h);
    }

    // 解绑原生事件
    this._unbindPenNativeEvents();
  }

  /** 栅格吸附辅助 */
  private snapPoint(point: Point): Point {
    if (!this.gridSnapEnabled) return point;
    const grid = this.gridSnapSize;
    return {
      x: Math.round(point.x / grid) * grid,
      y: Math.round(point.y / grid) * grid,
    };
  }

  /** 钢笔工具是否正在绘制中 */
  get isPenDrawing(): boolean {
    return this.penIsDrawing && this.penAnchors.length > 0;
  }

  // ================================================================
  // D.1.1: 渐变填充 — 将渐变直接应用到 Fabric.js 对象
  // ================================================================

  /**
   * 为选中对象设置线性渐变填充
   * @param colorStops — 渐变色标数组 [{color, position}]
   * @param angle — 渐变角度（度），默认 135
   */
  setLinearGradientFill(
    colorStops: Array<{ color: string; position: number }>,
    angle = 135,
  ): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    // 将角度转换为坐标
    const angleRad = (angle * Math.PI) / 180;
    const w = active.width ?? 100;
    const h = active.height ?? 100;
    const x1 = w / 2 - (Math.cos(angleRad) * w) / 2;
    const y1 = h / 2 - (Math.sin(angleRad) * h) / 2;
    const x2 = w / 2 + (Math.cos(angleRad) * w) / 2;
    const y2 = h / 2 + (Math.sin(angleRad) * h) / 2;

    // 使用 Fabric.js Gradient 对象
    active.set('fill', new FabricGradient({
      type: 'linear',
      coords: { x1, y1, x2, y2 },
      colorStops: colorStops.map((s) => ({
        offset: s.position,
        color: s.color,
      })),
    }));

    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  /**
   * 为选中对象设置径向渐变填充
   */
  setRadialGradientFill(
    colorStops: Array<{ color: string; position: number }>,
    centerX = 0.5,
    centerY = 0.5,
  ): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    const w = active.width ?? 100;
    const h = active.height ?? 100;
    const cx = w * centerX;
    const cy = h * centerY;
    const radius = Math.max(w, h) / 2;

    active.set('fill', new FabricGradient({
      type: 'radial',
      coords: { x1: cx, y1: cy, x2: cx, y2: cy, r1: 0, r2: radius },
      colorStops: colorStops.map((s) => ({
        offset: s.position,
        color: s.color,
      })),
    }));

    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  // ================================================================
  // D.4: Canvas 增强滤镜 — 应用到选中图片对象
  // ================================================================

  /**
   * 获取选中对象是否为图片（用于判断是否可应用 Canvas 滤镜）
   */
  isSelectedImage(): boolean {
    const active = this.canvas.getActiveObject();
    return active?.type === 'image';
  }

  // ================================================================
  // D.5: 阴影 — 为选中对象添加/移除阴影
  // ================================================================

  /**
   * 为选中对象设置阴影
   */
  setObjectShadow(options: {
    color?: string;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  } | null): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    if (options === null) {
      active.set('shadow', undefined);
    } else {
      active.set('shadow', new FabricShadow({
        color: options.color ?? 'rgba(0,0,0,0.3)',
        blur: options.blur ?? 10,
        offsetX: options.offsetX ?? 4,
        offsetY: options.offsetY ?? 4,
      }));
    }

    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  /**
   * 获取选中对象的阴影配置
   */
  getObjectShadow(): {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  } | null {
    const active = this.canvas.getActiveObject();
    if (!active?.shadow) return null;
    const s = active.shadow as FabricShadow;
    return {
      color: s.color ?? 'rgba(0,0,0,0.3)',
      blur: s.blur ?? 10,
      offsetX: s.offsetX ?? 0,
      offsetY: s.offsetY ?? 0,
    };
  }

  // ================================================================
  // C.1.2: 路径编辑模式 — 双击已有路径进入编辑
  // ================================================================

  private pathEditMode = false;
  private editingPath: Path | null = null;
  private editingAnchors: FabricObject[] = [];

  /**
   * 设置路径编辑事件监听（在 setupEventListeners 中调用）
   */
  private setupPathEditMode(): void {
    this.canvas.on('mouse:dblclick', (opt) => {
      const target = opt.target;
      if (!target || target.type !== 'path') return;

      // 进入路径编辑模式
      this.enterPathEditMode(target as Path);
    });
  }

  /**
   * 进入路径编辑模式
   *
   * 双击路径时进入编辑模式：
   * - 显示所有锚点（可拖拽移动）
   * - 对于 C（三次贝塞尔）命令，额外显示控制手柄点（可拖拽调整曲线弧度）
   * - 控制手柄点用连线连到对应的锚点
   */
  enterPathEditMode(pathObj: Path): void {
    // 先退出之前的编辑模式
    if (this.pathEditMode) this.exitPathEditMode();

    this.pathEditMode = true;
    this.editingPath = pathObj;

    // 禁用路径对象的选择（防止拖拽整体）
    pathObj.set({ selectable: false, evented: false } as Partial<FabricObject>);

    // 解析 path 的 d 属性，提取锚点
    const pathData = (pathObj as unknown as Record<string, unknown>).path as Array<Array<string | number>> | undefined;
    if (!pathData) { this.exitPathEditMode(); return; }

    const pathLeft = pathObj.left ?? 0;
    const pathTop = pathObj.top ?? 0;
    // 使用 pathOffset 获取路径内部坐标偏移
    const offsetX = ((pathObj as unknown as Record<string, { x: number }>).pathOffset?.x ?? 0);
    const offsetY = ((pathObj as unknown as Record<string, { y: number }>).pathOffset?.y ?? 0);

    /** 将路径内坐标转屏幕坐标 */
    const toScreen = (px: number, py: number) => ({
      x: pathLeft + px - offsetX,
      y: pathTop + py - offsetY,
    });

    // 从 path 数据中提取可拖拽的锚点和控制手柄
    for (let i = 0; i < pathData.length; i++) {
      const seg = pathData[i];
      const cmd = seg[0] as string;

      // ——— 锚点（终点） ———
      let anchorX: number | undefined;
      let anchorY: number | undefined;

      if (cmd === 'M' || cmd === 'L') {
        anchorX = seg[1] as number;
        anchorY = seg[2] as number;
      } else if (cmd === 'Q') {
        anchorX = seg[3] as number;
        anchorY = seg[4] as number;
      } else if (cmd === 'C') {
        anchorX = seg[5] as number;
        anchorY = seg[6] as number;
      }

      if (anchorX !== undefined && anchorY !== undefined) {
        const screenPos = toScreen(anchorX, anchorY);

        const anchor = new Ellipse({
          left: screenPos.x - 5,
          top: screenPos.y - 5,
          rx: 5,
          ry: 5,
          fill: '#4A90D9',
          stroke: '#fff',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: false,
          originX: 'center',
          originY: 'center',
        });

        // 存储锚点索引信息
        const anchorData = anchor as unknown as Record<string, unknown>;
        anchorData.__pathAnchorIdx = i;
        anchorData.__pathAnchorCmd = cmd;
        anchorData.name = '__path_edit_anchor__';

        // 拖拽锚点时实时更新路径
        anchor.on('moving', () => {
          this.updatePathAnchor(i, cmd, anchor);
        });

        this.editingAnchors.push(anchor);
        this.canvas.add(anchor);
      }

      // ——— 控制手柄（仅 C 命令） ———
      if (cmd === 'C') {
        const cp1X = seg[1] as number;
        const cp1Y = seg[2] as number;
        const cp2X = seg[3] as number;
        const cp2Y = seg[4] as number;
        const endX = seg[5] as number;
        const endY = seg[6] as number;

        // 控制点1（从上一个锚点延伸出的出控制手柄）
        const cp1Screen = toScreen(cp1X, cp1Y);
        this.addControlHandlePoint(i, 'cp1', cp1Screen, pathData);

        // 绘制 cp1 到上一个锚点的连线
        if (i > 0) {
          const prevSeg = pathData[i - 1];
          const prevCmd = prevSeg[0] as string;
          let prevEndX: number | undefined, prevEndY: number | undefined;
          if (prevCmd === 'M' || prevCmd === 'L') { prevEndX = prevSeg[1] as number; prevEndY = prevSeg[2] as number; }
          else if (prevCmd === 'Q') { prevEndX = prevSeg[3] as number; prevEndY = prevSeg[4] as number; }
          else if (prevCmd === 'C') { prevEndX = prevSeg[5] as number; prevEndY = prevSeg[6] as number; }

          if (prevEndX !== undefined && prevEndY !== undefined) {
            const prevScreen = toScreen(prevEndX, prevEndY);
            const handleLine = new Line(
              [prevScreen.x, prevScreen.y, cp1Screen.x, cp1Screen.y],
              { stroke: '#ff6b6b', strokeWidth: 1, strokeDashArray: [3, 3], selectable: false, evented: false },
            );
            (handleLine as unknown as Record<string, string>).name = '__path_edit_anchor__';
            this.editingAnchors.push(handleLine);
            this.canvas.add(handleLine);
          }
        }

        // 控制点2（到达当前锚点的入控制手柄）
        const cp2Screen = toScreen(cp2X, cp2Y);
        this.addControlHandlePoint(i, 'cp2', cp2Screen, pathData);

        // 绘制 cp2 到当前锚点的连线
        const endScreen = toScreen(endX, endY);
        const handleLine2 = new Line(
          [endScreen.x, endScreen.y, cp2Screen.x, cp2Screen.y],
          { stroke: '#339af0', strokeWidth: 1, strokeDashArray: [3, 3], selectable: false, evented: false },
        );
        (handleLine2 as unknown as Record<string, string>).name = '__path_edit_anchor__';
        this.editingAnchors.push(handleLine2);
        this.canvas.add(handleLine2);
      }
    }

    this.canvas.renderAll();
    this.events.toolChanged?.('path');
  }

  /**
   * 添加控制手柄点（路径编辑模式）
   */
  private addControlHandlePoint(
    segIdx: number,
    cpType: 'cp1' | 'cp2',
    screenPos: { x: number; y: number },
    pathData: Array<Array<string | number>>,
  ): void {
    const cpDot = new Rect({
      left: screenPos.x - 3,
      top: screenPos.y - 3,
      width: 6,
      height: 6,
      fill: cpType === 'cp1' ? '#ff6b6b' : '#339af0',
      stroke: '#fff',
      strokeWidth: 1,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      originX: 'center',
      originY: 'center',
    });

    const cpData = cpDot as unknown as Record<string, unknown>;
    cpData.__pathAnchorIdx = segIdx;
    cpData.__pathCpType = cpType;
    cpData.name = '__path_edit_anchor__';

    // 拖拽控制手柄时更新路径
    cpDot.on('moving', () => {
      if (!this.editingPath) return;
      const seg = pathData[segIdx];
      if (!seg || seg[0] !== 'C') return;

      const pLeft = this.editingPath.left ?? 0;
      const pTop = this.editingPath.top ?? 0;
      const oX = ((this.editingPath as unknown as Record<string, { x: number }>).pathOffset?.x ?? 0);
      const oY = ((this.editingPath as unknown as Record<string, { y: number }>).pathOffset?.y ?? 0);

      const newX = (cpDot.left ?? 0) - pLeft + oX;
      const newY = (cpDot.top ?? 0) - pTop + oY;

      if (cpType === 'cp1') {
        seg[1] = newX;
        seg[2] = newY;
      } else {
        seg[3] = newX;
        seg[4] = newY;
      }

      this.editingPath.set('dirty', true);
      (this.editingPath as unknown as Record<string, () => void>)._setPositionDimensions?.();
      this.canvas.renderAll();
    });

    this.editingAnchors.push(cpDot);
    this.canvas.add(cpDot);
  }

  /**
   * 更新路径锚点位置
   */
  private updatePathAnchor(segIndex: number, cmd: string, anchor: FabricObject): void {
    if (!this.editingPath) return;

    const pathData = (this.editingPath as unknown as Record<string, unknown>).path as Array<Array<string | number>> | undefined;
    if (!pathData || !pathData[segIndex]) return;

    const pathLeft = this.editingPath.left ?? 0;
    const pathTop = this.editingPath.top ?? 0;
    const offsetX = ((this.editingPath as unknown as Record<string, { x: number }>).pathOffset?.x ?? 0);
    const offsetY = ((this.editingPath as unknown as Record<string, { y: number }>).pathOffset?.y ?? 0);

    // 从锚点屏幕坐标反算路径内部坐标
    const newX = (anchor.left ?? 0) - pathLeft + offsetX;
    const newY = (anchor.top ?? 0) - pathTop + offsetY;

    const seg = pathData[segIndex];
    if (cmd === 'M' || cmd === 'L') {
      seg[1] = newX;
      seg[2] = newY;
    } else if (cmd === 'Q') {
      seg[3] = newX;
      seg[4] = newY;
    } else if (cmd === 'C') {
      seg[5] = newX;
      seg[6] = newY;
    }

    // 触发路径重绘
    this.editingPath.set('dirty', true);
    (this.editingPath as unknown as Record<string, () => void>)._setPositionDimensions?.();
    this.canvas.renderAll();
  }

  /**
   * 退出路径编辑模式
   */
  exitPathEditMode(): void {
    if (!this.pathEditMode) return;

    // 移除锚点
    for (const anchor of this.editingAnchors) {
      this.canvas.remove(anchor);
    }
    this.editingAnchors = [];

    // 恢复路径对象的选择
    if (this.editingPath) {
      this.editingPath.set({ selectable: true, evented: true } as Partial<FabricObject>);
      this.editingPath = null;
    }

    this.pathEditMode = false;
    this.canvas.renderAll();
    this.saveState();
    this.events.contentChanged?.();
  }

  /** 是否处于路径编辑模式 */
  get isPathEditing(): boolean {
    return this.pathEditMode;
  }

  // ===== 生命周期 =====

  /** 获取原始 Fabric Canvas（高级用法） */
  getCanvas(): FabricCanvas {
    return this.canvas;
  }

  /** 销毁 */
  destroy(): void {
    this.referenceFrame?.dispose();
    this.smartGuideEngine?.dispose();
    this.historyManager.clear();
    this.canvas.dispose();
  }
}

// ===== 混合模式辅助函数 =====

/** CSS BlendMode → Canvas globalCompositeOperation */
function blendModeToCGO(mode: BlendMode): string {
  const map: Record<BlendMode, string> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };
  return map[mode] ?? 'source-over';
}

/** Canvas globalCompositeOperation → CSS BlendMode */
function cgoToBlendMode(cgo: string): BlendMode {
  const map: Record<string, BlendMode> = {
    'source-over': 'normal',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };
  return map[cgo] ?? 'normal';
}
