import { useState } from 'react';
import { Button, Form, Input, Select, Space, message } from 'antd';
import type { EventTrigger } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

interface Props {
  nodeId: string;
  onDone: () => void;
}

const TRIGGERS: { label: string; value: EventTrigger }[] = [
  { label: 'Click', value: 'click' },
  { label: 'Hover', value: 'hover' },
  { label: 'Focus', value: 'focus' },
  { label: 'Blur', value: 'blur' },
  { label: 'Long Press', value: 'longPress' },
];

const ACTION_TYPES = [
  { label: '跳转页面', value: 'navigate' },
  { label: '设置状态', value: 'setState' },
  { label: '打开链接', value: 'openUrl' },
];

export function AddEventForm({ nodeId, onDone }: Props) {
  const [trigger, setTrigger] = useState<EventTrigger>('click');
  const [actionType, setActionType] = useState('navigate');
  const [targetScreenId, setTargetScreenId] = useState('new');
  const [url, setUrl] = useState('');
  const [stateName, setStateName] = useState('');

  const screens = editorStore.screens;

  const handleAdd = () => {
    if (actionType === 'navigate') {
      // 4B.19: addNavigation to "new" auto-creates a Screen
      const result = editorStore.execute({
        type: 'addNavigation',
        params: { nodeId, trigger, targetScreenId },
      });
      if (result.success) message.success('已添加导航事件');
    } else if (actionType === 'openUrl') {
      editorStore.execute({
        type: 'addEvent',
        params: { nodeId, event: { trigger, action: { type: 'openUrl', url } } },
      });
    } else if (actionType === 'setState') {
      editorStore.execute({
        type: 'addEvent',
        params: {
          nodeId,
          event: { trigger, action: { type: 'setState', targetId: nodeId, state: stateName } },
        },
      });
    }
    onDone();
  };

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginTop: 8 }}>
      <Form layout="vertical" size="small">
        <Form.Item label="触发方式">
          <Select value={trigger} onChange={setTrigger} options={TRIGGERS} />
        </Form.Item>

        <Form.Item label="动作类型">
          <Select value={actionType} onChange={setActionType} options={ACTION_TYPES} />
        </Form.Item>

        {actionType === 'navigate' && (
          <Form.Item label="目标页面">
            <Select
              value={targetScreenId}
              onChange={setTargetScreenId}
              options={[
                { label: '+ 新建页面', value: 'new' },
                ...screens.map((s) => ({ label: s.name, value: s.id })),
              ]}
            />
          </Form.Item>
        )}

        {actionType === 'openUrl' && (
          <Form.Item label="链接地址">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </Form.Item>
        )}

        {actionType === 'setState' && (
          <Form.Item label="状态名">
            <Input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="hover" />
          </Form.Item>
        )}

        <Space>
          <Button type="primary" onClick={handleAdd}>确认</Button>
          <Button onClick={onDone}>取消</Button>
        </Space>
      </Form>
    </div>
  );
}
