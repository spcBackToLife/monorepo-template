import { useState, useCallback } from 'react';
import { Select, Button, Typography, Segmented, Dropdown, Switch, Tooltip, App as AntdApp } from 'antd';
import { ArrowLeftOutlined, UndoOutlined, RedoOutlined, PlayCircleOutlined, ExportOutlined, CodeOutlined, AppstoreOutlined, FileTextOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';

// html2canvas 通过 CDN 全局注入，不在 bundle 内
declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  }
}
import { toJS } from 'mobx';
import { ALL_VIEWPORTS, type Screen } from '@globallink/design-schema';
import { generateReactCode } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';
import { SaveStatusIndicator } from '../SaveStatusIndicator';
import './toolbar.css';

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

  const activeScreen = editorStore.activeScreen;
  const dataSources = activeScreen?.dataSources ?? [];
  const screenGlobalStates = activeScreen?.domainStates ?? [];

  const handleDataSourceScenarioSwitch = (dataSourceId: string, scenarioId: string) => {
    if (!activeScreen) return;
    editorStore.execute({
      type: 'switchDataScenario',
      params: { screenId: activeScreen.id, dataSourceId, scenarioId },
    });
  };

  const handleGlobalStateChange = (variableName: string, value: string) => {
    editorStore.setCurrentGlobalState(variableName, value);
  };

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
        {dataSources.length > 0 && activeScreen && (
          <Tooltip title="当前页数据源（{{data.*}} 解析来源）">
            <Select
              size="small"
              value={dataSources[0]?.activeScenarioId}
              onChange={(scenarioId) => {
                const ds = dataSources.find(d => d.scenarios.some(s => s.id === scenarioId));
                if (ds) handleDataSourceScenarioSwitch(ds.id, scenarioId);
              }}
              style={{ width: 128 }}
              options={dataSources.flatMap((ds) =>
                ds.scenarios.map((sc) => ({ label: `${ds.name} / ${sc.name}`, value: sc.id }))
              )}
            />
          </Tooltip>
        )}
        {screenGlobalStates.length > 0 && activeScreen && (
          <Tooltip title="当前页全局变量（状态绑定与表达式；与预览顶栏一致）">
            <span className="toolbar-global-states flex items-center gap-1 flex-wrap">
              {screenGlobalStates.map((gs) => (
                <span key={gs.name} className="flex items-center gap-0.5">
                  <span className="text-[10px] text-gray-500 max-w-[56px] truncate" title={gs.name}>
                    {gs.name}
                  </span>
                  <Select
                    size="small"
                    value={editorStore.currentGlobalStates[gs.name] ?? gs.defaultValue}
                    onChange={(v) => handleGlobalStateChange(gs.name, String(v))}
                    style={{ width: 88 }}
                    options={gs.values.map((v) => ({ label: v.label, value: v.value }))}
                  />
                </span>
              ))}
            </span>
          </Tooltip>
        )}
        {viewport && (
          <Tooltip
            title={
              <span>
                Viewport 是<b>观察窗口</b>，不裁剪 Frame：
                <br />
                Frame 自适应内容高度，画布上虚线框就是当前 Viewport 边界。
                <br />
                需要同设备真实裁剪效果，请进入预览模式。
              </span>
            }
          >
            <span className="viewport-size" style={{ cursor: 'help' }}>
              {viewport.width} × {viewport.height}
              <span style={{ marginLeft: 4, opacity: 0.5 }}>ⓘ</span>
            </span>
          </Tooltip>
        )}
        {editorStore.viewportOverflow && (
          <Tooltip title="有节点超出当前 Viewport（观察窗口）。Frame 已撑开容纳，可继续设计；如需在真机模拟下查看，进入预览模式。">
            <span className="toolbar-overflow-badge">超出 Viewport</span>
          </Tooltip>
        )}
        <div className="zoom-wrap">
          <Dropdown
            menu={{
              items: [
                { key: 'fit', label: '适应画布 (⌘0)' },
                { key: '100', label: '100% (⌘1)' },
                { type: 'divider' },
                { key: '0.5', label: '50%' },
                { key: '0.75', label: '75%' },
                { key: '1', label: '100%' },
                { key: '1.5', label: '150%' },
                { key: '2', label: '200%' },
                { key: '3', label: '300%' },
                { type: 'divider' },
                {
                  key: 'custom',
                  label: (
                    <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min={10}
                        max={800}
                        placeholder="自定义"
                        className="w-16 h-6 px-1 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Number((e.target as HTMLInputElement).value);
                            if (v >= 10 && v <= 800) {
                              editorStore.setCanvasScale(v / 100);
                            }
                          }
                          e.stopPropagation();
                        }}
                      />
                      <span className="text-[10px] text-gray-400">%</span>
                    </span>
                  ),
                },
              ],
              onClick: ({ key }) => {
                if (key === 'fit') {
                  editorStore.fitCanvasToViewport();
                  return;
                }
                if (key === '100') {
                  editorStore.zoomTo100Percent();
                  return;
                }
                if (key === 'custom') return;
                editorStore.setCanvasScale(Number(key));
              },
            }}
            trigger={['click']}
          >
            <button
              type="button"
              className="zoom-label"
              style={{ cursor: 'pointer', border: 'none', background: 'none', padding: '2px 6px' }}
            >
              {Math.round(editorStore.canvasScale * 100)}% ▾
            </button>
          </Dropdown>
        </div>
        <Tooltip title="8px 栅格吸附（与对齐线并存时对齐线优先）">
          <span className="toolbar-inline-switch">
            <span className="toolbar-inline-switch__label">吸附</span>
            <Switch
              size="small"
              checked={editorStore.snapToGridEnabled}
              onChange={(v) => editorStore.setSnapToGridEnabled(v)}
            />
          </span>
        </Tooltip>
        <Tooltip title="在画布上显示对齐栅格线">
          <span className="toolbar-inline-switch">
            <span className="toolbar-inline-switch__label">栅格</span>
            <Switch
              size="small"
              checked={editorStore.showGridInEditor}
              onChange={(v) => editorStore.setShowGridInEditor(v)}
            />
          </span>
        </Tooltip>
        <Tooltip title="在画布上方显示数据源/领域态/环境态上下文条">
          <span className="toolbar-inline-switch">
            <span className="toolbar-inline-switch__label">上下文</span>
            <Switch
              size="small"
              checked={editorStore.showCanvasContextBar}
              onChange={(v) => editorStore.setShowCanvasContextBar(v)}
            />
          </span>
        </Tooltip>
      </div>

      <div className="toolbar-right">
        <SaveStatusIndicator />
        <Tooltip title="代码分屏">
          <Button
            type="text"
            icon={<CodeOutlined />}
            className={editorStore.codeSplitView ? 'toolbar-btn-active' : ''}
            onClick={() => editorStore.toggleCodeSplitView()}
            title="代码分屏"
          />
        </Tooltip>
        <ExportMenu />
        <Button
          type="text"
          icon={<PlayCircleOutlined />}
          className={editorStore.previewMode ? 'toolbar-btn-active' : ''}
          onClick={() => editorStore.setPreviewMode(!editorStore.previewMode)}
          title={editorStore.previewMode ? '退出预览' : '预览（同画布，可点按、悬停）'}
        />
        <Button
          type="text"
          icon={<AppstoreOutlined />}
          onClick={() => {
            // 有选中组件 → 组件全景；否则 → 页面全景
            const target = editorStore.selectedNodeIds.length === 1
              ? editorStore.selectedNodeIds[0]
              : null;
            const path = target ? `panorama?node=${target}` : 'panorama';
            navigate(path);
          }}
          title="全景视图（查看所有状态）"
        />
        <Tooltip title="产品全景 PRD + 交互链路图">
          <Button
            type="text"
            icon={<FileTextOutlined />}
            onClick={() => navigate('blueprint')}
          />
        </Tooltip>
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

const ExportMenu = observer(function ExportMenu() {
  const { message } = AntdApp.useApp();

  const exportCode = useCallback(
    async (format: 'react-tsx' | 'html') => {
      const screen = editorStore.activeScreen;
      if (!screen) {
        message.warning('请先选择一个页面');
        return;
      }
      try {
        const code = generateReactCode(toJS(screen) as Screen, {
          format,
          includeStyles: true,
          includeEvents: true,
        });
        await navigator.clipboard.writeText(code);
        message.success(`${format === 'html' ? 'HTML' : 'React TSX'} 已复制到剪贴板`);
      } catch (e) {
        message.error(`导出失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [message],
  );

  const exportJSON = useCallback(async () => {
    const screen = editorStore.activeScreen;
    if (!screen) return;
    const json = JSON.stringify(toJS(screen), null, 2);
    await navigator.clipboard.writeText(json);
    message.success('JSON Schema 已复制到剪贴板');
  }, [message]);

  const exportPNG = useCallback(async () => {
    const canvas = document.querySelector('.editor-canvas-area') as HTMLElement | null;
    if (!canvas) {
      message.warning('无法找到画布元素');
      return;
    }
    try {
      const html2canvasGlobal = window.html2canvas;
      if (!html2canvasGlobal) {
        message.warning('PNG 导出需要 html2canvas，请先添加依赖');
        return;
      }
      const c = await html2canvasGlobal(canvas, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `${editorStore.activeScreen?.name ?? 'export'}.png`;
      link.href = c.toDataURL('image/png');
      link.click();
      message.success('PNG 已下载');
    } catch {
      message.warning('PNG 导出失败');
    }
  }, [message]);

  const exportSVG = useCallback(async () => {
    const screen = editorStore.activeScreen;
    if (!screen) return;
    const viewport = editorStore.currentViewport;
    const w = viewport?.width ?? 375;
    const h = viewport?.height ?? 812;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${screen.backgroundColor || '#ffffff'}"/>
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="#999" font-size="14">${screen.name} (${w}x${h})</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${screen.name ?? 'export'}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    message.success('SVG 已下载');
  }, [message]);

  return (
    <Dropdown
      menu={{
        items: [
          { key: 'react', label: '复制 React TSX' },
          { key: 'html', label: '复制 HTML' },
          { key: 'json', label: '复制 JSON Schema' },
          { type: 'divider' },
          { key: 'png', label: '导出 PNG' },
          { key: 'svg', label: '导出 SVG (占位)' },
        ],
        onClick: ({ key }) => {
          switch (key) {
            case 'react':
              void exportCode('react-tsx');
              break;
            case 'html':
              void exportCode('html');
              break;
            case 'json':
              void exportJSON();
              break;
            case 'png':
              void exportPNG();
              break;
            case 'svg':
              void exportSVG();
              break;
          }
        },
      }}
      trigger={['click']}
    >
      <Button type="text" icon={<ExportOutlined />} title="导出" />
    </Dropdown>
  );
});
