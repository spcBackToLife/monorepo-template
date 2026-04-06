import { useEffect, useRef } from 'react';
import { Anchor } from 'antd';
import type { DesignProject } from '@globallink/design-schema';
import type { BlueprintAnalysis } from '../types';
import { OverviewSection } from './OverviewSection';
import { GlobalsSection } from './GlobalsSection';
import { ScreenSection } from './ScreenSection';
import { AppendixSection } from './AppendixSection';

interface PRDViewProps {
  analysis: BlueprintAnalysis;
  project: DesignProject;
  scrollToScreenId: string | null;
  onScrollHandled: () => void;
  onViewInFlow: (edgeId: string) => void;
}

export function PRDView({
  analysis,
  project,
  scrollToScreenId,
  onScrollHandled,
  onViewInFlow,
}: PRDViewProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToScreenId && bodyRef.current) {
      const el = document.getElementById(`screen-${scrollToScreenId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onScrollHandled();
    }
  }, [scrollToScreenId, onScrollHandled]);

  const anchorItems = [
    { key: 'overview', href: '#overview', title: '产品概览' },
    { key: 'globals', href: '#globals', title: '全局定义' },
    ...analysis.screens.map((sa) => ({
      key: `screen-${sa.screen.id}`,
      href: `#screen-${sa.screen.id}`,
      title: sa.screen.name,
    })),
    { key: 'appendix', href: '#appendix', title: '附录索引' },
  ];

  const assets = project.componentAssets ?? [];
  const viewport = project.currentViewport ?? { width: 375, height: 812 };

  return (
    <div className="prd-view">
      <div className="prd-toc">
        <Anchor
          items={anchorItems}
          getContainer={() => bodyRef.current || document.body}
          offsetTop={10}
          affix={false}
        />
      </div>
      <div className="prd-body" ref={bodyRef}>
        <div id="overview">
          <OverviewSection overview={analysis.overview} screens={analysis.screens} />
        </div>
        <div id="globals">
          <GlobalsSection globals={analysis.globals} />
        </div>
        {analysis.screens.map((sa, i) => (
          <div key={sa.screen.id} id={`screen-${sa.screen.id}`}>
            <ScreenSection
              screenAnalysis={sa}
              chapterNum={i + 3}
              assets={assets}
              viewport={viewport}
              onViewInFlow={onViewInFlow}
            />
          </div>
        ))}
        <div id="appendix">
          <AppendixSection indices={analysis.indices} />
        </div>
      </div>
    </div>
  );
}
