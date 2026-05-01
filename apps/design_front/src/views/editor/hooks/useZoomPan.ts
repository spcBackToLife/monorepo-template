import { useEffect, useCallback, useRef } from 'react';
import { editorStore } from '@/stores/editor';

/**
 * 画布平移 / 缩放交互（W1-002）—— Figma 级丝滑画布。
 *
 * 设计原则：编辑模式下，画布区是一个"无限灰背景上的可平移可缩放工作区"，
 * Frame 浮在背景之上。所有手势在画布区内统一接管，不让浏览器抢走。
 *
 * 快捷键：
 * - **滚轮**：垂直 deltaY → panY，水平 deltaX → panX（触控板双指自然丝滑）
 * - **Shift + 滚轮**：把垂直滚轮映射成横向平移（鼠标用户的横向滚动）
 * - **Cmd/Ctrl + 滚轮**：以指针为锚点缩放（保留），范围 0.1 – 4.0
 * - **Space + 拖动**：拖手平移（保留作为"全局拖手"）
 *
 * 关键实现：
 * - 全部 wheel 事件 `preventDefault` —— 阻止 macOS 触控板横向手势触发浏览器后退/前进
 *   （配合 `.editor-canvas-root { overscroll-behavior: none }`）
 * - `passive: false` 才能 preventDefault wheel
 * - 监听整个 `.editor-canvas-root`，鼠标在画布区任意位置滚都接管
 *
 * 预览模式：所有画布手势全部禁用 —— 让 DOM 层（PreviewRenderer 的 overflow:auto）
 * 自然处理"真机模拟滚动"。
 */
export function useZoomPan(containerRef: React.RefObject<HTMLElement | null>) {
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // 预览模式：完全交还给 DOM 层，画布层不拦截
      if (editorStore.previewMode) return;

      // 一律 preventDefault —— 阻止浏览器的"双指横滑前进/后退"等手势
      e.preventDefault();
      e.stopPropagation();

      // ===== Cmd/Ctrl + 滚轮：以指针为锚点缩放 =====
      if (e.metaKey || e.ctrlKey) {
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const oldScale = editorStore.canvasScale;
        // 缩放系数 0.005：跟 Figma 大致一致，约 ~100 deltaY → 1.65x。
        // 旧的 0.0012 太轻，10 倍 deltaY 才能换 ~1.13x，跟手感非常弱。
        const factor = Math.exp(-e.deltaY * 0.005);
        const newScale = Math.min(4.0, Math.max(0.1, oldScale * factor));

        const scaleRatio = newScale / oldScale;
        const newPanX = cursorX - scaleRatio * (cursorX - editorStore.canvasPanX);
        const newPanY = cursorY - scaleRatio * (cursorY - editorStore.canvasPanY);

        editorStore.setCanvasScale(newScale);
        editorStore.setCanvasPan(newPanX, newPanY);
        return;
      }

      // ===== 普通滚轮：平移画布 =====
      // - 触控板双指：deltaX + deltaY 都有，自然得到二维平移
      // - 鼠标 + Shift：把 deltaY 映射成 deltaX（设计工具通用约定）
      // - 鼠标无 Shift：纯垂直
      let dx = -e.deltaX;
      let dy = -e.deltaY;
      if (e.shiftKey && e.deltaX === 0) {
        // Shift + 鼠标垂直滚轮 → 横向平移
        dx = -e.deltaY;
        dy = 0;
      }
      editorStore.setCanvasPan(
        editorStore.canvasPanX + dx,
        editorStore.canvasPanY + dy,
      );
    },
    [containerRef],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !spaceHeld.current) {
      spaceHeld.current = true;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spaceHeld.current = false;
      if (isPanning.current) {
        isPanning.current = false;
      }
    }
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!spaceHeld.current) return;
    if (editorStore.previewMode) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { x: editorStore.canvasPanX, y: editorStore.canvasPanY };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    editorStore.setCanvasPan(panOrigin.current.x + dx, panOrigin.current.y + dy);
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // wheel 必须 passive:false 才能 preventDefault；触控板双指手势就是 wheel
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [containerRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp]);

  return { isPanning: isPanning.current };
}
