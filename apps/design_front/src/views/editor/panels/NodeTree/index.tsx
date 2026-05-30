import { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { App as AntdApp, Input, Empty } from 'antd';
import { observer } from 'mobx-react-lite';
import type { ComponentNode } from '@globallink/design-schema';
import { findNodeById, isNodeOrAncestorLocked } from '@globallink/design-operations';
import { useVirtualizer } from '@tanstack/react-virtual';
import { editorStore } from '@/stores/editor';
import {
  buildEditorContextMenuItems,
  EditorContextMenuPortal,
  handleEditorContextMenuClick,
  preloadMaterialSlots,
} from '../../EditorContextMenu';
import './nodeTreePanel.css';

/** v2.1 列表绑定标记：`node.repeat` 是 { expression, template } 对象 */
function hasListRepeat(node: ComponentNode): boolean {
  const r = node.repeat;
  if (!r || typeof r !== 'object') return false;
  return typeof r.expression === 'string' && r.expression.trim() !== '';
}

/**
 * 节点显示名（图层树 / 搜索 / 编辑共用）。
 * 与 schema 契约一致（features/design-schema/src/types/node.ts）：priority: label > name > type。
 * label 是用户面向的中文显示名，name 是代码标识（PascalCase）。
 */
function getNodeDisplayName(node: ComponentNode): string {
  return node.label ?? node.name ?? node.id.slice(0, 6);
}

/** W7-021：虚拟行高（与 py-0.5 + text-xs 行大致一致） */
const ROW_HEIGHT = 28;

interface FlatRow {
  node: ComponentNode;
  depth: number;
}

/** 与原先递归 Tree 的搜索语义一致：自身或任一后代匹配则保留子树 */
function subtreeMatchesSearch(node: ComponentNode, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  // 搜索同时匹配 label（中文显示名）和 name（代码标识）—— 用户两种都可能输
  const label = node.label ?? '';
  const name = node.name ?? '';
  if (
    label.toLowerCase().includes(t) ||
    name.toLowerCase().includes(t) ||
    node.type.toLowerCase().includes(t)
  ) return true;
  return (node.children ?? []).some((c) => subtreeMatchesSearch(c, term));
}

/** 按展开状态 DFS 展平为可见行（仅渲染视口内行） */
function flattenVisibleRows(
  root: ComponentNode,
  collapsed: Set<string>,
  searchTerm: string,
  filterType: string,
): FlatRow[] {
  const term = searchTerm.trim();
  const out: FlatRow[] = [];
  // v2.1：节点的逻辑子节点 = children ∪ repeat.template
  const logicalChildren = (n: ComponentNode): ComponentNode[] => {
    const arr: ComponentNode[] = [];
    if (n.children) arr.push(...n.children);
    if (n.repeat?.template) arr.push(n.repeat.template);
    return arr;
  };
  function walk(node: ComponentNode, depth: number) {
    if (term && !subtreeMatchesSearch(node, term)) return;
    if (filterType && node.type !== filterType && depth > 0) {
      for (const c of logicalChildren(node)) walk(c, depth + 1);
      return;
    }
    out.push({ node, depth });
    if (collapsed.has(node.id)) return;
    for (const c of logicalChildren(node)) walk(c, depth + 1);
  }
  walk(root, 0);
  return out;
}

/**
 * Task 1.6.12-1.6.16 — Node Tree (Enhanced)
 * Recursive tree rendering with:
 * - Click to select (syncs with canvas)
 * - Collapse/expand
 * - Type icons
 * - Double-click inline rename
 * - Drag reorder
 * - Search filter
 * - Lock/visible buttons
 */

// ── Type icon map ──
const TYPE_ICONS: Record<string, string> = {
  div: '◻',
  span: 'T',
  img: '🖼',
  button: '⬜',
  input: '▢',
  a: '🔗',
  ul: '≡',
  li: '•',
  form: '📋',
  video: '▶',
  annotation: '💬',
  default: '◇',
};

function getTypeIcon(type: string): string {
  if (type.startsWith('component:')) return '⚙';
  return TYPE_ICONS[type] ?? TYPE_ICONS.default;
}

type DropPosition = 'before' | 'after' | 'inside' | null;

interface TreeRowProps {
  node: ComponentNode;
  depth: number;
  collapsed: Set<string>;
  toggleCollapse: (id: string, recursive?: boolean) => void;
  editingId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  beginRename: (node: ComponentNode) => void;
  commitRename: (node: ComponentNode) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: DropPosition) => void;
  onDrop: () => void;
  dropTarget: { id: string; position: DropPosition } | null;
  treeRoot: ComponentNode;
  toggleLock: (node: ComponentNode) => void;
  toggleHidden: (node: ComponentNode) => void;
  /** 选中节点的祖先 id（用于 3.3 祖先浅条） */
  ancestorOfSelectedIds: Set<string>;
  onRowContextMenu?: (nodeId: string, clientX: number, clientY: number) => void;
}

const TreeRow = observer(function TreeRow({
  node,
  depth,
  collapsed,
  toggleCollapse,
  editingId,
  editingName,
  setEditingName,
  beginRename,
  commitRename,
  onDragStart,
  onDragOver,
  onDrop,
  dropTarget,
  treeRoot,
  toggleLock,
  toggleHidden,
  ancestorOfSelectedIds,
  onRowContextMenu,
}: TreeRowProps) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const isSelected = editorStore.selectedNodeIds.includes(node.id);
  const isAncestorOfSelected = !isSelected && ancestorOfSelectedIds.has(node.id);
  const isHovered = editorStore.hoveredNodeId === node.id;
  const isLocked = isNodeOrAncestorLocked(treeRoot, node.id);
  const isHidden = !node.visible;
  const displayName = getNodeDisplayName(node);

  return (
    <div
        data-node-tree-id={node.id}
        className={`node-tree-row relative flex items-center gap-0.5 px-1 py-0.5 cursor-pointer group text-xs transition-colors ${
          isSelected
            ? 'node-tree-row--selected text-blue-800'
            : isAncestorOfSelected
              ? 'node-tree-row--ancestor text-gray-800'
              : isHovered
                ? 'bg-gray-50'
                : 'hover:bg-gray-50'
        } ${isHidden ? 'opacity-40' : ''}`}
        style={{ paddingLeft: `${Math.min(depth, 4) * 16 + Math.max(0, depth - 4) * 8 + 4}px` }}
        onClick={(e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            editorStore.toggleSelect(node.id);
          } else {
            editorStore.select(node.id);
          }
        }}
        onMouseEnter={() => editorStore.setHovered(node.id)}
        onMouseLeave={() => editorStore.setHovered(null)}
        onDoubleClick={() => beginRename(node)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRowContextMenu?.(node.id, e.clientX, e.clientY);
        }}
        draggable={!isLocked}
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(node.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const quarter = rect.height / 4;
          let pos: DropPosition = 'inside';
          if (y < quarter) pos = 'before';
          else if (y > rect.height - quarter) pos = 'after';
          onDragOver(node.id, pos);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop();
        }}
      >
        {/* Drop indicator */}
        {dropTarget?.id === node.id && dropTarget.position === 'before' && (
          <div className="absolute left-4 right-2 top-0 h-0.5 bg-blue-500 rounded pointer-events-none" />
        )}
        {dropTarget?.id === node.id && dropTarget.position === 'after' && (
          <div className="absolute left-4 right-2 bottom-0 h-0.5 bg-blue-500 rounded pointer-events-none" />
        )}
        {dropTarget?.id === node.id && dropTarget.position === 'inside' && (
          <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded pointer-events-none" />
        )}

        {/* Collapse toggle */}
        <span
          className={`w-3 text-center flex-shrink-0 text-gray-400 ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleCollapse(node.id, e.altKey);
          }}
        >
          {hasChildren ? (isCollapsed ? '▸' : '▾') : ' '}
        </span>

        {/* Type icon */}
        <span className="w-4 text-center flex-shrink-0 text-gray-400">{getTypeIcon(node.type)}</span>

        {/* Name / rename input */}
        {editingId === node.id ? (
          <Input
            size="small"
            className="flex-1 h-5 text-xs"
            value={editingName}
            autoFocus
            onChange={(e) => setEditingName(e.target.value)}
            onPressEnter={() => commitRename(node)}
            onBlur={() => commitRename(node)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate" title={node.name ? `${displayName} · ${node.name}` : displayName}>{displayName}</span>
        )}

        {hasListRepeat(node) && (
          <span className="flex-shrink-0 text-[10px] text-cyan-600 font-mono px-0.5" title="列表绑定 (node.repeat)">
            ≡
          </span>
        )}

        {/* Lock / visible buttons (visible on hover) */}
        <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className={`w-4 h-4 text-[10px] rounded hover:bg-gray-200 ${isLocked ? 'text-red-400' : 'text-gray-400'}`}
            onClick={(e) => { e.stopPropagation(); toggleLock(node); }}
            title={isLocked ? '解锁' : '锁定'}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
          <button
            type="button"
            className={`w-4 h-4 text-[10px] rounded hover:bg-gray-200 ${isHidden ? 'text-red-400' : 'text-gray-400'}`}
            onClick={(e) => { e.stopPropagation(); toggleHidden(node); }}
            title={isHidden ? '显示' : '隐藏'}
          >
            {isHidden ? '👁‍🗨' : '👁'}
          </button>
        </span>
      </div>
  );
});

/** 从 root 到 targetId 的路径 [root, …, target]；未找到返回 null */
function findPathFromRoot(root: ComponentNode, targetId: string): string[] | null {
  if (root.id === targetId) return [root.id];
  for (const c of root.children ?? []) {
    const sub = findPathFromRoot(c, targetId);
    if (sub) return [root.id, ...sub];
  }
  return null;
}

/** 产品 08-layer-tree 3.3：选中子节点时，祖先行左侧浅蓝提示 */
function ancestorsOfSelectedNodes(
  node: ComponentNode,
  selected: Set<string>,
  ancestorPath: string[],
): Set<string> {
  const out = new Set<string>();
  if (selected.has(node.id)) {
    ancestorPath.forEach((id) => out.add(id));
  }
  for (const c of node.children ?? []) {
    const sub = ancestorsOfSelectedNodes(c, selected, [...ancestorPath, node.id]);
    sub.forEach((id) => out.add(id));
  }
  return out;
}

export const NewNodeTree = observer(function NewNodeTree() {
  const { message } = AntdApp.useApp();
  const screen = editorStore.activeScreen;
  const [treeContextMenu, setTreeContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const treeContextMenuRef = useRef(treeContextMenu);
  useEffect(() => {
    treeContextMenuRef.current = treeContextMenu;
  }, [treeContextMenu]);
  const selectedSet = useMemo(
    () => new Set(editorStore.selectedNodeIds),
    [editorStore.selectedNodeIds.join('|')],
  );
  const ancestorOfSelectedIds = useMemo(() => {
    if (!screen) return new Set<string>();
    return ancestorsOfSelectedNodes(screen.rootNode, selectedSet, []);
  }, [screen, selectedSet]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const dragSourceId = useRef<string | null>(null);
  const dragTargetId = useRef<string | null>(null);
  const dragTargetPos = useRef<DropPosition>(null);
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition } | null>(null);
  const treeScrollRef = useRef<HTMLDivElement>(null);

  const projectUpdatedAt = editorStore.project?.updatedAt;
  const normalizedSearch = searchTerm.toLowerCase().trim();

  const flatRows = useMemo(
    () =>
      screen
        ? flattenVisibleRows(screen.rootNode, collapsed, normalizedSearch, filterType)
        : [],
    [screen, collapsed, normalizedSearch, filterType, projectUpdatedAt],
  );

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => treeScrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  /** 行内编辑等导致行高变化时重新测量，避免裁切 */
  useLayoutEffect(() => {
    virtualizer.measure();
  }, [editingId, flatRows.length, normalizedSearch, virtualizer]);

  const toggleCollapse = useCallback((id: string, recursive?: boolean) => {
    if (!recursive) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    const s = editorStore.activeScreen;
    if (!s) return;
    const node = findNodeById(s.rootNode, id);
    if (!node) return;
    const allIds: string[] = [];
    const collectIds = (n: ComponentNode) => {
      allIds.push(n.id);
      for (const c of n.children ?? []) collectIds(c);
    };
    collectIds(node);
    setCollapsed((prev) => {
      const next = new Set(prev);
      const shouldCollapse = !next.has(id);
      for (const nid of allIds) {
        if (shouldCollapse) next.add(nid);
        else next.delete(nid);
      }
      return next;
    });
  }, []);

  // 双击改的是 label（中文显示名）。name（PascalCase 代码标识）由 MCP / 程序化创建时定，UI 不直接改 name。
  // 进入编辑时优先编辑 label；若节点没 label 则把当前 name 当作初值，保存仍写到 label 字段。
  const beginRename = useCallback((node: ComponentNode) => {
    setEditingId(node.id);
    setEditingName(node.label ?? node.name ?? '');
  }, []);

  const commitRename = useCallback((node: ComponentNode) => {
    const next = editingName.trim();
    setEditingId(null);
    if (next === (node.label ?? '')) return;
    const result = editorStore.execute({
      type: 'element.rename',
      params: { nodeId: node.id, label: next },
    });
    if (!result.success) message.error(result.description);
  }, [editingName, message]);

  const toggleLock = useCallback((node: ComponentNode) => {
    const result = editorStore.execute({
      type: 'element.setLocked',
      params: { nodeId: node.id, locked: !node.locked },
    });
    if (!result.success) message.error(result.description);
  }, [message]);

  const toggleHidden = useCallback((node: ComponentNode) => {
    const result = editorStore.execute({
      type: 'element.setVisible',
      params: { nodeId: node.id, visible: !node.visible },
    });
    if (!result.success) message.error(result.description);
  }, [message]);

  const handleDragStart = useCallback((id: string) => {
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
    dragSourceId.current = id;
  }, []);

  const handleDragOver = useCallback(
    (id: string, position: DropPosition) => {
      dragTargetId.current = id;
      dragTargetPos.current = position;
      setDropTarget({ id, position });

      if (autoExpandTimer.current) {
        clearTimeout(autoExpandTimer.current);
        autoExpandTimer.current = null;
      }
      if (position === 'inside' && collapsed.has(id)) {
        autoExpandTimer.current = setTimeout(() => {
          autoExpandTimer.current = null;
          setCollapsed((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 600);
      }
    },
    [collapsed],
  );

  const handleRowContextMenu = useCallback((nodeId: string, clientX: number, clientY: number) => {
    // 先预加载素材槽位数据再展示菜单（确保已有素材能显示）
    void preloadMaterialSlots(nodeId).finally(() => {
      setTreeContextMenu({ x: clientX, y: clientY, nodeId });
    });
  }, []);

  /** W1-014：画布或其它地方选中节点时，展开祖先并使行滚动到可见区 */
  useEffect(() => {
    const selectedId = editorStore.selectedNodeIds[0];
    if (!selectedId || !screen) return;

    const path = findPathFromRoot(screen.rootNode, selectedId);
    if (!path?.length) return;

    setCollapsed((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const ancestorId of path.slice(0, -1)) {
        if (next.has(ancestorId)) {
          next.delete(ancestorId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [editorStore.selectedNodeIds.join('|'), screen?.id]);

  useEffect(() => {
    const selectedId = editorStore.selectedNodeIds[0];
    if (!selectedId || !screen) return;
    const idx = flatRows.findIndex((r) => r.node.id === selectedId);
    if (idx < 0) return;
    const id = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(idx, { align: 'auto', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [editorStore.selectedNodeIds.join('|'), flatRows, screen?.id, virtualizer, collapsed]);

  const handleDrop = useCallback(() => {
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
    const sourceId = dragSourceId.current;
    const targetId = dragTargetId.current;
    const pos = dragTargetPos.current;
    dragSourceId.current = null;
    dragTargetId.current = null;
    dragTargetPos.current = null;
    setDropTarget(null);
    if (!sourceId || !targetId || sourceId === targetId || !screen) return;

    if (pos === 'inside') {
      const result = editorStore.execute({
        type: 'element.move',
        params: { elementId: sourceId, newParentId: targetId, position: 0 },
      });
      if (!result.success) message.error(result.description);
    } else {
      const parentRow = flatRows.find((r) =>
        (r.node.children ?? []).some((c) => c.id === targetId)
      );
      const parentId = parentRow?.node.id ?? screen.rootNode.id;
      const parentNode = parentRow?.node ?? screen.rootNode;
      const siblings = parentNode.children ?? [];
      let idx = siblings.findIndex((c) => c.id === targetId);
      if (pos === 'after') idx += 1;
      const result = editorStore.execute({
        type: 'element.move',
        params: { elementId: sourceId, newParentId: parentId, position: Math.max(0, idx) },
      });
      if (!result.success) message.error(result.description);
    }
  }, [message, screen, flatRows]);

  if (!screen) {
    return <Empty description="暂无节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-700 flex-shrink-0">节点树</span>
        <Input
          size="small"
          placeholder="搜索..."
          className="flex-1 h-5 text-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
        <select
          className="h-5 text-[10px] border border-gray-200 rounded px-1 bg-white flex-shrink-0"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">全部</option>
          <option value="div">div</option>
          <option value="span">span</option>
          <option value="button">button</option>
          <option value="img">img</option>
          <option value="input">input</option>
          <option value="a">a</option>
          <option value="annotation">annotation</option>
        </select>
      </div>

      {/* Tree — W7-021：虚拟列表，大量节点时仅挂载视口附近行 */}
      <div ref={treeScrollRef} className="flex-1 min-h-0 overflow-y-auto py-0.5">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const row = flatRows[vi.index];
            if (!row) return null;
            return (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <TreeRow
                  node={row.node}
                  depth={row.depth}
                  collapsed={collapsed}
                  toggleCollapse={toggleCollapse}
                  editingId={editingId}
                  editingName={editingName}
                  setEditingName={setEditingName}
                  beginRename={beginRename}
                  commitRename={commitRename}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  dropTarget={dropTarget}
                  treeRoot={screen.rootNode}
                  toggleLock={toggleLock}
                  toggleHidden={toggleHidden}
                  ancestorOfSelectedIds={ancestorOfSelectedIds}
                  onRowContextMenu={handleRowContextMenu}
                />
              </div>
            );
          })}
        </div>
      </div>
      <EditorContextMenuPortal
        open={treeContextMenu !== null}
        x={treeContextMenu?.x ?? 0}
        y={treeContextMenu?.y ?? 0}
        items={buildEditorContextMenuItems(
          treeContextMenu?.nodeId ?? null,
          screen.rootNode.id,
        )}
        onClose={() => setTreeContextMenu(null)}
        onMenuClick={({ key }) =>
          handleEditorContextMenuClick(
            String(key),
            treeContextMenuRef.current?.nodeId ?? null,
            screen.rootNode.id,
            message,
          )
        }
      />
    </div>
  );
});
