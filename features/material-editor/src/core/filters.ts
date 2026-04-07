/**
 * CSS 滤镜工具集
 *
 * 提供 CSS filter 的解析和生成功能。
 */

import type { FilterConfig, CSSFilterType } from '../types';

/** 默认滤镜值（还原到无效果时的值） */
export const FILTER_DEFAULTS: Record<CSSFilterType, string> = {
  'blur': '0px',
  'brightness': '1',
  'contrast': '1',
  'grayscale': '0',
  'hue-rotate': '0deg',
  'invert': '0',
  'opacity': '1',
  'saturate': '1',
  'sepia': '0',
  'drop-shadow': '0 0 0 transparent',
};

/** 滤镜取值范围说明 */
export const FILTER_RANGES: Record<CSSFilterType, { min: number; max: number; step: number; unit: string }> = {
  'blur': { min: 0, max: 50, step: 0.5, unit: 'px' },
  'brightness': { min: 0, max: 3, step: 0.05, unit: '' },
  'contrast': { min: 0, max: 3, step: 0.05, unit: '' },
  'grayscale': { min: 0, max: 1, step: 0.05, unit: '' },
  'hue-rotate': { min: 0, max: 360, step: 1, unit: 'deg' },
  'invert': { min: 0, max: 1, step: 0.05, unit: '' },
  'opacity': { min: 0, max: 1, step: 0.05, unit: '' },
  'saturate': { min: 0, max: 3, step: 0.05, unit: '' },
  'sepia': { min: 0, max: 1, step: 0.05, unit: '' },
  'drop-shadow': { min: 0, max: 50, step: 1, unit: 'px' },
};

/** 滤镜中文名 */
export const FILTER_LABELS: Record<CSSFilterType, string> = {
  'blur': '模糊',
  'brightness': '亮度',
  'contrast': '对比度',
  'grayscale': '灰度',
  'hue-rotate': '色相旋转',
  'invert': '反色',
  'opacity': '透明度',
  'saturate': '饱和度',
  'sepia': '复古',
  'drop-shadow': '投影',
};

/** 将滤镜数组转为 CSS filter 字符串 */
export function filtersToCSS(filters: FilterConfig[]): string {
  const parts: string[] = [];

  for (const f of filters) {
    if (!f.enabled) continue;

    const range = FILTER_RANGES[f.type];
    if (f.type === 'drop-shadow') {
      parts.push(`drop-shadow(${f.value})`);
    } else {
      parts.push(`${f.type}(${f.value}${range.unit})`);
    }
  }

  return parts.join(' ');
}

/** 解析 CSS filter 字符串为滤镜数组 */
export function parseFilterCSS(css: string): FilterConfig[] {
  if (!css || css === 'none') return [];

  const filters: FilterConfig[] = [];
  // Match function calls like blur(4px), brightness(1.2), drop-shadow(...)
  const regex = /([\w-]+)\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(css)) !== null) {
    const type = match[1] as CSSFilterType;
    let value = match[2].trim();

    if (type in FILTER_DEFAULTS) {
      const range = FILTER_RANGES[type];
      // Strip unit for numerical values
      if (range.unit && value.endsWith(range.unit)) {
        value = value.slice(0, -range.unit.length);
      }

      filters.push({
        type,
        value,
        enabled: true,
      });
    }
  }

  return filters;
}

/** 创建默认滤镜配置 */
export function createFilter(type: CSSFilterType, value?: string): FilterConfig {
  return {
    type,
    value: value ?? FILTER_DEFAULTS[type],
    enabled: true,
  };
}
