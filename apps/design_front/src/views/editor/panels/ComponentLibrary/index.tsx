import { useState, useCallback, useRef, useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { observer } from 'mobx-react-lite';
import { resolveAssetUrl } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';
import { PropBindingsEditorModal } from './PropBindingsEditorModal';
import { ComponentAssetDetailModal } from './ComponentAssetDetailModal';

/**
 * Task 4.5.5–4.5.6 — Component Library Panel
 *
 * Floating panel for browsing and instantiating component templates.
 * Features: search, category filter, template grid, click-to-add.
 */

interface TemplateCard {
  id: string;
  name: string;
  category: string;
  propDefinitions: unknown[] | undefined;
  thumbnail?: string;
}

export const ComponentLibrary = observer(function ComponentLibrary({
  onClose,
  /** 嵌入 Modal 等容器内时使用相对布局，避免 fixed 错位 */
  embedded = false,
}: {
  onClose: () => void;
  embedded?: boolean;
}) {
  const { message } = AntdApp.useApp();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [bindingsTemplateId, setBindingsTemplateId] = useState<string | null>(null);
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);

  // Get templates from project
  const project = editorStore.project;
  const templates: TemplateCard[] = (
    project?.componentAssets ?? []
  ).map((t) => ({
    id: t.id,
    name: t.name ?? 'Unnamed',
    category: t.category ?? '未分类',
    propDefinitions: t.propDefinitions ?? [],
    thumbnail: t.thumbnail,
  }));

  // Derive categories
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  // Filter templates
  const filtered = templates.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('input, button, select')) return;
      setDragging(true);
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    },
    [position],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // Instantiate template
  const handleInstantiate = (templateId: string) => {
    const parentId = editorStore.selectedNodeIds[0];
    if (!parentId) {
      const screen = editorStore.activeScreen;
      if (!screen?.rootNode) {
        message.warning('请先选中一个容器节点');
        return;
      }
      // Use root node as fallback
      const rootId = (screen.rootNode as { id?: string })?.id;
      if (!rootId) {
        message.warning('请先选中一个容器节点');
        return;
      }
      editorStore.execute({
        type: 'instantiateTemplate',
        params: { templateId, parentId: rootId },
      });
      onClose();
      return;
    }

    const result = editorStore.execute({
      type: 'instantiateTemplate',
      params: { templateId, parentId },
    });

    if (result.success) {
      message.success('组件已添加');
      const createdId = result.affectedNodeIds[0];
      if (createdId) editorStore.select(createdId);
      onClose();
    } else {
      message.error(result.description);
    }
  };

  const rootClass = embedded
    ? 'relative w-full flex flex-col bg-white border border-gray-200 rounded-lg max-h-[min(500px,70vh)]'
    : 'fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl';
  const rootStyle = embedded
    ? undefined
    : {
        left: position.x,
        top: position.y,
        width: 360,
        maxHeight: 500,
      };

  return (
    <div className={rootClass} style={rootStyle}>
      {/* Header — 浮动模式可拖拽标题栏 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 select-none bg-gray-50 rounded-t-lg ${
          embedded ? '' : 'cursor-move'
        }`}
        onMouseDown={embedded ? undefined : handleMouseDown}
      >
        <span className="text-xs font-medium text-gray-700">组件库</span>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          onClick={onClose}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <input
          type="text"
          className="w-full h-7 px-2 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
          placeholder="搜索组件..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-1 px-3 py-1.5 border-b border-gray-100 overflow-x-auto">
          <button
            type="button"
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex-shrink-0 ${
              !activeCategory
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveCategory(null)}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex-shrink-0 ${
                activeCategory === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Template grid */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: 340 }}>
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-4">
            {templates.length === 0 ? '暂无组件模板' : '未找到匹配的组件'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((template) => {
              const propCount = Array.isArray(template.propDefinitions)
                ? template.propDefinitions.length
                : 0;
              const full = project?.componentAssets.find((t) => t.id === template.id);
              const bindCount = full?.propBindings?.length ?? 0;
              return (
                <div key={template.id} className="relative group">
                  <button
                    type="button"
                    draggable
                    className="w-full flex flex-col items-center gap-1.5 p-2 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all bg-white text-left"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-design-template-id', template.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => handleInstantiate(template.id)}
                  >
                    {/* Thumbnail placeholder */}
                    <div className="w-full h-16 bg-gray-50 rounded flex items-center justify-center">
                      {template.thumbnail ? (
                        <img
                          src={resolveAssetUrl(template.thumbnail)}
                          alt={template.name}
                          className="w-full h-full object-contain rounded"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate w-full text-center">
                      {template.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {propCount > 0 ? `${propCount} 属性` : ' '}
                      {bindCount > 0 ? ` · ${bindCount} 绑定` : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="absolute top-1 left-1 z-10 w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white/95 text-[11px] text-gray-600 hover:text-blue-600 hover:border-blue-300 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="资产详情 / 缩略图"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDetailTemplateId(template.id);
                    }}
                  >
                    ℹ
                  </button>
                  <button
                    type="button"
                    className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white/95 text-[11px] text-gray-600 hover:text-blue-600 hover:border-blue-300 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="编辑 Prop 绑定 (propBindings)"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setBindingsTemplateId(template.id);
                    }}
                  >
                    ⚙
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PropBindingsEditorModal
        templateId={bindingsTemplateId}
        open={bindingsTemplateId !== null}
        onClose={() => setBindingsTemplateId(null)}
      />
      <ComponentAssetDetailModal
        templateId={detailTemplateId}
        open={detailTemplateId !== null}
        onClose={() => setDetailTemplateId(null)}
      />
    </div>
  );
});
