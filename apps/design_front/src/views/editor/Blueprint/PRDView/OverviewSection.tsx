import type { ProjectOverview, ScreenAnalysis } from '../types';

interface Props {
  overview: ProjectOverview;
  screens: ScreenAnalysis[];
}

export function OverviewSection({ overview, screens }: Props) {
  const { stats } = overview;

  return (
    <div className="prd-chapter">
      <h2 className="prd-chapter-title">第一章 · 产品概览</h2>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: '#475569' }}>
          <strong>产品名称：</strong>{overview.name}
        </div>
        <div style={{ fontSize: 14, color: '#475569' }}>
          <strong>目标平台：</strong>{overview.platform === 'mobile' ? 'Mobile' : 'PC'}
          （{overview.viewport.width} × {overview.viewport.height}）
        </div>
      </div>

      <div className="prd-stats-grid">
        <StatCard value={stats.screenCount} label="页面" />
        <StatCard value={stats.componentCount} label="组件" />
        <StatCard value={stats.eventCount} label="交互事件" />
        <StatCard value={stats.stateVarCount} label="状态变量" />
        <StatCard value={stats.apiCount} label="API 端点" />
        <StatCard value={stats.templateCount} label="组件资产" />
      </div>

      <h3 className="prd-section-title">页面列表</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {screens.map((sa) => (
          <a
            key={sa.screen.id}
            href={`#screen-${sa.screen.id}`}
            style={{
              display: 'block',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 16px',
              textDecoration: 'none',
              color: '#1e293b',
              minWidth: 140,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>{sa.screen.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {sa.nodeCount} 组件 · {sa.eventCount} 事件
            </div>
            {sa.outgoingNavs.length > 0 && (
              <div style={{ fontSize: 10, color: '#6366f1', marginTop: 4 }}>
                → {sa.outgoingNavs.map((n) => n.toScreenName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="prd-stat-card">
      <div className="prd-stat-value">{value}</div>
      <div className="prd-stat-label">{label}</div>
    </div>
  );
}
