import React, { useMemo } from 'react';
import type { Viewport } from '@globallink/design-schema';

export interface ViewportContainerProps {
  /** The viewport to render (determines width/height) */
  viewport: Viewport;
  /** Scale factor for the viewport (default: 1) */
  scale?: number;
  /** Background color for the viewport area */
  backgroundColor?: string;
  /** Children to render inside the viewport */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Container that simulates a device viewport.
 *
 * Sets an exact width/height based on the Viewport definition,
 * centers the content, and applies an optional scale transform.
 */
export function ViewportContainer({
  viewport,
  scale = 1,
  backgroundColor = '#ffffff',
  children,
  className,
}: ViewportContainerProps) {
  const outerStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      width: '100%',
      height: '100%',
      overflow: 'auto',
      padding: '24px',
      boxSizing: 'border-box' as const,
    }),
    [],
  );

  const viewportStyle = useMemo<React.CSSProperties>(
    () => ({
      width: `${viewport.width}px`,
      height: `${viewport.height}px`,
      backgroundColor,
      overflow: 'hidden',
      position: 'relative' as const,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'top center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      flexShrink: 0,
    }),
    [viewport.width, viewport.height, backgroundColor, scale],
  );

  return (
    <div
      className={className}
      style={outerStyle}
      data-viewport-container
      data-viewport-name={viewport.name}
    >
      <div
        style={viewportStyle}
        data-viewport
        data-viewport-width={viewport.width}
        data-viewport-height={viewport.height}
      >
        {children}
      </div>
    </div>
  );
}
