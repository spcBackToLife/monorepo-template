/**
 * MaterialEditorCanvas — 素材编辑器完整画布
 *
 * 组合 MaterialRenderer + SelectionOverlay + SmartGuides，
 * 提供完整的编辑器画布体验（渲染 + 交互）。
 *
 * 使用方式：
 *   <MaterialEditorProvider initialProject={project}>
 *     <MaterialEditorCanvas />
 *   </MaterialEditorProvider>
 */
import { useRef, useCallback, useState, useEffect, type WheelEvent } from 'react';
import { useMaterialEditor } from './context/MaterialEditorContext';
import { MaterialRenderer } from './renderer/MaterialRenderer';
import { SelectionOverlay } from './overlay/SelectionOverlay';
import { SmartGuides } from './overlay/SmartGuides';

interface MaterialEditorCanvasProps {
  /** 自定义 className（外部容器） */
  className?: string;
  /** 自定义 style（外部容器） */
  style?: React.CSSProperties;
}

export function MaterialEditorCanvas({
  className,
  style,
}: MaterialEditorCanvasProps) {
  const { state, setZoom, setPan, setTool } = useMaterialEditor();
  const { project, zoom, panX, panY, tool } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // ===== 缩放（滚轮） =====

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // 缩放
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
      } else {
        // 平移
        setPan(panX - e.deltaX, panY - e.deltaY);
      }
    },
    [zoom, panX, panY, setZoom, setPan],
  );

  // ===== 空白区域平移（hand 工具 / space + 拖拽） =====

  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'hand' || e.button === 1) {
        // 中键或 hand 工具
        e.preventDefault();
        setIsPanning(true);

        const startX = e.clientX;
        const startY = e.clientY;
        const startPanX = panX;
        const startPanY = panY;

        const handleMove = (me: MouseEvent) => {
          setPan(
            startPanX + (me.clientX - startX),
            startPanY + (me.clientY - startY),
          );
        };

        const handleUp = () => {
          setIsPanning(false);
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
      }
    },
    [tool, panX, panY, setPan],
  );

  // ===== 键盘快捷键 =====

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // 空格切换 hand 工具
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setTool('hand');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setTool]);

  // ===== 渲染 =====

  const canvasStyle: React.CSSProperties = {
    width: project.canvasWidth * zoom,
    height: project.canvasHeight * zoom,
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'auto',
        ...style,
        cursor: getCursor(tool, isPanning, isDragging),
      }}
      onWheel={handleWheel}
      onMouseDown={handleContainerMouseDown}
    >
      {/* 画布居中容器 */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          minWidth: '100%',
          minHeight: '100%',
          ...canvasStyle,
        }}
      >
        {/* 渲染层 */}
        <MaterialRenderer
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            borderRadius: 2,
          }}
        />

        {/* 交互覆盖层 */}
        <SelectionOverlay />

        {/* 对齐线 */}
        <SmartGuides enabled={isDragging} />
      </div>
    </div>
  );
}

function getCursor(
  tool: string,
  isPanning: boolean,
  isDragging: boolean,
): string {
  if (isPanning) return 'grabbing';
  if (isDragging) return 'move';

  switch (tool) {
    case 'hand':
      return 'grab';
    case 'rect':
    case 'ellipse':
    case 'polygon':
    case 'star':
    case 'line':
    case 'path':
      return 'crosshair';
    case 'text':
      return 'text';
    default:
      return 'default';
  }
}
