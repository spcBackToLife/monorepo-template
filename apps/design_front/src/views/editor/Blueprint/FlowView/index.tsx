import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Checkbox } from 'antd';
import type { DesignProject } from '@globallink/design-schema';
import type { BlueprintAnalysis, FlowEdgeType, _FlowGraphData } from '../types';
import { buildFlowGraph } from '../SchemaAnalyzer';
import { ScreenFlowNode } from './ScreenFlowNode';
import { StateFlowNode } from './StateFlowNode';
import { FlowDetailPanel } from './FlowDetailPanel';
import { computeElkLayout } from './useFlowGraph';

interface FlowViewProps {
  analysis: BlueprintAnalysis;
  project: DesignProject;
  highlightEdgeId: string | null;
  onHighlightHandled: () => void;
  onViewInPRD: (screenId: string) => void;
}

const nodeTypes: NodeTypes = {
  screen: ScreenFlowNode,
  domainState: StateFlowNode,
  envState: StateFlowNode,
  api: StateFlowNode,
};

const edgeColors: Record<FlowEdgeType, string> = {
  navigation: '#1677ff',
  'state-write': '#ef4444',
  'state-read': '#22c55e',
  'env-write': '#8b5cf6',
  'env-read': '#06b6d4',
  'api-call': '#f97316',
};

const edgeLabels: Record<FlowEdgeType, string> = {
  navigation: '页面跳转',
  'state-write': '状态写入',
  'state-read': '状态消费',
  'env-write': '环境写入',
  'env-read': '环境消费',
  'api-call': 'API 调用',
};

const ALL_EDGE_TYPES: FlowEdgeType[] = ['navigation', 'state-write', 'state-read', 'api-call', 'env-write', 'env-read'];

export function FlowView({
  analysis,
  project,
  highlightEdgeId,
  onHighlightHandled,
  onViewInPRD,
}: FlowViewProps) {
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<Set<FlowEdgeType>>(
    new Set(['navigation', 'state-write', 'state-read', 'api-call']),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Build graph
  const graphData = useMemo(() => buildFlowGraph(analysis, project), [analysis, project]);

  // Build screen lookup for rendering
  const screenMap = useMemo(() => {
    const m = new Map<string, typeof project.screens[0]>();
    for (const s of project.screens ?? []) m.set(s.id, s);
    return m;
  }, [project]);
  const assets = project.componentAssets ?? [];
  const vp = project.currentViewport ?? { width: 375, height: 812 };

  // Filter edges by visible types
  const filteredGraph = useMemo(() => {
    const edges = graphData.edges.filter((e) => visibleEdgeTypes.has(e.type));
    const nodeIds = new Set<string>();
    edges.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target); });
    // Always show screen nodes
    graphData.nodes.forEach((n) => { if (n.type === 'screen') nodeIds.add(n.id); });
    const nodes = graphData.nodes.filter((n) => nodeIds.has(n.id));
    return { nodes, edges };
  }, [graphData, visibleEdgeTypes]);

  // Convert to React Flow format with ELK layout
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const nodes: Node[] = filteredGraph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        ...n.metadata,
        nodeType: n.type,
        // Pass screen & assets for real rendering in ScreenFlowNode
        screen: n.type === 'screen' ? screenMap.get(n.id) : undefined,
        assets,
        vpWidth: vp.width,
        vpHeight: vp.height,
      },
    }));

    const edges: Edge[] = filteredGraph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.type === 'api-call',
      style: {
        stroke: edgeColors[e.type],
        strokeWidth: e.type === 'navigation' ? 2 : 1.5,
        strokeDasharray: e.type === 'navigation' ? undefined : '5,5',
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColors[e.type] },
      labelStyle: { fontSize: 10, fill: '#64748b' },
      data: { ...e, label: e.label } as Record<string, unknown>,
    }));

    // Apply ELK layout
    computeElkLayout(nodes, edges).then(({ nodes: layoutNodes, edges: layoutEdges }) => {
      setRfNodes(layoutNodes);
      setRfEdges(layoutEdges);
    });
  }, [filteredGraph]);

  // Handle highlight from PRD
  useEffect(() => {
    if (highlightEdgeId) {
      setSelectedEdgeId(highlightEdgeId);
      onHighlightHandled();
    }
  }, [highlightEdgeId, onHighlightHandled]);

  const toggleEdgeType = (type: FlowEdgeType) => {
    setVisibleEdgeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Navigate to PRD if it's a screen node
    if (node.data.nodeType === 'screen') {
      onViewInPRD(node.id);
    }
  }, [onViewInPRD]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const selectedFlowNode = graphData.nodes.find((n) => n.id === selectedNodeId);
  const selectedFlowEdge = graphData.edges.find((e) => e.id === selectedEdgeId);

  return (
    <div className="flow-view">
      {/* Left sidebar: filters */}
      <div className="flow-sidebar">
        <div className="flow-sidebar-title">边类型筛选</div>
        {ALL_EDGE_TYPES.map((type) => (
          <div key={type} style={{ marginBottom: 8 }}>
            <Checkbox
              checked={visibleEdgeTypes.has(type)}
              onChange={() => toggleEdgeType(type)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span
                  style={{
                    width: 12,
                    height: 3,
                    background: edgeColors[type],
                    borderRadius: 1,
                    display: 'inline-block',
                  }}
                />
                {edgeLabels[type]}
              </span>
            </Checkbox>
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
          节点：{filteredGraph.nodes.length} · 边：{filteredGraph.edges.length}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
          双击页面节点 → 跳转 PRD
        </div>
      </div>

      {/* Main canvas */}
      <div className="flow-canvas">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.data?.nodeType) {
                case 'screen': return '#6366f1';
                case 'domainState': return '#fbbf24';
                case 'api': return '#fb923c';
                default: return '#94a3b8';
              }
            }}
          />
        </ReactFlow>
      </div>

      {/* Right detail panel */}
      {(selectedFlowNode || selectedFlowEdge) && (
        <FlowDetailPanel
          node={selectedFlowNode ?? null}
          edge={selectedFlowEdge ?? null}
          analysis={analysis}
          onViewInPRD={onViewInPRD}
          onClose={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
        />
      )}
    </div>
  );
}
