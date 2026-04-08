/**
 * 纹理预设模板
 *
 * 提供 15+ 种 SVG 图案纹理，可直接用作 CSS background-image。
 * 每种纹理输出为内联 SVG data URI，支持自定义颜色和尺寸。
 */

export interface TexturePreset {
  /** 显示名称 */
  name: string;
  /** 英文标识 */
  nameEn: string;
  /** 分类 */
  category: 'geometric' | 'pattern' | 'organic';
  /** 生成 SVG data URI 的函数 */
  generateCSS: (options?: TextureOptions) => string;
}

export interface TextureOptions {
  /** 前景色 */
  color?: string;
  /** 背景色 */
  backgroundColor?: string;
  /** 图案尺寸（px） */
  size?: number;
  /** 线宽 */
  strokeWidth?: number;
  /** 透明度 0-1 */
  opacity?: number;
}

function svgToDataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function defaults(opts?: TextureOptions) {
  return {
    color: opts?.color ?? '#000000',
    bg: opts?.backgroundColor ?? 'transparent',
    size: opts?.size ?? 20,
    sw: opts?.strokeWidth ?? 1,
    opacity: opts?.opacity ?? 0.15,
  };
}

export const TEXTURE_PRESETS: TexturePreset[] = [
  // ===== Geometric =====
  {
    name: '点阵',
    nameEn: 'dots',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, opacity } = defaults(opts);
      const r = Math.max(1, size * 0.1);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '斜线',
    nameEn: 'diagonalLines',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '网格',
    nameEn: 'grid',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><line x1="${size}" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/><line x1="0" y1="${size}" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '菱形',
    nameEn: 'diamond',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const h = size / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><polygon points="${h},0 ${size},${h} ${h},${size} 0,${h}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '棋盘',
    nameEn: 'checkerboard',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, opacity } = defaults(opts);
      const h = size / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><rect width="${h}" height="${h}" fill="${color}" opacity="${opacity}"/><rect x="${h}" y="${h}" width="${h}" height="${h}" fill="${color}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '六边形',
    nameEn: 'hexagon',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const w = size;
      const h = size * 0.866;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h * 2}"><rect width="${w}" height="${h * 2}" fill="${bg}"/><polygon points="${w * 0.25},0 ${w * 0.75},0 ${w},${h * 0.5} ${w * 0.75},${h} ${w * 0.25},${h} 0,${h * 0.5}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" transform="translate(0,${h * 0.5})"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '三角',
    nameEn: 'triangles',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const h = size * 0.866;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}"><rect width="${size}" height="${h}" fill="${bg}"/><polygon points="${size / 2},0 ${size},${h} 0,${h}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '条纹',
    nameEn: 'stripes',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, opacity } = defaults(opts);
      const h = size / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><rect width="${size}" height="${h}" fill="${color}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '十字',
    nameEn: 'crosses',
    category: 'geometric',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const h = size / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><line x1="${h}" y1="0" x2="${h}" y2="${size}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/><line x1="0" y1="${h}" x2="${size}" y2="${h}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  // ===== Pattern =====
  {
    name: '砖墙',
    nameEn: 'bricks',
    category: 'pattern',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const h = size / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><rect x="0" y="0" width="${size}" height="${h}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/><line x1="${h}" y1="${h}" x2="${h}" y2="${size}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/><rect x="0" y="${h}" width="${size}" height="${h}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '织物',
    nameEn: 'fabric',
    category: 'pattern',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const s = size;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="${bg}"/><line x1="0" y1="0" x2="${s}" y2="${s}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/><line x1="${s}" y1="0" x2="0" y2="${s}" stroke="${color}" stroke-width="${sw}" opacity="${opacity * 0.5}"/><line x1="${s / 2}" y1="0" x2="${s}" y2="${s / 2}" stroke="${color}" stroke-width="${sw * 0.5}" opacity="${opacity * 0.3}"/><line x1="0" y1="${s / 2}" x2="${s / 2}" y2="${s}" stroke="${color}" stroke-width="${sw * 0.5}" opacity="${opacity * 0.3}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  // ===== Organic =====
  {
    name: '波纹',
    nameEn: 'waves',
    category: 'organic',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const h = size / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><path d="M0,${h} Q${size * 0.25},${h * 0.5} ${size * 0.5},${h} T${size},${h}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '木纹',
    nameEn: 'woodGrain',
    category: 'organic',
    generateCSS: (opts) => {
      const { color, bg, size, sw, opacity } = defaults(opts);
      const s = size * 2;
      const lines: string[] = [];
      for (let i = 0; i < 5; i++) {
        const y = s * (i + 1) / 6;
        const cp1x = s * 0.3;
        const cp1y = y + (i % 2 === 0 ? -3 : 3);
        const cp2x = s * 0.7;
        const cp2y = y + (i % 2 === 0 ? 3 : -3);
        lines.push(`<path d="M0,${y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${s},${y}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity * (0.6 + i * 0.08)}"/>`);
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="${bg}"/>${lines.join('')}</svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '噪点',
    nameEn: 'noise',
    category: 'organic',
    generateCSS: (opts) => {
      const { color, bg, opacity } = defaults(opts);
      // 使用 8x8 的 SVG 小图案进行平铺模拟噪点效果
      const size = 8;
      const dots: string[] = [];
      // 固定的伪随机位置（避免每次生成不同）
      const positions = [
        [1, 2], [3, 1], [5, 4], [7, 3], [2, 6], [4, 7], [6, 5], [0, 0],
        [1, 5], [3, 3], [5, 1], [7, 7], [2, 2], [4, 4], [6, 0], [0, 6],
      ];
      for (const [x, y] of positions) {
        dots.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" opacity="${opacity * (0.3 + Math.abs(x - y) * 0.1)}"/>`);
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${dots.join('')}</svg>`;
      return svgToDataUri(svg);
    },
  },
  {
    name: '大理石',
    nameEn: 'marble',
    category: 'organic',
    generateCSS: (opts) => {
      const { color, bg, opacity } = defaults(opts);
      const s = 40;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="${bg}"/><path d="M0,${s * 0.3} Q${s * 0.2},${s * 0.15} ${s * 0.4},${s * 0.35} T${s},${s * 0.25}" fill="none" stroke="${color}" stroke-width="0.5" opacity="${opacity}"/><path d="M0,${s * 0.6} Q${s * 0.3},${s * 0.5} ${s * 0.5},${s * 0.65} T${s},${s * 0.55}" fill="none" stroke="${color}" stroke-width="0.3" opacity="${opacity * 0.7}"/><path d="M0,${s * 0.8} Q${s * 0.4},${s * 0.9} ${s * 0.6},${s * 0.75} T${s},${s * 0.85}" fill="none" stroke="${color}" stroke-width="0.4" opacity="${opacity * 0.5}"/></svg>`;
      return svgToDataUri(svg);
    },
  },
];

/** 根据名称查找纹理预设 */
export function findTexturePreset(nameEn: string): TexturePreset | undefined {
  return TEXTURE_PRESETS.find((t) => t.nameEn === nameEn);
}

/** 将纹理应用为 CSS background-image */
export function textureToCSS(
  nameEn: string,
  options?: TextureOptions,
): string | undefined {
  const preset = findTexturePreset(nameEn);
  if (!preset) return undefined;
  return preset.generateCSS(options);
}
