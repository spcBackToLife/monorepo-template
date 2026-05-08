import { Typography, Collapse, Empty, message } from 'antd';
import { observer } from 'mobx-react-lite';
import {
  generateNodeId,
  getPrimitiveCategories,
  getPrimitivesByCategory,
  type PrimitiveNodeType,
} from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { SaveTemplateButton } from '../SaveTemplate';
import './addElement.css';

const CATEGORY_LABELS: Record<string, string> = {
  layout: '布局',
  text: '文本',
  form: '表单',
  media: '媒体',
  list: '列表',
  navigation: '导航',
};

export const AddElementPanel = observer(function AddElementPanel() {
  const handleAdd = (tag: string) => {
    const screen = editorStore.activeScreen;
    if (!screen) return;
    // Add to root node of active screen
    const parentId = screen.rootNode.id;
    const result = editorStore.execute({
      type: 'element.add',
      params: { parentId, tag: tag as PrimitiveNodeType, elementId: generateNodeId() },
    });
    if (result.success) {
      const createdNodeId = result.affectedNodeIds[0] ?? null;
      editorStore.select(createdNodeId);
      message.success(`已添加 ${tag}`);
    }
  };

  const categories = getPrimitiveCategories();

  return (
    <div>
      <Typography.Text strong style={{ fontSize: 13 }}>
        原子元素
      </Typography.Text>

      {categories.map((cat) => {
        const prims = getPrimitivesByCategory(cat);
        return (
          <div key={cat} style={{ marginTop: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {CATEGORY_LABELS[cat] ?? cat}
            </Typography.Text>
            <div className="add-el-grid" style={{ marginTop: 6 }}>
              {prims.map((p) => (
                <div key={p.type} className="add-el-item" onClick={() => handleAdd(p.type)}>
                  <span className="add-el-tag">&lt;{p.type}&gt;</span>
                  <span>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Typography.Text strong style={{ fontSize: 13, display: 'block', marginTop: 16 }}>
        组件资产
      </Typography.Text>
      <ComponentAssetList />

      <div style={{ marginTop: 16 }}>
        <SaveTemplateButton />
      </div>
    </div>
  );
});

/** Component asset list with scope collapse */
const ComponentAssetList = observer(function ComponentAssetList() {
  const assets = editorStore.project?.componentAssets ?? [];

  if (assets.length === 0) {
    return <Empty description="暂无组件资产" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 12 }} />;
  }

  const handleInstantiate = (templateId: string) => {
    const screen = editorStore.activeScreen;
    if (!screen) return;
    const result = editorStore.execute({
      type: 'asset.instantiateTemplate',
      params: { templateId, parentId: screen.rootNode.id },
    });
    if (result.success) {
      const createdNodeId = result.affectedNodeIds[0] ?? null;
      editorStore.select(createdNodeId);
      message.success('已添加组件');
    }
  };

  // Group by category
  const grouped = new Map<string, typeof assets>();
  for (const a of assets) {
    const list = grouped.get(a.category) ?? [];
    list.push(a);
    grouped.set(a.category, list);
  }

  return (
    <Collapse
      ghost
      size="small"
      style={{ marginTop: 8 }}
      items={Array.from(grouped.entries()).map(([cat, items]) => ({
        key: cat,
        label: cat,
        children: (
          <div className="add-el-grid">
            {items.map((t) => (
              <div key={t.id} className="add-el-item" onClick={() => handleInstantiate(t.id)}>
                <span style={{ fontSize: 12 }}>{t.name}</span>
              </div>
            ))}
          </div>
        ),
      }))}
    />
  );
});
