import React from 'react';
import type { ComponentTemplate, Screen } from '@globallink/design-schema';
import { SchemaRenderer } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';

const THUMB_W = 80;
const THUMB_H = 60;
const THUMB_SCALE = 0.1;

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

/**
 * StatePreviewThumbnail — 单个状态的缩略图预览。
 *
 * 用 SchemaRenderer 在 scale=0.1 下渲染整个页面，
 * 通过 interactionPreview 强制目标组件显示指定状态。
 * 80×60px 大小，pointerEvents:none，不影响交互性能。
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
            transform: `scale(${THUMB_SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <SchemaRenderer
            screen={screen}
            assets={assets}
            globalStates={globalStates}
            interactionPreview={{ nodeId, state: stateName }}
          />
        </div>
      </div>
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
    </div>
  );
});
