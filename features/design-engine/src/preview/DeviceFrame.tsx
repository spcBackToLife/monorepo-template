import React from 'react';
import type { Platform } from '@globallink/design-schema';

export interface DeviceFrameProps {
  width: number;
  height: number;
  platform: Platform;
  children: React.ReactNode;
  showFrame?: boolean;
}

const BEZEL = {
  mobile: { top: 54, bottom: 34, side: 14, radius: 44 },
  tablet: { top: 36, bottom: 28, side: 12, radius: 28 },
  pc: { top: 28, bottom: 8, side: 2, radius: 8 },
} as const;

/**
 * W8-100：设备外壳框架（纯 CSS 模拟 bezel，不依赖图片）。
 * showFrame=false 时只渲染视口阴影。
 */
export function DeviceFrame({
  width,
  height,
  platform,
  children,
  showFrame = true,
}: DeviceFrameProps) {
  if (!showFrame) {
    return (
      <div
        style={{
          width,
          height,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    );
  }

  const b = BEZEL[platform];

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: platform === 'pc' ? '#222' : '#1a1a1a',
        borderRadius: b.radius,
        padding: `${b.top}px ${b.side}px ${b.bottom}px`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {platform === 'mobile' && (
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 6,
            borderRadius: 3,
            background: '#333',
          }}
        />
      )}
      {platform === 'tablet' && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#333',
          }}
        />
      )}
      <div
        style={{
          width,
          height,
          overflow: 'hidden',
          borderRadius: Math.max(4, b.radius - b.side),
          position: 'relative',
          background: '#fff',
        }}
      >
        {children}
      </div>
      {platform === 'mobile' && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 100,
            height: 4,
            borderRadius: 2,
            background: '#444',
          }}
        />
      )}
    </div>
  );
}
