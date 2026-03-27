import { Select, Button, Typography } from 'antd';
import { ArrowLeftOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { ALL_VIEWPORTS } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import './toolbar.css';

export const Toolbar = observer(function Toolbar() {
  const navigate = useNavigate();
  const viewport = editorStore.currentViewport;

  const handleViewportChange = (name: string) => {
    const vp = ALL_VIEWPORTS.find((v) => v.name === name);
    if (vp) {
      editorStore.execute({ type: 'switchViewport', params: { viewport: vp } });
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} />
        <Typography.Text strong>{editorStore.project?.name ?? '编辑器'}</Typography.Text>
      </div>

      <div className="toolbar-center">
        <Select
          value={viewport?.name}
          onChange={handleViewportChange}
          style={{ width: 180 }}
          size="small"
          options={ALL_VIEWPORTS.map((v) => ({
            label: v.name,
            value: v.name,
          }))}
        />
        {viewport && (
          <span className="viewport-size">
            {viewport.width} × {viewport.height}
          </span>
        )}
      </div>

      <div className="toolbar-right">
        <Button
          type="text"
          icon={<UndoOutlined />}
          disabled={!editorStore.canUndo}
          onClick={() => editorStore.undo()}
          title="撤销"
        />
        <Button
          type="text"
          icon={<RedoOutlined />}
          disabled={!editorStore.canRedo}
          onClick={() => editorStore.redo()}
          title="重做"
        />
      </div>
    </div>
  );
});
