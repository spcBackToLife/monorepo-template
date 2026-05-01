/**
 * SVG 渲染工具函数
 *
 * MaterialObject → SVG 属性/元素的转换逻辑集中在此处。
 */
import type {
  MaterialObject,
  MaterialProjectSchema,
  GradientDef,
  FilterEntry,
} from '@globallink/material-operations';

// ===== 变换 =====

/** 生成 SVG transform 属性值 */
export function getTransform(obj: MaterialObject): string {
  const parts: string[] = [];

  // 位移
  parts.push(`translate(${obj.x}, ${obj.y})`);

  // 旋转（围绕对象中心）
  if (obj.rotation !== 0) {
    const cx = (obj.width * obj.scaleX) / 2;
    const cy = (obj.height * obj.scaleY) / 2;
    parts.push(`rotate(${obj.rotation}, ${cx}, ${cy})`);
  }

  // 缩放
  if (obj.scaleX !== 1 || obj.scaleY !== 1) {
    parts.push(`scale(${obj.scaleX}, ${obj.scaleY})`);
  }

  return parts.join(' ');
}

// ===== 填充 =====

/** 判断填充是否为渐变 */
export function isGradientFill(fill: MaterialObject['fill']): fill is GradientDef {
  return fill !== null && typeof fill === 'object' && 'type' in fill;
}

/** 为渐变生成唯一的 <defs> ID */
export function getGradientId(objectId: string): string {
  return `grad-${objectId}`;
}

/** 获取对象的填充属性值（用于 SVG fill 属性） */
export function getFillValue(obj: MaterialObject): string {
  if (obj.fill === null || obj.fill === undefined) return 'none';
  if (typeof obj.fill === 'string') return obj.fill;
  // 渐变 → 引用 defs 中定义的渐变
  return `url(#${getGradientId(obj.id)})`;
}

// ===== 描边 =====

export function getStrokeValue(obj: MaterialObject): string {
  return obj.stroke ?? 'none';
}

// ===== 混合模式 =====

export function getMixBlendMode(
  blendMode: string,
): React.CSSProperties['mixBlendMode'] {
  if (blendMode === 'normal') return undefined;
  return blendMode as React.CSSProperties['mixBlendMode'];
}

// ===== 阴影 → SVG filter =====

export function getShadowFilterId(objectId: string): string {
  return `shadow-${objectId}`;
}

export function hasShadow(obj: MaterialObject): boolean {
  return obj.shadow != null;
}

// ===== CSS 滤镜 =====

export function getCssFilter(filters?: FilterEntry[]): string | undefined {
  if (!filters || filters.length === 0) return undefined;
  const parts = filters
    .filter((f) => f.enabled)
    .map((f) => {
      switch (f.type) {
        case 'blur':
          return `blur(${f.value})`;
        case 'brightness':
          return `brightness(${f.value})`;
        case 'contrast':
          return `contrast(${f.value})`;
        case 'grayscale':
          return `grayscale(${f.value})`;
        case 'hue-rotate':
          return `hue-rotate(${f.value})`;
        case 'invert':
          return `invert(${f.value})`;
        case 'opacity':
          return `opacity(${f.value})`;
        case 'saturate':
          return `saturate(${f.value})`;
        case 'sepia':
          return `sepia(${f.value})`;
        case 'drop-shadow':
          return `drop-shadow(${f.value})`;
        default:
          return '';
      }
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

// ===== 多边形/星形 点计算 =====

/** 生成正多边形的 SVG points */
export function getPolygonPoints(
  width: number,
  height: number,
  sides: number,
): string {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const angle = (2 * Math.PI) / sides;
  const startAngle = -Math.PI / 2; // 从顶部开始

  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = startAngle + i * angle;
    points.push(`${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`);
  }
  return points.join(' ');
}

/** 生成星形的 SVG points */
export function getStarPoints(
  width: number,
  height: number,
  numPoints: number,
  innerRatio: number,
): string {
  const cx = width / 2;
  const cy = height / 2;
  const outerRx = width / 2;
  const outerRy = height / 2;
  const innerRx = outerRx * innerRatio;
  const innerRy = outerRy * innerRatio;
  const angle = Math.PI / numPoints;
  const startAngle = -Math.PI / 2;

  const points: string[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const a = startAngle + i * angle;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    points.push(`${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`);
  }
  return points.join(' ');
}

// ===== 样式对象 =====

/** 生成对象的内联 CSS 样式 */
export function getObjectStyle(obj: MaterialObject): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (obj.opacity !== 1) {
    style.opacity = obj.opacity;
  }

  const blend = getMixBlendMode(obj.blendMode);
  if (blend) {
    style.mixBlendMode = blend;
  }

  const filter = getCssFilter(obj.filters);
  if (filter) {
    style.filter = filter;
  }

  if (!obj.visible) {
    style.display = 'none';
  }

  return style;
}

// ===== 包围盒 =====

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/** 获取对象的包围盒 */
export function getBoundingBox(obj: MaterialObject): BoundingBox {
  return {
    x: obj.x,
    y: obj.y,
    width: obj.width * obj.scaleX,
    height: obj.height * obj.scaleY,
    rotation: obj.rotation,
  };
}

/**
 * 选中框 / 对齐线 / hover 叠加层使用的几何包围盒。
 *
 * 历史数据里「组件默认框」常被存成整画布占位 (0,0,600×400)，而视觉上的组件边界是 referenceFrame。
 * 此时若仍用 getBoundingBox，选框会跑到左上角；应对齐到与 CanvasGrid 虚线参考框一致。
 */
export function getOverlayBoundingBox(
  obj: MaterialObject,
  project: MaterialProjectSchema,
): BoundingBox {
  const rf = project.referenceFrame;
  if (
    project.defaultElementId &&
    obj.id === project.defaultElementId &&
    rf?.enabled
  ) {
    const { canvasWidth, canvasHeight } = project;
    return {
      x: (canvasWidth - rf.width) / 2,
      y: (canvasHeight - rf.height) / 2,
      width: rf.width,
      height: rf.height,
      rotation: 0,
    };
  }
  return getBoundingBox(obj);
}
