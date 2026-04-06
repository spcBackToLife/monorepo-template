import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx';
import { Button, Segmented, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { editorStore } from '@/stores/editor';
import { analyzeProject } from './SchemaAnalyzer';
import { PRDView } from './PRDView';
import { FlowView } from './FlowView';
import { exportToMarkdown } from './MarkdownExporter';
import type { BlueprintAnalysis } from './types';
import './blueprint.css';

type ViewTab = 'prd' | 'flow';

/**
 * BlueprintPage — 产品全景 PRD + 交互链路图
 *
 * 路由：/editor/:id/blueprint
 * 与画布模式、全景模式并列的第三种编辑器视图模式。
 *
 * 核心理念：Schema 的第三种导出 —— 给人类阅读的产品文档。
 */
export const BlueprintPage = observer(function BlueprintPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ViewTab>('prd');
  const [highlightEdgeId, setHighlightEdgeId] = useState<string | null>(null);
  const [scrollToScreenId, setScrollToScreenId] = useState<string | null>(null);

  const project = editorStore.project;

  // Compute analysis from project schema (memoized)
  const analysis: BlueprintAnalysis | null = useMemo(() => {
    if (!project) return null;
    try {
      return analyzeProject(toJS(project));
    } catch (e) {
      console.error('[Blueprint] analysis failed:', e);
      return null;
    }
  }, [project]);

  // PRD → Flow: highlight an edge in flow view
  const handleViewInFlow = useCallback((edgeId: string) => {
    setHighlightEdgeId(edgeId);
    setActiveTab('flow');
  }, []);

  // Flow → PRD: scroll to a screen section
  const handleViewInPRD = useCallback((screenId: string) => {
    setScrollToScreenId(screenId);
    setActiveTab('prd');
  }, []);

  // Export markdown
  const handleExportMarkdown = useCallback(() => {
    if (!analysis || !project) return;
    const md = exportToMarkdown(analysis, project.name);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-PRD.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis, project]);

  // Esc to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!project || !analysis) {
    return (
      <div className="blueprint-empty">
        <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
        <p>无可用项目数据</p>
        <Button onClick={() => navigate(-1)}>返回编辑器</Button>
      </div>
    );
  }

  return (
    <div className="blueprint-page">
      {/* Top Bar */}
      <div className="blueprint-topbar">
        <div className="blueprint-topbar-left">
          <Tooltip title="返回编辑器 (Esc)">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              返回
            </Button>
          </Tooltip>
          <div className="blueprint-title">
            <FileTextOutlined style={{ color: '#6366f1' }} />
            <span>{project.name} — 产品全景</span>
          </div>
        </div>

        <div className="blueprint-topbar-center">
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as ViewTab)}
            options={[
              {
                label: (
                  <span>
                    <FileTextOutlined /> PRD 文档
                  </span>
                ),
                value: 'prd',
              },
              {
                label: (
                  <span>
                    <ApartmentOutlined /> 交互链路图
                  </span>
                ),
                value: 'flow',
              },
            ]}
          />
        </div>

        <div className="blueprint-topbar-right">
          <span className="blueprint-stats">
            {analysis.overview.stats.screenCount} 页面 ·{' '}
            {analysis.overview.stats.eventCount} 事件 ·{' '}
            {analysis.overview.stats.stateVarCount} 状态 ·{' '}
            {analysis.overview.stats.apiCount} API
          </span>
          <Tooltip title="导出为 Markdown">
            <Button icon={<DownloadOutlined />} onClick={handleExportMarkdown}>
              导出 MD
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="blueprint-content">
        {activeTab === 'prd' ? (
          <PRDView
            analysis={analysis}
            project={project}
            scrollToScreenId={scrollToScreenId}
            onScrollHandled={() => setScrollToScreenId(null)}
            onViewInFlow={handleViewInFlow}
          />
        ) : (
          <FlowView
            analysis={analysis}
            project={project}
            highlightEdgeId={highlightEdgeId}
            onHighlightHandled={() => setHighlightEdgeId(null)}
            onViewInPRD={handleViewInPRD}
          />
        )}
      </div>
    </div>
  );
});
