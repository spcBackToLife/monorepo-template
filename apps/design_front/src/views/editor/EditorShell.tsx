import { useEffect } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
import { App as AntdApp, Spin } from 'antd';
import { observer } from 'mobx-react-lite';
import { projectStore } from '@/stores/project';
import { editorStore } from '@/stores/editor';
import { syncStore } from '@/stores/sync';
import { useEditorLoader } from './hooks/useEditorLoader';

/**
 * EditorShell — 编辑器的外壳组件。
 *
 * 职责：
 *   1. 加载项目数据（useEditorLoader）
 *   2. 页面退出时持久化（beforeunload / visibilitychange）
 *   3. 卸载时清理 store
 *   4. 渲染 <Outlet /> 供子路由使用
 *
 * 子路由共享同一个 editorStore MobX 单例：
 *   /editor/:id           → EditorWorkspace（画布+面板）
 *   /editor/:id/panorama  → PanoramaPage（全屏全景）
 */
export const EditorShell = observer(function EditorShell() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loading = useEditorLoader(id);
  const { message } = AntdApp.useApp();

  // 页面退出时持久化
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

  return <Outlet />;
});
