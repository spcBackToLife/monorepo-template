import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastType, ToastPosition } from '@globallink/design-schema';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  position: ToastPosition;
}

export interface ToastRendererProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const MAX_VISIBLE = 3;

const ICONS: Record<ToastType, string> = {
  success: '\u2705',
  error: '\u274C',
  warning: '\u26A0\uFE0F',
  info: '\u2139\uFE0F',
};

const BG_COLORS: Record<ToastType, string> = {
  success: '#f0fdf4',
  error: '#fef2f2',
  warning: '#fffbeb',
  info: '#eff6ff',
};

const BORDER_COLORS: Record<ToastType, string> = {
  success: '#bbf7d0',
  error: '#fecaca',
  warning: '#fde68a',
  info: '#bfdbfe',
};

const TEXT_COLORS: Record<ToastType, string> = {
  success: '#166534',
  error: '#991b1b',
  warning: '#92400e',
  info: '#1e40af',
};

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, toast.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, toast.duration]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: BG_COLORS[toast.type],
        border: `1px solid ${BORDER_COLORS[toast.type]}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: TEXT_COLORS[toast.type],
        fontSize: '14px',
        lineHeight: '1.4',
        maxWidth: '320px',
        minWidth: '200px',
        pointerEvents: 'auto' as const,
        transition: 'opacity 200ms ease, transform 200ms ease',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-8px)' : 'translateY(0)',
        animation: 'toast-slide-in 200ms ease-out',
      }}
      onClick={dismiss}
    >
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{ICONS[toast.type]}</span>
      <span style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</span>
    </div>
  );
}

export function ToastRenderer({ toasts, onDismiss }: ToastRendererProps) {
  const visible = toasts.slice(-MAX_VISIBLE);
  if (visible.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {visible.map((t) => (
          <SingleToast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}
