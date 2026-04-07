/**
 * 智能对齐线引擎 — Phase G: 对齐线与吸附系统
 *
 * 在 Fabric Canvas 的 object:moving 事件中计算对齐关系，
 * 提供与主编辑器一致的辅助体验：
 *   - 元素 ↔ 元素 对齐
 *   - 元素 ↔ 参考框 对齐
 *   - 元素 ↔ 画布中心 对齐
 *   - 粉色虚线 (#ff4d9f) 对齐线
 *   - 自动吸附（阈值 5px）
 */

import {
  Line,
  type Canvas as FabricCanvas,
  type FabricObject,
} from 'fabric';
import { ReferenceFrame } from './ReferenceFrame';

/** 对齐线信息 */
export interface SmartGuide {
  axis: 'horizontal' | 'vertical';
  position: number;
  type: 'edge' | 'center' | 'frame';
  /** 对齐线起点（沿垂直于 axis 的方向延伸） */
  from: number;
  /** 对齐线终点 */
  to: number;
}

/** 智能对齐线配置 */
export interface SmartGuideConfig {
  /** 吸附阈值（px），默认 5 */
  threshold: number;
  /** 是否对齐其他元素 */
  alignToObjects: boolean;
  /** 是否对齐参考框 */
  alignToFrame: boolean;
  /** 是否对齐画布中心 */
  alignToCanvasCenter: boolean;
  /** 对齐线颜色 */
  guideColor: string;
  /** 对齐线宽度 */
  guideStrokeWidth: number;
  /** 对齐线虚线样式 */
  guideDash: number[];
}

/** 默认配置 */
const DEFAULT_CONFIG: SmartGuideConfig = {
  threshold: 5,
  alignToObjects: true,
  alignToFrame: true,
  alignToCanvasCenter: true,
  guideColor: '#ff4d9f',
  guideStrokeWidth: 1,
  guideDash: [4, 3],
};

/** 参考矩形 */
interface RefRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 对齐计算结果 */
interface AlignmentResult {
  snapX?: number;
  snapY?: number;
  guides: SmartGuide[];
}

/** 智能对齐线辅助对象名称 */
const GUIDE_NAME = '__smart_guide__';

/**
 * 智能对齐线引擎
 */
export class SmartGuideEngine {
  private canvas: FabricCanvas;
  private config: SmartGuideConfig;
  private referenceFrame: ReferenceFrame | null;
  private guideLines: FabricObject[] = [];
  private enabled = true;

  // 事件处理器引用（用于 dispose 时清理）
  private _movingHandler: ((e: { target?: FabricObject }) => void) | null = null;
  private _modifiedHandler: (() => void) | null = null;

  constructor(
    canvas: FabricCanvas,
    config?: Partial<SmartGuideConfig>,
    referenceFrame?: ReferenceFrame,
  ) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.referenceFrame = referenceFrame ?? null;
    this.setupListeners();
  }

  /** 设置参考框引用（初始化后更新） */
  setReferenceFrame(frame: ReferenceFrame | null): void {
    this.referenceFrame = frame;
  }

  /** 启用/禁用对齐线 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearGuideLines();
    }
  }

  /** 获取启用状态 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 更新配置 */
  updateConfig(config: Partial<SmartGuideConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * 设置事件监听
   */
  private setupListeners(): void {
    this._movingHandler = (e: { target?: FabricObject }) => {
      if (!this.enabled || !e.target) return;
      this.onObjectMoving(e.target);
    };

    this._modifiedHandler = () => {
      this.clearGuideLines();
    };

    this.canvas.on('object:moving', this._movingHandler as (...args: unknown[]) => void);
    this.canvas.on('object:modified', this._modifiedHandler);
    this.canvas.on('mouse:up', this._modifiedHandler);
  }

  /**
   * 对象移动时：计算对齐线 + 吸附
   */
  private onObjectMoving(movingObj: FabricObject): void {
    this.clearGuideLines();

    // 收集所有参考矩形
    const refRects = this.collectReferenceRects(movingObj);

    // 计算对齐
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
  }

  /**
   * 收集所有参考矩形
   */
  private collectReferenceRects(movingObj: FabricObject): RefRect[] {
    const refRects: RefRect[] = [];

    // 1. 其他用户对象
    if (this.config.alignToObjects) {
      const allObjects = this.canvas.getObjects().filter(
        (o) => o !== movingObj && this.isUserObject(o),
      );
      for (let i = 0; i < allObjects.length; i++) {
        const obj = allObjects[i];
        const bound = obj.getBoundingRect();
        refRects.push({
          id: `obj_${i}`,
          left: bound.left,
          top: bound.top,
          width: bound.width,
          height: bound.height,
        });
      }
    }

    // 2. 参考框
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

    // 3. 画布中心
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

    return refRects;
  }

  /**
   * 核心对齐算法
   *
   * 对移动中的对象，检查其 5 个关键点（左/中/右、上/中/下）
   * 与所有参考矩形的 5 个关键点之间的距离，
   * 如果距离在阈值内，则产生吸附和对齐线。
   */
  private computeAlignment(
    movingObj: FabricObject,
    refRects: RefRect[],
  ): AlignmentResult {
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

      // --- 垂直对齐线（x 轴方向） ---
      const vPairs: { moving: number; ref: number; type: SmartGuide['type'] }[] = [
        { moving: mLeft, ref: rLeft, type: 'edge' },
        { moving: mLeft, ref: rCenterX, type: 'center' },
        { moving: mLeft, ref: rRight, type: 'edge' },
        { moving: mCenterX, ref: rCenterX, type: 'center' },
        { moving: mRight, ref: rLeft, type: 'edge' },
        { moving: mRight, ref: rRight, type: 'edge' },
      ];

      for (const pair of vPairs) {
        const dist = Math.abs(pair.moving - pair.ref);
        if (dist <= threshold && dist < bestDx) {
          bestDx = dist;
          snapX = mLeft + (pair.ref - pair.moving);
          // 重置之前的垂直对齐线
          const prevVGuides = guides.filter((g) => g.axis === 'vertical');
          for (const pg of prevVGuides) {
            const idx = guides.indexOf(pg);
            if (idx >= 0) guides.splice(idx, 1);
          }
          guides.push({
            axis: 'vertical',
            position: pair.ref,
            type: pair.type,
            from: Math.min(mTop, rTop) - 20,
            to: Math.max(mBottom, rBottom) + 20,
          });
        }
      }

      // --- 水平对齐线（y 轴方向） ---
      const hPairs: { moving: number; ref: number; type: SmartGuide['type'] }[] = [
        { moving: mTop, ref: rTop, type: 'edge' },
        { moving: mTop, ref: rCenterY, type: 'center' },
        { moving: mTop, ref: rBottom, type: 'edge' },
        { moving: mCenterY, ref: rCenterY, type: 'center' },
        { moving: mBottom, ref: rTop, type: 'edge' },
        { moving: mBottom, ref: rBottom, type: 'edge' },
      ];

      for (const pair of hPairs) {
        const dist = Math.abs(pair.moving - pair.ref);
        if (dist <= threshold && dist < bestDy) {
          bestDy = dist;
          snapY = mTop + (pair.ref - pair.moving);
          // 重置之前的水平对齐线
          const prevHGuides = guides.filter((g) => g.axis === 'horizontal');
          for (const pg of prevHGuides) {
            const idx = guides.indexOf(pg);
            if (idx >= 0) guides.splice(idx, 1);
          }
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
    const { guideColor, guideStrokeWidth, guideDash } = this.config;

    for (const guide of guides) {
      const coords: [number, number, number, number] =
        guide.axis === 'vertical'
          ? [guide.position, guide.from, guide.position, guide.to]
          : [guide.from, guide.position, guide.to, guide.position];

      const line = new Line(coords, {
        stroke: guideColor,
        strokeWidth: guideStrokeWidth,
        strokeDashArray: guideDash,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      (line as unknown as Record<string, string>).name = GUIDE_NAME;
      this.guideLines.push(line);
      this.canvas.add(line);
    }
    this.canvas.renderAll();
  }

  /** 清除所有对齐线 */
  clearGuideLines(): void {
    for (const line of this.guideLines) {
      this.canvas.remove(line);
    }
    this.guideLines = [];
  }

  /**
   * 判断是否为用户创建的对象（排除辅助元素）
   */
  private isUserObject(obj: FabricObject): boolean {
    const name = (obj as unknown as Record<string, string>).name;
    if (!name) return true;
    if (typeof name !== 'string') return true;
    return !name.startsWith('__');
  }

  /** 销毁 */
  dispose(): void {
    this.clearGuideLines();
    if (this._movingHandler) {
      this.canvas.off('object:moving', this._movingHandler as (...args: unknown[]) => void);
    }
    if (this._modifiedHandler) {
      this.canvas.off('object:modified', this._modifiedHandler);
      this.canvas.off('mouse:up', this._modifiedHandler);
    }
  }
}
