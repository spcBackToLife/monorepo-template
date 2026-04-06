import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Button, Slider, Segmented, Tooltip } from 'antd';
import { ArrowLeftOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { Screen, ComponentTemplate } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { PanoramaCell } from './PanoramaCell';
import { usePanoramaCombinations, type PanoramaCombination } from './useCombinations';

type FilterType = 'all' | 'interaction' | 'custom';

/**
 * PanoramaPage — 全屏全景路由页 /editor/:id/panorama
 *
 * 独立路由页面，全屏展示组件/页面在所有状态下的渲染。
 * 通过 URL query param ?node=xxx 区分组件全景和页面全景。
 */
export const PanoramaPage = observer(function PanoramaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetNodeId = searchParams.get('node');

  const screen = editorStore.activeScreen;
  const project = editorStore.project;
  const viewport = editorStore.currentViewport;

  const isComponentMode = !!targetNodeId;
  const [scale, setScale] = useState(isComponentMode ? 1.0 : 0.35);
  const [filter, setFilter] = useState<FilterType>('all');

  // Compute combinations
  const combinations = usePanoramaCombinations(
    screen ?? undefined,
    targetNodeId,
    editorStore.currentGlobalStates,
  );

  // Apply filter
  const filtered = useMemo(() => {
    if (filter === 'all') return combinations;
    return combinations.filter((c) => c.category === filter);
  }, [combinations, filter]);

  // Group by category for section headers
  const hasInteraction = combinations.some((c) => c.category === 'interaction');
  const hasCustom = combinations.some((c) => c.category === 'custom');

  // Esc to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  if (!screen || !viewport) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#94a3b8',
          background: '#f8f9fb',
        }}
      >
        无可用页面
      </div>
    );
  }

  // Find target node name
  const targetNodeName = targetNodeId ? findNodeName(screen.rootNode, targetNodeId) : null;
  const title = isComponentMode
    ? `组件全景: ${targetNodeName ?? targetNodeId}`
    : `页面全景: ${screen.name}`;

  const handleCellClick = (combo: (typeof combinations)[0]) => {
    if (combo.interactionPreview) {
      editorStore.setPreviewInteractionState(combo.interactionPreview.state);
    } else {
      for (const [key, value] of Object.entries(combo.globalStates)) {
        editorStore.setCurrentGlobalState(key, value);
      }
    }
    navigate(-1);
  };

  // Render sections
  const interactionCells = filtered.filter((c) => c.category === 'interaction');
  const customCells = filtered.filter((c) => c.category === 'custom');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#f8f9fb',
        overflow: 'hidden',
      }}
    >
      {/* ===== Top Bar ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          flexShrink: 0,
        }}
      >
        <Tooltip title="返回编辑器 (Esc)">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            返回编辑器
          </Button>
        </Tooltip>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreOutlined style={{ color: '#6366f1', fontSize: 16 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
            {title}
          </span>
        </div>

        <span
          style={{
            fontSize: 12,
            color: '#94a3b8',
            background: '#f1f5f9',
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          {filtered.length} 个状态
        </span>

        {/* Filter — only show in component mode where we have interaction + custom */}
        {isComponentMode && hasInteraction && hasCustom && (
          <Segmented
            size="small"
            value={filter}
            onChange={(v) => setFilter(v as FilterType)}
            options={[
              { label: '全部', value: 'all' },
              { label: '交互态', value: 'interaction' },
              { label: '自定义态', value: 'custom' },
            ]}
          />
        )}

        <div style={{ flex: 1 }} />

        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>缩放</span>
          <Slider
            min={0.15}
            max={1.5}
            step={0.05}
            value={scale}
            onChange={setScale}
            style={{ flex: 1, margin: 0 }}
            tooltip={{ formatter: (v) => `${Math.round((v ?? 1) * 100)}%` }}
          />
          <span style={{ fontSize: 11, color: '#64748b', minWidth: 32 }}>
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      {/* ===== Grid ===== */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {filter === 'all' && isComponentMode ? (
          <>
            {/* Sectioned layout */}
            {interactionCells.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#94a3b8',
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  交互状态
                </div>
                <CellGrid
                  cells={interactionCells}
                  screen={screen}
                  assets={project?.componentAssets ?? []}
                  viewport={viewport}
                  scale={scale}
                  onCellClick={handleCellClick}
                />
              </div>
            )}
            {customCells.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#94a3b8',
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  自定义状态
                </div>
                <CellGrid
                  cells={customCells}
                  screen={screen}
                  assets={project?.componentAssets ?? []}
                  viewport={viewport}
                  scale={scale}
                  onCellClick={handleCellClick}
                />
              </div>
            )}
          </>
        ) : (
          <CellGrid
            cells={filtered}
            screen={screen}
            assets={project?.componentAssets ?? []}
            viewport={viewport}
            scale={scale}
            onCellClick={handleCellClick}
          />
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 80 }}>
            该{isComponentMode ? '组件' : '页面'}没有定义状态变体
          </div>
        )}
      </div>

      {/* ===== Footer hint ===== */}
      <div
        style={{
          padding: '8px 20px',
          borderTop: '1px solid #e5e7eb',
          background: '#ffffff',
          fontSize: 11,
          color: '#94a3b8',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        点击任意格子应用该状态并返回编辑器 · 按 Esc 返回
      </div>
    </div>
  );
});

/** Grid layout for panorama cells */
function CellGrid({
  cells,
  screen,
  assets,
  viewport,
  scale,
  onCellClick,
}: {
  cells: PanoramaCombination[];
  screen: Screen;
  assets: ComponentTemplate[];
  viewport: { width: number; height: number };
  scale: number;
  onCellClick: (combo: PanoramaCombination) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
      }}
    >
      {cells.map((combo) => (
        <PanoramaCell
          key={combo.id}
          screen={screen}
          assets={assets}
          globalStates={combo.globalStates}
          interactionPreview={combo.interactionPreview ?? null}
          label={combo.label}
          viewportWidth={viewport.width}
          viewportHeight={viewport.height}
          scale={scale}
          onClick={() => onCellClick(combo)}
        />
      ))}
    </div>
  );
}

/** Find a node's name by id (recursive search) */
function findNodeName(
  node: { id: string; name?: string; children?: Array<{ id: string; name?: string; children?: unknown[] }> },
  id: string,
): string | null {
  if (node.id === id) return node.name ?? null;
  for (const child of (node.children ?? []) as typeof node[]) {
    const found = findNodeName(child, id);
    if (found) return found;
  }
  return null;
}
