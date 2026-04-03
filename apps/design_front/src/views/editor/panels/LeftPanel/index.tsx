import { useRef, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { NewNodeTree } from '../NodeTree';
import { NewPageList } from '../PageList';

/**
 * Task 1.4.7 — Left Panel
 * Split into top (NodeTree) and bottom (PageList) with draggable horizontal splitter.
 */
export const LeftPanel = observer(function LeftPanel() {
  const [splitRatio, setSplitRatio] = useState(0.6); // 60% tree, 40% pages
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (me: MouseEvent) => {
      if (!dragging.current || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const ratio = (me.clientY - rect.top) / rect.height;
      setSplitRatio(Math.min(0.85, Math.max(0.15, ratio)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div ref={panelRef} className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* W1-011：上 — 节点树（标题与搜索在 NewNodeTree 内，避免重复） */}
      <div className="flex flex-col min-h-0 border-b border-gray-100" style={{ height: `${splitRatio * 100}%` }}>
        {/* 仅由 NodeTree 内虚拟列表容器滚动，避免双滚动条与虚拟高度错位（W7-021） */}
        <div className="flex-1 min-h-0 flex flex-col">
          <NewNodeTree />
        </div>
      </div>

      <div
        className="flex-shrink-0 h-1 hover:h-1.5 bg-gray-100 hover:bg-blue-400 cursor-row-resize transition-colors"
        onMouseDown={handleSplitterMouseDown}
        aria-hidden
      />

      {/* 下 — 页面列表 */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-500 tracking-wide">页面</div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <NewPageList />
        </div>
      </div>
    </div>
  );
});
