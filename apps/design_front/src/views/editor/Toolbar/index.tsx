import { Select, Button, Typography, Segmented, Slider } from 'antd';
import { ArrowLeftOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { ALL_VIEWPORTS } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import './toolbar.css';
import { useState } from 'react';

export const Toolbar = observer(function Toolbar() {
  const navigate = useNavigate();
  const viewport = editorStore.currentViewport;
  const screens = editorStore.screens;
  const [platformFilter, setPlatformFilter] = useState<'mobile' | 'pc'>(
    viewport?.platform === 'pc' ? 'pc' : 'mobile',
  );

  const viewportOptions = ALL_VIEWPORTS.map((v) => ({
    key: `${v.platform}:${v.name}:${v.width}x${v.height}`,
    label: v.name,
    viewport: v,
  }));

  const handleViewportChange = (key: string) => {
    const vp = viewportOptions.find((item) => item.key === key)?.viewport;
    if (vp) {
      editorStore.execute({ type: 'switchViewport', params: { viewport: vp } });
    }
  };

  const filteredViewportOptions = viewportOptions.filter((v) =>
    platformFilter === 'pc' ? v.viewport.platform === 'pc' : v.viewport.platform !== 'pc',
  );

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} />
        <Typography.Text strong>{editorStore.project?.name ?? '编辑器'}</Typography.Text>
      </div>

      <div className="toolbar-center">
        <Segmented
          size="small"
          value={platformFilter}
          onChange={(v) => {
            const mode = String(v) as 'mobile' | 'pc';
            setPlatformFilter(mode);
            const fallback = mode === 'pc'
              ? ALL_VIEWPORTS.find((x) => x.platform === 'pc')
              : ALL_VIEWPORTS.find((x) => x.platform !== 'pc');
            if (fallback) {
              editorStore.execute({ type: 'switchViewport', params: { viewport: fallback } });
            }
          }}
          options={[
            { label: '手机', value: 'mobile' },
            { label: '桌面', value: 'pc' },
          ]}
        />
        <Select
          value={viewport ? `${viewport.platform}:${viewport.name}:${viewport.width}x${viewport.height}` : undefined}
          onChange={handleViewportChange}
          style={{ width: 190 }}
          size="small"
          options={filteredViewportOptions.map((v) => ({
            label: v.label,
            value: v.key,
          }))}
        />
        <Select
          size="small"
          value={editorStore.activeScreenId ?? undefined}
          onChange={(screenId) => editorStore.setActiveScreen(screenId)}
          style={{ width: 140 }}
          options={screens.map((s) => ({ label: s.name, value: s.id }))}
        />
        {viewport && (
          <span className="viewport-size">
            {viewport.width} × {viewport.height}
          </span>
        )}
        <div className="zoom-wrap">
          <span className="zoom-label">{Math.round(editorStore.canvasScale * 100)}%</span>
          <Slider
            min={0.4}
            max={1.6}
            step={0.1}
            value={editorStore.canvasScale}
            onChange={(v) => editorStore.setCanvasScale(Number(v))}
            style={{ width: 120 }}
          />
        </div>
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
