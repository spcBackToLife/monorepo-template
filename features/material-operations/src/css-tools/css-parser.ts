/**
 * CSS background 解析工具集
 */

import type { MaterialLayer, FilterConfig, ShadowConfig } from './types';
import { parseGradientCSS } from './gradient';
import { parseFilterCSS } from './filters';
import { parseBoxShadow, parseTextShadow } from './shadows';

export function parseStylesForEditor(styles: Record<string, string | number | undefined>): {
  layers: MaterialLayer[]; filters: FilterConfig[]; shadows: ShadowConfig[];
} {
  const layers: MaterialLayer[] = [];
  let orderCounter = 0;

  const bg = styles.background;
  if (typeof bg === 'string' && bg) {
    const parts = splitCSSMultiValues(bg);
    for (const part of parts) {
      const layer = parseBackgroundPart(part.trim(), ++orderCounter);
      if (layer) layers.push(layer);
    }
  }

  const bgColor = styles.backgroundColor;
  if (typeof bgColor === 'string' && bgColor && layers.length === 0) {
    layers.push({ id: `layer_init_${++orderCounter}`, name: '背景色', type: 'solid', visible: true, locked: false, opacity: 1, blendMode: 'normal', order: orderCounter, config: { type: 'solid', color: bgColor } });
  }

  const bgImage = styles.backgroundImage;
  if (typeof bgImage === 'string' && bgImage && bgImage !== 'none') {
    const parts = splitCSSMultiValues(bgImage);
    for (const part of parts) {
      const existing = layers.find((l) => l.config.type === 'image' || l.config.type === 'gradient');
      if (!existing) { const layer = parseBackgroundPart(part.trim(), ++orderCounter); if (layer) layers.push(layer); }
    }
  }

  const filterCSS = styles.filter;
  const filters = typeof filterCSS === 'string' ? parseFilterCSS(filterCSS) : [];

  const shadows: ShadowConfig[] = [];
  const boxShadow = styles.boxShadow;
  if (typeof boxShadow === 'string') shadows.push(...parseBoxShadow(boxShadow));
  const textShadow = styles.textShadow;
  if (typeof textShadow === 'string') shadows.push(...parseTextShadow(textShadow));

  return { layers, filters, shadows };
}

function parseBackgroundPart(part: string, order: number): MaterialLayer | null {
  const gradientMatch = part.match(/^(linear|radial|conic)-gradient\(/);
  if (gradientMatch) {
    const config = parseGradientCSS(part);
    if (config) return { id: `layer_init_${order}`, name: `渐变 ${order}`, type: 'gradient', visible: true, locked: false, opacity: 1, blendMode: 'normal', order, config };
  }
  const urlMatch = part.match(/url\(["']?(.+?)["']?\)/);
  if (urlMatch) return { id: `layer_init_${order}`, name: `图片 ${order}`, type: 'image', visible: true, locked: false, opacity: 1, blendMode: 'normal', order, config: { type: 'image', src: urlMatch[1], fit: 'cover', position: { x: 50, y: 50 }, size: { width: 100, height: 100 } } };
  if (part && !part.includes('(') || part.match(/^(rgb|hsl)a?\(/) || part.match(/^#[0-9a-fA-F]{3,8}$/)) {
    return { id: `layer_init_${order}`, name: `纯色 ${order}`, type: 'solid', visible: true, locked: false, opacity: 1, blendMode: 'normal', order, config: { type: 'solid', color: part } };
  }
  return null;
}

function splitCSSMultiValues(css: string): string[] {
  const parts: string[] = []; let depth = 0; let current = '';
  for (const ch of css) { if (ch === '(') depth++; else if (ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(current); current = ''; } else { current += ch; } }
  if (current.trim()) parts.push(current); return parts;
}
