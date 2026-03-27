// ===== Core Components =====
export { SchemaRenderer } from './renderer/SchemaRenderer';
export type { SchemaRendererProps } from './renderer/SchemaRenderer';

export { EditorOverlay } from './overlay/EditorOverlay';
export type { EditorOverlayProps } from './overlay/EditorOverlay';

export { ViewportContainer } from './viewport/ViewportContainer';
export type { ViewportContainerProps } from './viewport/ViewportContainer';

// ===== Renderers =====
export { PrimitiveRenderer } from './renderers/PrimitiveRenderer';
export type { PrimitiveRendererProps } from './renderers/PrimitiveRenderer';

// ===== Style Resolution =====
export { resolveStyles } from './styles/resolveStyles';
export { resolveActiveState } from './styles/resolveState';

// ===== Asset Resolution =====
export { resolveComponentInstance } from './assets/resolveInstance';

// ===== Coordinate Map =====
export { buildCoordinateMap, hitTest } from './overlay/coordinateMap';
export type { NodeRect, CoordinateMap } from './overlay/coordinateMap';

// ===== Interactions =====
export { createSelectHandler, drawSelection } from './overlay/interactions/select';
export type { SelectHandler } from './overlay/interactions/select';

export { getHoveredNode, drawHover } from './overlay/interactions/hover';

export {
  beginDrag,
  updateDrag,
  drawDragPreview,
} from './overlay/interactions/drag';
export type { DragState } from './overlay/interactions/drag';

export {
  getResizeHandles,
  hitTestHandle,
  beginResize,
  updateResize,
  drawResizeHandles,
  drawResizePreview,
} from './overlay/interactions/resize';
export type {
  ResizeHandlePosition,
  ResizeHandle,
  ResizeState,
} from './overlay/interactions/resize';
