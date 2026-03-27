import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { observer } from 'mobx-react-lite';
import { projectStore } from '@/stores/project';
import { editorStore } from '@/stores/editor';
import { syncStore } from '@/stores/sync';
import { useEditorLoader } from './hooks/useEditorLoader';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { OperationPanel } from './OperationPanel';
import { ScreenList } from './ScreenList';
import './editor.css';

export const EditorPage = observer(function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loading = useEditorLoader(id);

  useEffect(() => {
    return () => {
      editorStore.dispose();
      syncStore.stopSync();
      projectStore.clearCurrent();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载项目…" />
      </div>
    );
  }

  if (!editorStore.project) {
    message.error('项目加载失败');
    navigate('/');
    return null;
  }

  return (
    <div className="editor-layout">
      <Toolbar />
      <div className="editor-body">
        <div className="editor-screen-bar">
          <ScreenList />
        </div>
        <div className="editor-canvas-area">
          <Canvas />
        </div>
        <div className="editor-right-panel">
          <OperationPanel />
        </div>
      </div>
    </div>
  );
});
