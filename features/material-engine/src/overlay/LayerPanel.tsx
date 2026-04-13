/**
 * LayerPanel — 图层面板
 *
 * 位于画布区域下方（画布和底部工具栏之间），可折叠。
 * 从 MaterialEditorContext 读取对象列表，支持：
 *   - 图层选中（点击 → setSelected）
 *   - 可见性切换（me:setVisibility）
 *   - 锁定切换（me:setLock）
 *   - 上移/下移（me:reorderObject）
 *   - 删除（me:removeObject）
 *   - 重命名（me:renameObject）
 *
 * ┌───────────────────────────────────┐
 * │ 图层  (3)                    ▲   │
 * ├───────────────────────────────────┤
 * │ □ 矩形 1           👁 🔒 ▲ ▼   │
 * │ ○ 椭圆 1           👁 🔒 ▲ ▼   │
 * │ T 文字 1            👁 🔒 ▲ ▼   │
 * └───────────────────────────────────┘
 */
import { useState, useCallback } from 'react';
import { useMaterialEditor } from '../context/MaterialEditorContext';

interface LayerPanelProps {
  /** 初始折叠状态 */
  defaultCollapsed?: boolean;
}

/** 图层类型图标映射 */
const TYPE_ICONS: Record<string, string> = {
  rect: '□',
  ellipse: '○',
  circle: '○',
  polygon: '⬡',
  star: '★',
  line: '╱',
  path: '〰',
  textbox: 'T',
  image: '🖼',
  group: '📦',
};

export function LayerPanel({ defaultCollapsed = false }: LayerPanelProps) {
  const { state, execute, setSelected } = useMaterialEditor();
  const { project, selectedIds } = state;
  const { objects } = project;

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // 图层列表从上到下显示（堆叠顺序：上面的图层在最前面 = 数组最后）
  const reversedObjects = [...objects].reverse();

  const handleSelect = useCallback(
    (objId: string) => {
      setSelected([objId]);
    },
    [setSelected],
  );

  const handleToggleVisibility = useCallback(
    (objId: string, currentVisible: boolean) => {
      execute({
        type: 'me:setVisibility',
        params: { objectId: objId, visible: !currentVisible },
      });
    },
    [execute],
  );

  const handleToggleLock = useCallback(
    (objId: string, currentLocked: boolean) => {
      execute({
        type: 'me:setLock',
        params: { objectId: objId, locked: !currentLocked },
      });
    },
    [execute],
  );

  const handleMoveUp = useCallback(
    (objId: string) => {
      const currentIndex = objects.findIndex((o) => o.id === objId);
      if (currentIndex < objects.length - 1) {
        execute({
          type: 'me:reorderObject',
          params: { objectId: objId, direction: 'forward' },
        });
      }
    },
    [objects, execute],
  );

  const handleMoveDown = useCallback(
    (objId: string) => {
      const currentIndex = objects.findIndex((o) => o.id === objId);
      if (currentIndex > 0) {
        execute({
          type: 'me:reorderObject',
          params: { objectId: objId, direction: 'backward' },
        });
      }
    },
    [objects, execute],
  );

  const handleDelete = useCallback(
    (objId: string) => {
      execute({ type: 'me:removeObject', params: { objectId: objId } });
    },
    [execute],
  );

  const handleStartRename = useCallback(
    (objId: string, currentName: string) => {
      setEditingId(objId);
      setEditingName(currentName);
    },
    [],
  );

  const handleFinishRename = useCallback(() => {
    if (editingId && editingName.trim()) {
      execute({
        type: 'me:renameObject',
        params: { objectId: editingId, name: editingName.trim() },
      });
    }
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, execute]);

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
      {/* 面板头部 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          background: '#f9fafb',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>
            {collapsed ? '▸' : '▾'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#4b5563' }}>
            图层
          </span>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>
            ({objects.length})
          </span>
        </div>
      </div>

      {/* 图层列表 */}
      {!collapsed && (
        <div style={{ maxHeight: 160, overflowY: 'auto' }}>
          {objects.length === 0 && (
            <div style={{ fontSize: 10, color: '#9ca3af', padding: '12px 0', textAlign: 'center' }}>
              暂无图形，使用工具绘制
            </div>
          )}

          {reversedObjects.map((obj) => {
            const isSelected = selectedIds.includes(obj.id);

            return (
              <div
                key={obj.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 12px',
                  fontSize: 10,
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : undefined,
                  borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                }}
                onClick={() => handleSelect(obj.id)}
              >
                {/* 类型图标 */}
                <span style={{ width: 16, textAlign: 'center', color: '#9ca3af', flexShrink: 0, fontSize: 11 }}>
                  {TYPE_ICONS[obj.type] ?? '◆'}
                </span>

                {/* 名称（可编辑） */}
                {editingId === obj.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      border: '1px solid #3b82f6',
                      borderRadius: 2,
                      padding: '0 4px',
                      fontSize: 10,
                      outline: 'none',
                      minWidth: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: '#374151',
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(obj.id, obj.name);
                    }}
                  >
                    {obj.name}
                  </span>
                )}

                {/* 操作按钮 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {/* 可见性 */}
                  <button
                    type="button"
                    title={obj.visible ? '隐藏' : '显示'}
                    style={{
                      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: obj.visible ? '#9ca3af' : '#ef4444', fontSize: 10,
                    }}
                    onClick={(e) => { e.stopPropagation(); handleToggleVisibility(obj.id, obj.visible); }}
                  >
                    {obj.visible ? '👁' : '🚫'}
                  </button>

                  {/* 锁定 */}
                  <button
                    type="button"
                    title={obj.locked ? '解锁' : '锁定'}
                    style={{
                      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: obj.locked ? '#f59e0b' : '#9ca3af', fontSize: 10,
                    }}
                    onClick={(e) => { e.stopPropagation(); handleToggleLock(obj.id, obj.locked); }}
                  >
                    {obj.locked ? '🔒' : '🔓'}
                  </button>

                  {/* 上移（堆叠顺序上移 = 数组中后移） */}
                  <button
                    type="button"
                    title="上移"
                    style={{
                      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: '#9ca3af', fontSize: 9,
                    }}
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(obj.id); }}
                  >
                    ▲
                  </button>

                  {/* 下移 */}
                  <button
                    type="button"
                    title="下移"
                    style={{
                      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: '#9ca3af', fontSize: 9,
                    }}
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(obj.id); }}
                  >
                    ▼
                  </button>

                  {/* 删除 */}
                  <button
                    type="button"
                    title="删除"
                    style={{
                      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: '#d1d5db', fontSize: 9,
                    }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(obj.id); }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#d1d5db'; }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
