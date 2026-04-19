import type { ComponentTemplate, Screen } from '@globallink/design-schema';
import { SchemaRenderer, type InteractionPreview } from '@globallink/design-engine';
import { getEditorStaticAssetOrigin } from '@/views/editor/utils/staticAssetOrigin';

interface PanoramaCellProps {
  screen: Screen;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  interactionPreview?: InteractionPreview | null;
  label: string;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  /**
   * 自适应内容大小模式（用于组件全景）。
   * true: 不固定视口尺寸，让内容撑开格子大小
   * false: 固定视口尺寸 + CSS scale 缩放（用于页面全景）
   */
  autoSize?: boolean;
  /** 格子背景色，组件全景时应传入原始页面背景色以保持视觉一致 */
  cellBackground?: string;
  active?: boolean;
  onClick: () => void;
}

export function PanoramaCell({
  screen,
  assets,
  globalStates,
  interactionPreview,
  label,
  viewportWidth,
  viewportHeight,
  scale,
  autoSize = false,
  cellBackground,
  active = false,
  onClick,
}: PanoramaCellProps) {
  // Auto-size mode: render at natural size, no viewport scaling
  if (autoSize) {
    return (
      <div
        className="panorama-cell"
        style={{ cursor: 'pointer', flexShrink: 0 }}
        onClick={onClick}
      >
        <div
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            borderRadius: 12,
            border: active
              ? '2px solid #6366f1'
              : '1px solid rgba(0,0,0,0.08)',
            boxShadow: active
              ? '0 0 0 3px rgba(99,102,241,0.15)'
              : '0 2px 8px rgba(0,0,0,0.06)',
            background: cellBackground ?? '#ffffff',
            padding: 16,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.borderColor = '#818cf8';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }
          }}
        >
          <div style={{ pointerEvents: 'none' }}>
            <SchemaRenderer
              screen={screen}
              assets={assets}
              globalStates={globalStates}
              staticAssetOrigin={getEditorStaticAssetOrigin()}
              interactionPreview={interactionPreview}
              hideGhostNodes
              editorCanvasOptimize={false}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 500,
            color: active ? '#6366f1' : '#64748b',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
      </div>
    );
  }

  // Fixed viewport mode: scale entire viewport down (used for page panorama)
  const scaledW = Math.round(viewportWidth * scale);
  const scaledH = Math.round(viewportHeight * scale);

  return (
    <div
      className="panorama-cell"
      style={{
        width: scaledW,
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onClick={onClick}
    >
      {/* Scaled viewport container */}
      <div
        style={{
          width: scaledW,
          height: scaledH,
          overflow: 'hidden',
          borderRadius: 12,
          border: active
            ? '2px solid #6366f1'
            : '1px solid rgba(0,0,0,0.08)',
          boxShadow: active
            ? '0 0 0 3px rgba(99,102,241,0.15)'
            : '0 2px 8px rgba(0,0,0,0.06)',
          background: screen.backgroundColor ?? '#ffffff',
          position: 'relative',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.borderColor = '#818cf8';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
          }
        }}
      >
        <div
          style={{
            width: viewportWidth,
            height: viewportHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none', // Prevent interaction inside cells
          }}
        >
          <SchemaRenderer
            screen={screen}
            assets={assets}
            globalStates={globalStates}
            staticAssetOrigin={getEditorStaticAssetOrigin()}
            interactionPreview={interactionPreview}
            hideGhostNodes
          />
        </div>
      </div>

      {/* Label */}
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 500,
          color: active ? '#6366f1' : '#64748b',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
    </div>
  );
}
