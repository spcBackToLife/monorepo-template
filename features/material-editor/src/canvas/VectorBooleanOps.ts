/**
 * 矢量布尔运算 — Phase I: 从像素合成升级为矢量路径布尔运算
 *
 * 当前的 BooleanOps.ts 基于 Canvas globalCompositeOperation 做像素合成，
 * 结果是位图。本模块升级为基于 SVG 路径的矢量布尔运算：
 *   - 结果保持为 Fabric.js Path 对象（可再编辑）
 *   - 保留矢量可缩放性
 *   - 使用 paper.js 动态导入，不影响首屏
 *
 * 支持 5 种运算：
 *   - union (合并)
 *   - subtract (减去)
 *   - intersect (相交)
 *   - exclude (排除/XOR)
 *   - divide (分割)
 *
 * 回退策略：paper.js 不可用时回退到像素合成 (BooleanOps.ts)
 */

import {
  Path,
  Rect,
  Ellipse,
  Polygon,
  type Canvas as FabricCanvas,
  type FabricObject,
} from 'fabric';
import type { BooleanOpType } from './BooleanOps';
import { performBooleanOp as performPixelBooleanOp } from './BooleanOps';

/** 矢量布尔运算类型（扩展原有类型，新增 divide） */
export type VectorBooleanOpType = BooleanOpType | 'divide';

/** 矢量布尔运算标签 */
export const VECTOR_BOOLEAN_OP_LABELS: Record<VectorBooleanOpType, string> = {
  union: '合并',
  subtract: '减去',
  intersect: '相交',
  exclude: '排除',
  divide: '分割',
};

/**
 * 通过变换矩阵将点 (x, y) 转换到世界坐标
 */
function transformPoint(
  x: number,
  y: number,
  matrix: number[],
): { x: number; y: number } {
  // matrix = [a, b, c, d, e, f]  即 2D 仿射矩阵
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  };
}

/**
 * 将 Fabric.js 对象转为 SVG path d 字符串（世界坐标）
 *
 * 关键：使用 Fabric.js 的 calcTransformMatrix() 获取完整的仿射变换矩阵
 * （包含 left/top/scaleX/scaleY/angle/originX/originY 等所有因素），
 * 然后把对象的本地坐标顶点变换到世界坐标，确保路径位置正确。
 *
 * 支持的对象类型：
 * - Rect → 矩形路径（含圆角）
 * - Ellipse → 椭圆路径
 * - Polygon → 多边形路径
 * - Path → 直接使用 path data（应用变换）
 */
function fabricObjectToSVGPathD(obj: FabricObject): string | null {
  const type = obj.type;

  // 获取完整的世界变换矩阵（包含 left/top/scale/angle/origin 等）
  const m = obj.calcTransformMatrix();

  if (type === 'rect') {
    const rect = obj as Rect;
    const w = rect.width ?? 0;
    const h = rect.height ?? 0;
    const rx = Math.min(rect.rx ?? 0, w / 2);
    const ry = Math.min(rect.ry ?? 0, h / 2);

    // 本地坐标：以对象中心为原点
    const halfW = w / 2;
    const halfH = h / 2;

    if (rx > 0 || ry > 0) {
      // 圆角矩形 — 在本地坐标生成轮廓点，再变换到世界坐标
      // 简化处理：对圆角矩形用多段线近似弧段（每个圆角 8 段）
      const localPts = getRoundedRectPoints(-halfW, -halfH, w, h, rx, ry, 8);
      const worldPts = localPts.map((p) => transformPoint(p.x, p.y, m));
      let d = `M ${worldPts[0].x} ${worldPts[0].y}`;
      for (let i = 1; i < worldPts.length; i++) {
        d += ` L ${worldPts[i].x} ${worldPts[i].y}`;
      }
      d += ' Z';
      return d;
    }

    // 无圆角 — 4 个顶点
    const corners = [
      transformPoint(-halfW, -halfH, m),
      transformPoint(halfW, -halfH, m),
      transformPoint(halfW, halfH, m),
      transformPoint(-halfW, halfH, m),
    ];
    return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
  }

  if (type === 'ellipse') {
    const ellipse = obj as Ellipse;
    const rxE = ellipse.rx ?? 0;
    const ryE = ellipse.ry ?? 0;

    // 用 36 段多边形近似椭圆，然后变换到世界坐标
    const segments = 36;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      pts.push(transformPoint(
        Math.cos(angle) * rxE,
        Math.sin(angle) * ryE,
        m,
      ));
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].y}`;
    }
    d += ' Z';
    return d;
  }

  if (type === 'polygon') {
    const polygon = obj as Polygon;
    const points = polygon.points;
    if (!points || points.length < 3) return null;

    // Fabric.js Polygon 的 points 是相对于自身（pathOffset 偏移后的）坐标
    // 需要减去 pathOffset 转为以中心为原点的本地坐标
    const pathOffset = (polygon as unknown as { pathOffset: { x: number; y: number } }).pathOffset ?? { x: 0, y: 0 };
    const worldPts = points.map((p) =>
      transformPoint(p.x - pathOffset.x, p.y - pathOffset.y, m),
    );
    let d = `M ${worldPts[0].x} ${worldPts[0].y}`;
    for (let i = 1; i < worldPts.length; i++) {
      d += ` L ${worldPts[i].x} ${worldPts[i].y}`;
    }
    d += ' Z';
    return d;
  }

  if (type === 'path') {
    const path = obj as Path;
    const pathData = (path as unknown as Record<string, unknown>).path as Array<Array<string | number>> | undefined;
    if (!pathData) return null;

    // Path 对象的路径数据以自身 pathOffset 为原点
    const pathOffset = (path as unknown as { pathOffset: { x: number; y: number } }).pathOffset ?? { x: 0, y: 0 };

    // 遍历每个段的坐标点，变换到世界坐标
    const transformed: string[] = [];
    for (const seg of pathData) {
      const cmd = seg[0] as string;
      const nums = seg.slice(1) as number[];

      if (cmd === 'Z' || cmd === 'z') {
        transformed.push('Z');
        continue;
      }

      // 坐标成对出现 (x, y)
      const worldNums: number[] = [];
      for (let i = 0; i < nums.length; i += 2) {
        if (i + 1 < nums.length) {
          const wp = transformPoint(nums[i] - pathOffset.x, nums[i + 1] - pathOffset.y, m);
          worldNums.push(wp.x, wp.y);
        }
      }
      transformed.push(cmd + ' ' + worldNums.join(' '));
    }
    return transformed.join(' ').trim();
  }

  return null;
}

/**
 * 生成圆角矩形的近似多边形点集（本地坐标）
 */
function getRoundedRectPoints(
  x: number, y: number,
  w: number, h: number,
  rx: number, ry: number,
  arcSegments: number,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];

  // 四个圆角中心
  const corners = [
    { cx: x + rx, cy: y + ry, startAngle: Math.PI, endAngle: 1.5 * Math.PI },         // 左上
    { cx: x + w - rx, cy: y + ry, startAngle: 1.5 * Math.PI, endAngle: 2 * Math.PI }, // 右上
    { cx: x + w - rx, cy: y + h - ry, startAngle: 0, endAngle: 0.5 * Math.PI },       // 右下
    { cx: x + rx, cy: y + h - ry, startAngle: 0.5 * Math.PI, endAngle: Math.PI },     // 左下
  ];

  for (const c of corners) {
    for (let i = 0; i <= arcSegments; i++) {
      const t = i / arcSegments;
      const angle = c.startAngle + t * (c.endAngle - c.startAngle);
      pts.push({
        x: c.cx + Math.cos(angle) * rx,
        y: c.cy + Math.sin(angle) * ry,
      });
    }
  }

  return pts;
}

/**
 * 从 SVG path d 字符串创建 Fabric.js Path 对象
 *
 * 关键：创建后必须调用 setCoords() 确保选中框/控制点正确计算。
 * 同时检测退化路径（宽高为 0 或极小的结果），避免创建无效对象。
 */
function createFabricPathFromD(
  d: string,
  reference: FabricObject,
): FabricObject | null {
  // 检测退化/空路径
  if (!d || d.trim().length === 0) {
    console.warn('[VectorBooleanOps] 结果路径 d 为空');
    return null;
  }

  // 过滤掉仅含 M 指令没有实际线段的退化路径
  const hasDrawCommands = /[LlHhVvCcSsQqTtAaZz]/i.test(d);
  if (!hasDrawCommands) {
    console.warn('[VectorBooleanOps] 结果路径只有 Move 指令，无实际形状:', d.substring(0, 100));
    return null;
  }

  try {
    const path = new Path(d, {
      fill: reference.fill ?? '#4A90D9',
      stroke: reference.stroke ?? 'transparent',
      strokeWidth: reference.strokeWidth ?? 0,
      selectable: true,
      evented: true,
    });

    // 检查创建后的路径尺寸是否合理
    const w = path.width ?? 0;
    const h = path.height ?? 0;
    if (w < 0.5 && h < 0.5) {
      console.warn('[VectorBooleanOps] 结果路径尺寸过小 (退化):', w, h);
      return null;
    }

    // 关键：确保 Fabric 的 bounding box / 控制点坐标正确
    path.setCoords();

    return path;
  } catch (err) {
    console.warn('[VectorBooleanOps] 创建 Path 失败:', err);
    return null;
  }
}

/**
 * 执行矢量布尔运算
 *
 * 使用 paper.js 的路径布尔运算（动态导入），保持矢量可编辑性。
 * 如果 paper.js 不可用，回退到像素合成。
 *
 * @returns 运算结果 FabricObject（或 divide 时返回数组），失败返回 null
 */
export async function performVectorBooleanOp(
  canvas: FabricCanvas,
  objA: FabricObject,
  objB: FabricObject,
  operation: VectorBooleanOpType,
): Promise<FabricObject | FabricObject[] | null> {
  // 调试：打印两个对象的关键属性
  const safeGetBR = (o: FabricObject) => { try { return o.getBoundingRect(); } catch { return 'N/A'; } };
  console.log('[VectorBooleanOps] objA:', {
    type: objA.type,
    left: objA.left, top: objA.top,
    width: (objA as Rect).width, height: (objA as Rect).height,
    scaleX: objA.scaleX, scaleY: objA.scaleY,
    matrix: objA.calcTransformMatrix(),
    boundingRect: safeGetBR(objA),
    onCanvas: !!(objA as unknown as { canvas: unknown }).canvas,
  });
  console.log('[VectorBooleanOps] objB:', {
    type: objB.type,
    left: objB.left, top: objB.top,
    width: (objB as Rect).width, height: (objB as Rect).height,
    scaleX: objB.scaleX, scaleY: objB.scaleY,
    matrix: objB.calcTransformMatrix(),
    boundingRect: safeGetBR(objB),
    onCanvas: !!(objB as unknown as { canvas: unknown }).canvas,
  });

  // 尝试转换为 SVG path
  const pathA = fabricObjectToSVGPathD(objA);
  const pathB = fabricObjectToSVGPathD(objB);

  console.log('[VectorBooleanOps] pathA:', pathA?.substring(0, 200));
  console.log('[VectorBooleanOps] pathB:', pathB?.substring(0, 200));

  // 如果转换失败，回退到像素合成
  if (!pathA || !pathB) {
    console.warn('[VectorBooleanOps] 无法将对象转为 SVG 路径，回退到像素合成');
    return fallbackToPixel(canvas, objA, objB, operation);
  }

  try {
    // 动态导入 paper.js — 兼容 ESM/CJS 两种导出格式
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;

    // 创建离屏 paper.js 画布 — 使用较大尺寸避免精度问题
    const paperCanvas = document.createElement('canvas');
    const canvasW = canvas.getWidth() || 1000;
    const canvasH = canvas.getHeight() || 1000;
    paperCanvas.width = canvasW;
    paperCanvas.height = canvasH;
    paper.setup(paperCanvas);

    // 创建 paper.js Path
    const paperPathA = new paper.CompoundPath(pathA);
    const paperPathB = new paper.CompoundPath(pathB);

    // 调试：打印 paper.js 解析后的包围盒
    console.log('[VectorBooleanOps] paper boundsA:', paperPathA.bounds.toString());
    console.log('[VectorBooleanOps] paper boundsB:', paperPathB.bounds.toString());

    // 先检查两条路径是否实际有重叠（对非 union 运算很重要）
    const boundsA = paperPathA.bounds;
    const boundsB = paperPathB.bounds;
    const hasOverlap = boundsA.intersects(boundsB);
    console.log('[VectorBooleanOps] hasOverlap:', hasOverlap);

    if (operation === 'intersect' && !hasOverlap) {
      console.warn('[VectorBooleanOps] 两个对象的包围盒无重叠，相交结果为空');
      paperPathA.remove();
      paperPathB.remove();
      return null;
    }

    // 执行布尔运算
    let result: InstanceType<typeof paper.PathItem>;

    switch (operation) {
      case 'union':
        result = paperPathA.unite(paperPathB);
        break;
      case 'subtract':
        result = paperPathA.subtract(paperPathB);
        break;
      case 'intersect':
        result = paperPathA.intersect(paperPathB);
        break;
      case 'exclude':
        result = paperPathA.exclude(paperPathB);
        break;
      case 'divide': {
        // divide 返回多个子路径
        const divided = paperPathA.divide(paperPathB);
        const results: FabricObject[] = [];

        if ('children' in divided && Array.isArray(divided.children)) {
          for (const child of divided.children) {
            if ('pathData' in child) {
              const d = child.pathData as string;
              if (d) {
                const fabricPath = createFabricPathFromD(d, objA);
                if (fabricPath) {
                  (fabricPath as unknown as Record<string, string>).name = '分割结果';
                  results.push(fabricPath);
                }
              }
            }
          }
        } else if ('pathData' in divided) {
          const d = divided.pathData as string;
          if (d) {
            const fabricPath = createFabricPathFromD(d, objA);
            if (fabricPath) {
              (fabricPath as unknown as Record<string, string>).name = '分割结果';
              results.push(fabricPath);
            }
          }
        }

        // 清理
        paperPathA.remove();
        paperPathB.remove();

        return results.length > 0 ? results : null;
      }
    }

    // 检查结果是否为空/退化
    const resultBounds = result.bounds;
    if (!resultBounds || resultBounds.width < 0.5 || resultBounds.height < 0.5) {
      console.warn('[VectorBooleanOps] 运算结果面积过小（退化），视为无交集');
      paperPathA.remove();
      paperPathB.remove();
      result.remove();
      return null;
    }

    // 获取结果路径
    const resultD = 'pathData' in result ? (result.pathData as string) : null;

    // 清理
    paperPathA.remove();
    paperPathB.remove();
    result.remove();

    if (!resultD) {
      console.warn('[VectorBooleanOps] 运算结果为空路径');
      return null;
    }

    // 创建 Fabric.js Path
    const fabricResult = createFabricPathFromD(resultD, objA);
    if (!fabricResult) {
      console.warn('[VectorBooleanOps] 无法从结果 d 字符串创建 Fabric Path');
      return null;
    }
    (fabricResult as unknown as Record<string, string>).name = `布尔(${VECTOR_BOOLEAN_OP_LABELS[operation]})`;

    return fabricResult;
  } catch (err) {
    console.warn('[VectorBooleanOps] paper.js 运算失败，回退到像素合成:', err);
    return fallbackToPixel(canvas, objA, objB, operation);
  }
}

/**
 * 回退到像素合成
 */
async function fallbackToPixel(
  canvas: FabricCanvas,
  objA: FabricObject,
  objB: FabricObject,
  operation: VectorBooleanOpType,
): Promise<FabricObject | null> {
  // divide 不支持像素回退
  if (operation === 'divide') {
    console.warn('[VectorBooleanOps] 像素合成不支持 divide 操作');
    return null;
  }

  const { FabricImage } = await import('fabric');
  const pixelResult = performPixelBooleanOp(canvas, objA, objB, operation);
  if (!pixelResult) return null;

  try {
    const resultImg = await FabricImage.fromURL(pixelResult.dataURL);
    // 设置正确的位置（基于裁切后的区域坐标）
    resultImg.set({
      left: pixelResult.left,
      top: pixelResult.top,
    });
    resultImg.setCoords();
    (resultImg as unknown as Record<string, string>).name = `布尔(${VECTOR_BOOLEAN_OP_LABELS[operation]})-像素`;
    return resultImg;
  } catch {
    return null;
  }
}

/**
 * 检查 paper.js 是否可用（预加载检查）
 */
export async function isPaperJsAvailable(): Promise<boolean> {
  try {
    await import('paper');
    return true;
  } catch {
    return false;
  }
}
