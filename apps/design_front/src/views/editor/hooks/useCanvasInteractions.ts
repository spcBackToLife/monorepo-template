import { useCallback } from 'react';
import { App as AntdApp } from 'antd';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import { generateNodeId, type PrimitiveNodeType } from '@globallink/design-schema';
import {
  getPlacementParentRect,
  resolvePlacementParentElement,
  screenToContainerLogical,
} from '@globallink/design-engine';
import { resolveDrawParentId } from '../utils/placement';

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
        const active = editorStore.activeScreen;
        const container = containerRef.current;
        if (!active || !container) return;

        const selectedRaw = editorStore.selectedNodeIds[0];
        if (!selectedRaw) {
          message.warning('请先选中一个容器，再放置元素');
          return;
        }

        const rootId = active.rootNode.id;
        const parentId = resolveDrawParentId(active.rootNode, selectedRaw, rootId);
        const parentNode = findNodeInScreens(editorStore.screens, parentId);
        if (!parentNode) {
          message.warning('未命中可放置的容器');
          return;
        }

        const logical = screenToContainerLogical(container, e.clientX, e.clientY);
        const parentEl = resolvePlacementParentElement(container, parentId, logical);
        if (parentId !== rootId && !parentEl) {
          message.warning('未找到父容器 DOM，请重试');
          return;
        }

        const parentRect = getPlacementParentRect(container, parentId, rootId, parentEl, null);
        const rawLeft = Math.max(0, logical.x - parentRect.x);
        const rawTop = Math.max(0, logical.y - parentRect.y);
        const droppedStyles: Record<string, string> = {
          position: 'absolute',
          left: `${snapToGrid(rawLeft)}px`,
          top: `${snapToGrid(rawTop)}px`,
          width: `${NEW_NODE_WIDTH}px`,
          height: `${NEW_NODE_HEIGHT}px`,
        };

        const tagMap: Record<string, string> = {
          container: 'div',
          element: 'div',
          text: 'span',
        };

        // Ensure parent has position
        if (!parentNode.styles.position || parentNode.styles.position === 'static') {
          editorStore.execute({
            type: 'style.update',
            params: { nodeId: parentId, styles: { position: 'relative' } },
          });
        }

        const result = editorStore.execute({
          type: 'element.add',
          params: { parentId, tag: tagMap[tool] as PrimitiveNodeType, elementId: generateNodeId(), styles: droppedStyles },
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
