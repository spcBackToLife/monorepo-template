/**
 * CanvasRuler — 画布标尺组件
 *
 * 在画布区域顶部和左侧显示像素刻度标尺。
 * 跟随缩放同步缩放刻度，pointer-events: none 不阻挡交互。
 *
 * 结构：
 *   ┌──┬─────────────────────┐
 *   │■ │  水平标尺 (顶部)     │
 *   ├──┼─────────────────────┤
 *   │垂│                     │
 *   │直│     画布区域         │
 *   │标│                     │
 *   │尺│                     │
 *   └──┴─────────────────────┘
 */
import { useMemo } from 'react';
import { useMaterialEditor } from '../context/MaterialEditorContext';

interface CanvasRulerProps {
  /** 是否显示 */
  visible?: boolean;
}

/** 标尺高度/宽度常量 */
export const RULER_SIZE = 20;

/** 根据缩放级别动态计算合适的刻度间距 */
function getTickInterval(zoom: number): { minor: number; major: number; labelEvery: number } {
  const baseSize = 50 / zoom;
  if (baseSize <= 10) return { minor: 1, major: 5, labelEvery: 10 };
  if (baseSize <= 25) return { minor: 5, major: 25, labelEvery: 50 };
  if (baseSize <= 60) return { minor: 10, major: 50, labelEvery: 100 };
  if (baseSize <= 150) return { minor: 25, major: 100, labelEvery: 200 };
  return { minor: 50, major: 250, labelEvery: 500 };
}

/** 水平标尺（顶部） */
function HorizontalRuler({ width, zoom }: { width: number; zoom: number }) {
  const scaledW = width * zoom;
  const { minor, major, labelEvery } = useMemo(() => getTickInterval(zoom), [zoom]);

  const ticks = useMemo(() => {
    const result: Array<{ pos: number; value: number; isMajor: boolean; showLabel: boolean }> = [];
    for (let v = 0; v <= width; v += minor) {
      const isMajor = v % major === 0;
      const showLabel = v % labelEvery === 0;
      result.push({ pos: v * zoom, value: v, isMajor, showLabel });
    }
    return result;
  }, [width, zoom, minor, major, labelEvery]);

  return (
    <svg
      width={scaledW}
      height={RULER_SIZE}
      style={{ pointerEvents: 'none', display: 'block' }}
    >
      {/* 背景 */}
      <rect width={scaledW} height={RULER_SIZE} fill="#f8f9fa" />
      {/* 底部线 */}
      <line x1={0} y1={RULER_SIZE - 0.5} x2={scaledW} y2={RULER_SIZE - 0.5} stroke="#d9d9d9" strokeWidth={0.5} />

      {ticks.map((tick, i) => {
        const tickH = tick.isMajor ? 8 : 4;
        return (
          <g key={i}>
            <line
              x1={tick.pos}
              y1={RULER_SIZE}
              x2={tick.pos}
              y2={RULER_SIZE - tickH}
              stroke={tick.isMajor ? '#999' : '#ccc'}
              strokeWidth={0.5}
            />
            {tick.showLabel && (
              <text
                x={tick.pos + 2}
                y={RULER_SIZE - 10}
                fontSize={8}
                fill="#999"
                fontFamily="monospace"
              >
                {tick.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** 垂直标尺（左侧） */
function VerticalRuler({ height, zoom }: { height: number; zoom: number }) {
  const scaledH = height * zoom;
  const { minor, major, labelEvery } = useMemo(() => getTickInterval(zoom), [zoom]);

  const ticks = useMemo(() => {
    const result: Array<{ pos: number; value: number; isMajor: boolean; showLabel: boolean }> = [];
    for (let v = 0; v <= height; v += minor) {
      const isMajor = v % major === 0;
      const showLabel = v % labelEvery === 0;
      result.push({ pos: v * zoom, value: v, isMajor, showLabel });
    }
    return result;
  }, [height, zoom, minor, major, labelEvery]);

  return (
    <svg
      width={RULER_SIZE}
      height={scaledH}
      style={{ pointerEvents: 'none', display: 'block' }}
    >
      {/* 背景 */}
      <rect width={RULER_SIZE} height={scaledH} fill="#f8f9fa" />
      {/* 右侧线 */}
      <line x1={RULER_SIZE - 0.5} y1={0} x2={RULER_SIZE - 0.5} y2={scaledH} stroke="#d9d9d9" strokeWidth={0.5} />

      {ticks.map((tick, i) => {
        const tickW = tick.isMajor ? 8 : 4;
        return (
          <g key={i}>
            <line
              x1={RULER_SIZE}
              y1={tick.pos}
              x2={RULER_SIZE - tickW}
              y2={tick.pos}
              stroke={tick.isMajor ? '#999' : '#ccc'}
              strokeWidth={0.5}
            />
            {tick.showLabel && (
              <text
                x={2}
                y={tick.pos + 10}
                fontSize={8}
                fill="#999"
                fontFamily="monospace"
                transform={`rotate(-90, 2, ${tick.pos + 10})`}
              >
                {tick.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function CanvasRuler({ visible = true }: CanvasRulerProps) {
  const { state } = useMaterialEditor();
  const { project, zoom } = state;
  const { canvasWidth, canvasHeight } = project;

  if (!visible) return null;

  return (
    <>
      {/* 顶部水平标尺 */}
      <div
        style={{
          position: 'absolute',
          top: -RULER_SIZE,
          left: 0,
          width: canvasWidth * zoom,
          height: RULER_SIZE,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <HorizontalRuler width={canvasWidth} zoom={zoom} />
      </div>

      {/* 左侧垂直标尺 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: -RULER_SIZE,
          width: RULER_SIZE,
          height: canvasHeight * zoom,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <VerticalRuler height={canvasHeight} zoom={zoom} />
      </div>

      {/* 左上角小方块 */}
      <div
        style={{
          position: 'absolute',
          top: -RULER_SIZE,
          left: -RULER_SIZE,
          width: RULER_SIZE,
          height: RULER_SIZE,
          background: '#f8f9fa',
          borderRight: '0.5px solid #d9d9d9',
          borderBottom: '0.5px solid #d9d9d9',
          pointerEvents: 'none',
          zIndex: 11,
        }}
      />
    </>
  );
}
