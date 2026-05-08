import { useState, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { Screen } from '@globallink/design-schema';
import { SchemaRenderer } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';
import { getEditorStaticAssetOrigin } from '@/views/editor/utils/staticAssetOrigin';

function computeReorderNewIndex(
  screens: Screen[],
  sourceId: string,
  targetId: string,
  placement: 'before' | 'after',
): number {
  const sourceIndex = screens.findIndex((s) => s.id === sourceId);
  const targetIndex = screens.findIndex((s) => s.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return Math.max(0, sourceIndex);

  if (placement === 'before') {
    if (sourceIndex < targetIndex) return targetIndex - 1;
    return targetIndex;
  }
  if (sourceIndex < targetIndex) return targetIndex;
  return targetIndex + 1;
}

/**
 * 屏幕缩略图。
 *
 * 直接复用真实 SchemaRenderer + transform: scale 缩放到小尺寸，
 * 这样能完整还原 backgroundImage / 渐变 / 数据绑定 / 布局，
 * 而不会出现"画板有内容、缩略图却是白板"的不一致。
 *
 * 性能：缩略图 hideGhostNodes、editorCanvasOptimize=false、pointer-events:none，
 * 屏幕数较少（通常 < 20）时无明显开销；如未来量大可加 IntersectionObserver 懒渲染。
 */
const THUMB_W = 48;
const THUMB_H = 32;

const PageThumbnail = observer(function PageThumbnail({ screen }: { screen: Screen }) {
  const project = editorStore.project;
  const viewport = editorStore.currentViewport;
  const vpW = viewport?.width ?? 375;
  const vpH = viewport?.height ?? 667;
  const scale = Math.min(THUMB_W / vpW, THUMB_H / vpH);
  const bgColor =
    (typeof screen.rootNode.styles?.backgroundColor === 'string' &&
      screen.rootNode.styles.backgroundColor) ||
    screen.backgroundColor ||
    '#ffffff';

  return (
    <div
      className="rounded border border-gray-200 flex-shrink-0 overflow-hidden"
      style={{ width: THUMB_W, height: THUMB_H, backgroundColor: bgColor }}
    >
      <div
        // 内层走真机视口尺寸 + 缩放，让 SchemaRenderer 看到的父高度与正常画布一致，
        // 避免 root 节点 minHeight:100% 在缩略图里失效。
        style={{
          width: vpW,
          height: vpH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
          // SchemaRenderer 的 wrapper 是 flex:1，需要父级是 flex column 才能撑满。
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SchemaRenderer
          screen={screen}
          assets={project?.componentAssets ?? []}
          staticAssetOrigin={getEditorStaticAssetOrigin()}
          hideGhostNodes
          editorCanvasOptimize={false}
        />
      </div>
    </div>
  );
});

type DropIndicator = { targetId: string; edge: 'before' | 'after' };

/**
 * Task 1.6.17 — PageList
 * Screen list with thumbnails, CRUD, drag reorder, active page highlight.
 */
export const NewPageList = observer(function NewPageList() {
  const project = editorStore.project;
  const screens = project?.screens ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  const dragSourceIdRef = useRef<string | null>(null);
  const dragTargetIdRef = useRef<string | null>(null);

  const activeScreenId = editorStore.activeScreenId;

  const clearDragState = useCallback(() => {
    dragSourceIdRef.current = null;
    dragTargetIdRef.current = null;
    setDropIndicator(null);
  }, []);

  const handleSelect = useCallback((screenId: string) => {
    editorStore.execute({ type: 'screen.setActive', params: { screenId } });
  }, []);

  const handleAdd = useCallback(() => {
    const name = `页面 ${screens.length + 1}`;
    editorStore.execute({ type: 'screen.add', params: { name } });
  }, [screens.length]);

  const handleDelete = useCallback(
    (screenId: string) => {
      if (screens.length <= 1) return;
      editorStore.execute({ type: 'screen.remove', params: { screenId } });
    },
    [screens.length],
  );

  const handleDoubleClick = useCallback((screenId: string, name: string) => {
    setEditingId(screenId);
    setEditValue(name);
  }, []);

  const handleRename = useCallback(
    (screenId: string) => {
      if (editValue.trim()) {
        editorStore.execute({
          type: 'screen.rename',
          params: { screenId, name: editValue.trim() },
        });
      }
      setEditingId(null);
    },
    [editValue],
  );

  const updateDropIndicatorFromEvent = useCallback(
    (screenId: string, el: HTMLElement, clientY: number) => {
      const sourceId = dragSourceIdRef.current;
      if (!sourceId) return;

      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const placement = clientY < mid ? 'before' : 'after';
      dragTargetIdRef.current = screenId;
      setDropIndicator((prev) => {
        if (prev?.targetId === screenId && prev.edge === placement) return prev;
        return { targetId: screenId, edge: placement };
      });
    },
    [],
  );

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">页面</span>
        <button
          className="text-xs text-blue-500 hover:text-blue-600 px-1"
          onClick={handleAdd}
        >
          + 添加
        </button>
      </div>

      {/* Screen list */}
      <div className="space-y-1">
        {screens.map((screen) => (
          <div key={screen.id} className="relative">
            {dropIndicator?.targetId === screen.id && dropIndicator.edge === 'before' ? (
              <div
                className="absolute left-0 right-0 top-0 z-10 h-0.5 rounded-full bg-blue-500 pointer-events-none -translate-y-1"
                aria-hidden
              />
            ) : null}
            <div
              role="listitem"
              draggable
              className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                screen.id === activeScreenId
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
              onClick={() => handleSelect(screen.id)}
              onDoubleClick={() => handleDoubleClick(screen.id, screen.name)}
              onDragStart={(e) => {
                dragSourceIdRef.current = screen.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', screen.id);
              }}
              onDragEnd={() => {
                clearDragState();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                updateDropIndicatorFromEvent(screen.id, e.currentTarget, e.clientY);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragTargetIdRef.current === screen.id) {
                    dragTargetIdRef.current = null;
                    setDropIndicator(null);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const sourceId = dragSourceIdRef.current ?? e.dataTransfer.getData('text/plain');
                const ind = dropIndicator;
                const rect = e.currentTarget.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const placement =
                  ind?.edge ?? (e.clientY < mid ? ('before' as const) : ('after' as const));
                const targetId = ind?.targetId ?? dragTargetIdRef.current ?? screen.id;
                clearDragState();
                if (!sourceId) return;
                const newIndex = computeReorderNewIndex(screens, sourceId, targetId, placement);
                editorStore.execute({
                  type: 'screen.reorder',
                  params: { screenId: sourceId, newIndex },
                });
              }}
            >
              <PageThumbnail screen={screen} />

              {/* Name */}
              {editingId === screen.id ? (
                <input
                  draggable={false}
                  className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleRename(screen.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(screen.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  onClick={(ev) => ev.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-xs text-gray-700 truncate">{screen.name}</span>
              )}

              {/* Delete button */}
              {screens.length > 1 ? (
                <button
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-opacity"
                  draggable={false}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    handleDelete(screen.id);
                  }}
                >
                  ✕
                </button>
              ) : null}
            </div>
            {dropIndicator?.targetId === screen.id && dropIndicator.edge === 'after' ? (
              <div
                className="absolute left-0 right-0 bottom-0 z-10 h-0.5 rounded-full bg-blue-500 pointer-events-none translate-y-1"
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
});
