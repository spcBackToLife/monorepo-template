import React, { useMemo } from 'react';
import type { ComponentTemplate, ComponentNode, Screen } from '@globallink/design-schema';
import { SchemaRenderer } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';
import { getEditorStaticAssetOrigin } from '@/views/editor/utils/staticAssetOrigin';
import { buildIsolatedScreen } from '../../Panorama/PanoramaPage';

const THUMB_W = 80;
const THUMB_H = 60;

interface StatePreviewThumbnailProps {
  screen: Screen;
  assets: ComponentTemplate[];
  nodeId: string;
  stateName: string;
  label: string;
  globalStates: Record<string, string>;
  isActive: boolean;
  onClick: () => void;
}

/** 在组件树中找到指定 ID 的节点 */
function findNodeById(node: ComponentNode, id: string): ComponentNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * StatePreviewThumbnail — 单个状态的缩略图预览。
 *
 * - 对于 Root 节点：缩放渲染整个页面（scale=0.1）
 * - 对于非 Root 组件：构建隔离 Screen，只渲染目标组件自身
 */
export const StatePreviewThumbnail = React.memo(function StatePreviewThumbnail({
  screen,
  assets,
  nodeId,
  stateName,
  label,
  globalStates,
  isActive,
  onClick,
}: StatePreviewThumbnailProps) {
  const viewport = editorStore.currentViewport;
  const vpW = viewport?.width ?? 375;
  const vpH = viewport?.height ?? 667;

  const isRootNode = nodeId === screen.rootNode.id;

  // For non-root nodes: build an isolated screen containing only the target component
  const renderScreen = useMemo(() => {
    if (isRootNode) return screen;
    const targetNode = findNodeById(screen.rootNode, nodeId);
    if (!targetNode) return screen;
    return buildIsolatedScreen(screen, targetNode, vpW);
  }, [screen, nodeId, isRootNode, vpW]);

  // Root node: render scaled-down full page
  // Non-root: render component at natural size
  if (isRootNode) {
    const thumbScale = THUMB_W / vpW;
    return (
      <div
        style={{ flexShrink: 0, cursor: 'pointer', width: THUMB_W }}
        onClick={onClick}
        title={label}
      >
        <div
          style={{
            width: THUMB_W,
            height: THUMB_H,
            overflow: 'hidden',
            borderRadius: 6,
            border: isActive ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isActive ? '0 0 0 2px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
            background: screen.backgroundColor ?? '#ffffff',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        >
          <div
            style={{
              width: vpW,
              height: vpH,
              transform: `scale(${thumbScale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <SchemaRenderer
              screen={renderScreen}
              assets={assets}
              globalStates={globalStates}
              staticAssetOrigin={getEditorStaticAssetOrigin()}
              interactionPreview={{ nodeId, state: stateName }}
              hideGhostNodes
            />
          </div>
        </div>
        <ThumbnailLabel label={label} isActive={isActive} />
      </div>
    );
  }

  // Non-root component: render at natural size, scaled to fit thumbnail
  return (
    <div
      style={{ flexShrink: 0, cursor: 'pointer', width: THUMB_W }}
      onClick={onClick}
      title={label}
    >
      <div
        style={{
          width: THUMB_W,
          height: THUMB_H,
          overflow: 'hidden',
          borderRadius: 6,
          border: isActive ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: isActive ? '0 0 0 2px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
          background: '#ffffff',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: 'scale(0.2)',
            transformOrigin: 'center center',
            pointerEvents: 'none',
          }}
        >
          <SchemaRenderer
            screen={renderScreen}
            assets={assets}
            globalStates={globalStates}
            staticAssetOrigin={getEditorStaticAssetOrigin()}
            interactionPreview={{ nodeId, state: stateName }}
            hideGhostNodes
            editorCanvasOptimize={false}
          />
        </div>
      </div>
      <ThumbnailLabel label={label} isActive={isActive} />
    </div>
  );
});

function ThumbnailLabel({ label, isActive }: { label: string; isActive: boolean }) {
  return (
    <div
      style={{
        marginTop: 2,
        fontSize: 9,
        color: isActive ? '#3b82f6' : '#94a3b8',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: '14px',
      }}
    >
      {label}
    </div>
  );
}
