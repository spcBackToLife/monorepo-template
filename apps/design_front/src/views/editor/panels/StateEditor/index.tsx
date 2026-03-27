import { useState } from 'react';
import { Button, Empty, Input, Space, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';
import './stateEditor.css';

export const StateEditorPanel = observer(function StateEditorPanel() {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const nodeId = editorStore.selectedNodeIds[0];

  if (!nodeId) {
    return <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const node = findNodeInScreens(editorStore.screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const handleActivate = (stateName: string) => {
    editorStore.execute({ type: 'setActiveState', params: { nodeId, stateName } });
  };

  const handleRemove = (stateName: string) => {
    const result = editorStore.execute({ type: 'removeState', params: { nodeId, stateName } });
    if (result.success) message.success(`已删除状态 "${stateName}"`);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const result = editorStore.execute({
      type: 'addState',
      params: { nodeId, stateName: newName.trim() },
    });
    if (result.success) {
      message.success(`已添加状态 "${newName.trim()}"`);
      setNewName('');
      setAdding(false);
    }
  };

  return (
    <div>
      {/* Default state */}
      <div
        className={`state-item ${node.activeState === 'default' ? 'state-item-active' : ''}`}
        onClick={() => handleActivate('default')}
      >
        <span className="state-item-name">default</span>
        <Tag color="blue" style={{ marginRight: 0 }}>基础</Tag>
      </div>

      {/* Custom states */}
      {node.states.map((s) => (
        <div
          key={s.name}
          className={`state-item ${node.activeState === s.name ? 'state-item-active' : ''}`}
          onClick={() => handleActivate(s.name)}
        >
          <span className="state-item-name">{s.name}</span>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => { e.stopPropagation(); handleRemove(s.name); }}
          />
        </div>
      ))}

      {/* Add state */}
      {adding ? (
        <Space style={{ marginTop: 8 }}>
          <Input
            size="small"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如: hover"
            onPressEnter={handleAdd}
            autoFocus
          />
          <Button size="small" type="primary" onClick={handleAdd}>确认</Button>
          <Button size="small" onClick={() => { setAdding(false); setNewName(''); }}>取消</Button>
        </Space>
      ) : (
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={() => setAdding(true)}
          style={{ marginTop: 8 }}
        >
          添加状态
        </Button>
      )}
    </div>
  );
});
