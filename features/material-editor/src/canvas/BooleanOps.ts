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
 * 改进版：只在两个对象的联合包围盒区域内操作，
 * 然后裁切到实际有像素内容的最小区域，
 * 返回包含位置信息的结果。
 *
 * @param canvas — Fabric.js Canvas 实例（用于获取尺寸）
 * @param objA — 第一个对象
 * @param objB — 第二个对象
 * @param operation — 布尔运算类型
 * @returns 结果对象，包含 dataURL 和位置信息，失败返回 null
 */
export function performBooleanOp(
  canvas: FabricCanvas,
  objA: FabricObject,
  objB: FabricObject,
  operation: BooleanOpType,
): { dataURL: string; left: number; top: number; width: number; height: number } | null {
  // 使用两个对象的联合包围盒，而非整个画布尺寸
  const bbox = getUnionBoundingBox(objA, objB);
  // 添加安全边距
  const padding = 2;
  const offsetX = Math.floor(bbox.left - padding);
  const offsetY = Math.floor(bbox.top - padding);
  const width = Math.ceil(bbox.width + padding * 2);
  const height = Math.ceil(bbox.height + padding * 2);

  if (width <= 0 || height <= 0) return null;

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

  // 渲染对象 A 到离屏 Canvas（平移以适应包围盒偏移）
  renderObjectToCanvas(ctxA, objA, width, height, offsetX, offsetY);

  // 渲染对象 B 到离屏 Canvas
  renderObjectToCanvas(ctxB, objB, width, height, offsetX, offsetY);

  // 在结果 Canvas 上执行布尔运算
  // 先绘制 A
  resultCtx.drawImage(canvasA, 0, 0);

  // 再用指定的合成模式绘制 B
  resultCtx.globalCompositeOperation = OP_TO_COMPOSITE[operation];
  resultCtx.drawImage(canvasB, 0, 0);

  // 裁切到实际有内容的最小区域
  const trimmed = trimCanvas(resultCanvas, resultCtx);
  if (!trimmed) return null;

  return {
    dataURL: trimmed.dataURL,
    left: offsetX + trimmed.x,
    top: offsetY + trimmed.y,
    width: trimmed.width,
    height: trimmed.height,
  };
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

/** 将 Fabric 对象渲染到 2D 上下文（支持偏移，使坐标对齐包围盒区域） */
function renderObjectToCanvas(
  ctx: CanvasRenderingContext2D,
  obj: FabricObject,
  _width: number,
  _height: number,
  offsetX = 0,
  offsetY = 0,
): void {
  ctx.save();

  // 平移以补偿包围盒偏移
  // 注意：不要手动 ctx.transform(m[...])，因为 Fabric.js 的 obj.render(ctx)
  // 内部会调用 this.transform(ctx) 自动应用完整的变换矩阵
  ctx.translate(-offsetX, -offsetY);

  // 渲染对象（Fabric 内部会自动应用对象的变换矩阵）
  obj.render(ctx);

  ctx.restore();
}

/**
 * 裁切 canvas 到实际有像素内容的最小矩形
 * 返回裁切后的 dataURL 及在原 canvas 中的位置
 */
function trimCanvas(
  sourceCanvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): { dataURL: string; x: number; y: number; width: number; height: number } | null {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let hasContent = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 0) {
        hasContent = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasContent) return null;

  const trimW = maxX - minX + 1;
  const trimH = maxY - minY + 1;

  if (trimW <= 0 || trimH <= 0) return null;

  const trimmedCanvas = createOffscreenCanvas(trimW, trimH);
  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) return null;

  trimmedCtx.drawImage(sourceCanvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH);

  return {
    dataURL: trimmedCanvas.toDataURL('image/png'),
    x: minX,
    y: minY,
    width: trimW,
    height: trimH,
  };
}
