/**
 * Draw tool interaction: track a drag to define a rectangle for element creation.
 *
 * The user clicks and drags on the canvas to define the position and size
 * of a new element. On release, the bounds are returned for element creation.
 */

export interface DrawState {
  /** Starting X position in canvas coordinates */
  startX: number;
  /** Starting Y position in canvas coordinates */
  startY: number;
  /** Current X position in canvas coordinates */
  currentX: number;
  /** Current Y position in canvas coordinates */
  currentY: number;
}

export interface DrawBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Begin a draw operation at the given canvas position.
 */
export function beginDraw(startX: number, startY: number): DrawState {
  return { startX, startY, currentX: startX, currentY: startY };
}

/**
 * Update the draw preview as the mouse moves.
 */
export function updateDraw(
  state: DrawState,
  currentX: number,
  currentY: number,
): DrawState {
  return { ...state, currentX, currentY };
}

/**
 * Compute the normalized bounds from the draw state.
 * Handles negative-direction drags.
 */
export function getDrawBounds(state: DrawState): DrawBounds {
  const x = Math.min(state.startX, state.currentX);
  const y = Math.min(state.startY, state.currentY);
  const width = Math.abs(state.currentX - state.startX);
  const height = Math.abs(state.currentY - state.startY);
  return { x, y, width, height };
}

/**
 * Finalize the draw operation and return the created bounds.
 * Returns null if the drawn area is too small (< minSize in either dimension).
 */
export function finalizeDraw(
  state: DrawState,
  minSize: number = 4,
): DrawBounds | null {
  const bounds = getDrawBounds(state);

  if (bounds.width < minSize || bounds.height < minSize) {
    return null;
  }

  return bounds;
}

/**
 * Draw the draw-tool preview rectangle on the canvas overlay.
 */
export function drawDrawPreview(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
): void {
  const bounds = getDrawBounds(state);

  ctx.save();

  // Fill with semi-transparent gray
  ctx.fillStyle = 'rgba(100, 100, 100, 0.15)';
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

  // Stroke with dashed blue line
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

  // Show dimensions label
  if (bounds.width > 20 && bounds.height > 15) {
    const label = `${Math.round(bounds.width)} x ${Math.round(bounds.height)}`;
    ctx.setLineDash([]);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#1677ff';
    ctx.textAlign = 'center';
    ctx.fillText(label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 4);
  }

  ctx.restore();
}
