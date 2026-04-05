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
export { resolveActiveState } from './styles/resolveState';
export { resolveNodeProps } from './styles/resolveProps';
export type { ResolvedProps } from './styles/resolveProps';

// ===== Asset Resolution =====
export { resolveComponentInstance } from './assets/resolveInstance';
export { resolveAssetUrl } from './assets/resolveAssetUrl';

// ===== Data Binding & Context =====
export { resolveExpression, hasExpression, resolvePropsExpressions } from './data/resolveExpression';
export type { DataContext } from './data/resolveExpression';
export { DataContextProvider, useDataContext } from './data/DataContext';
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

// ===== Preview Mode =====
export { PreviewRenderer } from './preview/PreviewRenderer';
export type { PreviewRendererProps } from './preview/PreviewRenderer';

export { EventExecutionEngine } from './preview/EventExecutionEngine';
export type { PreviewContext, TransitionAnimation, MockResponse } from './preview/EventExecutionEngine';

export { MockExecutor } from './preview/MockExecutor';

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
