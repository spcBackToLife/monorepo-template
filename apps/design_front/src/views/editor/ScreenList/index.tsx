import { useState } from 'react';
import { Button, Input, message, Typography } from 'antd';
import { PlusOutlined, FileOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import './screenList.css';

export const ScreenList = observer(function ScreenList() {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const screens = editorStore.screens;

  const handleAddScreen = () => {
    if (!newName.trim()) return;
    const result = editorStore.execute({ type: 'addScreen', params: { name: newName.trim() } });
    if (result.success) {
      message.success('已添加页面');
      setNewName('');
      setAdding(false);
    }
  };

  return (
    <div className="screen-list">
      <Typography.Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
        页面列表
      </Typography.Text>

      {screens.map((s) => (
        <div
          key={s.id}
          className={`screen-list-item ${s.id === editorStore.activeScreenId ? 'screen-list-item-active' : ''}`}
          onClick={() => editorStore.setActiveScreen(s.id)}
        >
          <div className="screen-list-thumb">
            <FileOutlined />
          </div>
          <div className="screen-list-name">{s.name}</div>
        </div>
      ))}

      {adding ? (
        <div style={{ padding: '4px 0' }}>
          <Input
            size="small"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="页面名称"
            onPressEnter={handleAddScreen}
            autoFocus
          />
          <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
            <Button size="small" type="primary" onClick={handleAddScreen} block>确认</Button>
            <Button size="small" onClick={() => { setAdding(false); setNewName(''); }} block>取消</Button>
          </div>
        </div>
      ) : (
        <Button
          type="dashed"
          size="small"
          block
          icon={<PlusOutlined />}
          onClick={() => setAdding(true)}
        >
          新建页面
        </Button>
      )}
    </div>
  );
});
