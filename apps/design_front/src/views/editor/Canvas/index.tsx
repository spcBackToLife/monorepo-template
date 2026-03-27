import { useRef, useCallback } from 'react';
import { App as AntdApp } from 'antd';
import { observer } from 'mobx-react-lite';
import { ViewportContainer, SchemaRenderer, EditorOverlay } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';
import { useCanvasOperations } from './useCanvasOps';

export const Canvas = observer(function Canvas() {
  const { message } = AntdApp.useApp();
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

  const onDropElement = (tag: string) => {
    const parentId = editorStore.selectedNodeIds[0] ?? screen.rootNode.id;
    const result = editorStore.execute({
      type: 'addElement',
      params: { parentId, tag: tag as never },
    });
    if (result.success) {
      const createdNodeId = result.affectedNodeIds[0] ?? null;
      editorStore.select(createdNodeId);
      return;
    }
    if (!result.success) {
      message.error(result.description);
    }
  };

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      onWheel={(e) => {
        // 仅在捏合手势时缩放（macOS 触控板 pinch 通常带 ctrlKey/metaKey）
        // 普通双指滚动保留原生行为（含横向滚动）。
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0012);
        const next = editorStore.canvasScale * factor;
        editorStore.setCanvasScale(next);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const tag = e.dataTransfer.getData('application/x-design-tag');
        if (tag) onDropElement(tag);
      }}
    >
      <div
        style={{
          transform: `scale(${editorStore.canvasScale})`,
          transformOrigin: 'top center',
          width: `${100 / editorStore.canvasScale}%`,
          height: `${100 / editorStore.canvasScale}%`,
          margin: '0 auto',
        }}
      >
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
      </div>
    </div>
  );
});
