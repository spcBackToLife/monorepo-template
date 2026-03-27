import { useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { ViewportContainer, SchemaRenderer, EditorOverlay } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';
import { useCanvasOperations } from './useCanvasOps';

export const Canvas = observer(function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { handleDrag, handleResize } = useCanvasOperations();
  const screen = editorStore.activeScreen;
  const viewport = editorStore.currentViewport;

  const handleSelect = useCallback((nodeId: string | null) => {
    editorStore.select(nodeId);
  }, []);

  const handleHover = useCallback((nodeId: string | null) => {
    editorStore.setHovered(nodeId);
  }, []);

  if (!screen || !viewport) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>无可用屏幕</div>;
  }

  return (
    <ViewportContainer viewport={viewport}>
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <SchemaRenderer
          screen={screen}
          assets={editorStore.project?.componentAssets}
          onNodeClick={handleSelect}
          onNodeHover={handleHover}
        />
        <EditorOverlay
          containerRef={containerRef}
          selectedNodeIds={editorStore.selectedNodeIds}
          hoveredNodeId={editorStore.hoveredNodeId}
          onSelect={handleSelect}
          onHover={handleHover}
          onDrag={handleDrag}
          onResize={handleResize}
        />
      </div>
    </ViewportContainer>
  );
});
