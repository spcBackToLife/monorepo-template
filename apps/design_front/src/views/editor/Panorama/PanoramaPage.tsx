import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Button, Slider, Segmented, Tooltip } from 'antd';
import { ArrowLeftOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { Screen, ComponentNode, ComponentTemplate } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { PanoramaCell } from './PanoramaCell';
import { usePanoramaCombinations, type PanoramaCombination } from './useCombinations';

type FilterType = 'all' | 'interaction' | 'custom';

/**
 * 在组件树中找到指定 ID 的节点
 */
function findNodeById(node: ComponentNode, id: string): ComponentNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * 为组件全景构造一个只包含目标组件的临时 Screen。
 *
 * 不能直接把目标组件当 rootNode——SchemaRenderer 会给 rootNode 强制
 * height:100%/width:100%，导致按钮之类的小组件撑满整个视口。
 *
 * 解决方案：创建一个固定宽度的 wrapper div 作为 rootNode，目标组件作为唯一子节点。
 * wrapper 宽度与视口宽度相同，这样 width:100% 的子组件能正常展示。
 * wrapper 高度 auto 让内容自适应。
 */
export function buildIsolatedScreen(screen: Screen, targetNode: ComponentNode, viewportWidth = 375): Screen {
  const wrapperId = `__panorama_wrapper_${targetNode.id}`;
  const wrapperNode: ComponentNode = {
    id: wrapperId,
    type: 'div',
    name: 'PanoramaWrapper',
    styles: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      width: `${viewportWidth}px`,
      height: 'auto',
      minHeight: 'auto',
      padding: '16px',
      margin: '0',
      background: 'transparent',
    },
    props: {},
    children: [targetNode],
    states: [],
    activeState: 'default',
    visible: true,
    events: [],
    locked: false,
  };

  return {
    ...screen,
    rootNode: wrapperNode,
    backgroundColor: 'transparent',
  };
}

/**
 * PanoramaPage — 全屏全景路由页 /editor/:id/panorama
 *
 * 独立路由页面，全屏展示组件/页面在所有状态下的渲染。
 * 通过 URL query param ?node=xxx 区分组件全景和页面全景。
 *
 * 关键设计决策（第一性原理）：
 * - 全景 = 把所有场景的预览平铺在一起对比
 * - 每个格子 = 在该状态/数据下的真实渲染效果
 * - 组件全景只渲染目标组件（不是整个页面），因为目的是对比组件自身的状态差异
 * - 使用 hideGhostNodes=true 让被 childrenVisibility 隐藏的节点真正不渲染
 */
export const PanoramaPage = observer(function PanoramaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetNodeId = searchParams.get('node');

  const screen = editorStore.activeScreen;
  const project = editorStore.project;
  const viewport = editorStore.currentViewport;

  // Determine if this is component mode or page mode
  // If targetNodeId is the root node, treat as page mode (not component mode)
  const isRootNode = targetNodeId && screen ? targetNodeId === screen.rootNode.id : false;
  const isComponentMode = !!targetNodeId && !isRootNode;

  const [scale, setScale] = useState(isComponentMode ? 1.0 : 0.35);
  const [filter, setFilter] = useState<FilterType>('all');

  // For component mode: find the target node and build an isolated screen
  const targetNode = useMemo(() => {
    if (!isComponentMode || !targetNodeId || !screen) return null;
    return findNodeById(screen.rootNode, targetNodeId) ?? null;
  }, [isComponentMode, targetNodeId, screen]);

  const isolatedScreen = useMemo(() => {
    if (!isComponentMode || !targetNode || !screen) return null;
    return buildIsolatedScreen(screen, targetNode, viewport?.width ?? 375);
  }, [isComponentMode, targetNode, screen, viewport?.width]);

  // The effective node id for panorama combinations:
  // - Component mode (non-root): use targetNodeId for state enumeration
  // - Page/Root mode: null (enumerate domain states)
  const effectiveTargetNodeId = isComponentMode ? targetNodeId : (isRootNode ? targetNodeId : null);

  // Compute combinations
  const combinations = usePanoramaCombinations(
    screen ?? undefined,
    effectiveTargetNodeId,
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

  // For component panorama: use the original page background color so isolated components
  // render in the same visual context as they do on the page (e.g., dark bg for dark-themed pages)
  const pageBgColor = screen.rootNode.styles?.backgroundColor
    || screen.backgroundColor
    || '#ffffff';

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

  // For component mode: use isolated screen (only the target component)
  // For page mode: use the full screen
  const renderScreen = (isComponentMode && isolatedScreen) ? isolatedScreen : screen;

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
                  screen={renderScreen}
                  assets={project?.componentAssets ?? []}
                  viewport={viewport}
                  scale={scale}
                  autoSize={isComponentMode}
                  cellBackground={isComponentMode ? pageBgColor : undefined}
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
                  screen={renderScreen}
                  assets={project?.componentAssets ?? []}
                  viewport={viewport}
                  scale={scale}
                  autoSize={isComponentMode}
                  cellBackground={isComponentMode ? pageBgColor : undefined}
                  onCellClick={handleCellClick}
                />
              </div>
            )}
          </>
        ) : (
          <CellGrid
            cells={filtered}
            screen={renderScreen}
            assets={project?.componentAssets ?? []}
            viewport={viewport}
            scale={scale}
            autoSize={isComponentMode}
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
  autoSize,
  cellBackground,
  onCellClick,
}: {
  cells: PanoramaCombination[];
  screen: Screen;
  assets: ComponentTemplate[];
  viewport: { width: number; height: number };
  scale: number;
  autoSize?: boolean;
  /** Background color for cells (component panorama should use original page bg) */
  cellBackground?: string;
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
          autoSize={autoSize}
          cellBackground={cellBackground}
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
