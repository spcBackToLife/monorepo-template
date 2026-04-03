import type { CoordinateMap, NodeRect } from './coordinateMap';

function verticalOverlap(a: NodeRect, b: NodeRect): boolean {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return bottom - top > 1;
}

function horizontalOverlap(a: NodeRect, b: NodeRect): boolean {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  return right - left > 1;
}

/**
 * W2-023：按住 Alt 悬停时，用粉色标注与最近邻矩形之间的间距（水平/垂直）。
 * 若无邻接矩形，则标注到画布容器内缘的距离。
 */
export function drawSpacingHints(
  ctx: CanvasRenderingContext2D,
  map: CoordinateMap,
  hoveredId: string,
  containerW: number,
  containerH: number,
): void {
  const rect = map.get(hoveredId);
  if (!rect) return;

  let bestRight = Infinity;
  let bestLeft = Infinity;
  let bestBottom = Infinity;
  let bestTop = Infinity;

  for (const [id, o] of map) {
    if (id === hoveredId) continue;
    if (verticalOverlap(rect, o) && o.x >= rect.x + rect.width) {
      const gap = o.x - (rect.x + rect.width);
      if (gap >= 0 && gap < bestRight) bestRight = gap;
    }
    if (verticalOverlap(rect, o) && o.x + o.width <= rect.x) {
      const gap = rect.x - (o.x + o.width);
      if (gap >= 0 && gap < bestLeft) bestLeft = gap;
    }
    if (horizontalOverlap(rect, o) && o.y >= rect.y + rect.height) {
      const gap = o.y - (rect.y + rect.height);
      if (gap >= 0 && gap < bestBottom) bestBottom = gap;
    }
    if (horizontalOverlap(rect, o) && o.y + o.height <= rect.y) {
      const gap = rect.y - (o.y + o.height);
      if (gap >= 0 && gap < bestTop) bestTop = gap;
    }
  }

  const edgeRight = containerW - (rect.x + rect.width);
  const edgeLeft = rect.x;
  const edgeBottom = containerH - (rect.y + rect.height);
  const edgeTop = rect.y;

  const rR = bestRight !== Infinity ? bestRight : edgeRight;
  const rL = bestLeft !== Infinity ? bestLeft : edgeLeft;
  const rB = bestBottom !== Infinity ? bestBottom : edgeBottom;
  const rT = bestTop !== Infinity ? bestTop : edgeTop;

  ctx.save();
  ctx.strokeStyle = '#ff4d9f';
  ctx.fillStyle = '#ff4d9f';
  ctx.font = '11px system-ui, sans-serif';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);

  const cy = rect.y + rect.height / 2;
  const cx = rect.x + rect.width / 2;

  if (rR > 0.5) {
    const x0 = rect.x + rect.width;
    const x1 = bestRight !== Infinity ? x0 + rR : containerW;
    ctx.beginPath();
    ctx.moveTo(x0, cy);
    ctx.lineTo(x1, cy);
    ctx.stroke();
    ctx.fillText(`${Math.round(rR)}`, (x0 + x1) / 2 - 12, cy - 8);
  }
  if (rL > 0.5) {
    const x1 = rect.x;
    const x0 = bestLeft !== Infinity ? x1 - rL : 0;
    ctx.beginPath();
    ctx.moveTo(x0, cy);
    ctx.lineTo(x1, cy);
    ctx.stroke();
    ctx.fillText(`${Math.round(rL)}`, (x0 + x1) / 2 - 12, cy - 8);
  }
  if (rB > 0.5) {
    const y0 = rect.y + rect.height;
    const y1 = bestBottom !== Infinity ? y0 + rB : containerH;
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.lineTo(cx, y1);
    ctx.stroke();
    ctx.fillText(`${Math.round(rB)}`, cx + 6, (y0 + y1) / 2 + 4);
  }
  if (rT > 0.5) {
    const y1 = rect.y;
    const y0 = bestTop !== Infinity ? y1 - rT : 0;
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.lineTo(cx, y1);
    ctx.stroke();
    ctx.fillText(`${Math.round(rT)}`, cx + 6, (y0 + y1) / 2 + 4);
  }

  ctx.restore();
}
