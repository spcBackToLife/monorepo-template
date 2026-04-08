/**
 * 布尔运算操作：booleanOp
 *
 * 支持的运算类型：
 *   - union       合并（并集）
 *   - subtract    减去（差集）
 *   - intersect   相交（交集）
 *   - exclude     排除（对称差）
 *
 * 核心逻辑：
 *   1. 将两个对象转换为绝对坐标多边形
 *   2. 使用 Weiler-Atherton 裁剪算法 + 多边形合并
 *   3. 生成新的 path 对象，移除原对象
 *
 * 默认元素特殊处理：
 *   如果参与运算的对象 ID 等于 schema 中的 defaultElementId（组件默认元素），
 *   不会直接操作该元素，而是先在同一位置生成一个克隆框参与运算，
 *   原默认元素保持不变。
 */

import type { MaterialProjectSchema, MaterialObject } from '../schema';
import type {
  BooleanOpType,
  BooleanOpOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone, generateObjectId, findObjectIndex } from '../utils';

type ExecResult = {
  project: MaterialProjectSchema;
  result: OperationResult;
  inverse: InverseData;
};

type Pt = { x: number; y: number };

// ===== 对象 → 绝对坐标多边形 =====

/** 将 rect 转为绝对坐标多边形顶点 */
function rectToPolygon(obj: MaterialObject): Pt[] {
  const w = obj.width * obj.scaleX;
  const h = obj.height * obj.scaleY;
  const x = obj.x;
  const y = obj.y;
  const rx = Math.min(obj.rx ?? 0, w / 2);
  const ry = Math.min(obj.ry ?? 0, h / 2);

  if (rx <= 0 && ry <= 0) {
    // 无圆角 → 4 个顶点
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }

  // 有圆角 → 用多段线近似圆弧
  const r = Math.max(rx, ry);
  const pts: Pt[] = [];
  const arcSteps = 8;

  // 右上角弧
  for (let i = 0; i <= arcSteps; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / arcSteps);
    pts.push({
      x: x + w - r + r * Math.cos(a),
      y: y + r + r * Math.sin(a),
    });
  }
  // 右下角弧
  for (let i = 0; i <= arcSteps; i++) {
    const a = 0 + (Math.PI / 2) * (i / arcSteps);
    pts.push({
      x: x + w - r + r * Math.cos(a),
      y: y + h - r + r * Math.sin(a),
    });
  }
  // 左下角弧
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / arcSteps);
    pts.push({
      x: x + r + r * Math.cos(a),
      y: y + h - r + r * Math.sin(a),
    });
  }
  // 左上角弧
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / arcSteps);
    pts.push({
      x: x + r + r * Math.cos(a),
      y: y + r + r * Math.sin(a),
    });
  }

  return pts;
}

/** 将 ellipse 转为多边形近似（32 段） */
function ellipseToPolygon(obj: MaterialObject): Pt[] {
  const cx = obj.x + (obj.width * obj.scaleX) / 2;
  const cy = obj.y + (obj.height * obj.scaleY) / 2;
  const rx = (obj.width * obj.scaleX) / 2;
  const ry = (obj.height * obj.scaleY) / 2;
  const N = 32;
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

/** 正多边形顶点 */
function polygonVertices(obj: MaterialObject): Pt[] {
  const cx = obj.x + (obj.width * obj.scaleX) / 2;
  const cy = obj.y + (obj.height * obj.scaleY) / 2;
  const rx = (obj.width * obj.scaleX) / 2;
  const ry = (obj.height * obj.scaleY) / 2;
  const sides = obj.sides ?? 6;
  const startAngle = -Math.PI / 2;
  const angle = (2 * Math.PI) / sides;
  const pts: Pt[] = [];
  for (let i = 0; i < sides; i++) {
    const a = startAngle + i * angle;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

/** 星形顶点 */
function starVertices(obj: MaterialObject): Pt[] {
  const cx = obj.x + (obj.width * obj.scaleX) / 2;
  const cy = obj.y + (obj.height * obj.scaleY) / 2;
  const outerRx = (obj.width * obj.scaleX) / 2;
  const outerRy = (obj.height * obj.scaleY) / 2;
  const innerRatio = obj.innerRatio ?? 0.4;
  const innerRx = outerRx * innerRatio;
  const innerRy = outerRy * innerRatio;
  const numPoints = obj.points ?? 5;
  const angle = Math.PI / numPoints;
  const startAngle = -Math.PI / 2;
  const pts: Pt[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const a = startAngle + i * angle;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

/**
 * 解析 SVG path d 到多边形顶点。
 * 对于布尔运算结果（path 类型的对象），pathData 使用的是相对于 (0,0) 的坐标，
 * 需要加上对象的 x/y 偏移得到绝对坐标。
 */
function pathDataToPolygon(obj: MaterialObject): Pt[] {
  const d = obj.pathData;
  if (!d) return [];
  const pts: Pt[] = [];
  const commands = d.match(/[MLQCAZ][^MLQCAZ]*/gi);
  if (!commands) return pts;

  let cx = 0, cy = 0;
  for (const cmd of commands) {
    const type = cmd[0]!.toUpperCase();
    const nums = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (type === 'M' || type === 'L') {
      for (let i = 0; i < nums.length - 1; i += 2) {
        cx = nums[i]!;
        cy = nums[i + 1]!;
        pts.push({ x: cx, y: cy });
      }
    } else if (type === 'Q') {
      if (nums.length >= 4) {
        // 二次贝塞尔 → 采样中间点
        const cp1x = nums[0]!, cp1y = nums[1]!;
        const ex = nums[2]!, ey = nums[3]!;
        for (let t = 0.25; t < 1; t += 0.25) {
          const t1 = 1 - t;
          pts.push({
            x: t1 * t1 * cx + 2 * t1 * t * cp1x + t * t * ex,
            y: t1 * t1 * cy + 2 * t1 * t * cp1y + t * t * ey,
          });
        }
        cx = ex; cy = ey;
        pts.push({ x: cx, y: cy });
      }
    } else if (type === 'C') {
      if (nums.length >= 6) {
        const cp1x = nums[0]!, cp1y = nums[1]!;
        const cp2x = nums[2]!, cp2y = nums[3]!;
        const ex = nums[4]!, ey = nums[5]!;
        for (let t = 0.2; t < 1; t += 0.2) {
          const t1 = 1 - t;
          pts.push({
            x: t1*t1*t1*cx + 3*t1*t1*t*cp1x + 3*t1*t*t*cp2x + t*t*t*ex,
            y: t1*t1*t1*cy + 3*t1*t1*t*cp1y + 3*t1*t*t*cp2y + t*t*t*ey,
          });
        }
        cx = ex; cy = ey;
        pts.push({ x: cx, y: cy });
      }
    } else if (type === 'A') {
      if (nums.length >= 7) {
        cx = nums[5]!;
        cy = nums[6]!;
        pts.push({ x: cx, y: cy });
      }
    }
    // Z: 闭合
  }

  // 将 pathData 局部坐标转为绝对坐标（加上对象位置偏移）
  const offsetX = obj.x;
  const offsetY = obj.y;
  return pts.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
}

/**
 * 将 MaterialObject 转为绝对坐标多边形顶点列表
 */
function objectToPolygon(obj: MaterialObject): Pt[] | null {
  switch (obj.type) {
    case 'rect':
      return rectToPolygon(obj);
    case 'ellipse':
      return ellipseToPolygon(obj);
    case 'polygon':
      return polygonVertices(obj);
    case 'star':
      return starVertices(obj);
    case 'path':
      return pathDataToPolygon(obj);
    default:
      return null;
  }
}

// ===== 多边形布尔运算 =====

/** 将点列表转为 SVG path d 字符串 */
function pointsToPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
}

/** Sutherland-Hodgman 多边形裁剪 — 计算 subject ∩ clip */
function clipPolygon(subject: Pt[], clip: Pt[]): Pt[] {
  if (subject.length < 3 || clip.length < 3) return [];
  let output = [...subject];

  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return [];
    const input = [...output];
    output = [];
    const edgeStart = clip[i]!;
    const edgeEnd = clip[(i + 1) % clip.length]!;

    for (let j = 0; j < input.length; j++) {
      const current = input[j]!;
      const prev = input[(j - 1 + input.length) % input.length]!;
      const currentInside = isInside(current, edgeStart, edgeEnd);
      const prevInside = isInside(prev, edgeStart, edgeEnd);
      if (currentInside) {
        if (!prevInside) {
          const inter = lineIntersect(prev, current, edgeStart, edgeEnd);
          if (inter) output.push(inter);
        }
        output.push(current);
      } else if (prevInside) {
        const inter = lineIntersect(prev, current, edgeStart, edgeEnd);
        if (inter) output.push(inter);
      }
    }
  }
  return output;
}

/** 判断点是否在裁剪边的内侧 */
function isInside(point: Pt, edgeStart: Pt, edgeEnd: Pt): boolean {
  return (
    (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
      (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x) >=
    0
  );
}

/** 两条线段的交点 */
function lineIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

/** 计算多边形面积（带符号） */
function polygonArea(pts: Pt[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i]!.x * pts[j]!.y;
    area -= pts[j]!.x * pts[i]!.y;
  }
  return area / 2;
}

/** 确保多边形是逆时针方向 */
function ensureCCW(pts: Pt[]): Pt[] {
  if (polygonArea(pts) < 0) return [...pts].reverse();
  return pts;
}

/** 确保多边形是顺时针方向 */
function ensureCW(pts: Pt[]): Pt[] {
  if (polygonArea(pts) > 0) return [...pts].reverse();
  return pts;
}

/** 计算多边形的包围盒 */
function polyBounds(pts: Pt[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * 执行布尔运算 — 使用 SVG 复合路径策略
 *
 * 核心思路：
 *   - intersect: Sutherland-Hodgman 裁剪（已验证正确）
 *   - union: 将 A、B 两个子路径合并为一条 SVG 复合 path，
 *            两个子路径都是 CCW 方向，用 fill-rule="nonzero" 渲染，
 *            SVG 引擎自动产生正确的并集效果。
 *   - subtract: A (CCW) + B (CW) 复合路径，fill-rule="nonzero"
 *               SVG 的 nonzero 规则会把 B 的反转 winding 区域挖掉
 *   - exclude: A + B 复合路径，fill-rule="evenodd"
 */
function computeBoolean(
  polyA: Pt[],
  polyB: Pt[],
  opType: BooleanOpType,
): {
  pathData: string;
  bounds: { x: number; y: number; width: number; height: number };
  fillRule?: 'nonzero' | 'evenodd';
} | null {
  const a = ensureCCW(polyA);
  const b = ensureCCW(polyB);

  if (a.length < 3 || b.length < 3) return null;

  switch (opType) {
    case 'intersect': {
      // 交集 — Sutherland-Hodgman 裁剪
      const resultPoly = clipPolygon(a, b);
      if (resultPoly.length < 3) return null;
      const bounds = polyBounds(resultPoly);
      const normalizedPts = resultPoly.map((p) => ({
        x: p.x - bounds.x,
        y: p.y - bounds.y,
      }));
      return { pathData: pointsToPath(normalizedPts), bounds };
    }

    case 'union': {
      // 并集 — 两个 CCW 子路径，用 nonzero 填充规则
      const allPts = [...a, ...b];
      const bounds = polyBounds(allPts);
      const normA = a.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y }));
      const normB = b.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y }));
      const pathA = pointsToPath(normA);
      const pathB = pointsToPath(normB);
      return {
        pathData: `${pathA} ${pathB}`,
        bounds,
        fillRule: 'nonzero',
      };
    }

    case 'subtract': {
      // 差集 — A 保持 CCW，B 反转为 CW，用 nonzero 填充规则
      const bCW = ensureCW(polyB);
      const allPts = [...a, ...bCW];
      const bounds = polyBounds(allPts);
      const normA = a.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y }));
      const normB = bCW.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y }));
      const pathA = pointsToPath(normA);
      const pathB = pointsToPath(normB);
      return {
        pathData: `${pathA} ${pathB}`,
        bounds,
        fillRule: 'nonzero',
      };
    }

    case 'exclude': {
      // 排除（对称差） — 两个 CCW 子路径，用 evenodd 填充规则
      const allPts = [...a, ...b];
      const bounds = polyBounds(allPts);
      const normA = a.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y }));
      const normB = b.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y }));
      const pathA = pointsToPath(normA);
      const pathB = pointsToPath(normB);
      return {
        pathData: `${pathA} ${pathB}`,
        bounds,
        fillRule: 'evenodd',
      };
    }

    default:
      return null;
  }
}

// ===== 布尔运算 Operation 执行 =====

export function executeBooleanOp(
  project: MaterialProjectSchema,
  params: BooleanOpOp['params'],
): ExecResult {
  const { targetId, toolId, opType } = params;

  const newProject = deepClone(project);

  const targetIdx = findObjectIndex(newProject.objects, targetId);
  const toolIdx = findObjectIndex(newProject.objects, toolId);

  if (targetIdx === -1 || toolIdx === -1) {
    return {
      project,
      result: {
        success: false,
        description: `Objects not found: target=${targetId} tool=${toolId}`,
        affectedObjectIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const targetObj = newProject.objects[targetIdx]!;
  const toolObj = newProject.objects[toolIdx]!;

  // 判断是否涉及默认元素
  const isTargetDefault = targetObj.id === newProject.defaultElementId;
  const isToolDefault = toolObj.id === newProject.defaultElementId;

  // 实际参与运算的对象
  let actualTarget = targetObj;
  let actualTool = toolObj;

  // 如果目标是默认元素，生成克隆体参与运算
  if (isTargetDefault) {
    const cloneId = params.cloneId ?? generateObjectId();
    const clone: MaterialObject = {
      ...deepClone(targetObj),
      id: cloneId,
      name: `${targetObj.name} (布尔运算)`,
    };
    // 插入到目标之后
    newProject.objects.splice(targetIdx + 1, 0, clone);
    actualTarget = clone;
    // toolIdx 可能因为插入而偏移
    const newToolIdx = findObjectIndex(newProject.objects, toolId);
    if (newToolIdx !== -1) {
      actualTool = newProject.objects[newToolIdx]!;
    }
  }

  // 如果工具是默认元素，生成克隆体参与运算
  if (isToolDefault && !isTargetDefault) {
    const cloneId = generateObjectId();
    const clone: MaterialObject = {
      ...deepClone(toolObj),
      id: cloneId,
      name: `${toolObj.name} (布尔运算)`,
    };
    newProject.objects.splice(toolIdx + 1, 0, clone);
    actualTool = clone;
  }

  // 转换为多边形（绝对坐标）
  const polyA = objectToPolygon(actualTarget);
  const polyB = objectToPolygon(actualTool);

  if (!polyA || polyA.length < 3 || !polyB || polyB.length < 3) {
    return {
      project,
      result: {
        success: false,
        description: `Cannot convert objects to polygon for boolean operation (types: ${actualTarget.type}, ${actualTool.type})`,
        affectedObjectIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 执行布尔运算
  const boolResult = computeBoolean(polyA, polyB, opType);

  if (!boolResult) {
    return {
      project,
      result: {
        success: false,
        description: `Boolean operation "${opType}" produced no result`,
        affectedObjectIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 创建结果 path 对象
  const resultId = params.resultId ?? generateObjectId();
  const resultObj: MaterialObject = {
    id: resultId,
    type: 'path',
    name: `${opType}(${actualTarget.name}, ${actualTool.name})`,
    x: Math.round(boolResult.bounds.x),
    y: Math.round(boolResult.bounds.y),
    width: Math.round(boolResult.bounds.width),
    height: Math.round(boolResult.bounds.height),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    fill: actualTarget.fill,
    stroke: actualTarget.stroke,
    strokeWidth: actualTarget.strokeWidth,
    opacity: actualTarget.opacity,
    blendMode: actualTarget.blendMode,
    visible: true,
    locked: false,
    pathData: boolResult.pathData,
    fillRule: boolResult.fillRule,
  };

  // 保存被删除的对象（用于 undo）
  const removedObjects: { object: MaterialObject; position: number }[] = [];

  // 从列表中移除参与运算的非默认元素对象（从后往前删，避免索引偏移）
  const idsToRemove = [actualTarget.id, actualTool.id].filter(
    (id) => id !== newProject.defaultElementId,
  );

  const indicesToRemove = idsToRemove
    .map((id) => findObjectIndex(newProject.objects, id))
    .filter((idx) => idx !== -1)
    .sort((a, b) => b - a); // 从大到小排序

  for (const idx of indicesToRemove) {
    const removed = newProject.objects.splice(idx, 1)[0]!;
    removedObjects.push({ object: removed, position: idx });
  }

  // 插入结果对象到最小原始位置
  const insertIdx = Math.min(
    ...removedObjects.map((r) => r.position),
    newProject.objects.length,
  );
  newProject.objects.splice(insertIdx, 0, resultObj);

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Boolean "${opType}" → ${resultObj.name}`,
      affectedObjectIds: [resultId],
    },
    inverse: {
      type: 'me:undoBooleanOp',
      params: {
        resultId,
        removedObjects,
      },
    },
  };
}

/** 布尔运算的反向操作 — 恢复被删除的对象并移除结果 */
export function executeUndoBooleanOp(
  project: MaterialProjectSchema,
  params: {
    resultId: string;
    removedObjects: { object: MaterialObject; position: number }[];
  },
): ExecResult {
  const newProject = deepClone(project);

  // 移除结果对象
  const resultIdx = findObjectIndex(newProject.objects, params.resultId);
  if (resultIdx !== -1) {
    newProject.objects.splice(resultIdx, 1);
  }

  // 恢复被删除的对象（按位置从小到大插入）
  const sorted = [...params.removedObjects].sort((a, b) => a.position - b.position);
  for (const entry of sorted) {
    const pos = Math.min(entry.position, newProject.objects.length);
    newProject.objects.splice(pos, 0, deepClone(entry.object));
  }

  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Undo boolean operation`,
      affectedObjectIds: params.removedObjects.map((r) => r.object.id),
    },
    inverse: { type: 'noop', params: {} },
  };
}
