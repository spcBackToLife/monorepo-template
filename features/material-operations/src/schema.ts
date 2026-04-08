/**
 * @globallink/material-operations — 素材项目 Schema 定义
 *
 * 与 @globallink/design-schema 同构的数据模型。
 * 后端和前端共享同一份类型定义，后端是数据唯一真相来源。
 */

// ===== 基础值类型 =====

/** 渐变色标 */
export interface GradientStop {
  color: string;
  offset: number; // 0-1
}

/** 渐变定义 */
export interface GradientDef {
  type: 'linear' | 'radial' | 'conic';
  /** 线性渐变角度（度），默认 0 = 从上到下 */
  angle?: number;
  /** 色标 */
  stops: GradientStop[];
  /** 径向渐变中心 X (0-1) */
  cx?: number;
  /** 径向渐变中心 Y (0-1) */
  cy?: number;
  /** 径向渐变半径 (0-1) */
  r?: number;
}

/** 阴影定义 */
export interface ShadowDef {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

/** CSS 滤镜条目 */
export interface FilterEntry {
  type: string;   // 'blur' | 'brightness' | 'contrast' | 'grayscale' | 'hue-rotate' | ...
  value: string;  // e.g. "4px", "1.2", "120deg"
  enabled: boolean;
}

// ===== 素材对象 =====

/** 素材对象类型 */
export type MaterialObjectType =
  | 'rect'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'path'
  | 'line'
  | 'textbox'
  | 'image'
  | 'group';

/** 素材对象 — 画布上的一个图形元素 */
export interface MaterialObject {
  /** 唯一 ID */
  id: string;
  /** 对象类型 */
  type: MaterialObjectType;
  /** 显示名称（图层名） */
  name: string;

  // ===== 变换 =====
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 旋转角度（度） */
  rotation: number;
  /** 水平缩放 */
  scaleX: number;
  /** 垂直缩放 */
  scaleY: number;

  // ===== 样式 =====
  /** 填充（颜色字符串、渐变定义或 null） */
  fill: string | GradientDef | null;
  /** 描边颜色 */
  stroke: string | null;
  /** 描边宽度 */
  strokeWidth: number;
  /** 不透明度 (0-1) */
  opacity: number;
  /** 混合模式 */
  blendMode: string;

  // ===== 形状特定属性 =====
  /** rect 圆角 X */
  rx?: number;
  /** rect 圆角 Y */
  ry?: number;
  /** polygon 边数 */
  sides?: number;
  /** star 角数 */
  points?: number;
  /** star 内径比 (0-1) */
  innerRatio?: number;
  /** SVG path d 属性 */
  pathData?: string;
  /** line 起点 X */
  x1?: number;
  /** line 起点 Y */
  y1?: number;
  /** line 终点 X */
  x2?: number;
  /** line 终点 Y */
  y2?: number;

  // ===== 文字属性 =====
  /** 文字内容 */
  text?: string;
  /** 字号 */
  fontSize?: number;
  /** 字体 */
  fontFamily?: string;
  /** 字重 */
  fontWeight?: string | number;
  /** 对齐方式 */
  textAlign?: string;
  /** 行高 */
  lineHeight?: number;
  /** 字间距 */
  letterSpacing?: number;

  // ===== 图片属性 =====
  /** 图片 URL */
  src?: string;

  // ===== 控制属性 =====
  /** 是否可见 */
  visible: boolean;
  /** 是否锁定 */
  locked: boolean;

  // ===== 组属性 =====
  /** 子对象（group 类型使用） */
  children?: MaterialObject[];

  // ===== 效果 =====
  /** 滤镜列表 */
  filters?: FilterEntry[];
  /** 阴影 */
  shadow?: ShadowDef | null;
}

/** 参考框配置 */
export interface ReferenceFrameConfig {
  enabled: boolean;
  width: number;
  height: number;
}

/** 素材工程 Schema — 后端和前端共享的唯一数据模型 */
export interface MaterialProjectSchema {
  /** 素材工程 ID */
  id: string;
  /** 所属设计项目 ID */
  projectId: string;
  /** 工程名称 */
  name: string;

  /** 画布宽度 */
  canvasWidth: number;
  /** 画布高度 */
  canvasHeight: number;
  /** 画布背景色 */
  backgroundColor: string;

  /** 参考框配置 */
  referenceFrame: ReferenceFrameConfig;

  /** 对象列表（有序，索引 = 图层堆叠顺序，从底到顶） */
  objects: MaterialObject[];

  /** 数据版本号（每次操作递增） */
  version: number;

  /** 创建时间 ISO string */
  createdAt: string;
  /** 更新时间 ISO string */
  updatedAt: string;
}

// ===== 工厂函数 =====

/** 创建空的素材工程 */
export function createMaterialProject(
  id: string,
  projectId: string,
  name: string,
  width: number = 200,
  height: number = 200,
): MaterialProjectSchema {
  const now = new Date().toISOString();
  return {
    id,
    projectId,
    name,
    canvasWidth: width,
    canvasHeight: height,
    backgroundColor: '#ffffff',
    referenceFrame: {
      enabled: true,
      width,
      height,
    },
    objects: [],
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** 创建默认的 MaterialObject */
export function createDefaultObject(
  type: MaterialObjectType,
  id: string,
  name?: string,
): MaterialObject {
  const defaults: Record<MaterialObjectType, Partial<MaterialObject>> = {
    rect: { width: 100, height: 80, fill: '#4A90D9', rx: 0, ry: 0 },
    ellipse: { width: 100, height: 100, fill: '#4A90D9' },
    polygon: { width: 100, height: 100, fill: '#4A90D9', sides: 6 },
    star: { width: 100, height: 100, fill: '#4A90D9', points: 5, innerRatio: 0.4 },
    path: { width: 100, height: 100, fill: '#4A90D9', pathData: '' },
    line: { width: 100, height: 0, x1: 0, y1: 0, x2: 100, y2: 0, fill: null, stroke: '#333333', strokeWidth: 2 },
    textbox: { width: 200, height: 40, fill: '#333333', text: 'Text', fontSize: 16, fontFamily: 'sans-serif' },
    image: { width: 200, height: 150, fill: null, src: '' },
    group: { width: 100, height: 100, fill: null, children: [] },
  };

  const d = defaults[type] ?? {};

  return {
    id,
    type,
    name: name ?? `${type}_${id.slice(-4)}`,
    x: 0,
    y: 0,
    width: d.width ?? 100,
    height: d.height ?? 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    fill: d.fill ?? '#4A90D9',
    stroke: d.stroke ?? null,
    strokeWidth: d.strokeWidth ?? 0,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    ...d,
  } as MaterialObject;
}
