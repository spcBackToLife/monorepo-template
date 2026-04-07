/**
 * 画布栅格叠加层
 *
 * 在 Fabric.js Canvas 上方叠加 SVG 栅格，不阻挡交互。
 * 提供栅格参考线，让设计师精准对齐。
 */

import { useId } from 'react';

interface CanvasGridProps {
  width: number;
  height: number;
  zoom: number;
  gridSize?: number;       // 细栅格间距（默认 10px）
  majorGridSize?: number;  // 粗栅格间距（默认 50px）
  visible?: boolean;
}

export function CanvasGrid({
  width,
  height,
  zoom,
  gridSize = 10,
  majorGridSize = 50,
  visible = true,
}: CanvasGridProps) {
  // 使用 useId 保证 SVG pattern id 全局唯一，避免多实例冲突
  const uniqueId = useId().replace(/:/g, '');
  const minorPatternId = `grid-minor-${uniqueId}`;
  const majorPatternId = `grid-major-${uniqueId}`;

  if (!visible) return null;

  const scaledW = width * zoom;
  const scaledH = height * zoom;
  const scaledGrid = gridSize * zoom;
  const scaledMajor = majorGridSize * zoom;

  return (
    <svg
      className="absolute inset-0"
      width={scaledW}
      height={scaledH}
      style={{ pointerEvents: 'none', opacity: 0.4, zIndex: 1 }}
    >
      <defs>
        {/* 细栅格图案 */}
        <pattern
          id={minorPatternId}
          width={scaledGrid}
          height={scaledGrid}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${scaledGrid} 0 L 0 0 0 ${scaledGrid}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        </pattern>

        {/* 粗栅格图案 */}
        <pattern
          id={majorPatternId}
          width={scaledMajor}
          height={scaledMajor}
          patternUnits="userSpaceOnUse"
        >
          <rect width={scaledMajor} height={scaledMajor} fill={`url(#${minorPatternId})`} />
          <path
            d={`M ${scaledMajor} 0 L 0 0 0 ${scaledMajor}`}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={1}
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${majorPatternId})`} />
    </svg>
  );
}
