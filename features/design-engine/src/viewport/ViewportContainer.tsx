import React, { useMemo } from 'react';
import type { Viewport } from '@globallink/design-schema';

export interface ViewportContainerProps {
  /**
   * 物理舞台尺寸 / 取景框 —— 同时也定义"真机模拟"视口的宽高。
   *
   * 渲染契约只认它，不再读 schema 上的 frame/defaultViewport 字段。
   * 由调用方（编辑器画布、预览容器、导出工具）显式提供。
   */
  viewport: Viewport;
  /** 缩放因子（默认 1，仅画布交互期使用） */
  scale?: number;
  /** Frame 背景色 */
  backgroundColor?: string;
  /** Frame 内部内容 */
  children: React.ReactNode;
  /** 外层 className */
  className?: string;
  /**
   * 是否"展开 Frame" —— 仅服务编辑器视图层的辅助能力，**不影响最终预览/导出**。
   *
   * - `true`（编辑模式）：Frame 高度由内容自然撑开，overflow:visible，
   *   并叠加一个 viewport 大小的虚线"取景框"指示真机首屏边界。
   * - `false`（预览模式默认）：Frame 严格按 viewport 宽高裁剪 + overflow:hidden，
   *   等价真机表现。任何"内部滚动"都必须由 schema 自己用 CSS 显式声明。
   */
  unfoldFrame?: boolean;
}

/**
 * 渲染一个"物理舞台 / Frame"。
 *
 * 详见 `design_docs/02-product/editor/01-canvas/frame-viewport-canvas-redesign.md` §10：
 * - 渲染契约 = 只看 (viewport, schema.styles)，不再读 schema 上的任何 frame 元信息
 * - "展开长 frame" 是编辑画布的视图层能力，由 unfoldFrame 控制，不污染 schema、不影响预览
 */
export function ViewportContainer({
  viewport,
  scale = 1,
  backgroundColor = '#ffffff',
  children,
  className,
  unfoldFrame = false,
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

  const frameStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: `${viewport.width}px`,
      // 展开模式：高度由内容撑开，保留 viewport.height 作 minHeight 兜底
      // 预览/真机：严格按 viewport 高度 + 裁剪
      height: unfoldFrame ? undefined : `${viewport.height}px`,
      minHeight: unfoldFrame ? `${viewport.height}px` : undefined,
      backgroundColor,
      overflow: unfoldFrame ? 'visible' : 'hidden',
      position: 'relative' as const,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'top center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      flexShrink: 0,
    };
  }, [viewport.width, viewport.height, backgroundColor, scale, unfoldFrame]);

  // 取景框叠加层：仅展开模式（编辑期辅助），预览态 = false 时不绘制
  const cutoutOverlay = useMemo<React.CSSProperties | null>(() => {
    if (!unfoldFrame) return null;
    return {
      position: 'absolute' as const,
      left: 0,
      top: 0,
      width: `${viewport.width}px`,
      height: `${viewport.height}px`,
      border: '1px dashed rgba(13, 153, 255, 0.55)',
      pointerEvents: 'none' as const,
      boxSizing: 'border-box' as const,
      zIndex: 9999,
    };
  }, [unfoldFrame, viewport.width, viewport.height]);

  return (
    <div
      className={className}
      style={outerStyle}
      data-viewport-container
      data-viewport-name={viewport.name}
    >
      <div
        style={frameStyle}
        data-frame
        data-viewport-width={viewport.width}
        data-viewport-height={viewport.height}
      >
        {children}
        {cutoutOverlay && (
          <div data-viewport-cutout style={cutoutOverlay} />
        )}
      </div>
    </div>
  );
}
