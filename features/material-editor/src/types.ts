/**
 * Material Editor — 素材编辑器类型定义
 *
 * 定义图层系统、滤镜、导出格式等核心数据结构。
 * 这些类型是 CSS-first 设计理念的基础：
 *   输出物 = CSS 属性值（渐变/阴影/滤镜） + 资源文件引用
 */

// ===== 图层类型 =====

/** 图层类型枚举 */
export type LayerType =
  | 'solid'       // 纯色
  | 'gradient'    // 渐变
  | 'image'       // 图片
  | 'pattern'     // 图案纹理
  | 'shape'       // 矢量图形
  | 'svg'         // 导入的 SVG
  | 'text'        // 文字
  | 'group';      // 图层组

/** CSS 混合模式 */
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

/** 渐变类型 */
export type GradientType = 'linear' | 'radial' | 'conic';

/** 渐变色标 */
export interface ColorStop {
  color: string;
  position: number; // 0-1
}

/** 图形类型 */
export type ShapeType = 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'path';

/** 点坐标 */
export interface Point {
  x: number;
  y: number;
}

// ===== 图层配置 =====

/** 纯色图层配置 */
export interface SolidLayerConfig {
  type: 'solid';
  color: string;
}

/** 渐变图层配置 */
export interface GradientLayerConfig {
  type: 'gradient';
  gradientType: GradientType;
  angle?: number;              // 线性渐变角度（度）
  colorStops: ColorStop[];
  // 径向渐变特有
  centerX?: number;            // 0-1 百分比
  centerY?: number;
  radiusX?: number;
  radiusY?: number;
}

/** 图片图层配置 */
export interface ImageLayerConfig {
  type: 'image';
  src: string;                 // asset:// URL 或 base64
  fit: 'cover' | 'contain' | 'fill' | 'none';
  position: Point;             // 百分比 0-100
  size: { width: number; height: number };
  crop?: { x: number; y: number; width: number; height: number };
  filters?: FilterConfig[];
}

/** 图案纹理图层配置 */
export interface PatternLayerConfig {
  type: 'pattern';
  src: string;
  tileWidth: number;
  tileHeight: number;
  repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
}

/** 图形图层配置 */
export interface ShapeLayerConfig {
  type: 'shape';
  shapeType: ShapeType;
  fill?: string | GradientLayerConfig;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;       // 矩形圆角
  sides?: number;              // 多边形边数
  innerRadius?: number;        // 星形内径比
  points?: Point[];            // 路径点
  pathData?: string;           // SVG path d 属性
}

/** SVG 图层配置 */
export interface SvgLayerConfig {
  type: 'svg';
  svgContent: string;          // SVG 字符串
}

/** 文字图层配置 */
export interface TextLayerConfig {
  type: 'text';
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fill?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

/** 图层组配置 */
export interface GroupLayerConfig {
  type: 'group';
  childLayerIds: string[];
}

/** 图层配置联合类型 */
export type LayerConfig =
  | SolidLayerConfig
  | GradientLayerConfig
  | ImageLayerConfig
  | PatternLayerConfig
  | ShapeLayerConfig
  | SvgLayerConfig
  | TextLayerConfig
  | GroupLayerConfig;

// ===== 图层 =====

/** 素材图层 */
export interface MaterialLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;             // 0-1
  blendMode: BlendMode;
  order: number;               // 堆叠顺序
  config: LayerConfig;
}

// ===== 滤镜 =====

/** CSS 原生滤镜类型（可直接映射到 CSS filter） */
export type CSSFilterType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'grayscale'
  | 'hue-rotate'
  | 'invert'
  | 'opacity'
  | 'saturate'
  | 'sepia'
  | 'drop-shadow';

/** 滤镜配置 */
export interface FilterConfig {
  type: CSSFilterType;
  value: string;               // e.g. "4px", "1.2", "120deg"
  enabled: boolean;
}

// ===== 阴影 =====

/** 阴影配置 */
export interface ShadowConfig {
  type: 'box-shadow' | 'text-shadow' | 'drop-shadow';
  x: number;
  y: number;
  blur: number;
  spread?: number;             // 仅 box-shadow
  color: string;
  inset?: boolean;             // 仅 box-shadow
  enabled: boolean;
}

// ===== 导出 =====

/** CSS 导出结果 */
export interface CSSOutput {
  background?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundBlendMode?: string;
  filter?: string;
  backdropFilter?: string;
  boxShadow?: string;
  textShadow?: string;
  borderImage?: string;
  maskImage?: string;
  // 允许扩展
  [key: string]: string | undefined;
}

/** 素材编辑器输出 */
export interface MaterialEditorOutput {
  /** CSS 属性（直接写入 Schema.styles） */
  css?: CSSOutput;

  /** 资源文件（需上传到服务端） */
  assets?: {
    type: 'svg' | 'png' | 'webp';
    data: Blob;
    filename: string;
    usage: 'src' | 'background' | 'icon';
  }[];

  /** 内联 SVG（小型图标） */
  inlineSvg?: string;
}

// ===== 素材编辑器工程文件 =====

/** 素材编辑器工程（可保存/重新编辑） */
export interface MaterialProject {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: MaterialLayer[];
  shadows: ShadowConfig[];
  filters: FilterConfig[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ===== 动画 =====

/** CSS 关键帧 */
export interface CSSKeyframe {
  offset: number;              // 0-1 (0%=0, 50%=0.5, 100%=1)
  styles: Record<string, string | number>;
}

/** CSS 动画配置 */
export interface CSSAnimationConfig {
  name: string;
  duration: string;            // "0.5s", "300ms"
  timingFunction: string;      // "ease", "linear", "cubic-bezier(...)"
  delay?: string;
  iterationCount?: string | number;  // "infinite" 或数字
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  keyframes: CSSKeyframe[];
}

/** 外部动画资源配置 */
export interface ExternalAnimationConfig {
  type: 'lottie' | 'pag' | 'rive' | 'gif';
  src: string;                 // asset:// URL
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
}

/** 动画配置 */
export interface AnimationConfig {
  css?: CSSAnimationConfig;
  external?: ExternalAnimationConfig;
}

// ===== 工具 =====

/** 素材编辑器工具类型 */
export type MaterialToolType =
  | 'select'
  | 'hand'
  | 'rect'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'path'       // 钢笔工具
  | 'pencil'     // 铅笔工具
  | 'text'
  | 'image'
  | 'gradient'
  | 'fill'
  | 'eyedropper';

// ===== 素材编辑器初始化 =====

/** 从设计编辑器打开素材编辑器时的初始化参数 */
export interface MaterialEditorInit {
  /** 关联的 Schema 节点（可选，独立创作时为 undefined） */
  targetNodeId?: string;
  targetNodeType?: string;

  /** 初始图层（从 node.styles 解析） */
  initialLayers?: MaterialLayer[];

  /** 初始滤镜（从 node.styles.filter 解析） */
  initialFilters?: FilterConfig[];

  /** 初始阴影（从 node.styles.boxShadow 解析） */
  initialShadows?: ShadowConfig[];

  /** 画布尺寸 */
  canvasWidth: number;
  canvasHeight: number;
}

// ===== 预置模板 =====

/** 渐变预设 */
export interface GradientPreset {
  name: string;
  nameEn: string;
  config: GradientLayerConfig;
}

/** 动画预设 */
export interface AnimationPreset {
  name: string;
  nameEn: string;
  config: CSSAnimationConfig;
}
