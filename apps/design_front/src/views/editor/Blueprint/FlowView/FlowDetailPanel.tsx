import { Button } from 'antd';
import { CloseOutlined, FileTextOutlined } from '@ant-design/icons';
import type { BlueprintAnalysis, FlowNode, FlowEdge } from '../types';

interface Props {
  node: FlowNode | null;
  edge: FlowEdge | null;
  analysis: BlueprintAnalysis;
  onViewInPRD: (screenId: string) => void;
  onClose: () => void;
}

export function FlowDetailPanel({ node, edge, analysis, onViewInPRD, onClose }: Props) {
  return (
    <div className="flow-detail-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="flow-detail-title">
          {node ? '节点详情' : '连线详情'}
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      {node && <NodeDetail node={node} analysis={analysis} onViewInPRD={onViewInPRD} />}
      {edge && <EdgeDetail edge={edge} analysis={analysis} onViewInPRD={onViewInPRD} />}
    </div>
  );
}

function NodeDetail({
  node,
  analysis,
  onViewInPRD,
}: {
  node: FlowNode;
  analysis: BlueprintAnalysis;
  onViewInPRD: (screenId: string) => void;
}) {
  if (node.type === 'screen') {
    const sa = analysis.screens.find((s) => s.screen.id === node.id);
    if (!sa) return <div style={{ fontSize: 12, color: '#94a3b8' }}>未找到页面信息</div>;

    return (
      <div style={{ fontSize: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
          📄 {sa.screen.name}
        </div>

        <DetailGroup label="统计">
          <div>{sa.nodeCount} 组件 · {sa.eventCount} 事件</div>
          <div>{(sa.screen.domainStates ?? []).length} 状态变量 · {sa.screen.apiEndpoints?.length ?? 0} API</div>
        </DetailGroup>

        {sa.outgoingNavs.length > 0 && (
          <DetailGroup label={`出口 (${sa.outgoingNavs.length})`}>
            {sa.outgoingNavs.map((nav, i) => (
              <div key={i} style={{ color: '#475569' }}>
                → {nav.toScreenName} ({nav.trigger}: {nav.triggerNodeName})
              </div>
            ))}
          </DetailGroup>
        )}

        {sa.incomingNavs.length > 0 && (
          <DetailGroup label={`入口 (${sa.incomingNavs.length})`}>
            {sa.incomingNavs.map((nav, i) => (
              <div key={i} style={{ color: '#475569' }}>
                ← {nav.fromScreenName} ({nav.trigger}: {nav.triggerNodeName})
              </div>
            ))}
          </DetailGroup>
        )}

        {sa.stateAnalysis.length > 0 && (
          <DetailGroup label="状态变量">
            {sa.stateAnalysis.map((sv) => (
              <div key={sv.variable.id} style={{ color: '#475569' }}>
                ◇ {sv.variable.label}: {sv.variable.values.map(v => v.label).join(' / ')}
              </div>
            ))}
          </DetailGroup>
        )}

        <div style={{ marginTop: 16 }}>
          <Button
            type="primary"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => onViewInPRD(node.id)}
          >
            查看 PRD 章节
          </Button>
        </div>
      </div>
    );
  }

  // Non-screen node
  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
        {node.type === 'domainState' && '◇ '}
        {node.type === 'api' && '📡 '}
        {node.type === 'envState' && '🌐 '}
        {node.label}
      </div>
      <div style={{ color: '#94a3b8' }}>
        类型: {node.type === 'domainState' ? '领域状态变量' : node.type === 'api' ? 'API 端点' : '环境变量'}
      </div>
      {Array.isArray(node.metadata.values) && (
        <div style={{ marginTop: 8, color: '#475569' }}>
          可选值: {(node.metadata.values as string[]).join(', ')}
        </div>
      )}
      {typeof node.metadata.method === 'string' && (
        <div style={{ marginTop: 8, color: '#475569' }}>
          {String(node.metadata.method)} {String(node.metadata.path ?? '')}
        </div>
      )}
      {node.screenId && (
        <div style={{ marginTop: 12 }}>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => onViewInPRD(node.screenId!)}
          >
            查看所属页面
          </Button>
        </div>
      )}
    </div>
  );
}

function EdgeDetail({
  edge,
  analysis: _analysis,
  onViewInPRD: _onViewInPRD,
}: {
  edge: FlowEdge;
  analysis: BlueprintAnalysis;
  onViewInPRD: (screenId: string) => void;
}) {
  const typeLabels: Record<string, string> = {
    navigation: '页面跳转',
    'state-write': '状态写入',
    'state-read': '状态消费',
    'env-write': '环境变量写入',
    'env-read': '环境变量消费',
    'api-call': 'API 调用',
  };

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
        🔗 {typeLabels[edge.type] || edge.type}
      </div>

      <DetailGroup label="连接">
        <div style={{ color: '#475569' }}>
          {edge.source} → {edge.target}
        </div>
      </DetailGroup>

      <DetailGroup label="标签">
        <div style={{ color: '#475569' }}>{edge.label}</div>
      </DetailGroup>

      {edge.trigger && (
        <DetailGroup label="触发器">
          <div style={{ color: '#475569' }}>{edge.trigger}</div>
        </DetailGroup>
      )}

      {typeof edge.metadata.nodeName === 'string' && (
        <DetailGroup label="触发元素">
          <div style={{ color: '#475569' }}>{String(edge.metadata.nodeName)}</div>
        </DetailGroup>
      )}
    </div>
  );
}

function DetailGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
