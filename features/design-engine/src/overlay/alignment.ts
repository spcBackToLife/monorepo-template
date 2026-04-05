import type { BoundingRect } from './BoundingBoxCache';

export interface AlignmentGuide {
  axis: 'horizontal' | 'vertical';
  /** Position of the guide line in canvas coordinates */
  position: number;
  type: 'edge' | 'center';
  sourceNodeId: string;
  targetNodeId: string;
}

/**
 * Compute alignment guides between a moving rectangle and all other
 * rectangles on the canvas.
 *
 * For each reference rect we compare 6 position pairs per axis:
 *
 * Vertical guides (x-axis positions):
 *   moving-left  vs  ref-left, ref-center, ref-right
 *   moving-center vs  ref-center
 *   moving-right vs  ref-left, ref-center, ref-right
 *
 * Horizontal guides (y-axis positions):
 *   moving-top    vs  ref-top, ref-center, ref-bottom
 *   moving-center vs  ref-center
 *   moving-bottom vs  ref-top, ref-center, ref-bottom
 *
 * If the distance between any pair is ≤ threshold, a guide is emitted.
 */
export function computeAlignmentGuides(
  movingRect: BoundingRect,
  allRects: BoundingRect[],
  threshold: number = 5,
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];

  const mLeft = movingRect.x;
  const mRight = movingRect.x + movingRect.width;
  const mCenterX = movingRect.x + movingRect.width / 2;
  const mTop = movingRect.y;
  const mBottom = movingRect.y + movingRect.height;
  const mCenterY = movingRect.y + movingRect.height / 2;

  for (const ref of allRects) {
    const sameInstance =
      ref.instanceKey != null &&
      movingRect.instanceKey != null &&
      ref.instanceKey === movingRect.instanceKey;
    if (sameInstance) continue;
    if (ref.instanceKey == null && movingRect.instanceKey == null && ref.nodeId === movingRect.nodeId) {
      continue;
    }

    const rLeft = ref.x;
    const rRight = ref.x + ref.width;
    const rCenterX = ref.x + ref.width / 2;
    const rTop = ref.y;
    const rBottom = ref.y + ref.height;
    const rCenterY = ref.y + ref.height / 2;

    // --- Vertical guides (x-axis) ---

    const verticalPairs: { movingPos: number; refPos: number; type: 'edge' | 'center' }[] = [
      { movingPos: mLeft, refPos: rLeft, type: 'edge' },
      { movingPos: mLeft, refPos: rCenterX, type: 'center' },
      { movingPos: mLeft, refPos: rRight, type: 'edge' },
      { movingPos: mCenterX, refPos: rCenterX, type: 'center' },
      { movingPos: mRight, refPos: rLeft, type: 'edge' },
      { movingPos: mRight, refPos: rCenterX, type: 'center' },
      { movingPos: mRight, refPos: rRight, type: 'edge' },
    ];

    for (const pair of verticalPairs) {
      if (Math.abs(pair.movingPos - pair.refPos) <= threshold) {
        guides.push({
          axis: 'vertical',
          position: pair.refPos,
          type: pair.type,
          sourceNodeId: movingRect.nodeId,
          targetNodeId: ref.nodeId,
        });
      }
    }

    // --- Horizontal guides (y-axis) ---

    const horizontalPairs: { movingPos: number; refPos: number; type: 'edge' | 'center' }[] = [
      { movingPos: mTop, refPos: rTop, type: 'edge' },
      { movingPos: mTop, refPos: rCenterY, type: 'center' },
      { movingPos: mTop, refPos: rBottom, type: 'edge' },
      { movingPos: mCenterY, refPos: rCenterY, type: 'center' },
      { movingPos: mBottom, refPos: rTop, type: 'edge' },
      { movingPos: mBottom, refPos: rCenterY, type: 'center' },
      { movingPos: mBottom, refPos: rBottom, type: 'edge' },
    ];

    for (const pair of horizontalPairs) {
      if (Math.abs(pair.movingPos - pair.refPos) <= threshold) {
        guides.push({
          axis: 'horizontal',
          position: pair.refPos,
          type: pair.type,
          sourceNodeId: movingRect.nodeId,
          targetNodeId: ref.nodeId,
        });
      }
    }
  }

  return guides;
}

// ===== Equal Spacing Detection =====

export interface EqualSpacingGuide {
  axis: 'horizontal' | 'vertical';
  /** The consistent gap distance between elements */
  gap: number;
  /** Ordered list of node IDs that form the equal-spacing group */
  nodeIds: string[];
  /** Positions of the gap indicators (midpoints of each gap) */
  gapPositions: number[];
}

/**
 * Detect 3+ elements that have equal gaps between them along an axis.
 *
 * For horizontal spacing: sorts rects by x, computes gaps between
 * consecutive elements (right edge of N to left edge of N+1), and
 * finds groups of 3+ consecutive elements where all gaps are equal
 * (within the given threshold).
 *
 * For vertical spacing: same logic but along the y axis.
 */
export function computeEqualSpacing(
  movingRect: BoundingRect,
  allRects: BoundingRect[],
  threshold: number = 3,
): EqualSpacingGuide[] {
  const guides: EqualSpacingGuide[] = [];

  // Include the moving rect in the set
  const rects = allRects.map((r) =>
    r.nodeId === movingRect.nodeId ? movingRect : r,
  );
  // If movingRect is not in allRects, add it
  if (!allRects.some((r) => r.nodeId === movingRect.nodeId)) {
    rects.push(movingRect);
  }

  if (rects.length < 3) return guides;

  // Check horizontal equal spacing
  const hGuide = detectEqualSpacingOnAxis(rects, 'horizontal', threshold);
  if (hGuide) guides.push(hGuide);

  // Check vertical equal spacing
  const vGuide = detectEqualSpacingOnAxis(rects, 'vertical', threshold);
  if (vGuide) guides.push(vGuide);

  return guides;
}

function detectEqualSpacingOnAxis(
  rects: BoundingRect[],
  axis: 'horizontal' | 'vertical',
  threshold: number,
): EqualSpacingGuide | null {
  // Sort rects by position along the axis
  const sorted = [...rects].sort((a, b) => {
    if (axis === 'horizontal') return a.x - b.x;
    return a.y - b.y;
  });

  // Compute gaps between consecutive elements
  const gaps: { gap: number; fromId: string; toId: string; midPos: number }[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    let gap: number;
    let midPos: number;

    if (axis === 'horizontal') {
      const currentRight = current.x + current.width;
      gap = next.x - currentRight;
      midPos = currentRight + gap / 2;
    } else {
      const currentBottom = current.y + current.height;
      gap = next.y - currentBottom;
      midPos = currentBottom + gap / 2;
    }

    // Only consider positive gaps (non-overlapping)
    if (gap > 0) {
      gaps.push({
        gap,
        fromId: current.nodeId,
        toId: next.nodeId,
        midPos,
      });
    }
  }

  if (gaps.length < 2) return null;

  // Find the longest run of equal gaps
  let bestStart = 0;
  let bestLength = 1;
  let currentStart = 0;
  let currentLength = 1;

  for (let i = 1; i < gaps.length; i++) {
    if (Math.abs(gaps[i].gap - gaps[currentStart].gap) <= threshold) {
      currentLength++;
      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }
    } else {
      currentStart = i;
      currentLength = 1;
    }
  }

  // Need at least 2 equal gaps (meaning 3+ elements)
  if (bestLength < 2) return null;

  const equalGaps = gaps.slice(bestStart, bestStart + bestLength);

  // Collect the node IDs in order
  const nodeIds: string[] = [equalGaps[0].fromId];
  for (const g of equalGaps) {
    nodeIds.push(g.toId);
  }

  return {
    axis,
    gap: equalGaps[0].gap,
    nodeIds,
    gapPositions: equalGaps.map((g) => g.midPos),
  };
}
