import { useCallback } from 'react';
import { editorStore } from '@/stores/editor';

/** Translates canvas drag/resize events into design operations */
export function useCanvasOperations() {
  const handleDrag = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    // For now, drag translates to style updates (position offset)
    // A full implementation would compute the new parent via hit-testing
    if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return;
    editorStore.execute({
      type: 'updateStyle',
      params: {
        nodeId,
        styles: {
          position: 'relative',
          left: `${deltaX}px`,
          top: `${deltaY}px`,
        },
      },
    });
  }, []);

  const handleResize = useCallback((nodeId: string, newWidth: number, newHeight: number) => {
    editorStore.execute({
      type: 'updateStyle',
      params: {
        nodeId,
        styles: {
          width: `${Math.round(newWidth)}px`,
          height: `${Math.round(newHeight)}px`,
        },
      },
    });
  }, []);

  return { handleDrag, handleResize };
}
