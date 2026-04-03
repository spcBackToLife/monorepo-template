import type { AlignmentGuide } from './alignment';
import { computeAlignmentGuides } from './alignment';
import type { BoundingRect } from './BoundingBoxCache';
import type { Point } from './coordinateMap';

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  guides: AlignmentGuide[];
}

/**
 * Compute the best snapped position for a node being moved.
 *
 * Priority:
 *   1. Alignment guide snap (other nodes' edges / centres)
 *   2. Grid snap (if gridSize is provided)
 *   3. No snap – use the raw position
 *
 * The function builds a "virtual" moving rect at the proposed position,
 * asks for alignment guides, and if any guide is within threshold it
 * shifts the position to align exactly.
 */
export function computeSnap(
  position: Point,
  movingRect: BoundingRect,
  allRects: BoundingRect[],
  gridSize: number | null,
  threshold: number = 5,
): SnapResult {
  // Build a virtual rect at the proposed new position
  const virtualRect: BoundingRect = {
    nodeId: movingRect.nodeId,
    x: position.x,
    y: position.y,
    width: movingRect.width,
    height: movingRect.height,
  };

  // 1. Try alignment guide snap
  const guides = computeAlignmentGuides(virtualRect, allRects, threshold);

  let snappedX = position.x;
  let snappedY = position.y;
  let didSnapX = false;
  let didSnapY = false;
  let bestDx = threshold + 1;
  let bestDy = threshold + 1;

  const activeGuides: AlignmentGuide[] = [];

  const mLeft = virtualRect.x;
  const mRight = virtualRect.x + virtualRect.width;
  const mCenterX = virtualRect.x + virtualRect.width / 2;
  const mTop = virtualRect.y;
  const mBottom = virtualRect.y + virtualRect.height;
  const mCenterY = virtualRect.y + virtualRect.height / 2;

  for (const guide of guides) {
    if (guide.axis === 'vertical') {
      // Determine which edge/center of the moving rect was matched
      const candidates = [mLeft, mCenterX, mRight];
      for (const c of candidates) {
        const dist = Math.abs(c - guide.position);
        if (dist <= threshold && dist < bestDx) {
          bestDx = dist;
          snappedX = position.x + (guide.position - c);
          didSnapX = true;
        }
      }
    } else {
      const candidates = [mTop, mCenterY, mBottom];
      for (const c of candidates) {
        const dist = Math.abs(c - guide.position);
        if (dist <= threshold && dist < bestDy) {
          bestDy = dist;
          snappedY = position.y + (guide.position - c);
          didSnapY = true;
        }
      }
    }
  }

  // Collect the guides that actually contributed to the snap
  if (didSnapX || didSnapY) {
    // Recompute guides with the snapped position for accurate results
    const snappedVirtualRect: BoundingRect = {
      nodeId: movingRect.nodeId,
      x: snappedX,
      y: snappedY,
      width: movingRect.width,
      height: movingRect.height,
    };
    const finalGuides = computeAlignmentGuides(snappedVirtualRect, allRects, 1);
    activeGuides.push(...finalGuides);
  }

  // 2. Grid snap for any axis that didn't align-snap
  if (gridSize !== null && gridSize > 0) {
    if (!didSnapX) {
      snappedX = Math.round(position.x / gridSize) * gridSize;
    }
    if (!didSnapY) {
      snappedY = Math.round(position.y / gridSize) * gridSize;
    }
  }

  return {
    snappedX,
    snappedY,
    guides: activeGuides,
  };
}
