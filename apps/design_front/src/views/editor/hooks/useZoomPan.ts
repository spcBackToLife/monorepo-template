import { useEffect, useCallback, useRef } from 'react';
import { editorStore } from '@/stores/editor';

/**
 * Task 1.5.2 — Zoom & Pan hook（W1-002）
 *
 * - Cmd/Ctrl+wheel：以**指针在画布容器内的位置**为锚点缩放（`cursorX/Y` 为相对容器的局部坐标，与外层 `transform` 语义一致）。
 * - Space+drag：平移 `canvasPanX/Y`。
 * - 缩放范围 0.1–4.0；状态写入 `editorStore` 并由会话内 `sessionStorage` 按项目恢复（见 store）。
 */
export function useZoomPan(containerRef: React.RefObject<HTMLElement | null>) {
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const oldScale = editorStore.canvasScale;
      const factor = Math.exp(-e.deltaY * 0.0012);
      const newScale = Math.min(4.0, Math.max(0.1, oldScale * factor));

      // Zoom toward cursor position
      const scaleRatio = newScale / oldScale;
      const newPanX = cursorX - scaleRatio * (cursorX - editorStore.canvasPanX);
      const newPanY = cursorY - scaleRatio * (cursorY - editorStore.canvasPanY);

      editorStore.setCanvasScale(newScale);
      editorStore.setCanvasPan(newPanX, newPanY);
    },
    [containerRef],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !spaceHeld.current) {
      spaceHeld.current = true;
      // Don't prevent default if focus is in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spaceHeld.current = false;
      if (isPanning.current) {
        isPanning.current = false;
      }
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!spaceHeld.current) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { x: editorStore.canvasPanX, y: editorStore.canvasPanY };
      e.preventDefault();
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      editorStore.setCanvasPan(panOrigin.current.x + dx, panOrigin.current.y + dy);
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [containerRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp]);

  return { isPanning: isPanning.current };
}
