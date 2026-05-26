// ===== Core Components =====
export { SchemaRenderer } from './renderer/SchemaRenderer';
export type {
  SchemaRendererProps,
  InteractionPreview,
} from './renderer/SchemaRenderer';

export { EditorOverlay } from './overlay/EditorOverlay';
export type { EditorOverlayProps, OverlayToolMode } from './overlay/EditorOverlay';

export { ViewportContainer } from './viewport/ViewportContainer';
export type { ViewportContainerProps } from './viewport/ViewportContainer';

// ===== Renderers =====
export { PrimitiveRenderer } from './renderers/PrimitiveRenderer';
export type { PrimitiveRendererProps } from './renderers/PrimitiveRenderer';

// ===== Style Resolution =====
export { resolveStyles, resolveNodeStyles } from './styles/resolveStyles';
export { resolveTokenValue, resolveTokensInStyles } from './styles/resolveTokens';
export { resolveActiveState } from './styles/resolveState';
export { resolveNodeProps } from './styles/resolveProps';
export type { ResolvedProps } from './styles/resolveProps';
export { mergeStateMaps } from './styles/mergeStateMaps';

// ===== Asset Resolution =====
export { resolveComponentInstance } from './assets/resolveInstance';
/** @deprecated No longer needed — asset URLs are now stored as direct relative paths */
export { resolveAssetUrl } from './assets/resolveAssetUrl';
export {
  rewriteCssUrlValues,
  rewriteStyleObjectUrls,
  rewriteMediaSrc,
} from './assets/rewriteLocalAssetRefs';
export { StaticAssetOriginProvider, useStaticAssetOrigin } from './renderer/StaticAssetOriginContext';

// ===== Expression Engine (v2) =====
// 受限求值器：解析 `{{ ... }}` 表达式，在 { state, item, index, parent, $last, $ } 作用域下安全求值。
export {
  evaluateExpression,
  evaluateAst,
  compileExpression,
  extractDeps,
  parseExpression,
  parseSingleExpression,
  parseTemplate,
  ExpressionParseError,
  ExpressionEvaluationError,
  builtinFunctions,
  FORBIDDEN_GLOBALS,
} from './expression';
export type {
  Ast,
  BinaryOp,
  TemplateSegment,
  EvalContext,
  BuiltinFunctions,
} from './expression';

// ===== Data Binding & Context =====
// v1 的 resolveExpression 已删除；编辑期需要 DataContext 拼装时使用以下两个公开 helper：
//   - buildEditorPreviewState(screen): 把 screen.dataSources 中 static.initial 与 api 激活 mock
//     场景 responseBody 注入为最小 ScreenState。
//   - buildScreenDataContext(screen, state): 把 ScreenState 包成渲染期 DataContext。
// 运行时（PreviewRenderer / 真实运行时）由 Store 维护 ScreenState，渲染器直接消费。
export { DataContextProvider, useDataContext } from './data/DataContextProvider';
export {
  buildScreenDataContext,
  buildEditorPreviewState,
  hasExpression,
  resolveExpression as resolveExpressionValue,
  resolvePropsExpressions,
} from './data/dataContext';
export type { DataContext } from './data/dataContext';
export { ListRenderer } from './data/ListRenderer';
export type { ListRendererProps } from './data/ListRenderer';

// ===== Coordinate Map =====
export {
  buildCoordinateMap,
  mergeCoordinateMaps,
  scaleCoordinateMapToLayoutContainer,
  expandRootRectToContainer,
  hitTest,
  hitTestAt,
  hitTestAll,
  rectFullyContains,
  hitTestAllContainingBounds,
  getEditorCoordinateRoot,
  getEditorContentRootRect,
  getRootStackPlacementRect,
  getParentContentRectInContainer,
  screenToContainerLogical,
  getPlacementParentRect,
  resolvePlacementParentElement,
  getRectForInteraction,
  mapHasNodeId,
  collectRectsForNodeId,
  DATA_NODE_INSTANCE_KEY_ATTR,
} from './overlay/coordinateMap';
export { buildSchemaLayoutMap, expandCullRect } from './overlay/schemaLayoutMap';
export type { BuildSchemaLayoutMapOptions } from './overlay/schemaLayoutMap';
export {
  screenToCanvas,
  canvasToScreen,
  canvasToViewport,
  viewportToParent,
} from './overlay/coordinateMap';
export type {
  NodeRect,
  CoordinateMap,
  CoordinateMapEntry,
  Point,
  CanvasViewState,
} from './overlay/coordinateMap';

// ===== Bounding Box Cache =====
export { BoundingBoxCache } from './overlay/BoundingBoxCache';
export type { BoundingRect } from './overlay/BoundingBoxCache';

// ===== Hit Testing =====
export {
  hitTest as hitTestNode,
  hitTestResizeHandle,
} from './overlay/hitTest';
export type { HitTestResult, ResizeHandle as ResizeHandleId } from './overlay/hitTest';

// ===== Alignment & Snapping =====
export { computeAlignmentGuides, computeEqualSpacing } from './overlay/alignment';
export type { AlignmentGuide, EqualSpacingGuide } from './overlay/alignment';

export { computeSnap } from './overlay/snapping';
export type { SnapResult } from './overlay/snapping';

// ===== Interactions =====
export { createSelectHandler, drawSelection } from './overlay/interactions/select';
export type { SelectHandler } from './overlay/interactions/select';

export { getHoveredNode, drawHover } from './overlay/interactions/hover';

export {
  beginDrag,
  updateDrag,
  updateDragWithSnap,
  drawDragPreview,
} from './overlay/interactions/drag';
export type { DragState } from './overlay/interactions/drag';

export {
  getResizeHandles,
  hitTestHandle,
  resizeHandleCanvasPx,
  beginResize,
  updateResize,
  updateResizeWithSnap,
  drawResizeHandles,
  drawResizePreview,
} from './overlay/interactions/resize';
export type {
  ResizeHandlePosition,
  ResizeHandle,
  ResizeState,
} from './overlay/interactions/resize';

// ===== Marquee Selection =====
export {
  beginMarquee,
  updateMarquee,
  getMarqueeRect,
  findNodesInMarquee,
  findNodesIntersectingMarquee,
  drawMarquee,
} from './overlay/interactions/marquee';
export type { MarqueeState, MarqueeRect } from './overlay/interactions/marquee';

// ===== Draw Tool =====
export {
  beginDraw,
  updateDraw,
  getDrawBounds,
  finalizeDraw,
  drawDrawPreview,
} from './overlay/interactions/draw';
export type { DrawState, DrawBounds } from './overlay/interactions/draw';

// ===== State / Action / Effect =====
// Store + Reducer + Dispatcher + EffectExecutor。
export {
  createStore,
  createEmptyState,
  reduceStateAction,
  parsePath,
  getByPath,
  setByPath,
  EffectExecutor,
  MockDriver,
  HttpDriver,
  Dispatcher,
} from './state';
export type {
  Store,
  Listener,
  Updater,
  StateMutationAction,
  EffectDriver,
  Env,
  HostAdapters,
  DataSourceResolver,
  DispatcherDeps,
} from './state';

// ===== Preview Mode =====
export { PreviewRenderer } from './preview/PreviewRenderer';
export type { PreviewRendererProps } from './preview/PreviewRenderer';

export { ToastRenderer } from './preview/ToastRenderer';
export type { ToastItem, ToastRendererProps } from './preview/ToastRenderer';

export { TransitionAnimator } from './preview/TransitionAnimator';
export type { TransitionAnimatorProps } from './preview/TransitionAnimator';

export { CSSPseudoInjector } from './preview/CSSPseudoInjector';

export { NavigationStack } from './preview/NavigationStack';

export { DeviceFrame } from './preview/DeviceFrame';
export type { DeviceFrameProps } from './preview/DeviceFrame';

export { PreviewController } from './preview/PreviewController';
export type { PreviewControllerCallbacks } from './preview/PreviewController';

export { generateReactCode, type CodegenOptions } from './codegen/reactCodegen';
