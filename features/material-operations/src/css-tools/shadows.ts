/**
 * CSS 阴影工具集
 *
 * 提供 box-shadow 和 text-shadow 的解析和生成。
 */

import type { ShadowConfig } from './types';

/** 将阴影配置数组转为 CSS box-shadow 字符串 */
export function shadowsToCSS(shadows: ShadowConfig[]): {
  boxShadow?: string;
  textShadow?: string;
} {
  const boxParts: string[] = [];
  const textParts: string[] = [];

  for (const s of shadows) {
    if (!s.enabled) continue;

    if (s.type === 'box-shadow') {
      const parts = [
        s.inset ? 'inset' : '',
        `${s.x}px`,
        `${s.y}px`,
        `${s.blur}px`,
        s.spread != null ? `${s.spread}px` : '',
        s.color,
      ].filter(Boolean).join(' ');
      boxParts.push(parts);
    } else if (s.type === 'text-shadow') {
      textParts.push(`${s.x}px ${s.y}px ${s.blur}px ${s.color}`);
    }
  }

  const result: { boxShadow?: string; textShadow?: string } = {};
  if (boxParts.length > 0) result.boxShadow = boxParts.join(', ');
  if (textParts.length > 0) result.textShadow = textParts.join(', ');
  return result;
}

/** 解析 CSS box-shadow 字符串 */
export function parseBoxShadow(css: string): ShadowConfig[] {
  if (!css || css === 'none') return [];

  const shadows: ShadowConfig[] = [];
  // Split by top-level commas
  const parts = splitShadows(css);

  for (const part of parts) {
    const trimmed = part.trim();
    const inset = trimmed.startsWith('inset');
    const values = (inset ? trimmed.slice(5) : trimmed).trim();

    // Extract px values and color
    const tokens = values.split(/\s+/);
    // Expect: x y blur [spread] color
    const numericTokens: number[] = [];
    let color = '';

    for (const token of tokens) {
      const num = parseFloat(token);
      if (!isNaN(num) && (token.endsWith('px') || /^-?\d+(\.\d+)?$/.test(token))) {
        numericTokens.push(num);
      } else {
        // Everything else is color
        color += (color ? ' ' : '') + token;
      }
    }

    if (numericTokens.length >= 2) {
      shadows.push({
        type: 'box-shadow',
        x: numericTokens[0],
        y: numericTokens[1],
        blur: numericTokens[2] ?? 0,
        spread: numericTokens[3],
        color: color || 'rgba(0, 0, 0, 0.25)',
        inset,
        enabled: true,
      });
    }
  }

  return shadows;
}

/** 解析 CSS text-shadow 字符串 */
export function parseTextShadow(css: string): ShadowConfig[] {
  if (!css || css === 'none') return [];

  const shadows: ShadowConfig[] = [];
  const parts = splitShadows(css);

  for (const part of parts) {
    const tokens = part.trim().split(/\s+/);
    const numericTokens: number[] = [];
    let color = '';

    for (const token of tokens) {
      const num = parseFloat(token);
      if (!isNaN(num) && (token.endsWith('px') || /^-?\d+(\.\d+)?$/.test(token))) {
        numericTokens.push(num);
      } else {
        color += (color ? ' ' : '') + token;
      }
    }

    if (numericTokens.length >= 2) {
      shadows.push({
        type: 'text-shadow',
        x: numericTokens[0],
        y: numericTokens[1],
        blur: numericTokens[2] ?? 0,
        color: color || 'rgba(0, 0, 0, 0.25)',
        enabled: true,
      });
    }
  }

  return shadows;
}

/** 按顶层逗号分割阴影声明（不分割括号内的逗号） */
function splitShadows(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of str) {
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

/** 创建默认 box-shadow */
export function createBoxShadow(options?: Partial<ShadowConfig>): ShadowConfig {
  return {
    type: 'box-shadow',
    x: 0,
    y: 4,
    blur: 12,
    spread: 0,
    color: 'rgba(0, 0, 0, 0.15)',
    inset: false,
    enabled: true,
    ...options,
  };
}

/** 创建默认 text-shadow */
export function createTextShadow(options?: Partial<ShadowConfig>): ShadowConfig {
  return {
    type: 'text-shadow',
    x: 0,
    y: 2,
    blur: 4,
    color: 'rgba(0, 0, 0, 0.3)',
    enabled: true,
    ...options,
  };
}

/** 阴影预设 */
export const SHADOW_PRESETS = {
  none: { x: 0, y: 0, blur: 0, spread: 0, color: 'transparent' },
  sm: { x: 0, y: 1, blur: 2, spread: 0, color: 'rgba(0, 0, 0, 0.05)' },
  md: { x: 0, y: 4, blur: 6, spread: -1, color: 'rgba(0, 0, 0, 0.1)' },
  lg: { x: 0, y: 10, blur: 15, spread: -3, color: 'rgba(0, 0, 0, 0.1)' },
  xl: { x: 0, y: 20, blur: 25, spread: -5, color: 'rgba(0, 0, 0, 0.1)' },
  '2xl': { x: 0, y: 25, blur: 50, spread: -12, color: 'rgba(0, 0, 0, 0.25)' },
  inner: { x: 0, y: 2, blur: 4, spread: 0, color: 'rgba(0, 0, 0, 0.06)', inset: true },
} as const;
