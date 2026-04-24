import type { CSSProperties } from '@globallink/design-schema';

/**
 * 从 `background` 简写中去掉最前面的 `url(...)` 及其后紧跟的 position/size/repeat 片段，保留其余层（如渐变）。
 */
export function stripLeadingBackgroundUrlLayer(background: string): string {
  return background
    .trim()
    .replace(/^\s*url\s*\([^)]*\)(?:\s+[^,]*)?(?:\s*,\s*|$)/i, '')
    .trim();
}

/**
 * 删除「素材槽」后应同步清理的节点样式（删槽 = 解除该通道的素材托管，收回写入结果）。
 * 不在此自动删槽：用户在属性面板改样式时由产品另做提示/「解除绑定」。
 */
export function getStyleCleanupAfterMaterialSlotRemove(
  cssTarget: string,
  nodeStyles: Record<string, unknown>,
): { resetProperties: string[]; updateStyles?: Partial<CSSProperties> } {
  if (cssTarget === 'background-image') {
    const resetProperties: string[] = [
      'backgroundImage',
      'backgroundSize',
      'backgroundRepeat',
      'backgroundPosition',
      'backgroundClip',
      'backgroundOrigin',
    ];
    const bg = nodeStyles.background;
    if (typeof bg === 'string' && /\burl\s*\(/i.test(bg)) {
      const rest = stripLeadingBackgroundUrlLayer(bg);
      if (!rest) {
        resetProperties.push('background');
      } else {
        return { resetProperties, updateStyles: { background: rest } };
      }
    }
    return { resetProperties };
  }

  if (cssTarget === 'border-image') {
    return {
      resetProperties: [
        'borderImage',
        'borderImageSlice',
        'borderImageRepeat',
        'borderImageWidth',
      ],
    };
  }

  if (cssTarget === 'mask-image') {
    return {
      resetProperties: [
        'maskImage',
        'maskSize',
        'maskRepeat',
        'maskPosition',
        'WebkitMaskImage',
        'WebkitMaskSize',
        'WebkitMaskRepeat',
        'WebkitMaskPosition',
      ],
    };
  }

  if (cssTarget === '::before.background' || cssTarget === '::after.background') {
    const pseudoName = cssTarget.startsWith('::before') ? 'before' : 'after';
    return { resetProperties: [`--${pseudoName}-bg`] };
  }

  return { resetProperties: [] };
}
