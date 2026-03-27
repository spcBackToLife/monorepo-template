import { useState } from 'react';
import { Button, Empty, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';
import { AddEventForm } from './AddEventForm';
import { formatAction } from './utils';
import './eventEditor.css';

export const EventEditorPanel = observer(function EventEditorPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const nodeId = editorStore.selectedNodeIds[0];

  if (!nodeId) {
    return <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const node = findNodeInScreens(editorStore.screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const handleRemove = (index: number) => {
    const result = editorStore.execute({
      type: 'removeEvent',
      params: { nodeId, eventIndex: index },
    });
    if (result.success) message.success('已删除事件');
  };

  return (
    <div>
      {node.events.length === 0 && !showAdd && (
        <Empty description="暂无交互事件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {node.events.map((ev, i) => (
        <div className="event-list-item" key={i}>
          <div className="event-list-item-info">
            <span className="event-trigger-tag">{ev.trigger}</span>
            <span>→</span>
            <span className="event-action-tag">{formatAction(ev.action)}</span>
          </div>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(i)}
          />
        </div>
      ))}

      {showAdd ? (
        <AddEventForm nodeId={nodeId} onDone={() => setShowAdd(false)} />
      ) : (
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={() => setShowAdd(true)}
          style={{ marginTop: 8 }}
        >
          添加事件
        </Button>
      )}
    </div>
  );
});
