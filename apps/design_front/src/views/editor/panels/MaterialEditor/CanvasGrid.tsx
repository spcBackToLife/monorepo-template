/**
 * 画布栅格叠加层
 *
 * 在 Fabric.js Canvas 上方叠加 SVG 栅格，不阻挡交互（pointer-events: none）。
 *
 * 视觉设计（z-index: 2，在 canvas z:1 之上）：
 *   1. 整个工作区都显示网格线（细网格 + 粗网格）
 *   2. 参考框内背景色由 Fabric.js 中的 ReferenceFrame 背景矩形控制（可选中、可改填充色）
 *   3. 参考框虚线边框 + 四角标记
 *   4. 参考框外部：半透明灰色遮罩（降低干扰但仍可看到网格）
 *   5. 尺寸标注由 ReferenceFrame 的 afterRender 钩子渲染
 */

import { useId } from 'react';

interface CanvasGridProps {
  /** 工作区总宽度 (px) */
  width: number;
  /** 工作区总高度 (px) */
  height: number;
  /** 当前缩放 */
  zoom: number;
  /** 细栅格间距（默认 10px） */
  gridSize?: number;
  /** 粗栅格间距（默认 50px） */
  majorGridSize?: number;
  /** 是否可见 */
  visible?: boolean;
  /** 参考框区域（画布坐标系，未缩放） */
  referenceFrame?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function CanvasGrid({
  width,
  height,
  zoom,
  gridSize = 10,
  majorGridSize = 50,
  visible = true,
  referenceFrame,
}: CanvasGridProps) {
  const uniqueId = useId().replace(/:/g, '');
  const minorPatternId = `grid-minor-${uniqueId}`;
  const majorPatternId = `grid-major-${uniqueId}`;
  const maskId = `frame-mask-${uniqueId}`;

  if (!visible) return null;

  const scaledW = width * zoom;
  const scaledH = height * zoom;
  const scaledGrid = gridSize * zoom;
  const scaledMajor = majorGridSize * zoom;

  // 参考框缩放后的坐标
  const frame = referenceFrame
    ? {
        x: referenceFrame.x * zoom,
        y: referenceFrame.y * zoom,
        w: referenceFrame.width * zoom,
        h: referenceFrame.height * zoom,
      }
    : null;

  return (
    <svg
      className="absolute inset-0"
      width={scaledW}
      height={scaledH}
      style={{ pointerEvents: 'none', zIndex: 2 }}
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
            stroke="#d5d8dc"
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
            stroke="#bfc4ca"
            strokeWidth={1}
          />
        </pattern>

        {/* 参考框外部遮罩：用 clip-path 反向裁切 */}
        {frame && (
          <mask id={maskId}>
            {/* 整个画布白色 = 可见 */}
            <rect width={scaledW} height={scaledH} fill="white" />
            {/* 参考框区域黑色 = 不可见（打洞） */}
            <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} fill="black" />
          </mask>
        )}
      </defs>

      {/* 层 1: 参考框内背景已由 Fabric.js 中的 ReferenceFrame 背景矩形控制，此处留空 */}

      {/* 层 2: 整个工作区的网格线 */}
      <rect width="100%" height="100%" fill={`url(#${majorPatternId})`} opacity={0.45} />

      {/* 层 3: 参考框外部半透明遮罩（让框外区域变暗，突出参考框） */}
      {frame && (
        <rect
          width={scaledW}
          height={scaledH}
          fill="#d0d0d0"
          opacity={0.3}
          mask={`url(#${maskId})`}
        />
      )}

      {/* 层 4: 参考框虚线边框 */}
      {frame && (
        <rect
          x={frame.x}
          y={frame.y}
          width={frame.w}
          height={frame.h}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.8}
        />
      )}

      {/* 尺寸标注由 ReferenceFrame 的 afterRender 钩子渲染，此处不再重复 */}
    </svg>
  );
}
