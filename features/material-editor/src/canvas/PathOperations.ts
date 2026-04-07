/**
 * 路径高级操作 — Phase J
 *
 * 提供专业级的路径编辑能力：
 *   - 展开描边（Outline Stroke）
 *   - 路径偏移（Offset Path）
 *   - 路径简化（Simplify Path）
 *   - 路径平滑（Smooth Path）
 *   - 翻转路径方向（Reverse Path）
 *   - 拆解路径（Break Apart）
 *   - 连接路径（Join Paths）
 *
 * 依赖 paper.js 动态导入来执行复杂路径操作。
 */

import {
  Path,
  type FabricObject,
} from 'fabric';

/** 路径操作类型 */
export type PathOperationType =
  | 'outline-stroke'
  | 'offset-path'
  | 'simplify'
  | 'smooth'
  | 'reverse'
  | 'break-apart'
  | 'join-paths';

/** 路径操作中文标签 */
export const PATH_OPERATION_LABELS: Record<PathOperationType, string> = {
  'outline-stroke': '展开描边',
  'offset-path': '路径偏移',
  'simplify': '路径简化',
  'smooth': '路径平滑',
  'reverse': '翻转方向',
  'break-apart': '拆解路径',
  'join-paths': '连接路径',
};

/**
 * 获取 Fabric.js Path 对象的 d 字符串
 */
function getPathD(pathObj: FabricObject): string | null {
  const pathData = (pathObj as unknown as Record<string, unknown>).path as
    | Array<Array<string | number>>
    | undefined;
  if (!pathData) return null;

  let d = '';
  for (const seg of pathData) {
    d += seg.join(' ') + ' ';
  }
  return d.trim();
}

/**
 * 从 d 字符串创建 Fabric.js Path
 */
function createPath(d: string, reference: FabricObject): Path {
  return new Path(d, {
    fill: reference.fill ?? 'transparent',
    stroke: reference.stroke ?? '#333',
    strokeWidth: reference.strokeWidth ?? 1,
    selectable: true,
    evented: true,
  });
}

/**
 * 展开描边（Outline Stroke）
 *
 * 将有描边的路径转换为填充的封闭路径。
 * stroke + path → filled compound path
 */
export async function outlineStroke(
  pathObj: FabricObject,
  strokeWidth?: number,
): Promise<FabricObject | null> {
  const d = getPathD(pathObj);
  if (!d) return null;

  const sw = strokeWidth ?? (pathObj.strokeWidth ?? 1);
  if (sw <= 0) return null;

  try {
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 1;
    paperCanvas.height = 1;
    paper.setup(paperCanvas);

    const paperPath = new paper.Path(d);
    paperPath.strokeWidth = sw;
    paperPath.strokeJoin = 'round';
    paperPath.strokeCap = 'round';

    // 使用 paper.js 的路径偏移来模拟展开描边
    // 创建外轮廓和内轮廓，合并成填充路径
    const outerOffset = (paperPath as unknown as Record<string, (...args: unknown[]) => InstanceType<typeof paper.Path>>)
      .offset?.(sw / 2, { join: 'round' });
    const innerOffset = (paperPath as unknown as Record<string, (...args: unknown[]) => InstanceType<typeof paper.Path>>)
      .offset?.(-sw / 2, { join: 'round' });

    let resultD: string | null = null;

    if (outerOffset && innerOffset) {
      const combined = outerOffset.unite(innerOffset);
      resultD = combined.pathData;
      combined.remove();
      outerOffset.remove();
      innerOffset.remove();
    } else {
      // 简化方案：将描边转为虚拟的包围路径
      // 使用较大的描边宽度重新创建
      const expanded = paperPath.clone() as InstanceType<typeof paper.Path>;
      expanded.strokeWidth = sw;
      const expandedBounds = expanded.strokeBounds;

      // 创建一个与描边包围盒等大的矩形来近似
      const boundRect = new paper.Path.Rectangle(expandedBounds);
      const intersection = boundRect.intersect(expanded);
      resultD = intersection?.pathData ?? null;

      expanded.remove();
      boundRect.remove();
      intersection?.remove();
    }

    paperPath.remove();

    if (!resultD) return null;

    const result = new Path(resultD, {
      fill: pathObj.stroke ?? '#333',
      stroke: 'transparent',
      strokeWidth: 0,
      selectable: true,
      evented: true,
    });
    (result as unknown as Record<string, string>).name = '展开描边';
    return result;
  } catch (err) {
    console.warn('[PathOperations] 展开描边失败:', err);
    return null;
  }
}

/**
 * 路径偏移（Offset Path）
 *
 * 生成等距偏移路径（正值外扩，负值内缩）
 */
export async function offsetPath(
  pathObj: FabricObject,
  distance: number,
): Promise<FabricObject | null> {
  const d = getPathD(pathObj);
  if (!d) return null;

  try {
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 1;
    paperCanvas.height = 1;
    paper.setup(paperCanvas);

    const paperPath = new paper.Path(d);

    // paper.js 的 offset（如果可用）
    const offsetFn = (paperPath as unknown as Record<string, (...args: unknown[]) => InstanceType<typeof paper.Path>>).offset;
    let resultPath: InstanceType<typeof paper.Path> | null = null;

    if (typeof offsetFn === 'function') {
      resultPath = offsetFn.call(paperPath, distance, { join: 'round' });
    } else {
      // 退化方案：缩放路径
      const clone = paperPath.clone() as InstanceType<typeof paper.Path>;
      const scaleFactor = 1 + (distance * 2) / Math.max(clone.bounds.width, clone.bounds.height, 1);
      clone.scale(scaleFactor);
      resultPath = clone;
    }

    if (!resultPath) {
      paperPath.remove();
      return null;
    }

    const resultD = resultPath.pathData;
    resultPath.remove();
    paperPath.remove();

    if (!resultD) return null;

    const result = createPath(resultD, pathObj);
    (result as unknown as Record<string, string>).name = `偏移路径(${distance > 0 ? '+' : ''}${distance})`;
    return result;
  } catch (err) {
    console.warn('[PathOperations] 路径偏移失败:', err);
    return null;
  }
}

/**
 * 路径简化（Simplify Path）
 *
 * 减少路径锚点数量，保持形状近似。
 * 常用于清理铅笔工具绘制的过度密集锚点。
 *
 * @param tolerance — 简化容差（越大越简化，默认 2.5）
 */
export async function simplifyPath(
  pathObj: FabricObject,
  tolerance = 2.5,
): Promise<FabricObject | null> {
  const d = getPathD(pathObj);
  if (!d) return null;

  try {
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 1;
    paperCanvas.height = 1;
    paper.setup(paperCanvas);

    const paperPath = new paper.Path(d);
    paperPath.simplify(tolerance);

    const resultD = paperPath.pathData;
    paperPath.remove();

    if (!resultD) return null;

    const result = createPath(resultD, pathObj);
    (result as unknown as Record<string, string>).name = '简化路径';
    return result;
  } catch (err) {
    console.warn('[PathOperations] 路径简化失败:', err);
    return null;
  }
}

/**
 * 路径平滑（Smooth Path）
 *
 * 将直线段锚点转为曲线锚点，自动添加合理的控制手柄。
 */
export async function smoothPath(
  pathObj: FabricObject,
): Promise<FabricObject | null> {
  const d = getPathD(pathObj);
  if (!d) return null;

  try {
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 1;
    paperCanvas.height = 1;
    paper.setup(paperCanvas);

    const paperPath = new paper.Path(d);
    paperPath.smooth({ type: 'catmull-rom' });

    const resultD = paperPath.pathData;
    paperPath.remove();

    if (!resultD) return null;

    const result = createPath(resultD, pathObj);
    (result as unknown as Record<string, string>).name = '平滑路径';
    return result;
  } catch (err) {
    console.warn('[PathOperations] 路径平滑失败:', err);
    return null;
  }
}

/**
 * 翻转路径方向（Reverse Path）
 *
 * 翻转路径的绘制方向。
 */
export async function reversePath(
  pathObj: FabricObject,
): Promise<FabricObject | null> {
  const d = getPathD(pathObj);
  if (!d) return null;

  try {
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 1;
    paperCanvas.height = 1;
    paper.setup(paperCanvas);

    const paperPath = new paper.Path(d);
    paperPath.reverse();

    const resultD = paperPath.pathData;
    paperPath.remove();

    if (!resultD) return null;

    const result = createPath(resultD, pathObj);
    (result as unknown as Record<string, string>).name = '翻转路径';
    return result;
  } catch (err) {
    console.warn('[PathOperations] 翻转路径失败:', err);
    return null;
  }
}

/**
 * 拆解路径（Break Apart）
 *
 * 将复合路径拆分为多个独立子路径。
 */
export async function breakApart(
  pathObj: FabricObject,
): Promise<FabricObject[] | null> {
  const d = getPathD(pathObj);
  if (!d) return null;

  try {
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 1;
    paperCanvas.height = 1;
    paper.setup(paperCanvas);

    const compoundPath = new paper.CompoundPath(d);
    const results: FabricObject[] = [];

    if (compoundPath.children && compoundPath.children.length > 1) {
      for (const child of compoundPath.children) {
        if ('pathData' in child) {
          const childD = child.pathData as string;
          if (childD) {
            const fabricPath = createPath(childD, pathObj);
            (fabricPath as unknown as Record<string, string>).name = '拆解子路径';
            results.push(fabricPath);
          }
        }
      }
    }

    compoundPath.remove();

    return results.length > 0 ? results : null;
  } catch (err) {
    console.warn('[PathOperations] 拆解路径失败:', err);
    return null;
  }
}

/**
 * 连接路径（Join Paths）
 *
 * 将两个开放路径首尾相连合为一条路径。
 */
export async function joinPaths(
  pathA: FabricObject,
  pathB: FabricObject,
): Promise<FabricObject | null> {
  const dA = getPathD(pathA);
  const dB = getPathD(pathB);
  if (!dA || !dB) return null;

  try {
    const paperModule = await import('paper');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paper = (paperModule as any).default || paperModule;
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = 1;
    paperCanvas.height = 1;
    paper.setup(paperCanvas);

    const paperPathA = new paper.Path(dA);
    const paperPathB = new paper.Path(dB);

    // 连接两条路径
    paperPathA.join(paperPathB);

    const resultD = paperPathA.pathData;
    paperPathA.remove();

    if (!resultD) return null;

    const result = createPath(resultD, pathA);
    (result as unknown as Record<string, string>).name = '连接路径';
    return result;
  } catch (err) {
    console.warn('[PathOperations] 连接路径失败:', err);
    return null;
  }
}
