import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App as AntdApp, Spin, Segmented, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx';
import { generateReactCode } from '@globallink/design-engine';
import type { Screen, ComponentNode } from '@globallink/design-schema';
import { findNodeInScreens } from '@globallink/design-operations';
import { projectStore } from '@/stores/project';
import { editorStore } from '@/stores/editor';
import { syncStore } from '@/stores/sync';
import { useEditorLoader } from './hooks/useEditorLoader';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { LeftPanel } from './panels/LeftPanel';
import { PropertyPanel } from './panels/PropertyPanel';
import { PanelResizer } from './panels/PanelResizer';
import { BottomToolbar } from './BottomToolbar';
import { PreviewBar } from './PreviewBar';
import { AiOperationToast } from './AiOperationToast';
import './editor.css';

export const EditorPage = observer(function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loading = useEditorLoader(id);
  const { message } = AntdApp.useApp();
  useKeyboardShortcuts();

  useEffect(() => {
    const handlePageExit = () => {
      editorStore.flushPersistOnPageExit();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        editorStore.flushPersistOnPageExit();
      }
    };

    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      editorStore.dispose();
      syncStore.stopSync();
      projectStore.clearCurrent();
    };
  }, []);

  useEffect(() => {
    if (!loading && !editorStore.project) {
      message.error('项目加载失败');
      navigate('/');
    }
  }, [loading, message, navigate]);


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!editorStore.project) {
    return null;
  }

  /**
   * 预览已并入中间画布（Canvas 内切换 PreviewRenderer，见 02-toolbar / 01-canvas）；
   * 此处仅保留顶栏下的预览条（全局状态、退出等）。
   */

  return (
    <div className="editor-layout">
      <Toolbar />
      {editorStore.previewMode && <PreviewBar />}
      <div className="editor-body">
        {!editorStore.leftPanelCollapsed ? (
          <>
            <div
              className="editor-left-panel"
              style={{ width: editorStore.leftPanelWidth }}
            >
              <LeftPanel />
            </div>
            <PanelResizer side="left" />
          </>
        ) : (
          <button
            type="button"
            className="editor-panel-collapsed-edge editor-panel-collapsed-edge--left"
            title="双击展开左侧面板"
            aria-label="展开左侧面板"
            onDoubleClick={() => editorStore.toggleLeftPanel()}
          />
        )}
        <div className="editor-center" style={editorStore.codeSplitView ? { display: 'flex', flexDirection: 'row' } : undefined}>
          <div className="editor-canvas-area" style={editorStore.codeSplitView ? { flex: 1, minWidth: 0 } : undefined}>
            <Canvas />
            {!editorStore.previewMode && <BottomToolbar />}
          </div>
          {editorStore.codeSplitView && <CodeSplitPane />}
        </div>
        {!editorStore.rightPanelCollapsed ? (
          <>
            <PanelResizer side="right" />
            <div
              className="editor-right-panel"
              style={{ width: editorStore.rightPanelWidth }}
            >
              <PropertyPanel />
            </div>
          </>
        ) : (
          <button
            type="button"
            className="editor-panel-collapsed-edge editor-panel-collapsed-edge--right"
            title="双击展开右侧面板"
            aria-label="展开右侧面板"
            onDoubleClick={() => editorStore.toggleRightPanel()}
          />
        )}
      </div>
      <AiOperationToast />
    </div>
  );
});

const CodeSplitPane = observer(function CodeSplitPane() {
  const { message } = AntdApp.useApp();
  const [view, setView] = useState<'react' | 'html' | 'json'>('react');
  const [scope, setScope] = useState<'node' | 'screen'>('screen');

  const nodeId = editorStore.selectedNodeIds[0];
  const screen = editorStore.activeScreen;
  const node = nodeId ? findNodeInScreens(editorStore.screens, nodeId) : null;

  const codegenScreen = useMemo((): Screen | null => {
    const s = screen ? (toJS(screen) as Screen) : null;
    if (!s) return null;
    if (scope === 'screen') return s;
    if (scope === 'node' && node) {
      return { ...s, name: (node.name && String(node.name)) || s.name || 'Node', rootNode: toJS(node) as ComponentNode };
    }
    return null;
  }, [screen, scope, node]);

  const code = useMemo(() => {
    if (view === 'json') {
      const target = scope === 'screen' && screen ? toJS(screen) : scope === 'node' && node ? toJS(node) : null;
      return target ? JSON.stringify(target, null, 2) : '// 无数据';
    }
    if (!codegenScreen) return '// 无当前页面';
    try {
      return generateReactCode(codegenScreen, {
        format: view === 'html' ? 'html' : 'react-tsx',
        includeStyles: true,
        includeEvents: true,
      });
    } catch (e) {
      return `// 生成失败: ${e instanceof Error ? e.message : String(e)}`;
    }
  }, [view, scope, codegenScreen, screen, node]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    message.success('已复制');
  }, [code, message]);

  return (
    <div style={{ width: 380, borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-white">
        <Segmented size="small" value={scope} onChange={(v) => setScope(v as 'node' | 'screen')} options={[{ label: '节点', value: 'node' }, { label: '页面', value: 'screen' }]} />
        <Segmented size="small" value={view} onChange={(v) => setView(v as 'react' | 'html' | 'json')} options={[{ label: 'React', value: 'react' }, { label: 'HTML', value: 'html' }, { label: 'JSON', value: 'json' }]} />
        <span className="flex-1" />
        <Button size="small" icon={<CopyOutlined />} onClick={() => void copy()} />
        <button type="button" className="text-gray-400 hover:text-gray-600 text-xs px-1" onClick={() => editorStore.toggleCodeSplitView()}>×</button>
      </div>
      <textarea
        readOnly
        spellCheck={false}
        className="flex-1 w-full p-2 font-mono text-[11px] leading-relaxed bg-gray-50 text-gray-800 resize-none outline-none border-none"
        value={code}
      />
    </div>
  );
});
