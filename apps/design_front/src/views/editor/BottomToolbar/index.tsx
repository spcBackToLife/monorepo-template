import { App as AntdApp, Tabs } from 'antd';
import { getPrimitiveCategories, getPrimitivesByCategory } from '@globallink/design-schema';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import './bottomToolbar.css';

export const BottomToolbar = observer(function BottomToolbar() {
  const { message } = AntdApp.useApp();
  const categories = getPrimitiveCategories();

  const addDirect = (tag: string) => {
    const screen = editorStore.activeScreen;
    if (!screen) return;
    const parentId = editorStore.selectedNodeIds[0] ?? screen.rootNode.id;
    const result = editorStore.execute({
      type: 'addElement',
      params: { parentId, tag: tag as never },
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
    <div className="bottom-toolbar">
      <Tabs
        size="small"
        items={categories.map((cat) => ({
          key: cat,
          label: cat,
          children: (
            <div className="bottom-grid">
              {getPrimitivesByCategory(cat).map((p) => (
                <div
                  key={p.type}
                  className="bottom-item"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('application/x-design-tag', p.type)}
                  onDoubleClick={() => addDirect(p.type)}
                >
                  <span className="bottom-item-tag">&lt;{p.type}&gt;</span>
                  <span>{p.label}</span>
                </div>
              ))}
            </div>
          ),
        }))}
      />
      <div className="bottom-tip">拖拽元素到画布放下，或双击快速插入到选中容器</div>
    </div>
  );
});

