/**
 * @globallink/material-operations — 素材项目 Schema 定义
 *
 * 与 @globallink/design-schema 同构的数据模型。
 * 后端和前端共享同一份类型定义，后端是数据唯一真相来源。
 */

import { deepClone } from './utils';

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
  | 'group'
  /** 沿路径可变线宽 + 弧上色标（当前实现：圆模板），渲染见 profiledStroke 采样 */
  | 'profiledStroke';

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

  // ===== profiledStroke（圆模板）— 与 @globallink/material-operations/profiledStroke 采样一致 =====
  /** 当前仅支持 circle */
  profiledKind?: 'circle';
  /** 12 点方向总缺口角度（度） */
  profiledGapDegrees?: number;
  /** 缺口两侧线宽羽化角度（度）；不传则由采样算法按 gap 自动估算 */
  profiledGapFeatherDegrees?: number;
  /** 采样段数 */
  profiledSampleSegments?: number;
  /** 沿可见弧 t∈[0,1] 的线宽锚点 */
  profiledWidthStops?: { t: number; width: number }[];
  /** 沿同一参数 t 的色标 */
  profiledColorStops?: { t: number; color: string }[];
  /** 线段端帽 */
  profiledLineCap?: 'round' | 'butt';
  /** SVG fill-rule（布尔运算合并路径使用） */
  fillRule?: 'nonzero' | 'evenodd';
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

  /**
   * 默认元素 ID — 组件自带的那个框。
   * 数据上 `locked: true`，与前端一致：可选中、改填充等样式，不可移动/缩放/旋转/删除/改名/解锁/复制。
   * 布尔运算时不直接操作它，而是在同位置生成克隆体参与运算。
   */
  defaultElementId?: string;

  /** 数据版本号（每次操作递增） */
  version: number;

  /** 创建时间 ISO string */
  createdAt: string;
  /** 更新时间 ISO string */
  updatedAt: string;
}

// ===== 工厂函数 =====

/** 画布最小边距 — 画布至少比参考框每边多出这些像素 */
const CANVAS_MIN_PADDING = 400;

/**
 * 工作台画布尺寸（与 createMaterialProject 一致）。
 * 参考框为「组件」尺寸；画布应显著更大，便于摆放素材与标尺。
 */
export function computeMaterialWorkspaceCanvasSize(
  referenceWidth: number,
  referenceHeight: number,
  explicitCanvasWidth?: number,
  explicitCanvasHeight?: number,
): { canvasWidth: number; canvasHeight: number } {
  const canvasWidth =
    explicitCanvasWidth ?? Math.max(1200, referenceWidth + CANVAS_MIN_PADDING * 2);
  const canvasHeight =
    explicitCanvasHeight ?? Math.max(900, referenceHeight + CANVAS_MIN_PADDING * 2);
  return { canvasWidth, canvasHeight };
}

/**
 * 修复「画布几乎等于参考框」的错误元数据（历史 Modal 曾把二者都设成组件像素）。
 * 展开后须再 reconcile 默认框几何。
 */
export function expandMaterialProjectCanvasIfTooTight(
  schema: MaterialProjectSchema,
): MaterialProjectSchema {
  const rf = schema.referenceFrame;
  if (!rf?.enabled) return schema;
  const margin = 80;
  const tooTight =
    schema.canvasWidth < rf.width + margin || schema.canvasHeight < rf.height + margin;
  if (!tooTight) return schema;
  const { canvasWidth, canvasHeight } = computeMaterialWorkspaceCanvasSize(rf.width, rf.height);
  const next = deepClone(schema);
  next.canvasWidth = canvasWidth;
  next.canvasHeight = canvasHeight;
  return next;
}

/** 创建空的素材工程
 * @param id 工程 ID
 * @param projectId 关联的项目 ID
 * @param name 工程名称
 * @param componentWidth 组件/参考框宽度
 * @param componentHeight 组件/参考框高度
 * @param canvasWidth 可选：画布宽度（默认自动计算 = 组件尺寸 + 边距）
 * @param canvasHeight 可选：画布高度（默认自动计算）
 */
export function createMaterialProject(
  id: string,
  projectId: string,
  name: string,
  componentWidth: number = 200,
  componentHeight: number = 200,
  canvasWidth?: number,
  canvasHeight?: number,
): MaterialProjectSchema {
  const now = new Date().toISOString();
  const { canvasWidth: cw, canvasHeight: ch } = computeMaterialWorkspaceCanvasSize(
    componentWidth,
    componentHeight,
    canvasWidth,
    canvasHeight,
  );

  // 默认元素 — 组件自带的框，居中放置在画布上
  const defaultElementId = `default_${id}`;
  const frameX = (cw - componentWidth) / 2;
  const frameY = (ch - componentHeight) / 2;
  const defaultElement: MaterialObject = {
    id: defaultElementId,
    type: 'rect',
    name: '组件默认框',
    x: frameX,
    y: frameY,
    width: componentWidth,
    height: componentHeight,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    fill: '#ffffff',
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    /** 与前端交互一致：数据上锁定；选中与填充等样式仍由引擎对 defaultElementId 单独放行 */
    locked: true,
    rx: 0,
    ry: 0,
  };

  return {
    id,
    projectId,
    name,
    canvasWidth: cw,
    canvasHeight: ch,
    backgroundColor: '#ffffff',
    referenceFrame: {
      enabled: true,
      width: componentWidth,
      height: componentHeight,
    },
    objects: [defaultElement],
    defaultElementId,
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 将「组件默认框」矩形与当前参考框对齐（居中于画布，尺寸 = referenceFrame）。
 *
 * 背景：SyncBridge 曾用后端 `objects` 覆盖本地后，部分历史工程里默认框被存成整画布占位 (0,0,600×400)，
 * 与参考框虚线脱节。调用本函数可在加载合并后恢复与 createMaterialProject 一致的几何语义。
 */
export function reconcileDefaultElementWithReferenceFrame(
  schema: MaterialProjectSchema,
): MaterialProjectSchema {
  const defId = schema.defaultElementId;
  const rf = schema.referenceFrame;
  if (!defId || !rf?.enabled) return schema;

  const idx = schema.objects.findIndex((o) => o.id === defId);
  if (idx < 0) return schema;

  const { canvasWidth: cw, canvasHeight: ch } = schema;
  const x = (cw - rf.width) / 2;
  const y = (ch - rf.height) / 2;
  const obj = schema.objects[idx]!;
  const w = rf.width;
  const h = rf.height;

  const aligned =
    Math.abs(obj.x - x) < 0.01 &&
    Math.abs(obj.y - y) < 0.01 &&
    Math.abs(obj.width * obj.scaleX - w) < 0.01 &&
    Math.abs(obj.height * obj.scaleY - h) < 0.01;

  if (aligned) {
    const o = schema.objects[idx]!;
    if (o.locked === true) return schema;
    const nextLocked = deepClone(schema);
    nextLocked.objects[idx]!.locked = true;
    return nextLocked;
  }

  const next = deepClone(schema);
  const t = next.objects[idx]!;
  t.x = Math.round(x);
  t.y = Math.round(y);
  t.width = rf.width;
  t.height = rf.height;
  t.scaleX = 1;
  t.scaleY = 1;
  t.locked = true;
  return next;
}

/**
 * 素材编辑器 / GET schema 出口：仅展开工作台画布 + 对齐「组件默认框」与参考框。
 * 具体图元（波形等）必须由 MCP / 前端操作写入 Schema，**不在此写死任何设计**。
 */
export function normalizeMaterialEditorSchema(schema: MaterialProjectSchema): MaterialProjectSchema {
  return reconcileDefaultElementWithReferenceFrame(expandMaterialProjectCanvasIfTooTight(schema));
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
    profiledStroke: {
      width: 220,
      height: 220,
      fill: null,
      stroke: null,
      strokeWidth: 0,
      profiledKind: 'circle',
      /** 顶部开口；与 sampleProfiledStrokeCircle 缺口居中于 12 点一致 */
      profiledGapDegrees: 16,
      profiledSampleSegments: 128,
      /** 细线 + 底部略粗（t=0.5 为 6 点方向），近缺口两端由采样算法再平滑收细 */
      profiledWidthStops: [
        { t: 0, width: 0.55 },
        { t: 0.38, width: 0.88 },
        { t: 0.5, width: 1.45 },
        { t: 0.62, width: 0.88 },
        { t: 1, width: 0.48 },
      ],
      profiledColorStops: [
        { t: 0, color: '#a78bfa' },
        { t: 0.22, color: '#22d3ee' },
        { t: 0.45, color: '#f472b6' },
        { t: 0.72, color: '#fb923c' },
        { t: 1, color: '#818cf8' },
      ],
      profiledLineCap: 'round',
    },
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
