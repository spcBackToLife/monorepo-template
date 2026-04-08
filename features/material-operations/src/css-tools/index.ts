/**
 * CSS 工具集 — 统一导出
 *
 * 从 @globallink/material-editor 迁移来的纯 CSS 工具模块，
 * 完全不依赖 Fabric.js。
 */

// ===== Types =====
export type {
  LayerType, BlendMode, MaterialLayer, LayerConfig,
  SolidLayerConfig, GradientLayerConfig, ImageLayerConfig, PatternLayerConfig,
  ShapeLayerConfig, SvgLayerConfig, TextLayerConfig, GroupLayerConfig,
  GradientType, ColorStop, GradientPreset,
  CSSFilterType, FilterConfig,
  ShadowConfig,
  ShapeType, Point,
  CSSOutput, MaterialEditorOutput,
  MaterialProject,
  CSSKeyframe, CSSAnimationConfig, ExternalAnimationConfig, AnimationConfig, AnimationPreset,
  MaterialToolType,
  MaterialEditorInit,
} from './types';

// ===== Gradient =====
export {
  gradientToCSS, parseGradientCSS,
  createLinearGradient, createRadialGradient, createConicGradient,
  GRADIENT_PRESETS,
} from './gradient';

// ===== Filters =====
export {
  filtersToCSS, parseFilterCSS, createFilter,
  FILTER_DEFAULTS, FILTER_RANGES, FILTER_LABELS,
} from './filters';

// ===== Shadows =====
export {
  shadowsToCSS, parseBoxShadow, parseTextShadow,
  createBoxShadow, createTextShadow, SHADOW_PRESETS,
} from './shadows';

// ===== Animation =====
export {
  animationToCSS, createAnimation,
  ANIMATION_PRESETS, EASING_PRESETS,
} from './animation';

// ===== Textures =====
export { TEXTURE_PRESETS, findTexturePreset, textureToCSS } from './textures';
export type { TexturePreset, TextureOptions } from './textures';

// ===== Layers =====
export { LayerManager, createLayer, generateLayerId } from './LayerManager';

// ===== CSS Export =====
export { layersToCSS, cssToLayers, generateCSSCode } from './css-exporter';
export { parseStylesForEditor } from './css-parser';

// ===== Canvas Filters =====
export {
  applyNoise, applyPixelate, applySharpen, applyEmboss,
  applyCanvasFilters, createCanvasFilter, CANVAS_FILTER_RANGES,
} from './CanvasFilters';
export type { CanvasFilterType, CanvasFilterConfig } from './CanvasFilters';

// ===== CSS Animation Editor =====
export {
  CSSAnimationEditorManager,
  parseTimingFunction, bezierToCSS, bezierCurvePoints, evaluateBezierEasing,
  ANIMATABLE_CSS_PROPERTIES, TRANSFORM_PRESETS,
} from './CSSAnimationEditor';
export type { BezierControlPoints, CSSAnimationEditorEvents } from './CSSAnimationEditor';

// ===== Animation Resource Manager =====
export {
  AnimationResourceManager,
  detectAnimationType, isAnimationFile,
  getAnimationTypeName, getAnimationTypeIcon, getAcceptedExtensions,
  parseLottieJSON, replaceLottieText, replaceLottieColor,
  hexToLottieColor, lottieColorToHex, blendColors, generateColorScale,
  generateAnimationExportCode, generateSchemaAnimationProp, createExternalAnimationConfig,
} from './AnimationResourceManager';
export type {
  AnimationResourceType, AnimationPlayState, AnimationFileInfo,
  LottieTextReplacement, LottieColorReplacement, LottieEditableInfo,
  AnimationPlayer, AnimationResourceEvents,
} from './AnimationResourceManager';
