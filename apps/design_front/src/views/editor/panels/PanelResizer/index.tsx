import { useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';

interface PanelResizerProps {
  side: 'left' | 'right';
}

/**
 * Task 1.4.3 — Panel Resizer
 * Vertical drag handle between panel and canvas.
 * Drag to resize, double-click to toggle collapse.
 */
export const PanelResizer = observer(function PanelResizer({ side }: PanelResizerProps) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = side === 'left' ? editorStore.leftPanelWidth : editorStore.rightPanelWidth;

      const onMouseMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        const delta = side === 'left'
          ? me.clientX - startX.current
          : startX.current - me.clientX;
        const newWidth = startWidth.current + delta;
        if (side === 'left') {
          editorStore.setLeftPanelWidth(newWidth);
        } else {
          editorStore.setRightPanelWidth(newWidth);
        }
      };

      const onMouseUp = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [side],
  );

  const handleDoubleClick = useCallback(() => {
    if (side === 'left') {
      editorStore.toggleLeftPanel();
    } else {
      editorStore.toggleRightPanel();
    }
  }, [side]);

  return (
    <div
      className="flex-shrink-0 w-1 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors relative group"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
});
