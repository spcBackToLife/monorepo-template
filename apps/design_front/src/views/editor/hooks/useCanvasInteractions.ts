import { useCallback } from 'react';
import { App as AntdApp } from 'antd';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import { generateNodeId } from '@globallink/design-schema';

const GRID_SIZE = 8;
const NEW_NODE_WIDTH = 200;
const NEW_NODE_HEIGHT = 50;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * Task 1.5.4 — Canvas Interactions hook
 * Dispatches behavior based on store.activeTool.
 */
export function useCanvasInteractions(containerRef: React.RefObject<HTMLElement | null>) {
  const { message } = AntdApp.useApp();

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const tool = editorStore.activeTool;

      if (tool === 'select' || tool === 'hand') {
        // Select mode: handled by overlay click handlers
        return;
      }

      // Placement tools: container, element, text
      if (tool === 'container' || tool === 'element' || tool === 'text') {
        const parentId = editorStore.selectedNodeIds[0];
        if (!parentId) {
          message.warning('请先选中一个容器，再放置元素');
          return;
        }

        const parentNode = findNodeInScreens(editorStore.screens, parentId);
        if (!parentNode) {
          message.warning('未命中可放置的容器');
          return;
        }

        const parentEl = containerRef.current?.querySelector(`[data-node-id="${parentId}"]`) as HTMLElement | null;
        const baseRect = (parentEl ?? containerRef.current)?.getBoundingClientRect();

        let droppedStyles: Record<string, string> | undefined;
        if (baseRect) {
          const rawLeft = Math.max(0, (e.clientX - baseRect.left) / editorStore.canvasScale);
          const rawTop = Math.max(0, (e.clientY - baseRect.top) / editorStore.canvasScale);
          droppedStyles = {
            position: 'absolute',
            left: `${snapToGrid(rawLeft)}px`,
            top: `${snapToGrid(rawTop)}px`,
            width: `${NEW_NODE_WIDTH}px`,
            height: `${NEW_NODE_HEIGHT}px`,
          };
        }

        const tagMap: Record<string, string> = {
          container: 'div',
          element: 'div',
          text: 'span',
        };

        // Ensure parent has position
        if (!parentNode.styles.position || parentNode.styles.position === 'static') {
          editorStore.execute({
            type: 'updateStyle',
            params: { nodeId: parentId, styles: { position: 'relative' } },
          });
        }

        const result = editorStore.execute({
          type: 'addElement',
          params: { parentId, tag: tagMap[tool] as never, elementId: generateNodeId(), styles: droppedStyles },
        });

        if (result.success) {
          const createdId = result.affectedNodeIds[0] ?? null;
          editorStore.select(createdId);
          // Auto-return to select unless holding shift
          if (!e.shiftKey && !editorStore.toolLocked) {
            editorStore.setActiveTool('select');
          }
        } else {
          message.error(result.description);
        }
        return;
      }
    },
    [containerRef, message],
  );

  const handleCanvasSelect = useCallback((nodeId: string | null, e?: { shiftKey?: boolean }) => {
    if (e?.shiftKey && nodeId) {
      editorStore.toggleSelect(nodeId);
    } else {
      editorStore.select(nodeId);
    }
  }, []);

  const handleCanvasHover = useCallback((nodeId: string | null) => {
    editorStore.setHovered(nodeId);
  }, []);

  return {
    handleCanvasClick,
    handleCanvasSelect,
    handleCanvasHover,
  };
}
