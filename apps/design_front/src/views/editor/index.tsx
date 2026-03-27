import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App as AntdApp, Spin } from 'antd';
import { observer } from 'mobx-react-lite';
import { projectStore } from '@/stores/project';
import { editorStore } from '@/stores/editor';
import { syncStore } from '@/stores/sync';
import { useEditorLoader } from './hooks/useEditorLoader';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { OperationPanel } from './OperationPanel';
import { NodeTree } from './NodeTree';
import { BottomToolbar } from './BottomToolbar';
import './editor.css';

export const EditorPage = observer(function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loading = useEditorLoader(id);
  const { message } = AntdApp.useApp();

  useEffect(() => {
    return () => {
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

  return (
    <div className="editor-layout">
      <Toolbar />
      <div className="editor-body">
        <div className="editor-left-panel">
          <NodeTree />
        </div>
        <div className="editor-center">
          <div className="editor-canvas-area">
            <Canvas />
          </div>
          <BottomToolbar />
        </div>
        <div className="editor-right-panel">
          <OperationPanel />
        </div>
      </div>
    </div>
  );
});
