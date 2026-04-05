import { useRef, useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { App as AntdApp } from 'antd';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import {
  ViewportContainer,
  SchemaRenderer,
  PreviewRenderer,
  TransitionAnimator,
  EditorOverlay,
  buildCoordinateMap,
  mergeCoordinateMaps,
  scaleCoordinateMapToLayoutContainer,
  expandRootRectToContainer,
  buildSchemaLayoutMap,
  hitTest,
  getEditorCoordinateRoot,
  getPlacementParentRect,
  screenToContainerLogical,
  resolvePlacementParentElement,
  type CoordinateMap,
  type DrawBounds,
  type NodeRect,
  type OverlayToolMode,
} from '@globallink/design-engine';
import type { TransitionAnimation } from '@globallink/design-schema';
import {
  findNodeInScreens,
  collectEffectivelyLockedNodeIds,
  collectAnnotationNodeIds,
} from '@globallink/design-operations';
import { generateNodeId } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { useEditorCanvasOperations } from './useEditorCanvasOps';
import { TextInlineEditor } from './TextInlineEditor';
import { CanvasContextBar } from './CanvasContextBar';
import { useZoomPan } from '../hooks/useZoomPan';
import {
  buildEditorContextMenuItems,
  EditorContextMenuPortal,
  handleEditorContextMenuClick,
} from '../EditorContextMenu';
import { collectNodeIdsWithEvents } from '../utils/collectNodeIdsWithEvents';
import { collectNodeIdsWithListBinding } from '../utils/collectNodeIdsWithListBinding';
import { resolveDrawParentId } from '../utils/placement';
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
  const activeDsForLayout = (() => {
    if (!screen) return undefined;
    for (const ds of screen.dataSources ?? []) {
      if (ds.activePhase !== 'loaded') continue;
      const sc = ds.scenarios.find(s => s.id === ds.activeScenarioId);
      if (sc) return sc;
    }
    return undefined;
  })();
  const layoutDatasetFingerprint = JSON.stringify(activeDsForLayout?.data ?? {});

  /** W7-022：视口内节点包围盒是否超出设备框（与 buildCoordinateMap 同源） */
  const projectUpdatedAt = editorStore.project?.updatedAt;

  /** W7-025：与 DOM 合并的 Schema 布局图（虚拟化开启时与 SchemaRenderer / Overlay 同源） */
  const schemaLayoutMap = useMemo(() => {
    if (!screen || !viewport) return null;
    if (!editorStore.canvasVirtualizeOutsideDeviceFrame) return null;
    const mergedData: Record<string, unknown> = {};
    for (const ds of screen.dataSources ?? []) {
      if (ds.activePhase !== 'loaded') continue;
      const sc = ds.scenarios.find(s => s.id === ds.activeScenarioId);
      if (sc) Object.assign(mergedData, sc.data);
    }
    return buildSchemaLayoutMap(screen, {
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      globalStates: editorStore.currentGlobalStates,
      assets: editorStore.project?.componentAssets ?? [],
      dataContext: { data: mergedData },
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
    (stack: HTMLElement) => {
      const coordRoot = getEditorCoordinateRoot(stack);
      const dom = buildCoordinateMap(coordRoot);
      let map: CoordinateMap;
      if (!schemaLayoutMap || schemaLayoutMap.size === 0) {
        map = dom;
      } else {
        const vw = viewport?.width ?? 375;
        const vh = viewport?.height ?? 812;
        const scaled = scaleCoordinateMapToLayoutContainer(schemaLayoutMap, coordRoot, vw, vh);
        map = mergeCoordinateMaps(dom, scaled);
      }
      const rid = screen?.rootNode?.id;
      return rid ? expandRootRectToContainer(map, coordRoot, rid) : map;
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
      const stack = containerRef.current;
      if (!stack) return;
      const coordRoot = getEditorCoordinateRoot(stack);
      const map = mergeCanvasCoordinateMap(stack);
      let maxR = 0;
      let maxB = 0;
      for (const entry of map.values()) {
        const r = entry.rect;
        maxR = Math.max(maxR, r.x + r.width);
        maxB = Math.max(maxB, r.y + r.height);
      }
      const overflow =
        maxR > coordRoot.offsetWidth + EPS || maxB > coordRoot.offsetHeight + EPS;
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

  const handlePreviewNavigate = useCallback((screenId: string, animation?: TransitionAnimation) => {
    const name =
      animation == null || animation.type === 'none' ? 'fade' : animation.type;
    editorStore.previewNavigateTo(screenId, name);
  }, []);

  const handlePreviewSwitchDataSourcePhase = useCallback((dataSourceId: string, phase: string) => {
    const screen = editorStore.activeScreen;
    if (!screen) return;
    runInAction(() => {
      const ds = screen.dataSources?.find((d) => d.id === dataSourceId);
      if (ds) ds.activePhase = phase;
    });
  }, []);

  useEffect(() => {
    if (editorStore.previewMode) setTextEditNodeId(null);
  }, [editorStore.previewMode]);

  const handleDrawCreate = useCallback(
    (bounds: DrawBounds) => {
      const container = containerRef.current;
      if (!container || !screen) return;

      const map = mergeCanvasCoordinateMap(container);
      const rootId = screen.rootNode.id;
      const parentId = resolveDrawParentId(screen.rootNode, editorStore.selectedNodeIds[0], rootId);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const parentEl = resolvePlacementParentElement(container, parentId, { x: cx, y: cy });
      const parentRect: NodeRect = getPlacementParentRect(
        container,
        parentId,
        rootId,
        parentEl,
        map,
      );

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
    [screen, message, mergeCanvasCoordinateMap, editorStore.selectedNodeIds[0]],
  );

  /** W7-024：注释工具点击 → addAnnotation，落点相对父节点包围盒 */
  const handleAnnotationPlace = useCallback(
    (args: { parentId: string; canvasX: number; canvasY: number }) => {
      if (!screen) return;
      const container = containerRef.current;
      if (!container) return;

      const map = mergeCanvasCoordinateMap(container);
      const rootId = screen.rootNode.id;
      const parentEl = resolvePlacementParentElement(container, args.parentId, {
        x: args.canvasX,
        y: args.canvasY,
      });
      const parentRect = getPlacementParentRect(
        container,
        args.parentId,
        rootId,
        parentEl,
        map,
      );
      const left = args.canvasX - parentRect.x;
      const top = args.canvasY - parentRect.y;

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
      const logical = screenToContainerLogical(container, e.clientX, e.clientY);
      const nodeId = hitTest(map, logical.x, logical.y);
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    },
    [mergeCanvasCoordinateMap],
  );

  const onDropTemplate = useCallback(
    (templateId: string, clientX?: number, clientY?: number) => {
      const active = editorStore.activeScreen;
      if (!active) return;

      const hitNodeId = (() => {
        if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
        const elements = document.elementsFromPoint(clientX, clientY);
        for (const el of elements) {
          const id = (el as HTMLElement).getAttribute?.('data-node-id');
          if (id) return id;
        }
        return null;
      })();

      const startId = hitNodeId ?? editorStore.selectedNodeIds[0];
      if (!startId) {
        message.warning('请先选中一个容器，再把组件拖到画布');
        return;
      }

      const rootId = active.rootNode.id;
      const parentId = resolveDrawParentId(active.rootNode, startId, rootId);
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
      const container = containerRef.current;
      if (newId && container && typeof clientX === 'number' && typeof clientY === 'number') {
        const map = mergeCanvasCoordinateMap(container);
        const logical = screenToContainerLogical(container, clientX, clientY);
        const pel = resolvePlacementParentElement(container, parentId, logical);
        const parentRect = getPlacementParentRect(container, parentId, rootId, pel, map);
        const rawLeft = Math.max(0, logical.x - parentRect.x);
        const rawTop = Math.max(0, logical.y - parentRect.y);
        const left = Math.min(
          Math.max(0, snapToGrid(rawLeft)),
          Math.max(0, parentRect.width - 40),
        );
        const top = Math.min(
          Math.max(0, snapToGrid(rawTop)),
          Math.max(0, parentRect.height - 40),
        );
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

      if (newId) {
        editorStore.select(newId);
        message.success('已添加组件实例');
      }
    },
    [message, mergeCanvasCoordinateMap],
  );

  const onDropElement = useCallback(
    (tag: string, clientX?: number, clientY?: number) => {
      const active = editorStore.activeScreen;
      if (!active) return;

      const hitNodeId = (() => {
        if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
        const elements = document.elementsFromPoint(clientX, clientY);
        for (const el of elements) {
          const id = (el as HTMLElement).getAttribute?.('data-node-id');
          if (id) return id;
        }
        return null;
      })();

      const startId = hitNodeId ?? editorStore.selectedNodeIds[0];
      if (!startId) {
        message.warning('请先选中一个容器，再把元素拖到画布');
        return;
      }

      const rootId = active.rootNode.id;
      const parentId = resolveDrawParentId(active.rootNode, startId, rootId);
      const parentNode = findNodeInScreens(editorStore.screens, parentId);
      if (!parentNode) {
        message.warning('未命中可放置的容器，请重试');
        return;
      }

      const container = containerRef.current;
      const droppedStyles =
        container && typeof clientX === 'number' && typeof clientY === 'number'
          ? (() => {
              const map = mergeCanvasCoordinateMap(container);
              const logical = screenToContainerLogical(container, clientX, clientY);
              const pel = resolvePlacementParentElement(container, parentId, logical);
              const parentRect = getPlacementParentRect(container, parentId, rootId, pel, map);
              const rawLeft = Math.max(0, logical.x - parentRect.x);
              const rawTop = Math.max(0, logical.y - parentRect.y);
              const maxLeft = Math.max(0, parentRect.width - NEW_NODE_DEFAULT_WIDTH);
              const maxTop = Math.max(0, parentRect.height - NEW_NODE_DEFAULT_HEIGHT);
              const left = Math.min(maxLeft, snapToGrid(rawLeft));
              const top = Math.min(maxTop, snapToGrid(rawTop));
              return {
                position: 'absolute' as const,
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
        editorStore.select(result.affectedNodeIds[0] ?? null);
        return;
      }
      message.error(result.description);
    },
    [message, mergeCanvasCoordinateMap],
  );

  if (!screen || !viewport) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>无可用屏幕</div>;
  }

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
      {editorStore.showCanvasContextBar && <CanvasContextBar />}
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
                <TransitionAnimator
                  transitionKey={screen.id}
                  transition={editorStore.previewTransition}
                >
                  <PreviewRenderer
                    screen={screen}
                    assets={editorStore.project?.componentAssets ?? []}
                    globalStates={editorStore.currentGlobalStates}
                    currentDataSet={undefined}
                    onNavigate={handlePreviewNavigate}
                    onSwitchDataSourcePhase={handlePreviewSwitchDataSourcePhase}
                    embedded
                  />
                </TransitionAnimator>
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
