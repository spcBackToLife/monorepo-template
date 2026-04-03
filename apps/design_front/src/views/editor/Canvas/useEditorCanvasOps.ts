import { useCallback, type RefObject } from 'react';
import {
  buildCoordinateMap,
  mergeCoordinateMaps,
  scaleCoordinateMapToLayoutContainer,
  expandRootRectToContainer,
} from '@globallink/design-engine';
import type { CoordinateMap } from '@globallink/design-engine';
import { findNodeInScreens, findParentInScreens } from '@globallink/design-operations';
import type { ComponentNode } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

function mergeDomWithScaledFallback(
  container: HTMLElement,
  domMap: CoordinateMap,
  coordinateLayoutFallback?: CoordinateMap | null,
): CoordinateMap {
  let map: CoordinateMap;
  if (!coordinateLayoutFallback || coordinateLayoutFallback.size === 0) {
    map = domMap;
  } else {
    const vp = editorStore.currentViewport;
    const vw = vp?.width ?? 375;
    const vh = vp?.height ?? 812;
    const scaled = scaleCoordinateMapToLayoutContainer(
      coordinateLayoutFallback,
      container,
      vw,
      vh,
    );
    map = mergeCoordinateMaps(domMap, scaled);
  }
  const rootId = editorStore.activeScreen?.rootNode?.id;
  return rootId ? expandRootRectToContainer(map, container, rootId) : map;
}

function parseCssPx(value: string | number | undefined): number {
  if (value === undefined || value === '') return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const m = String(value).match(/^(-?\d*\.?\d+)/);
  return m ? parseFloat(m[1]) : 0;
}

/** 合并 base + 当前激活状态覆盖，用于读 left/top（拖拽增量） */
function getEffectiveLeftTop(node: ComponentNode): { left: number; top: number } {
  const base = node.styles as Record<string, string | number | undefined>;
  let left = parseCssPx(base.left);
  let top = parseCssPx(base.top);
  const active = node.activeState ?? 'default';
  if (active !== 'default') {
    const st = node.states.find((s) => s.name === active);
    const o = st?.styles as Record<string, string | number | undefined> | undefined;
    if (o?.left !== undefined) left = parseCssPx(o.left);
    if (o?.top !== undefined) top = parseCssPx(o.top);
  }
  return { left, top };
}

/**
 * 将覆盖层拖拽/缩放转为 updateStyle 或 updateState（随 activeState）；
 * 多选拖拽时对每个选中节点应用相同画布增量。
 */
export function useEditorCanvasOperations(
  containerRef: RefObject<HTMLElement | null>,
  coordinateLayoutFallback?: CoordinateMap | null,
) {
  const handleDrag = useCallback(
    (nodeId: string, deltaX: number, deltaY: number, groupIds?: string[]) => {
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

      const ids = groupIds?.length ? groupIds : [nodeId];
      for (const id of ids) {
        const node = findNodeInScreens(editorStore.screens, id);
        if (!node) continue;

        const parentInfo = findParentInScreens(editorStore.screens, id);
        const parent = parentInfo?.parent;
        const parentDisplay = (parent?.styles as Record<string, string | undefined>)?.display;
        const isFlexParent = parentDisplay === 'flex' || parentDisplay === 'inline-flex';
        const siblingCount = parent?.children?.length ?? 0;
        /** 仅在有多个兄弟时走 flex 重排序；单子节点时 handleFlexReorder 会空操作，导致无法写回 left/top，表现为「拖不动」。 */
        const nodePos = (node.styles as Record<string, string | undefined>)?.position;
        const isOutOfFlow = nodePos === 'absolute' || nodePos === 'fixed';

        if (isFlexParent && parent && siblingCount > 1 && !isOutOfFlow) {
          handleFlexReorder(id, parent, deltaX, deltaY);
          continue;
        }

        const activeState = node.activeState ?? 'default';
        const styles = node.styles as Record<string, string | number | undefined>;
        const pos = styles.position;
        const wasStatic = !pos || pos === 'static';

        const { left, top } = getEffectiveLeftTop(node);
        const nextLeft = left + deltaX;
        const nextTop = top + deltaY;

        const patch: Record<string, string> = {
          ...(wasStatic ? { position: 'relative' } : {}),
          left: `${Math.round(nextLeft * 100) / 100}px`,
          top: `${Math.round(nextTop * 100) / 100}px`,
        };

        if (activeState === 'default') {
          editorStore.execute({
            type: 'updateStyle',
            params: { nodeId: id, styles: patch },
          });
        } else {
          editorStore.execute({
            type: 'updateState',
            params: { nodeId: id, stateName: activeState, styles: patch },
          });
        }
      }
    },
    [containerRef, coordinateLayoutFallback],
  );

  const lastFlexReorderRef = { current: '' };

  function handleFlexReorder(
    nodeId: string,
    parent: ComponentNode,
    deltaX: number,
    deltaY: number,
  ) {
    const container = containerRef.current;
    if (!container) return;

    const domMap = buildCoordinateMap(container);
    const map = mergeDomWithScaledFallback(container, domMap, coordinateLayoutFallback);

    const nodeRect = map.get(nodeId);
    if (!nodeRect) return;

    const centerX = nodeRect.x + nodeRect.width / 2 + deltaX;
    const centerY = nodeRect.y + nodeRect.height / 2 + deltaY;

    const siblings = parent.children ?? [];
    const flexDir = (parent.styles as Record<string, string | undefined>)?.flexDirection ?? 'row';
    const isHorizontal = flexDir === 'row' || flexDir === 'row-reverse';

    let bestIndex = 0;
    for (let i = 0; i < siblings.length; i++) {
      const sib = siblings[i];
      if (sib.id === nodeId) continue;
      const sibRect = map.get(sib.id);
      if (!sibRect) continue;
      const sibCenter = isHorizontal
        ? sibRect.x + sibRect.width / 2
        : sibRect.y + sibRect.height / 2;
      const dragCenter = isHorizontal ? centerX : centerY;
      if (dragCenter > sibCenter) bestIndex = i + 1;
    }

    const currentIndex = siblings.findIndex((s) => s.id === nodeId);
    if (currentIndex === bestIndex || currentIndex + 1 === bestIndex) return;

    const key = `${nodeId}:${bestIndex}`;
    if (lastFlexReorderRef.current === key) return;
    lastFlexReorderRef.current = key;

    editorStore.execute({
      type: 'reorderElement',
      params: { nodeId, parentId: parent.id, newIndex: bestIndex > currentIndex ? bestIndex - 1 : bestIndex },
    } as never);
  }

  const handleResize = useCallback(
    (nodeId: string, frame: { x: number; y: number; width: number; height: number }) => {
      const container = containerRef.current;
      if (!container) return;

      const domMap = buildCoordinateMap(container);
      const map = mergeDomWithScaledFallback(container, domMap, coordinateLayoutFallback);
      const parentInfo = findParentInScreens(editorStore.screens, nodeId);
      const parentRect = parentInfo ? map.get(parentInfo.parent.id) : null;

      const localLeft = parentRect ? frame.x - parentRect.x : frame.x;
      const localTop = parentRect ? frame.y - parentRect.y : frame.y;

      const node = findNodeInScreens(editorStore.screens, nodeId);
      if (!node) return;

      const activeState = node.activeState ?? 'default';
      const styles = {
        left: `${Math.round(localLeft)}px`,
        top: `${Math.round(localTop)}px`,
        width: `${Math.round(Math.max(1, frame.width))}px`,
        height: `${Math.round(Math.max(1, frame.height))}px`,
      };

      if (activeState === 'default') {
        editorStore.execute({
          type: 'updateStyle',
          params: { nodeId, styles },
        });
      } else {
        editorStore.execute({
          type: 'updateState',
          params: { nodeId, stateName: activeState, styles },
        });
      }
    },
    [containerRef, coordinateLayoutFallback],
  );

  return { handleDrag, handleResize };
}
