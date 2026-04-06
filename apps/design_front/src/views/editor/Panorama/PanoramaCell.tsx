import type { ComponentTemplate, Screen } from '@globallink/design-schema';
import { SchemaRenderer, type InteractionPreview } from '@globallink/design-engine';

interface PanoramaCellProps {
  screen: Screen;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  interactionPreview?: InteractionPreview | null;
  label: string;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
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
  active = false,
  onClick,
}: PanoramaCellProps) {
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
            interactionPreview={interactionPreview}
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
