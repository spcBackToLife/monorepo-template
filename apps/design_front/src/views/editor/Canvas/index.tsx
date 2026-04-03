import { useRef, useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { App as AntdApp } from 'antd';
import { observer } from 'mobx-react-lite';
import {
  ViewportContainer,
  SchemaRenderer,
  PreviewRenderer,
  EditorOverlay,
  buildCoordinateMap,
  mergeCoordinateMaps,
  scaleCoordinateMapToLayoutContainer,
  expandRootRectToContainer,
  buildSchemaLayoutMap,
  hitTest,
  hitTestAll,
  type CoordinateMap,
  type DrawBounds,
  type OverlayToolMode,
} from '@globallink/design-engine';
import {
  findNodeInScreens,
  collectEffectivelyLockedNodeIds,
  collectAnnotationNodeIds,
} from '@globallink/design-operations';
import { generateNodeId } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { useEditorCanvasOperations } from './useEditorCanvasOps';
import { TextInlineEditor } from './TextInlineEditor';
import { useZoomPan } from '../hooks/useZoomPan';
import {
  buildEditorContextMenuItems,
  EditorContextMenuPortal,
  handleEditorContextMenuClick,
} from '../EditorContextMenu';
import { collectNodeIdsWithEvents } from '../utils/collectNodeIdsWithEvents';
import { collectNodeIdsWithListBinding } from '../utils/collectNodeIdsWithListBinding';
import './canvas.css';

const NEW_NODE_DEFAULT_WIDTH = 200;
const NEW_NODE_DEFAULT_HEIGHT = 50;
const GRID_SIZE = 8;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export const Canvas = observer(function Canvas() {
  const { message } = AntdApp.useApp();
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);
  const contextMenuRef = useRef(contextMenu);
  useEffect(() => {
    contextMenuRef.current = contextMenu;
  }, [contextMenu]);
  useZoomPan(canvasAreaRef);

  const [textEditNodeId, setTextEditNodeId] = useState<string | null>(null);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      editorStore.setCanvasViewportSize(r.width, r.height);
    });
    ro.observe(el);
    const r0 = el.getBoundingClientRect();
    editorStore.setCanvasViewportSize(r0.width, r0.height);
    return () => ro.disconnect();
  }, []);

  const screen = editorStore.activeScreen;
  const viewport = editorStore.currentViewport;
  const activeDsForLayout = screen?.dataSets?.find((d) => d.id === screen.activeDataSetId);
  const layoutDatasetFingerprint = JSON.stringify(activeDsForLayout?.data ?? {});

  /** W7-022：视口内节点包围盒是否超出设备框（与 buildCoordinateMap 同源） */
  const projectUpdatedAt = editorStore.project?.updatedAt;

  /** W7-025：与 DOM 合并的 Schema 布局图（虚拟化开启时与 SchemaRenderer / Overlay 同源） */
  const schemaLayoutMap = useMemo(() => {
    if (!screen || !viewport) return null;
    if (!editorStore.canvasVirtualizeOutsideDeviceFrame) return null;
    const activeDs = screen.dataSets?.find((d) => d.id === screen.activeDataSetId);
    return buildSchemaLayoutMap(screen, {
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      globalStates: editorStore.currentGlobalStates,
      assets: editorStore.project?.componentAssets ?? [],
      dataContext: { data: activeDs?.data ?? {} },
      interactionPreview:
        editorStore.selectedNodeIds.length === 1 &&
        editorStore.previewInteractionState &&
        editorStore.previewInteractionState !== 'normal'
          ? {
              nodeId: editorStore.selectedNodeIds[0]!,
              state: editorStore.previewInteractionState,
            }
          : null,
    });
  }, [
    screen?.id,
    viewport?.width,
    viewport?.height,
    editorStore.currentGlobalStates,
    editorStore.project?.componentAssets,
    projectUpdatedAt,
    editorStore.selectedNodeIds,
    editorStore.previewInteractionState,
    editorStore.canvasVirtualizeOutsideDeviceFrame,
    layoutDatasetFingerprint,
  ]);

  const mergeCanvasCoordinateMap = useCallback(
    (container: HTMLElement) => {
      const dom = buildCoordinateMap(container);
      let map: CoordinateMap;
      if (!schemaLayoutMap || schemaLayoutMap.size === 0) {
        map = dom;
      } else {
        const vw = viewport?.width ?? 375;
        const vh = viewport?.height ?? 812;
        const scaled = scaleCoordinateMapToLayoutContainer(schemaLayoutMap, container, vw, vh);
        map = mergeCoordinateMaps(dom, scaled);
      }
      const rid = screen?.rootNode?.id;
      return rid ? expandRootRectToContainer(map, container, rid) : map;
    },
    [schemaLayoutMap, viewport?.width, viewport?.height, screen?.rootNode?.id],
  );

  const { handleDrag, handleResize } = useEditorCanvasOperations(containerRef, schemaLayoutMap);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !screen) {
      editorStore.setViewportOverflow(false);
      return;
    }
    const EPS = 2;
    const check = () => {
      const node = containerRef.current;
      if (!node) return;
      const map = mergeCanvasCoordinateMap(node);
      let maxR = 0;
      let maxB = 0;
      for (const r of map.values()) {
        maxR = Math.max(maxR, r.x + r.width);
        maxB = Math.max(maxB, r.y + r.height);
      }
      const overflow = maxR > node.offsetWidth + EPS || maxB > node.offsetHeight + EPS;
      editorStore.setViewportOverflow(overflow);
    };
    check();
    const ro = new ResizeObserver(() => requestAnimationFrame(check));
    ro.observe(el);
    const id = requestAnimationFrame(check);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [screen?.id, projectUpdatedAt, editorStore.canvasScale, mergeCanvasCoordinateMap]);

  const nodeIdsWithInteractionEvents = useMemo(
    () => (screen ? collectNodeIdsWithEvents(screen.rootNode) : []),
    [screen],
  );

  const nodeIdsWithListBinding = useMemo(
    () => (screen ? collectNodeIdsWithListBinding(screen.rootNode) : []),
    [screen],
  );

  /** W7-023：画布命中跳过自身或祖先已锁定的节点 */
  const lockedNodeIds = useMemo(
    () => (screen ? collectEffectivelyLockedNodeIds(screen.rootNode) : new Set<string>()),
    [screen, projectUpdatedAt],
  );

  /** W7-024：注释工具拾取时跳过已有注释节点 */
  const annotationNodeIds = useMemo(
    () => (screen ? collectAnnotationNodeIds(screen.rootNode) : new Set<string>()),
    [screen, projectUpdatedAt],
  );

  const handleSelect = useCallback((nodeId: string | null) => {
    editorStore.select(nodeId);
  }, []);

  const handleHover = useCallback((nodeId: string | null) => {
    editorStore.setHovered(nodeId);
  }, []);

  const handleMarqueeSelect = useCallback((nodeIds: string[]) => {
    editorStore.selectMultiple(nodeIds);
  }, []);

  const handlePreviewNavigate = useCallback((screenId: string) => {
    editorStore.previewNavigateTo(screenId);
  }, []);

  useEffect(() => {
    if (editorStore.previewMode) setTextEditNodeId(null);
  }, [editorStore.previewMode]);

  const handleDrawCreate = useCallback(
    (bounds: DrawBounds) => {
      const container = containerRef.current;
      if (!container) return;

      const map = mergeCanvasCoordinateMap(container);

      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;

      const LEAF_TYPES = new Set([
        'img', 'input', 'textarea', 'p', 'span', 'h1', 'h2', 'h3', 'a',
      ]);

      const hits = hitTestAll(map, cx, cy);
      let parentId: string | undefined;
      for (const id of hits) {
        const node = findNodeInScreens(editorStore.screens, id);
        if (!node) continue;
        if (LEAF_TYPES.has(node.type)) continue;
        parentId = id;
        break;
      }
      if (!parentId) {
        parentId = screen?.rootNode?.id;
      }
      if (!parentId) return;

      const parentRect = map.get(parentId);
      if (!parentRect) {
        message.error('无法解析父容器位置');
        return;
      }

      const localLeft = bounds.x - parentRect.x;
      const localTop = bounds.y - parentRect.y;
      const clampedLeft = Math.max(0, localLeft);
      const clampedTop = Math.max(0, localTop);
      const maxW = Math.max(1, parentRect.width - clampedLeft);
      const maxH = Math.max(1, parentRect.height - clampedTop);
      const w = Math.min(bounds.width, maxW);
      const h = Math.min(bounds.height, maxH);

      const parentNode = findNodeInScreens(editorStore.screens, parentId);
      if (parentNode && (!parentNode.styles.position || parentNode.styles.position === 'static')) {
        editorStore.execute({
          type: 'updateStyle',
          params: { nodeId: parentId, styles: { position: 'relative' } },
        });
      }

      const tag =
        editorStore.activeTool === 'container'
          ? 'div'
          : editorStore.activeTool === 'text'
            ? 'p'
            : 'div';
      const isTextTool = editorStore.activeTool === 'text';
      const result = editorStore.execute({
        type: 'addElement',
        params: {
          parentId,
          tag: tag as never,
          elementId: generateNodeId(),
          styles: {
            position: 'absolute',
            left: `${snapToGrid(clampedLeft)}px`,
            top: `${snapToGrid(clampedTop)}px`,
            ...(isTextTool
              ? { width: 'fit-content' }
              : {
                  width: `${snapToGrid(Math.max(1, w))}px`,
                  height: `${snapToGrid(Math.max(1, h))}px`,
                }),
          },
        },
      });
      if (result.success) {
        editorStore.select(result.affectedNodeIds[0] ?? null);
        if (!editorStore.toolLocked) editorStore.setActiveTool('select');
      } else {
        message.error(result.description);
      }
    },
    [screen, message, mergeCanvasCoordinateMap],
  );

  /** W7-024：注释工具点击 → addAnnotation，落点相对父节点包围盒 */
  const handleAnnotationPlace = useCallback(
    (args: { parentId: string; canvasX: number; canvasY: number }) => {
      if (!screen) return;
      const container = containerRef.current;
      if (!container) return;

      const map = mergeCanvasCoordinateMap(container);
      const parentRect = map.get(args.parentId);
      const left = parentRect ? args.canvasX - parentRect.x : args.canvasX;
      const top = parentRect ? args.canvasY - parentRect.y : args.canvasY;

      const parentNode = findNodeInScreens(editorStore.screens, args.parentId);
      if (parentNode && (!parentNode.styles.position || parentNode.styles.position === 'static')) {
        editorStore.execute({
          type: 'updateStyle',
          params: { nodeId: args.parentId, styles: { position: 'relative' } },
        });
      }

      const result = editorStore.execute({
        type: 'addAnnotation',
        params: {
          parentId: args.parentId,
          content: '新注释',
          styles: {
            position: 'absolute',
            left: `${Math.round(left)}px`,
            top: `${Math.round(top)}px`,
            width: '200px',
            minHeight: '36px',
            zIndex: 100,
            boxSizing: 'border-box',
            border: '2px dashed #faad14',
            backgroundColor: 'rgba(250, 173, 20, 0.08)',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '12px',
            color: '#d48806',
            pointerEvents: 'auto',
          },
        },
      });
      if (result.success) {
        if (!editorStore.toolLocked) editorStore.setActiveTool('select');
        const newId = result.affectedNodeIds[0];
        if (newId) editorStore.select(newId);
      } else {
        message.error(result.description);
      }
    },
    [screen, message, mergeCanvasCoordinateMap],
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (editorStore.previewMode) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const map = mergeCanvasCoordinateMap(container);
      const r = container.getBoundingClientRect();
      const effectiveScale =
        container.offsetWidth > 0 ? r.width / container.offsetWidth : 1;
      const x = (e.clientX - r.left) / effectiveScale;
      const y = (e.clientY - r.top) / effectiveScale;
      const nodeId = hitTest(map, x, y);
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    },
    [mergeCanvasCoordinateMap],
  );

  if (!screen || !viewport) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>无可用屏幕</div>;
  }

  const onDropTemplate = useCallback(
    (templateId: string, clientX?: number, clientY?: number) => {
      const hitNodeId = (() => {
        if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
        const elements = document.elementsFromPoint(clientX, clientY);
        for (const el of elements) {
          const id = (el as HTMLElement).getAttribute?.('data-node-id');
          if (id) return id;
        }
        return null;
      })();

      const parentId = hitNodeId ?? editorStore.selectedNodeIds[0];
      if (!parentId) {
        message.warning('请先选中一个容器，再把组件拖到画布');
        return;
      }

      const parentNode = findNodeInScreens(editorStore.screens, parentId);
      if (!parentNode) {
        message.warning('未命中可放置的容器，请重试');
        return;
      }

      if (!parentNode.styles.position || parentNode.styles.position === 'static') {
        editorStore.execute({
          type: 'updateStyle',
          params: { nodeId: parentId, styles: { position: 'relative' } },
        });
      }

      const result = editorStore.execute({
        type: 'instantiateTemplate',
        params: { templateId, parentId },
      });
      if (!result.success) {
        message.error(result.description);
        return;
      }

      const newId = result.affectedNodeIds[0];
      if (
        newId &&
        typeof clientX === 'number' &&
        typeof clientY === 'number'
      ) {
        const parentEl = containerRef.current?.querySelector(
          `[data-node-id="${parentId}"]`,
        ) as HTMLElement | null;
        const baseRect = (parentEl ?? containerRef.current)?.getBoundingClientRect();
        if (baseRect) {
          const parentW = Math.max(0, baseRect.width / editorStore.canvasScale);
          const parentH = Math.max(0, baseRect.height / editorStore.canvasScale);
          const rawLeft = Math.max(0, (clientX - baseRect.left) / editorStore.canvasScale);
          const rawTop = Math.max(0, (clientY - baseRect.top) / editorStore.canvasScale);
          const left = Math.min(Math.max(0, snapToGrid(rawLeft)), Math.max(0, parentW - 40));
          const top = Math.min(Math.max(0, snapToGrid(rawTop)), Math.max(0, parentH - 40));
          editorStore.execute({
            type: 'updateStyle',
            params: {
              nodeId: newId,
              styles: {
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
              },
            },
          });
        }
      }

      if (newId) {
        editorStore.select(newId);
        message.success('已添加组件实例');
      }
    },
    [message],
  );

  const onDropElement = (tag: string, clientX?: number, clientY?: number) => {
    const hitNodeId = (() => {
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        const id = (el as HTMLElement).getAttribute?.('data-node-id');
        if (id) return id;
      }
      return null;
    })();

    const parentId = hitNodeId ?? editorStore.selectedNodeIds[0];
    if (!parentId) {
      message.warning('请先选中一个容器，再把元素拖到画布');
      return;
    }

    const parentNode = findNodeInScreens(editorStore.screens, parentId);
    if (!parentNode) {
      message.warning('未命中可放置的容器，请重试');
      return;
    }

    const parentEl = containerRef.current?.querySelector(`[data-node-id="${parentId}"]`) as HTMLElement | null;
    const baseRect = (parentEl ?? containerRef.current)?.getBoundingClientRect();
    const droppedStyles =
      baseRect && typeof clientX === 'number' && typeof clientY === 'number'
        ? (() => {
            const parentW = Math.max(0, baseRect.width / editorStore.canvasScale);
            const parentH = Math.max(0, baseRect.height / editorStore.canvasScale);
            const maxLeft = Math.max(0, parentW - NEW_NODE_DEFAULT_WIDTH);
            const maxTop = Math.max(0, parentH - NEW_NODE_DEFAULT_HEIGHT);

            const rawLeft = Math.max(0, (clientX - baseRect.left) / editorStore.canvasScale);
            const rawTop = Math.max(0, (clientY - baseRect.top) / editorStore.canvasScale);

            const left = Math.min(maxLeft, snapToGrid(rawLeft));
            const top = Math.min(maxTop, snapToGrid(rawTop));

            return {
              position: 'absolute',
              left: `${Math.max(0, left)}px`,
              top: `${Math.max(0, top)}px`,
              width: `${NEW_NODE_DEFAULT_WIDTH}px`,
              height: `${NEW_NODE_DEFAULT_HEIGHT}px`,
            };
          })()
        : undefined;

    if (!parentNode.styles.position || parentNode.styles.position === 'static') {
      editorStore.execute({
        type: 'updateStyle',
        params: { nodeId: parentId, styles: { position: 'relative' } },
      });
    }

    const result = editorStore.execute({
      type: 'addElement',
      params: { parentId, tag: tag as never, elementId: generateNodeId(), styles: droppedStyles },
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
      ref={canvasAreaRef}
      className="editor-canvas-root"
      onDragOver={(e) => e.preventDefault()}
      onContextMenu={handleCanvasContextMenu}
      onDrop={(e) => {
        if (editorStore.previewMode) return;
        e.preventDefault();
        const tag = e.dataTransfer.getData('application/x-design-tag');
        if (tag) {
          onDropElement(tag, e.clientX, e.clientY);
          return;
        }
        const templateId = e.dataTransfer.getData('application/x-design-template-id');
        if (templateId) {
          onDropTemplate(templateId, e.clientX, e.clientY);
        }
      }}
    >
      <div
        className="editor-canvas-transform"
        style={{
          transform: `translate(${editorStore.canvasPanX}px, ${editorStore.canvasPanY}px) scale(${editorStore.canvasScale})`,
        }}
      >
        <ViewportContainer viewport={viewport} backgroundColor="transparent">
          <div ref={containerRef} className="editor-canvas-stack">
            <div
              className={`editor-canvas-dom-layer ${
                editorStore.previewMode ? 'editor-canvas-dom-layer--preview' : ''
              }`}
              style={{ position: 'relative' }}
            >
              {editorStore.previewMode ? (
                <PreviewRenderer
                  screen={screen}
                  assets={editorStore.project?.componentAssets ?? []}
                  globalStates={editorStore.currentGlobalStates}
                  currentDataSet={screen.activeDataSetId}
                  onNavigate={handlePreviewNavigate}
                  embedded
                />
              ) : (
                <>
                  <SchemaRenderer
                    screen={screen}
                    assets={editorStore.project?.componentAssets}
                    globalStates={editorStore.currentGlobalStates}
                    virtualizeOutsideDeviceFrame={editorStore.canvasVirtualizeOutsideDeviceFrame}
                    virtualizeViewportWidth={viewport.width}
                    virtualizeViewportHeight={viewport.height}
                    schemaLayoutMap={schemaLayoutMap}
                    interactionPreview={
                      editorStore.selectedNodeIds.length === 1 &&
                      editorStore.previewInteractionState &&
                      editorStore.previewInteractionState !== 'normal'
                        ? {
                            nodeId: editorStore.selectedNodeIds[0]!,
                            state: editorStore.previewInteractionState,
                          }
                        : null
                    }
                    onNodeClick={handleSelect}
                    onNodeHover={handleHover}
                  />
                  {(screen.rootNode.children?.length ?? 0) === 0 && (
                    <div
                      className="editor-canvas-empty-hint"
                      style={{
                        pointerEvents: 'none',
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: 13,
                        textAlign: 'center',
                        padding: 24,
                      }}
                    >
                      画布为空：从左侧组件库拖入元素，或使用底部工具绘制
                    </div>
                  )}
                </>
              )}
            </div>
            {!editorStore.previewMode && (
              <EditorOverlay
                containerRef={containerRef}
                layoutSyncKey={`${viewport.platform}:${viewport.name}:${viewport.width}x${viewport.height}-${editorStore.canvasScale.toFixed(3)}`}
                layoutViewportWidth={viewport.width}
                layoutViewportHeight={viewport.height}
                selectedNodeIds={editorStore.selectedNodeIds}
                hoveredNodeId={editorStore.hoveredNodeId}
                activeTool={editorStore.activeTool as OverlayToolMode}
                onSelect={handleSelect}
                onMarqueeSelect={handleMarqueeSelect}
                onHover={handleHover}
                onDrag={handleDrag}
                onResize={handleResize}
                onDrawCreate={handleDrawCreate}
                zoomLevel={editorStore.canvasScale}
                snapToGridEnabled={editorStore.snapToGridEnabled}
                gridSizePx={editorStore.gridSizePx}
                showGridOverlay={editorStore.showGridInEditor}
                onNodeDoubleClick={(id) => {
                  setTextEditNodeId(id);
                  editorStore.select(id);
                }}
                /* 已移除：双击非文本节点不再自动插入文本段落 */
                nodeIdsWithInteractionEvents={nodeIdsWithInteractionEvents}
                nodeIdsWithListBinding={nodeIdsWithListBinding}
                lockedNodeIds={lockedNodeIds}
                annotationNodeIds={annotationNodeIds}
                rootNodeId={screen.rootNode.id}
                onAnnotationPlace={handleAnnotationPlace}
                coordinateLayoutFallback={schemaLayoutMap ?? undefined}
              />
            )}
          </div>
        </ViewportContainer>
      </div>
      {textEditNodeId && (
        <TextInlineEditor
          nodeId={textEditNodeId}
          containerRef={containerRef}
          onClose={() => setTextEditNodeId(null)}
        />
      )}
      <EditorContextMenuPortal
        open={contextMenu !== null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        items={buildEditorContextMenuItems(
          contextMenu?.nodeId ?? null,
          screen.rootNode.id,
        )}
        onClose={() => setContextMenu(null)}
        onMenuClick={({ key }) =>
          handleEditorContextMenuClick(
            String(key),
            contextMenuRef.current?.nodeId ?? null,
            screen.rootNode.id,
            message,
          )
        }
      />
    </div>
  );
});
