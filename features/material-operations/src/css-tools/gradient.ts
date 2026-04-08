/**
 * 渐变工具集
 *
 * 提供 CSS 渐变的解析、生成、预设模板等功能。
 * 这是素材编辑器最核心的 CSS-first 能力。
 */

import type {
  GradientLayerConfig,
  GradientType,
  ColorStop,
  GradientPreset,
} from './types';

// ===== CSS 渐变生成 =====

/** 将渐变配置转为 CSS 字符串 */
export function gradientToCSS(config: GradientLayerConfig): string {
  const stops = config.colorStops
    .map((s) => `${s.color} ${Math.round(s.position * 100)}%`)
    .join(', ');

  switch (config.gradientType) {
    case 'linear': {
      const angle = config.angle ?? 180;
      return `linear-gradient(${angle}deg, ${stops})`;
    }
    case 'radial': {
      const cx = config.centerX ?? 0.5;
      const cy = config.centerY ?? 0.5;
      const shape = config.radiusX !== config.radiusY ? 'ellipse' : 'circle';
      return `radial-gradient(${shape} at ${Math.round(cx * 100)}% ${Math.round(cy * 100)}%, ${stops})`;
    }
    case 'conic': {
      const angle = config.angle ?? 0;
      const cx = config.centerX ?? 0.5;
      const cy = config.centerY ?? 0.5;
      return `conic-gradient(from ${angle}deg at ${Math.round(cx * 100)}% ${Math.round(cy * 100)}%, ${stops})`;
    }
    default:
      return `linear-gradient(180deg, ${stops})`;
  }
}

// ===== CSS 渐变解析 =====

/** 从 CSS 渐变字符串解析为配置 */
export function parseGradientCSS(css: string): GradientLayerConfig | null {
  const trimmed = css.trim();

  // linear-gradient
  const linearMatch = trimmed.match(/^linear-gradient\((.+)\)$/);
  if (linearMatch) {
    return parseLinearGradient(linearMatch[1]);
  }

  // radial-gradient
  const radialMatch = trimmed.match(/^radial-gradient\((.+)\)$/);
  if (radialMatch) {
    return parseRadialGradient(radialMatch[1]);
  }

  // conic-gradient
  const conicMatch = trimmed.match(/^conic-gradient\((.+)\)$/);
  if (conicMatch) {
    return parseConicGradient(conicMatch[1]);
  }

  return null;
}

function parseLinearGradient(inner: string): GradientLayerConfig {
  let angle = 180;
  let stopsStr = inner;

  // Try to extract angle
  const angleMatch = inner.match(/^(\d+(?:\.\d+)?)deg\s*,\s*(.+)$/);
  if (angleMatch) {
    angle = parseFloat(angleMatch[1]);
    stopsStr = angleMatch[2];
  } else {
    // Check for direction keywords
    const dirMatch = inner.match(/^to\s+([\w\s]+)\s*,\s*(.+)$/);
    if (dirMatch) {
      angle = directionToAngle(dirMatch[1].trim());
      stopsStr = dirMatch[2];
    }
  }

  return {
    type: 'gradient',
    gradientType: 'linear',
    angle,
    colorStops: parseColorStops(stopsStr),
  };
}

function parseRadialGradient(inner: string): GradientLayerConfig {
  let centerX = 0.5;
  let centerY = 0.5;
  let stopsStr = inner;

  const posMatch = inner.match(/^(?:circle|ellipse)?\s*at\s+(\d+)%\s+(\d+)%\s*,\s*(.+)$/);
  if (posMatch) {
    centerX = parseInt(posMatch[1]) / 100;
    centerY = parseInt(posMatch[2]) / 100;
    stopsStr = posMatch[3];
  }

  return {
    type: 'gradient',
    gradientType: 'radial',
    centerX,
    centerY,
    colorStops: parseColorStops(stopsStr),
  };
}

function parseConicGradient(inner: string): GradientLayerConfig {
  let angle = 0;
  let centerX = 0.5;
  let centerY = 0.5;
  let stopsStr = inner;

  const posMatch = inner.match(/^from\s+(\d+(?:\.\d+)?)deg(?:\s+at\s+(\d+)%\s+(\d+)%)?\s*,\s*(.+)$/);
  if (posMatch) {
    angle = parseFloat(posMatch[1]);
    if (posMatch[2] && posMatch[3]) {
      centerX = parseInt(posMatch[2]) / 100;
      centerY = parseInt(posMatch[3]) / 100;
    }
    stopsStr = posMatch[4];
  }

  return {
    type: 'gradient',
    gradientType: 'conic',
    angle,
    centerX,
    centerY,
    colorStops: parseColorStops(stopsStr),
  };
}

/** 解析色标列表 */
function parseColorStops(stopsStr: string): ColorStop[] {
  const stops: ColorStop[] = [];
  // Split by comma, but respect parentheses (for rgb/rgba/hsl)
  const parts = splitByTopLevelComma(stopsStr);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    // Try to match "color position%"
    const match = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/);
    if (match) {
      stops.push({
        color: match[1].trim(),
        position: parseFloat(match[2]) / 100,
      });
    } else {
      // No explicit position — distribute evenly
      const position = parts.length === 1 ? 0 : i / (parts.length - 1);
      stops.push({ color: part, position });
    }
  }

  return stops;
}

/** 按顶层逗号分割（不分割括号内的逗号） */
function splitByTopLevelComma(str: string): string[] {
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

/** 方向关键词转角度 */
function directionToAngle(dir: string): number {
  const map: Record<string, number> = {
    'top': 0,
    'right': 90,
    'bottom': 180,
    'left': 270,
    'top right': 45,
    'right top': 45,
    'bottom right': 135,
    'right bottom': 135,
    'bottom left': 225,
    'left bottom': 225,
    'top left': 315,
    'left top': 315,
  };
  return map[dir] ?? 180;
}

// ===== 渐变创建辅助 =====

/** 创建线性渐变 */
export function createLinearGradient(
  angle: number,
  colorStops: ColorStop[],
): GradientLayerConfig {
  return {
    type: 'gradient',
    gradientType: 'linear',
    angle,
    colorStops,
  };
}

/** 创建径向渐变 */
export function createRadialGradient(
  colorStops: ColorStop[],
  options?: {
    centerX?: number;
    centerY?: number;
    radiusX?: number;
    radiusY?: number;
  },
): GradientLayerConfig {
  return {
    type: 'gradient',
    gradientType: 'radial',
    colorStops,
    centerX: options?.centerX ?? 0.5,
    centerY: options?.centerY ?? 0.5,
    radiusX: options?.radiusX,
    radiusY: options?.radiusY,
  };
}

/** 创建锥形渐变 */
export function createConicGradient(
  colorStops: ColorStop[],
  angle?: number,
  options?: { centerX?: number; centerY?: number },
): GradientLayerConfig {
  return {
    type: 'gradient',
    gradientType: 'conic',
    angle: angle ?? 0,
    colorStops,
    centerX: options?.centerX ?? 0.5,
    centerY: options?.centerY ?? 0.5,
  };
}

// ===== 渐变预设模板 =====

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    name: '晨曦',
    nameEn: 'Sunrise',
    config: createLinearGradient(135, [
      { color: '#f093fb', position: 0 },
      { color: '#f5576c', position: 1 },
    ]),
  },
  {
    name: '海洋',
    nameEn: 'Ocean',
    config: createLinearGradient(135, [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 1 },
    ]),
  },
  {
    name: '森林',
    nameEn: 'Forest',
    config: createLinearGradient(135, [
      { color: '#11998e', position: 0 },
      { color: '#38ef7d', position: 1 },
    ]),
  },
  {
    name: '日落',
    nameEn: 'Sunset',
    config: createLinearGradient(135, [
      { color: '#fc5c7d', position: 0 },
      { color: '#6a82fb', position: 1 },
    ]),
  },
  {
    name: '极光',
    nameEn: 'Aurora',
    config: createLinearGradient(135, [
      { color: '#a8edea', position: 0 },
      { color: '#fed6e3', position: 1 },
    ]),
  },
  {
    name: '霓虹',
    nameEn: 'Neon',
    config: createLinearGradient(135, [
      { color: '#f12711', position: 0 },
      { color: '#f5af19', position: 1 },
    ]),
  },
  {
    name: '深空',
    nameEn: 'Deep Space',
    config: createLinearGradient(180, [
      { color: '#000000', position: 0 },
      { color: '#434343', position: 1 },
    ]),
  },
  {
    name: '天空',
    nameEn: 'Sky',
    config: createLinearGradient(180, [
      { color: '#2196f3', position: 0 },
      { color: '#f44336', position: 0.6 },
      { color: '#ffeb3b', position: 1 },
    ]),
  },
  {
    name: '蜜桃',
    nameEn: 'Peach',
    config: createLinearGradient(90, [
      { color: '#ffecd2', position: 0 },
      { color: '#fcb69f', position: 1 },
    ]),
  },
  {
    name: '薰衣草',
    nameEn: 'Lavender',
    config: createLinearGradient(135, [
      { color: '#e0c3fc', position: 0 },
      { color: '#8ec5fc', position: 1 },
    ]),
  },
  {
    name: '火焰',
    nameEn: 'Flame',
    config: createLinearGradient(45, [
      { color: '#f83600', position: 0 },
      { color: '#f9d423', position: 1 },
    ]),
  },
  {
    name: '翡翠',
    nameEn: 'Emerald',
    config: createLinearGradient(135, [
      { color: '#43e97b', position: 0 },
      { color: '#38f9d7', position: 1 },
    ]),
  },
  {
    name: '暗夜紫',
    nameEn: 'Night Purple',
    config: createLinearGradient(135, [
      { color: '#5b247a', position: 0 },
      { color: '#1bcedf', position: 1 },
    ]),
  },
  {
    name: '彩虹',
    nameEn: 'Rainbow',
    config: createLinearGradient(90, [
      { color: '#ff0000', position: 0 },
      { color: '#ff7f00', position: 0.17 },
      { color: '#ffff00', position: 0.33 },
      { color: '#00ff00', position: 0.5 },
      { color: '#0000ff', position: 0.67 },
      { color: '#4b0082', position: 0.83 },
      { color: '#9400d3', position: 1 },
    ]),
  },
  {
    name: '银河',
    nameEn: 'Galaxy',
    config: createLinearGradient(135, [
      { color: '#0f0c29', position: 0 },
      { color: '#302b63', position: 0.5 },
      { color: '#24243e', position: 1 },
    ]),
  },
];
