/**
 * CanvasGrid — 画布栅格叠加层
 *
 * 在 SVG 画布上叠加 SVG 栅格，不阻挡交互（pointer-events: none）。
 *
 * 视觉设计：
 *   1. 整个画布显示网格线（细网格 + 粗网格）
 *   2. 参考框虚线边框 + 四角标记
 *   3. 尺寸标注文字（参考框宽×高）
 */
import { useId, useMemo } from 'react';
import { useMaterialEditor } from '../context/MaterialEditorContext';

interface CanvasGridProps {
  /** 细栅格间距（默认 10px） */
  gridSize?: number;
  /** 粗栅格间距（默认 50px） */
  majorGridSize?: number;
  /** 是否显示网格 */
  showGrid?: boolean;
}

export function CanvasGrid({
  gridSize = 10,
  majorGridSize = 50,
  showGrid = true,
}: CanvasGridProps) {
  const { state } = useMaterialEditor();
  const { project, zoom } = state;
  const { canvasWidth, canvasHeight, referenceFrame } = project;

  const uniqueId = useId().replace(/:/g, '');
  const minorPatternId = `grid-minor-${uniqueId}`;
  const majorPatternId = `grid-major-${uniqueId}`;

  const scaledW = canvasWidth * zoom;
  const scaledH = canvasHeight * zoom;
  const scaledGrid = gridSize * zoom;
  const scaledMajor = majorGridSize * zoom;

  // 参考框缩放后的坐标
  const frame = useMemo(() => {
    if (!referenceFrame?.enabled) return null;
    const frameX = (canvasWidth - referenceFrame.width) / 2;
    const frameY = (canvasHeight - referenceFrame.height) / 2;
    return {
      x: frameX * zoom,
      y: frameY * zoom,
      w: referenceFrame.width * zoom,
      h: referenceFrame.height * zoom,
      // 未缩放坐标（用于标注）
      rawW: referenceFrame.width,
      rawH: referenceFrame.height,
    };
  }, [referenceFrame, canvasWidth, canvasHeight, zoom]);

  // 四角标记长度
  const cornerLen = Math.min(12 * zoom, frame ? Math.min(frame.w, frame.h) / 4 : 12);

  if (!showGrid) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: scaledW,
        height: scaledH,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
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
      </defs>

      {/* 层 1: 网格线 — 整个画布 */}
      {showGrid && (
        <rect
          width="100%"
          height="100%"
          fill={`url(#${majorPatternId})`}
          opacity={0.4}
        />
      )}

      {/* 层 2: 参考框虚线边框 */}
      {frame && (
        <>
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

          {/* 四角标记 */}
          {/* 左上 */}
          <path
            d={`M ${frame.x} ${frame.y + cornerLen} L ${frame.x} ${frame.y} L ${frame.x + cornerLen} ${frame.y}`}
            fill="none"
            stroke="#6b7280"
            strokeWidth={2}
          />
          {/* 右上 */}
          <path
            d={`M ${frame.x + frame.w - cornerLen} ${frame.y} L ${frame.x + frame.w} ${frame.y} L ${frame.x + frame.w} ${frame.y + cornerLen}`}
            fill="none"
            stroke="#6b7280"
            strokeWidth={2}
          />
          {/* 左下 */}
          <path
            d={`M ${frame.x} ${frame.y + frame.h - cornerLen} L ${frame.x} ${frame.y + frame.h} L ${frame.x + cornerLen} ${frame.y + frame.h}`}
            fill="none"
            stroke="#6b7280"
            strokeWidth={2}
          />
          {/* 右下 */}
          <path
            d={`M ${frame.x + frame.w - cornerLen} ${frame.y + frame.h} L ${frame.x + frame.w} ${frame.y + frame.h} L ${frame.x + frame.w} ${frame.y + frame.h - cornerLen}`}
            fill="none"
            stroke="#6b7280"
            strokeWidth={2}
          />

          {/* 尺寸标注 — 底部居中 */}
          <text
            x={frame.x + frame.w / 2}
            y={frame.y + frame.h + 16}
            textAnchor="middle"
            fontSize={10}
            fill="#9ca3af"
            fontFamily="monospace"
          >
            {frame.rawW} × {frame.rawH}
          </text>
        </>
      )}
    </svg>
  );
}
