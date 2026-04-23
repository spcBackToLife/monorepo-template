/**
 * 导出用：去掉仅编辑器预览的画布背景（深色/棋盘格），恢复为 Schema 中的 backgroundColor。
 */
export function prepareMaterialSvgCloneForExport(
  clone: SVGSVGElement,
  schemaBackgroundColor: string | undefined,
): void {
  const fill = schemaBackgroundColor && schemaBackgroundColor.trim() !== ''
    ? schemaBackgroundColor
    : 'transparent';
  const rect = clone.querySelector('[data-canvas-bg="true"]');
  if (rect) {
    rect.setAttribute('fill', fill);
  }
  clone.querySelectorAll('pattern[data-workbench-checker="true"]').forEach((n) => {
    n.parentNode?.removeChild(n);
  });
}
