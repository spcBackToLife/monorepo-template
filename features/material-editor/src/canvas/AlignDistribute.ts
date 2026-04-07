/**
 * 对齐与分布操作 — Phase H
 *
 * 当选中多个对象时，提供：
 *   - 6 种对齐：左/右/上/下/水平居中/垂直居中
 *   - 2 种分布：水平等间距/垂直等间距
 *   - 支持"相对于选区"和"相对于参考框"两种模式
 */

import type { Canvas as FabricCanvas, FabricObject } from 'fabric';
import type { ReferenceFrame } from './ReferenceFrame';

/** 对齐类型 */
export type AlignType =
  | 'align-left'
  | 'align-center-h'
  | 'align-right'
  | 'align-top'
  | 'align-center-v'
  | 'align-bottom';

/** 分布类型 */
export type DistributeType =
  | 'distribute-h'   // 水平等间距
  | 'distribute-v';  // 垂直等间距

/** 对齐参考 */
export type AlignRelativeTo =
  | 'selection'      // 相对于选区包围盒
  | 'frame';         // 相对于参考框

/** 对齐类型中文标签 */
export const ALIGN_LABELS: Record<AlignType, string> = {
  'align-left': '左对齐',
  'align-center-h': '水平居中',
  'align-right': '右对齐',
  'align-top': '顶对齐',
  'align-center-v': '垂直居中',
  'align-bottom': '底对齐',
};

/** 分布类型中文标签 */
export const DISTRIBUTE_LABELS: Record<DistributeType, string> = {
  'distribute-h': '水平等间距',
  'distribute-v': '垂直等间距',
};

/**
 * 对齐操作
 *
 * @param canvas — Fabric.js Canvas 实例
 * @param objects — 要对齐的对象数组
 * @param type — 对齐类型
 * @param relativeTo — 相对于选区 或 相对于参考框
 * @param frame — 参考框实例（relativeTo='frame' 时必须）
 */
export function alignObjects(
  canvas: FabricCanvas,
  objects: FabricObject[],
  type: AlignType,
  relativeTo: AlignRelativeTo = 'selection',
  frame?: ReferenceFrame,
): void {
  if (objects.length < 1) return;
  if (objects.length < 2 && relativeTo === 'selection') return;

  // 计算参考边界
  let refBound: { left: number; top: number; width: number; height: number };

  if (relativeTo === 'frame' && frame) {
    const clipRect = frame.getClipRect();
    refBound = {
      left: clipRect.x,
      top: clipRect.y,
      width: clipRect.width,
      height: clipRect.height,
    };
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
    const objLeft = obj.left ?? 0;
    const objTop = obj.top ?? 0;

    switch (type) {
      case 'align-left':
        obj.set('left', objLeft + (refBound.left - bound.left));
        break;
      case 'align-center-h':
        obj.set('left', objLeft +
          (refBound.left + refBound.width / 2 - (bound.left + bound.width / 2)));
        break;
      case 'align-right':
        obj.set('left', objLeft +
          (refBound.left + refBound.width - (bound.left + bound.width)));
        break;
      case 'align-top':
        obj.set('top', objTop + (refBound.top - bound.top));
        break;
      case 'align-center-v':
        obj.set('top', objTop +
          (refBound.top + refBound.height / 2 - (bound.top + bound.height / 2)));
        break;
      case 'align-bottom':
        obj.set('top', objTop +
          (refBound.top + refBound.height - (bound.top + bound.height)));
        break;
    }
    obj.setCoords();
  }

  canvas.renderAll();
}

/**
 * 等间距分布
 *
 * @param canvas — Fabric.js Canvas 实例
 * @param objects — 要分布的对象数组（至少 3 个）
 * @param type — 分布类型
 */
export function distributeObjects(
  canvas: FabricCanvas,
  objects: FabricObject[],
  type: DistributeType,
): void {
  if (objects.length < 3) return;

  const items = objects.map((obj) => ({
    obj,
    bound: obj.getBoundingRect(),
  }));

  if (type === 'distribute-h') {
    items.sort((a, b) => a.bound.left - b.bound.left);

    const totalObjWidth = items.reduce((sum, item) => sum + item.bound.width, 0);
    const containerLeft = items[0].bound.left;
    const containerRight = items[items.length - 1].bound.left + items[items.length - 1].bound.width;
    const availableSpace = containerRight - containerLeft - totalObjWidth;
    const gap = availableSpace / (items.length - 1);

    let x = containerLeft;
    for (const item of items) {
      const objLeft = item.obj.left ?? 0;
      item.obj.set('left', objLeft + (x - item.bound.left));
      item.obj.setCoords();
      x += item.bound.width + gap;
    }
  } else {
    items.sort((a, b) => a.bound.top - b.bound.top);

    const totalObjHeight = items.reduce((sum, item) => sum + item.bound.height, 0);
    const containerTop = items[0].bound.top;
    const containerBottom = items[items.length - 1].bound.top + items[items.length - 1].bound.height;
    const availableSpace = containerBottom - containerTop - totalObjHeight;
    const gap = availableSpace / (items.length - 1);

    let y = containerTop;
    for (const item of items) {
      const objTop = item.obj.top ?? 0;
      item.obj.set('top', objTop + (y - item.bound.top));
      item.obj.setCoords();
      y += item.bound.height + gap;
    }
  }

  canvas.renderAll();
}
