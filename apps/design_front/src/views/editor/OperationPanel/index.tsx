import { Tabs } from 'antd';
import {
  FormatPainterOutlined,
  ThunderboltOutlined,
  SwitcherOutlined,
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { StyleEditorPanel } from '../panels/StyleEditor';
import { EventEditorPanel } from '../panels/EventEditor';
import { StateEditorPanel } from '../panels/StateEditor';
import './panel.css';

const items = [
  {
    key: 'style',
    label: '样式',
    icon: <FormatPainterOutlined />,
    children: <StyleEditorPanel />,
  },
  {
    key: 'event',
    label: '交互',
    icon: <ThunderboltOutlined />,
    children: <EventEditorPanel />,
  },
  {
    key: 'state',
    label: '状态',
    icon: <SwitcherOutlined />,
    children: <StateEditorPanel />,
  },
];

export const OperationPanel = observer(function OperationPanel() {
  return (
    <div className="op-panel">
      <Tabs items={items} size="small" centered />
    </div>
  );
});
