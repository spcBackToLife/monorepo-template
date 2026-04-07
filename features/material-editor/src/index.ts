/**
 * @globallink/material-editor
 *
 * 素材编辑器核心库 — CSS 视觉效果构建器 + 轻量图形编辑器。
 *
 * 设计理念：CSS-first
 *   输出物 = CSS 属性值（渐变/阴影/滤镜/背景） + 资源文件引用
 */

// ===== Types =====
export type {
  // 图层
  LayerType,
  BlendMode,
  MaterialLayer,
  LayerConfig,
  SolidLayerConfig,
  GradientLayerConfig,
  ImageLayerConfig,
  PatternLayerConfig,
  ShapeLayerConfig,
  SvgLayerConfig,
  TextLayerConfig,
  GroupLayerConfig,
  // 渐变
  GradientType,
  ColorStop,
  GradientPreset,
  // 滤镜
  CSSFilterType,
  FilterConfig,
  // 阴影
  ShadowConfig,
  // 图形
  ShapeType,
  Point,
  // 导出
  CSSOutput,
  MaterialEditorOutput,
  // 工程文件
  MaterialProject,
  // 动画
  CSSKeyframe,
  CSSAnimationConfig,
  ExternalAnimationConfig,
  AnimationConfig,
  AnimationPreset,
  // 工具
  MaterialToolType,
  // 初始化
  MaterialEditorInit,
} from './types';

// ===== Core: 渐变 =====
export {
  gradientToCSS,
  parseGradientCSS,
  createLinearGradient,
  createRadialGradient,
  createConicGradient,
  GRADIENT_PRESETS,
} from './core/gradient';

// ===== Core: 滤镜 =====
export {
  filtersToCSS,
  parseFilterCSS,
  createFilter,
  FILTER_DEFAULTS,
  FILTER_RANGES,
  FILTER_LABELS,
} from './core/filters';

// ===== Core: 阴影 =====
export {
  shadowsToCSS,
  parseBoxShadow,
  parseTextShadow,
  createBoxShadow,
  createTextShadow,
  SHADOW_PRESETS,
} from './core/shadows';

// ===== Core: 动画 =====
export {
  animationToCSS,
  createAnimation,
  ANIMATION_PRESETS,
  EASING_PRESETS,
} from './core/animation';

// ===== Core: 纹理 =====
export {
  TEXTURE_PRESETS,
  findTexturePreset,
  textureToCSS,
} from './core/textures';
export type {
  TexturePreset,
  TextureOptions,
} from './core/textures';

// ===== Layers =====
export {
  LayerManager,
  createLayer,
  generateLayerId,
} from './layers/LayerManager';

// ===== Export =====
export {
  layersToCSS,
  cssToLayers,
  generateCSSCode,
} from './export/css-exporter';

export {
  parseStylesForEditor,
} from './export/css-parser';

// ===== Canvas: Fabric.js 图形编辑引擎 (Phase 3) =====
export {
  MaterialEditorCore,
  BLEND_MODES,
  BLEND_MODE_LABELS,
} from './canvas/MaterialEditorCore';
export type {
  CanvasEditorEvents,
  MaterialEditorCoreConfig,
  CanvasProjectFile,
} from './canvas/MaterialEditorCore';

export {
  HistoryManager,
} from './canvas/HistoryManager';
export type {
  HistoryState,
} from './canvas/HistoryManager';

// ===== Canvas: Phase 4 — 图层合成与特效 =====
export {
  applyNoise,
  applyPixelate,
  applySharpen,
  applyEmboss,
  applyCanvasFilters,
  createCanvasFilter,
  CANVAS_FILTER_RANGES,
} from './canvas/CanvasFilters';
export type {
  CanvasFilterType,
  CanvasFilterConfig,
} from './canvas/CanvasFilters';

export {
  performBooleanOp,
  getUnionBoundingBox,
  BOOLEAN_OP_LABELS,
} from './canvas/BooleanOps';
export type {
  BooleanOpType,
} from './canvas/BooleanOps';

// ===== Phase F: 参考框系统 =====
export {
  ReferenceFrame,
  computeWorkspaceSize,
} from './canvas/ReferenceFrame';
export type {
  ReferenceFrameConfig,
} from './canvas/ReferenceFrame';

// ===== Phase G: 智能对齐线 =====
export {
  SmartGuideEngine,
} from './canvas/SmartGuides';
export type {
  SmartGuide,
  SmartGuideConfig,
} from './canvas/SmartGuides';

// ===== Phase H: 对齐与分布 =====
export {
  alignObjects,
  distributeObjects,
  ALIGN_LABELS,
  DISTRIBUTE_LABELS,
} from './canvas/AlignDistribute';
export type {
  AlignType,
  DistributeType,
  AlignRelativeTo,
} from './canvas/AlignDistribute';

// ===== Phase I: 矢量布尔运算 =====
export {
  performVectorBooleanOp,
  isPaperJsAvailable,
  VECTOR_BOOLEAN_OP_LABELS,
} from './canvas/VectorBooleanOps';
export type {
  VectorBooleanOpType,
} from './canvas/VectorBooleanOps';

// ===== Phase J: 路径高级操作 =====
export {
  outlineStroke,
  offsetPath,
  simplifyPath,
  smoothPath,
  reversePath,
  breakApart,
  joinPaths,
  PATH_OPERATION_LABELS,
} from './canvas/PathOperations';
export type {
  PathOperationType,
} from './canvas/PathOperations';

// ===== Phase 5: CSS 动画编辑器 =====
export {
  CSSAnimationEditorManager,
  parseTimingFunction,
  bezierToCSS,
  bezierCurvePoints,
  evaluateBezierEasing,
  ANIMATABLE_CSS_PROPERTIES,
  TRANSFORM_PRESETS,
} from './canvas/CSSAnimationEditor';
export type {
  BezierControlPoints,
  CSSAnimationEditorEvents,
} from './canvas/CSSAnimationEditor';

// ===== Phase 6: 动画资源管理 (Lottie/PAG/Rive/GIF) =====
export {
  AnimationResourceManager,
  detectAnimationType,
  isAnimationFile,
  getAnimationTypeName,
  getAnimationTypeIcon,
  getAcceptedExtensions,
  parseLottieJSON,
  replaceLottieText,
  replaceLottieColor,
  hexToLottieColor,
  lottieColorToHex,
  blendColors,
  generateColorScale,
  generateAnimationExportCode,
  generateSchemaAnimationProp,
  createExternalAnimationConfig,
} from './canvas/AnimationResourceManager';
export type {
  AnimationResourceType,
  AnimationPlayState,
  AnimationFileInfo,
  LottieTextReplacement,
  LottieColorReplacement,
  LottieEditableInfo,
  AnimationPlayer,
  AnimationResourceEvents,
} from './canvas/AnimationResourceManager';
