/**
 * 布尔运算 — 基于 Canvas 像素合成
 *
 * Phase 4: 图层合成与特效
 * 实现四种布尔运算：
 *   - 合并 (Union) — 两个形状的并集
 *   - 减去 (Subtract) — 从形状 A 中减去形状 B
 *   - 相交 (Intersect) — 两个形状的交集
 *   - 排除 (Exclude) — 两个形状的对称差集
 *
 * 实现原理：
 *   利用 Fabric.js 将两个对象分别渲染到离屏 Canvas，
 *   然后使用 Canvas 2D 的 globalCompositeOperation 进行合成，
 *   最终将结果转为 Fabric.js Path 对象。
 */

import type { Canvas as FabricCanvas, FabricObject } from 'fabric';

/** 布尔运算类型 */
export type BooleanOpType = 'union' | 'subtract' | 'intersect' | 'exclude';

/** 布尔运算标签映射 */
export const BOOLEAN_OP_LABELS: Record<BooleanOpType, string> = {
  union: '合并',
  subtract: '减去',
  intersect: '相交',
  exclude: '排除',
};

/** 布尔运算对应的 Canvas globalCompositeOperation */
const OP_TO_COMPOSITE: Record<BooleanOpType, GlobalCompositeOperation> = {
  union: 'source-over',       // A + B
  subtract: 'destination-out', // A - B
  intersect: 'destination-in', // A ∩ B
  exclude: 'xor',             // A △ B
};

/**
 * 对两个 Fabric.js 对象执行布尔运算，返回结果 DataURL
 *
 * @param canvas — Fabric.js Canvas 实例（用于获取尺寸）
 * @param objA — 第一个对象
 * @param objB — 第二个对象
 * @param operation — 布尔运算类型
 * @returns 结果 PNG DataURL
 */
export function performBooleanOp(
  canvas: FabricCanvas,
  objA: FabricObject,
  objB: FabricObject,
  operation: BooleanOpType,
): string | null {
  const width = canvas.getWidth();
  const height = canvas.getHeight();

  // 创建离屏 Canvas A
  const canvasA = createOffscreenCanvas(width, height);
  const ctxA = canvasA.getContext('2d');
  if (!ctxA) return null;

  // 创建离屏 Canvas B
  const canvasB = createOffscreenCanvas(width, height);
  const ctxB = canvasB.getContext('2d');
  if (!ctxB) return null;

  // 创建结果 Canvas
  const resultCanvas = createOffscreenCanvas(width, height);
  const resultCtx = resultCanvas.getContext('2d');
  if (!resultCtx) return null;

  // 渲染对象 A 到离屏 Canvas
  renderObjectToCanvas(ctxA, objA, width, height);

  // 渲染对象 B 到离屏 Canvas
  renderObjectToCanvas(ctxB, objB, width, height);

  // 在结果 Canvas 上执行布尔运算
  // 先绘制 A
  resultCtx.drawImage(canvasA, 0, 0);

  // 再用指定的合成模式绘制 B
  resultCtx.globalCompositeOperation = OP_TO_COMPOSITE[operation];
  resultCtx.drawImage(canvasB, 0, 0);

  return resultCanvas.toDataURL('image/png');
}

/**
 * 获取两个对象的包围盒并集
 */
export function getUnionBoundingBox(
  objA: FabricObject,
  objB: FabricObject,
): { left: number; top: number; width: number; height: number } {
  const boxA = objA.getBoundingRect();
  const boxB = objB.getBoundingRect();

  const left = Math.min(boxA.left, boxB.left);
  const top = Math.min(boxA.top, boxB.top);
  const right = Math.max(boxA.left + boxA.width, boxB.left + boxB.width);
  const bottom = Math.max(boxA.top + boxA.height, boxB.top + boxB.height);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

/** 创建离屏 Canvas */
function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** 将 Fabric 对象渲染到 2D 上下文 */
function renderObjectToCanvas(
  ctx: CanvasRenderingContext2D,
  obj: FabricObject,
  _width: number,
  _height: number,
): void {
  ctx.save();

  // 获取对象的变换矩阵
  const m = obj.calcTransformMatrix();
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

  // 渲染对象
  obj.render(ctx);

  ctx.restore();
}
