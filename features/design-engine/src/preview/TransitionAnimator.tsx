import React, { useMemo } from 'react';

export interface TransitionAnimatorProps {
  /** 通常为当前 screenId，变化时触发动画 */
  transitionKey: string;
  /** 与 editorStore.previewTransition 一致 */
  transition: string;
  durationMs?: number;
  children: React.ReactNode;
}

const DEFAULT_MS = 320;

const KEYFRAMES: Record<string, string> = {
  fade: `@keyframes previewTx { from { opacity: 0.82; } to { opacity: 1; } }`,
  'slide-left': `@keyframes previewTx { from { opacity: 0.92; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }`,
  'slide-right': `@keyframes previewTx { from { opacity: 0.92; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }`,
  'slide-up': `@keyframes previewTx { from { opacity: 0.92; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`,
  'slide-down': `@keyframes previewTx { from { opacity: 0.92; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }`,
  'zoom-in': `@keyframes previewTx { from { opacity: 0.88; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`,
  zoomIn: `@keyframes previewTx { from { opacity: 0.88; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`,
};

/**
 * 预览页切换进入动画（fade、四向 slide、zoom-in）。
 * 后退时由 store 使用与进入相反的 slide（如 slide-right）。
 */
export function TransitionAnimator({
  transitionKey,
  transition,
  durationMs = DEFAULT_MS,
  children,
}: TransitionAnimatorProps) {
  const kf = useMemo(() => {
    return KEYFRAMES[transition] ?? KEYFRAMES.fade;
  }, [transition]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <style>{`${kf}
        .preview-tx-inner {
          animation: previewTx ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
      <div
        key={transitionKey}
        className="preview-tx-inner"
        style={{ width: '100%', height: '100%', minHeight: '100%', boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </div>
  );
}
