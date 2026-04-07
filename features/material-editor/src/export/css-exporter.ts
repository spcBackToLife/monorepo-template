/**
 * CSS 导出器
 *
 * 将图层合成结果导出为 CSS 属性，直接映射到 Schema.styles。
 * 这是素材编辑器的核心输出：CSS-first 设计理念的体现。
 */

import type {
  MaterialLayer,
  CSSOutput,
  FilterConfig,
  ShadowConfig,
  GradientLayerConfig,
  SolidLayerConfig,
  ImageLayerConfig,
  PatternLayerConfig,
} from '../types';
import { gradientToCSS, parseGradientCSS } from '../core/gradient';
import { filtersToCSS } from '../core/filters';
import { shadowsToCSS } from '../core/shadows';

/** 将图层列表导出为 CSS 属性 */
export function layersToCSS(
  layers: MaterialLayer[],
  options?: {
    filters?: FilterConfig[];
    shadows?: ShadowConfig[];
  },
): CSSOutput {
  const backgrounds: string[] = [];
  const backgroundSizes: string[] = [];
  const backgroundPositions: string[] = [];
  const backgroundRepeats: string[] = [];
  const backgroundBlendModes: string[] = [];

  // 从上到下遍历可见图层（order 降序 = 视觉上最上面的图层在 CSS 中排最前）
  const visibleLayers = layers
    .filter((l) => l.visible)
    .sort((a, b) => b.order - a.order);

  for (const layer of visibleLayers) {
    switch (layer.config.type) {
      case 'solid': {
        const cfg = layer.config as SolidLayerConfig;
        backgrounds.push(cfg.color);
        backgroundSizes.push('auto');
        backgroundPositions.push('center');
        backgroundRepeats.push('no-repeat');
        backgroundBlendModes.push(layer.blendMode);
        break;
      }
      case 'gradient': {
        const cfg = layer.config as GradientLayerConfig;
        backgrounds.push(gradientToCSS(cfg));
        backgroundSizes.push('auto');
        backgroundPositions.push('center');
        backgroundRepeats.push('no-repeat');
        backgroundBlendModes.push(layer.blendMode);
        break;
      }
      case 'image': {
        const cfg = layer.config as ImageLayerConfig;
        backgrounds.push(`url(${cfg.src})`);
        backgroundSizes.push(cfg.fit);
        backgroundPositions.push(
          `${cfg.position.x}% ${cfg.position.y}%`
        );
        backgroundRepeats.push('no-repeat');
        backgroundBlendModes.push(layer.blendMode);
        break;
      }
      case 'pattern': {
        const cfg = layer.config as PatternLayerConfig;
        backgrounds.push(`url(${cfg.src})`);
        backgroundSizes.push(`${cfg.tileWidth}px ${cfg.tileHeight}px`);
        backgroundPositions.push('0 0');
        backgroundRepeats.push(cfg.repeat);
        backgroundBlendModes.push(layer.blendMode);
        break;
      }
      // shape, svg, text 类型需导出为图片后处理，暂不走 CSS background
      default:
        break;
    }
  }

  const result: CSSOutput = {};

  if (backgrounds.length > 0) {
    result.background = backgrounds.join(', ');
    result.backgroundSize = backgroundSizes.join(', ');
    result.backgroundPosition = backgroundPositions.join(', ');
    result.backgroundRepeat = backgroundRepeats.join(', ');

    // 只有需要混合时才输出 backgroundBlendMode
    const hasBlend = backgroundBlendModes.some((m) => m !== 'normal');
    if (hasBlend) {
      result.backgroundBlendMode = backgroundBlendModes.join(', ');
    }
  }

  // 滤镜
  if (options?.filters && options.filters.length > 0) {
    const filterCSS = filtersToCSS(options.filters);
    if (filterCSS) result.filter = filterCSS;
  }

  // 阴影
  if (options?.shadows && options.shadows.length > 0) {
    const shadowCSS = shadowsToCSS(options.shadows);
    if (shadowCSS.boxShadow) result.boxShadow = shadowCSS.boxShadow;
    if (shadowCSS.textShadow) result.textShadow = shadowCSS.textShadow;
  }

  return result;
}

/** 从 CSS 属性解析出图层列表（逆向操作，用于编辑器初始化） */
export function cssToLayers(styles: Record<string, string | number | undefined>): MaterialLayer[] {
  const layers: MaterialLayer[] = [];
  let orderCounter = 0;

  const bg = styles.background;
  if (typeof bg === 'string' && bg) {
    const parts = splitCSSBackgrounds(bg);
    for (const part of parts) {
      const trimmed = part.trim();

      // 检查是否是渐变
      if (trimmed.match(/^(linear|radial|conic)-gradient\(/)) {
        const gradientConfig = parseGradientCSS(trimmed);
        if (gradientConfig) {
          layers.push({
            id: `layer_init_${++orderCounter}`,
            name: `渐变 ${orderCounter}`,
            type: 'gradient',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            order: orderCounter,
            config: gradientConfig,
          });
        }
        continue;
      }

      // 检查是否是 url()
      const urlMatch = trimmed.match(/^url\(["']?(.+?)["']?\)/);
      if (urlMatch) {
        layers.push({
          id: `layer_init_${++orderCounter}`,
          name: `图片 ${orderCounter}`,
          type: 'image',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          order: orderCounter,
          config: {
            type: 'image',
            src: urlMatch[1],
            fit: 'cover',
            position: { x: 50, y: 50 },
            size: { width: 100, height: 100 },
          },
        });
        continue;
      }

      // 否则当作纯色
      if (trimmed) {
        layers.push({
          id: `layer_init_${++orderCounter}`,
          name: `纯色 ${orderCounter}`,
          type: 'solid',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          order: orderCounter,
          config: { type: 'solid', color: trimmed },
        });
      }
    }
  }

  // 也检查 backgroundColor
  const bgColor = styles.backgroundColor;
  if (typeof bgColor === 'string' && bgColor && layers.length === 0) {
    layers.push({
      id: `layer_init_${++orderCounter}`,
      name: '背景色',
      type: 'solid',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      order: orderCounter,
      config: { type: 'solid', color: bgColor },
    });
  }

  return layers;
}

/** 分割 CSS background 声明中的多层背景 */
function splitCSSBackgrounds(css: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of css) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;

    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** 生成可复制的 CSS 代码文本 */
export function generateCSSCode(output: CSSOutput): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(output)) {
    if (value === undefined) continue;
    // 转为 kebab-case
    const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    lines.push(`${cssKey}: ${value};`);
  }

  return lines.join('\n');
}
