/**
 * @globallink/material-engine
 *
 * 素材编辑器前端渲染引擎 — 与 @globallink/design-engine 同构。
 *
 * 架构：
 *   MaterialProjectSchema (来自 material-operations)
 *   → MaterialEditorProvider (上下文 + Executor)
 *   → MaterialRenderer (SVG 渲染层)
 *   → SelectionOverlay (交互覆盖层)
 *   → SmartGuides (对齐线)
 *   → MaterialEditorCanvas (组合画布)
 *   → useMaterialSync (WS 同步)
 *   → useMaterialKeyboard (键盘快捷键)
 *
 * 使用方式：
 *   import {
 *     MaterialEditorProvider,
 *     MaterialEditorCanvas,
 *     useMaterialEditor,
 *     useMaterialSync,
 *     useMaterialKeyboard,
 *   } from '@globallink/material-engine';
 */

// ===== Context & Provider =====
export {
  MaterialEditorProvider,
  useMaterialEditor,
  type MaterialEditorContextValue,
  type MaterialEditorState,
  type MaterialEditorProviderProps,
  type MaterialToolType,
} from './context/MaterialEditorContext';

// ===== Canvas (Complete Editor) =====
export { MaterialEditorCanvas } from './MaterialEditorCanvas';

// ===== Renderer =====
export { MaterialRenderer } from './renderer/MaterialRenderer';
export { ObjectRenderer } from './renderer/ObjectRenderer';
export { GradientDefs } from './renderer/GradientDefs';
export { ShadowDefs } from './renderer/ShadowDefs';
export {
  getTransform,
  getFillValue,
  getStrokeValue,
  getObjectStyle,
  getPolygonPoints,
  getStarPoints,
  getBoundingBox,
  isGradientFill,
  type BoundingBox,
} from './renderer/svg-utils';

// ===== Overlay =====
export { SelectionOverlay } from './overlay/SelectionOverlay';
export { SmartGuides } from './overlay/SmartGuides';
export { CanvasGrid } from './overlay/CanvasGrid';
export { CanvasRuler, RULER_SIZE } from './overlay/CanvasRuler';
export { LayerPanel } from './overlay/LayerPanel';

// ===== Hooks =====
export { useMaterialSync } from './hooks/useMaterialSync';
export { useMaterialKeyboard } from './hooks/useMaterialKeyboard';
