import { useState, useMemo, useCallback } from 'react';
import { App as AntdApp, Segmented, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx';
import { generateReactCode } from '@globallink/design-engine';
import type { Screen } from '@globallink/design-schema';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { LeftPanel } from './panels/LeftPanel';
import { RightPanel } from './panels/RightPanel';
import { PanelResizer } from './panels/PanelResizer';
import { BottomToolbar } from './BottomToolbar';
// v1 PreviewBar 已随 D.5 删除（按 phase/scenario/domainState 顶栏切换条），
// 预览状态切换待 D.6 按 v2 模型（env mock/http + view 预览）重写后恢复。
import { AiOperationToast } from './AiOperationToast';
import { MaterialEditorModal } from './panels/MaterialEditor/MaterialEditorModal';
import './editor.css';

// Re-export EditorShell as EditorPage for backward compatibility with route config
export { EditorShell as EditorPage } from './EditorShell';

/**
 * EditorWorkspace — 编辑器工作区（画布 + 面板 + 工具栏）。
 *
 * 作为 EditorShell 的子路由渲染（index route），
 * Shell 负责项目加载和 store 生命周期管理。
 */
export const EditorWorkspace = observer(function EditorWorkspace() {
  useKeyboardShortcuts();

  return (
    <div className="editor-layout">
      <Toolbar />
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
              <RightPanel />
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
      <MaterialEditorModal />
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
    const s = screen ? toJS(screen) : null;
    if (!s) return null;
    if (scope === 'screen') return s;
    if (scope === 'node' && node) {
      return { ...s, name: (node.name && String(node.name)) || s.name || 'Node', rootNode: toJS(node) };
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
