/**
 * 动画资源管理器 (Animation Resource Manager)
 *
 * Phase 6: 外部动画资源支持
 *   - Lottie 导入 + 预览播放 (lottie-web)
 *   - Lottie 参数编辑（颜色替换/文字替换/速度调节）
 *   - PAG 导入 + 预览播放 (libpag)
 *   - Rive 导入 + 预览播放 (@rive-app/canvas)
 *   - GIF 导入支持
 *   - 动画资源在预览模式中的正确播放
 *   - 动画资源在代码导出时的处理
 *
 * 依赖：
 *   - chroma-js: 专业颜色空间转换（Lottie 颜色编辑）
 *   - lottie-web: Lottie 动画播放与控制
 *   - libpag: PAG 动画播放（运行时可选）
 *   - @rive-app/canvas: Rive 动画播放（运行时可选）
 */

import chroma from 'chroma-js';
import type { ExternalAnimationConfig } from '../types';

// ===== 支持的动画类型 =====

/** 动画资源类型 */
export type AnimationResourceType = 'lottie' | 'pag' | 'rive' | 'gif';

/** 动画播放状态 */
export type AnimationPlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

/** 文件格式检测结果 */
export interface AnimationFileInfo {
  type: AnimationResourceType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Lottie JSON 中的元数据 */
  meta?: {
    version?: string;
    frameRate?: number;
    totalFrames?: number;
    width?: number;
    height?: number;
    name?: string;
    layers?: number;
  };
}

// ===== Lottie 特殊操作 =====

/** Lottie 文本替换项 */
export interface LottieTextReplacement {
  layerName: string;
  originalText: string;
  newText: string;
}

/** Lottie 颜色替换项 */
export interface LottieColorReplacement {
  /** 目标路径（如 "assets.0.layers.0.shapes.0.it.1.c.k"） */
  path: string;
  /** 图层名称（便于 UI 展示） */
  layerName: string;
  /** 原始颜色 (RGBA 0-1) */
  originalColor: [number, number, number, number];
  /** 新颜色 (RGBA 0-1) */
  newColor: [number, number, number, number];
}

/** Lottie 可编辑信息 */
export interface LottieEditableInfo {
  /** 可替换的文本图层 */
  texts: {
    layerName: string;
    text: string;
    layerIndex: number;
  }[];
  /** 可替换的颜色 */
  colors: {
    layerName: string;
    path: string;
    color: [number, number, number, number];
  }[];
  /** 动画基本信息 */
  frameRate: number;
  totalFrames: number;
  duration: number;
  width: number;
  height: number;
}

// ===== 统一播放器接口 =====

/** 动画播放器通用接口 */
export interface AnimationPlayer {
  /** 播放 */
  play(): void;
  /** 暂停 */
  pause(): void;
  /** 停止并回到开头 */
  stop(): void;
  /** 设置播放速度 (1.0 = 正常) */
  setSpeed(speed: number): void;
  /** 设置是否循环 */
  setLoop(loop: boolean): void;
  /** 跳转到指定帧/时间 */
  seek(frame: number): void;
  /** 获取总帧数 (GIF 为帧数, Lottie/PAG 为帧数, Rive 为 -1) */
  getTotalFrames(): number;
  /** 获取当前帧 */
  getCurrentFrame(): number;
  /** 获取当前播放状态 */
  getPlayState(): AnimationPlayState;
  /** 销毁播放器，释放资源 */
  destroy(): void;
}

// ===== 事件 =====

export interface AnimationResourceEvents {
  /** 加载完成 */
  loaded: (info: AnimationFileInfo) => void;
  /** 播放状态变更 */
  stateChanged: (state: AnimationPlayState) => void;
  /** Lottie 编辑信息解析完成 */
  lottieInfoParsed: (info: LottieEditableInfo) => void;
  /** 错误 */
  error: (msg: string) => void;
}

// ===== 工具函数：文件格式检测 =====

/** 支持的文件扩展名映射 */
const EXTENSION_MAP: Record<string, AnimationResourceType> = {
  '.json': 'lottie',
  '.lottie': 'lottie',
  '.pag': 'pag',
  '.riv': 'rive',
  '.gif': 'gif',
};

/** MIME 类型映射 */
const MIME_MAP: Record<string, AnimationResourceType> = {
  'application/json': 'lottie',
  'image/gif': 'gif',
};

/** 检测动画文件类型 */
export function detectAnimationType(
  file: File | { name: string; type: string; size: number },
): AnimationResourceType | null {
  // 优先用扩展名
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (ext && EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];

  // 然后用 MIME
  if (file.type && MIME_MAP[file.type]) return MIME_MAP[file.type];

  return null;
}

/** 判断文件是否为支持的动画格式 */
export function isAnimationFile(file: File | { name: string; type: string }): boolean {
  return detectAnimationType(file as File) !== null;
}

/** 获取动画类型的友好名称 */
export function getAnimationTypeName(type: AnimationResourceType): string {
  const names: Record<AnimationResourceType, string> = {
    lottie: 'Lottie 动画',
    pag: 'PAG 动画',
    rive: 'Rive 动画',
    gif: 'GIF 动画',
  };
  return names[type];
}

/** 获取各动画类型的图标 Emoji */
export function getAnimationTypeIcon(type: AnimationResourceType): string {
  const icons: Record<AnimationResourceType, string> = {
    lottie: '🎬',
    pag: '🎞️',
    rive: '🎮',
    gif: '🖼️',
  };
  return icons[type];
}

/** 获取各动画类型接受的文件扩展名 */
export function getAcceptedExtensions(type?: AnimationResourceType): string {
  if (type === 'lottie') return '.json,.lottie';
  if (type === 'pag') return '.pag';
  if (type === 'rive') return '.riv';
  if (type === 'gif') return '.gif';
  return '.json,.lottie,.pag,.riv,.gif';
}

// ===== Lottie JSON 解析工具 =====

/** 解析 Lottie JSON 数据，提取可编辑信息 */
export function parseLottieJSON(data: Record<string, unknown>): LottieEditableInfo {
  const fr = (data.fr as number) ?? 30;
  const ip = (data.ip as number) ?? 0;
  const op = (data.op as number) ?? 0;
  const totalFrames = op - ip;
  const duration = totalFrames / fr;
  const w = (data.w as number) ?? 0;
  const h = (data.h as number) ?? 0;

  const texts: LottieEditableInfo['texts'] = [];
  const colors: LottieEditableInfo['colors'] = [];

  // 遍历图层，提取文本和颜色
  const layers = (data.layers ?? []) as Record<string, unknown>[];

  layers.forEach((layer, layerIndex) => {
    const nm = (layer.nm as string) ?? `Layer ${layerIndex}`;
    const ty = layer.ty as number;

    // ty === 5 = 文本图层
    if (ty === 5) {
      const t = layer.t as Record<string, unknown> | undefined;
      if (t) {
        const d = t.d as Record<string, unknown> | undefined;
        if (d) {
          const k = (d.k ?? []) as Record<string, unknown>[];
          k.forEach((keyframe) => {
            const s = keyframe.s as Record<string, unknown> | undefined;
            if (s && typeof s.t === 'string') {
              texts.push({
                layerName: nm,
                text: s.t,
                layerIndex,
              });
            }
          });
        }
      }
    }

    // 提取形状图层中的颜色 (ty === 4 = 形状图层)
    if (ty === 4) {
      const shapes = (layer.shapes ?? []) as Record<string, unknown>[];
      extractColorsFromShapes(shapes, nm, `layers.${layerIndex}.shapes`, colors);
    }
  });

  return {
    texts,
    colors,
    frameRate: fr,
    totalFrames,
    duration,
    width: w,
    height: h,
  };
}

/** 递归提取形状中的颜色 */
function extractColorsFromShapes(
  shapes: Record<string, unknown>[],
  layerName: string,
  basePath: string,
  colors: LottieEditableInfo['colors'],
) {
  shapes.forEach((shape, idx) => {
    const ty = shape.ty as string | undefined;

    // 填充 (fl) 或描边 (st)
    if (ty === 'fl' || ty === 'st') {
      const c = shape.c as Record<string, unknown> | undefined;
      if (c) {
        const k = c.k as number[] | undefined;
        if (k && Array.isArray(k) && k.length >= 3) {
          colors.push({
            layerName,
            path: `${basePath}.${idx}.c.k`,
            color: [k[0], k[1], k[2], k[3] ?? 1],
          });
        }
      }
    }

    // 递归处理嵌套组 (gr)
    if (ty === 'gr') {
      const it = (shape.it ?? []) as Record<string, unknown>[];
      extractColorsFromShapes(it, layerName, `${basePath}.${idx}.it`, colors);
    }
  });
}

/** 在 Lottie JSON 数据中替换文本 */
export function replaceLottieText(
  data: Record<string, unknown>,
  layerIndex: number,
  newText: string,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  const layers = (clone.layers ?? []) as Record<string, unknown>[];
  const layer = layers[layerIndex];
  if (!layer) return clone;

  const t = layer.t as Record<string, unknown> | undefined;
  if (t) {
    const d = t.d as Record<string, unknown> | undefined;
    if (d) {
      const k = (d.k ?? []) as Record<string, unknown>[];
      k.forEach((keyframe) => {
        const s = keyframe.s as Record<string, unknown> | undefined;
        if (s && typeof s.t === 'string') {
          s.t = newText;
        }
      });
    }
  }

  return clone;
}

/** 在 Lottie JSON 数据中替换颜色 */
export function replaceLottieColor(
  data: Record<string, unknown>,
  path: string,
  newColor: [number, number, number, number],
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  // 按 path 遍历对象树
  const parts = path.split('.');
  let current: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current == null || typeof current !== 'object') return clone;
    current = (current as Record<string, unknown>)[parts[i]];
  }

  if (current != null && typeof current === 'object') {
    const lastKey = parts[parts.length - 1];
    (current as Record<string, unknown>)[lastKey] = newColor;
  }

  return clone;
}

/**
 * 将 hex / CSS 颜色转为 Lottie RGBA (0-1)
 * 基于 chroma-js 颜色空间转换，支持 hex / rgb / hsl / named color 等多种格式
 */
export function hexToLottieColor(colorStr: string): [number, number, number, number] {
  try {
    const c = chroma(colorStr);
    const [r, g, b] = c.gl(); // gl() 返回 0-1 浮点 [r, g, b, a]
    const a = c.alpha();
    return [
      Math.round(r * 1000) / 1000,
      Math.round(g * 1000) / 1000,
      Math.round(b * 1000) / 1000,
      Math.round(a * 1000) / 1000,
    ];
  } catch {
    // 降级：无法解析时返回黑色
    return [0, 0, 0, 1];
  }
}

/**
 * 将 Lottie RGBA (0-1) 转为 hex 颜色
 * 基于 chroma-js，保证色值精确转换
 */
export function lottieColorToHex(color: [number, number, number, number]): string {
  try {
    // chroma.gl() 接受 0-1 范围的 r, g, b, a
    return chroma.gl(color[0], color[1], color[2], color[3] ?? 1).hex();
  } catch {
    return '#000000';
  }
}

/**
 * 使用 chroma-js 进行颜色混合/插值（用于动画过渡等场景）
 * @param color1 - 起始颜色 hex
 * @param color2 - 结束颜色 hex
 * @param ratio  - 混合比例 0~1
 * @param mode   - 颜色空间（默认 lrgb，线性感知更好）
 */
export function blendColors(color1: string, color2: string, ratio: number, mode: 'rgb' | 'lrgb' | 'lab' | 'lch' = 'lrgb'): string {
  try {
    return chroma.mix(color1, color2, ratio, mode).hex();
  } catch {
    return color1;
  }
}

/**
 * 生成颜色渐变序列（用于颜色可视化预览）
 * @param colors - 颜色数组
 * @param steps  - 输出步数
 */
export function generateColorScale(colors: string[], steps: number = 10): string[] {
  try {
    return chroma.scale(colors).mode('lrgb').colors(steps);
  } catch {
    return colors;
  }
}

// ===== 代码导出 =====

/** 生成动画资源在代码导出时的 HTML + JS 代码 */
export function generateAnimationExportCode(config: ExternalAnimationConfig): {
  html: string;
  js: string;
  dependencies: string[];
} {
  const { type, src, autoplay = true, loop = true, speed = 1 } = config;

  switch (type) {
    case 'lottie':
      return {
        html: `<div id="lottie-container" style="width: 100%; height: 100%;"></div>`,
        js: [
          `import lottie from 'lottie-web';`,
          ``,
          `const animation = lottie.loadAnimation({`,
          `  container: document.getElementById('lottie-container'),`,
          `  renderer: 'svg',`,
          `  loop: ${loop},`,
          `  autoplay: ${autoplay},`,
          `  path: '${src}',`,
          `});`,
          speed !== 1 ? `animation.setSpeed(${speed});` : '',
        ].filter(Boolean).join('\n'),
        dependencies: ['lottie-web'],
      };

    case 'pag':
      return {
        html: `<canvas id="pag-canvas" style="width: 100%; height: 100%;"></canvas>`,
        js: [
          `import { PAGInit } from 'libpag';`,
          ``,
          `async function initPAG() {`,
          `  const PAG = await PAGInit();`,
          `  const buffer = await fetch('${src}').then(r => r.arrayBuffer());`,
          `  const pagFile = await PAG.PAGFile.load(buffer);`,
          `  const canvas = document.getElementById('pag-canvas');`,
          `  const pagView = await PAG.PAGView.init(pagFile, canvas);`,
          `  pagView.setRepeatCount(${loop ? 0 : 1});`,
          speed !== 1 ? `  // PAG speed control via setProgress` : '',
          autoplay ? `  await pagView.play();` : '',
          `}`,
          `initPAG();`,
        ].filter(Boolean).join('\n'),
        dependencies: ['libpag'],
      };

    case 'rive':
      return {
        html: `<canvas id="rive-canvas" style="width: 100%; height: 100%;"></canvas>`,
        js: [
          `import { Rive } from '@rive-app/canvas';`,
          ``,
          `const rive = new Rive({`,
          `  src: '${src}',`,
          `  canvas: document.getElementById('rive-canvas'),`,
          `  autoplay: ${autoplay},`,
          `  onLoad: () => {`,
          `    rive.resizeDrawingSurfaceToCanvas();`,
          `  },`,
          `});`,
        ].join('\n'),
        dependencies: ['@rive-app/canvas'],
      };

    case 'gif':
      return {
        html: `<img src="${src}" alt="animation" style="width: 100%; height: 100%; object-fit: contain;" />`,
        js: `// GIF 通过 <img> 标签原生播放`,
        dependencies: [],
      };

    default:
      return { html: '', js: '', dependencies: [] };
  }
}

/** 生成 data-animation 属性值（用于 Schema 节点） */
export function generateSchemaAnimationProp(config: ExternalAnimationConfig): string {
  return JSON.stringify(config);
}

/** 创建默认的外部动画配置 */
export function createExternalAnimationConfig(
  type: AnimationResourceType,
  src: string,
  options?: Partial<ExternalAnimationConfig>,
): ExternalAnimationConfig {
  return {
    type,
    src,
    autoplay: options?.autoplay ?? true,
    loop: options?.loop ?? true,
    speed: options?.speed ?? 1,
  };
}

// ===== 动画资源管理器类 =====

/**
 * AnimationResourceManager
 *
 * 管理一个动画资源的完整生命周期：
 *   加载 → 解析元数据 → 播放控制 → 参数编辑 → 代码导出
 */
export class AnimationResourceManager {
  private config: ExternalAnimationConfig;
  private fileInfo: AnimationFileInfo | null = null;
  private lottieData: Record<string, unknown> | null = null;
  private lottieEditableInfo: LottieEditableInfo | null = null;
  private events: Partial<AnimationResourceEvents>;
  private playState: AnimationPlayState = 'idle';

  constructor(
    config: ExternalAnimationConfig,
    events?: Partial<AnimationResourceEvents>,
  ) {
    this.config = { ...config };
    this.events = events ?? {};
  }

  // ===== Getters =====

  getConfig(): ExternalAnimationConfig {
    return { ...this.config };
  }

  getFileInfo(): AnimationFileInfo | null {
    return this.fileInfo;
  }

  getLottieData(): Record<string, unknown> | null {
    return this.lottieData;
  }

  getLottieEditableInfo(): LottieEditableInfo | null {
    return this.lottieEditableInfo;
  }

  getPlayState(): AnimationPlayState {
    return this.playState;
  }

  // ===== 配置更新 =====

  setConfig(config: Partial<ExternalAnimationConfig>) {
    this.config = { ...this.config, ...config };
  }

  setSpeed(speed: number) {
    this.config.speed = Math.max(0.1, Math.min(5, speed));
  }

  setLoop(loop: boolean) {
    this.config.loop = loop;
  }

  setAutoplay(autoplay: boolean) {
    this.config.autoplay = autoplay;
  }

  // ===== 文件加载 =====

  /** 从 File 对象加载动画 */
  async loadFromFile(file: File): Promise<AnimationFileInfo | null> {
    const type = detectAnimationType(file);
    if (!type) {
      this.events.error?.('不支持的文件格式');
      return null;
    }

    this.setPlayState('loading');
    this.config.type = type;

    this.fileInfo = {
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    };

    // Lottie: 解析 JSON
    if (type === 'lottie') {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;
        this.lottieData = json;

        const info = parseLottieJSON(json);
        this.lottieEditableInfo = info;

        this.fileInfo.meta = {
          version: json.v as string | undefined,
          frameRate: info.frameRate,
          totalFrames: info.totalFrames,
          width: info.width,
          height: info.height,
          name: json.nm as string | undefined,
          layers: ((json.layers ?? []) as unknown[]).length,
        };

        this.events.lottieInfoParsed?.(info);
      } catch (e) {
        this.setPlayState('error');
        this.events.error?.(`Lottie JSON 解析失败: ${e}`);
        return null;
      }
    }

    // GIF: 生成 Blob URL
    if (type === 'gif') {
      this.config.src = URL.createObjectURL(file);
    }

    // PAG / Rive: 生成 Blob URL
    if (type === 'pag' || type === 'rive') {
      this.config.src = URL.createObjectURL(file);
    }

    this.setPlayState('idle');
    this.events.loaded?.(this.fileInfo);
    return this.fileInfo;
  }

  /** 从 URL 加载（服务端已上传的资源） */
  async loadFromUrl(url: string, type: AnimationResourceType): Promise<void> {
    this.config.type = type;
    this.config.src = url;
    this.setPlayState('loading');

    // Lottie: 需要 fetch JSON 数据
    if (type === 'lottie') {
      try {
        const res = await fetch(url);
        const json = await res.json() as Record<string, unknown>;
        this.lottieData = json;

        const info = parseLottieJSON(json);
        this.lottieEditableInfo = info;

        this.fileInfo = {
          type,
          fileName: url.split('/').pop() ?? 'animation.json',
          fileSize: 0,
          mimeType: 'application/json',
          meta: {
            version: json.v as string | undefined,
            frameRate: info.frameRate,
            totalFrames: info.totalFrames,
            width: info.width,
            height: info.height,
            name: json.nm as string | undefined,
            layers: ((json.layers ?? []) as unknown[]).length,
          },
        };

        this.events.lottieInfoParsed?.(info);
      } catch (e) {
        this.setPlayState('error');
        this.events.error?.(`Lottie 远程加载失败: ${e}`);
        return;
      }
    } else {
      this.fileInfo = {
        type,
        fileName: url.split('/').pop() ?? 'animation',
        fileSize: 0,
        mimeType: type === 'gif' ? 'image/gif' : 'application/octet-stream',
      };
    }

    this.setPlayState('idle');
    this.events.loaded?.(this.fileInfo);
  }

  // ===== Lottie 编辑 =====

  /** 替换 Lottie 文本 */
  replaceLottieText(layerIndex: number, newText: string): Record<string, unknown> | null {
    if (!this.lottieData) return null;
    this.lottieData = replaceLottieText(this.lottieData, layerIndex, newText);
    this.lottieEditableInfo = parseLottieJSON(this.lottieData);
    this.events.lottieInfoParsed?.(this.lottieEditableInfo);
    return this.lottieData;
  }

  /** 替换 Lottie 颜色 */
  replaceLottieColor(
    path: string,
    newColor: [number, number, number, number],
  ): Record<string, unknown> | null {
    if (!this.lottieData) return null;
    this.lottieData = replaceLottieColor(this.lottieData, path, newColor);
    this.lottieEditableInfo = parseLottieJSON(this.lottieData);
    this.events.lottieInfoParsed?.(this.lottieEditableInfo);
    return this.lottieData;
  }

  /** 获取编辑后的 Lottie JSON 字符串 */
  exportLottieJSON(): string | null {
    if (!this.lottieData) return null;
    return JSON.stringify(this.lottieData);
  }

  // ===== 代码导出 =====

  /** 生成导出代码 */
  generateExportCode() {
    return generateAnimationExportCode(this.config);
  }

  /** 生成 Schema 中的 data-animation 属性值 */
  generateSchemaProps(): Record<string, string> {
    return {
      'data-animation': generateSchemaAnimationProp(this.config),
    };
  }

  // ===== 播放状态管理 =====

  private setPlayState(state: AnimationPlayState) {
    this.playState = state;
    this.events.stateChanged?.(state);
  }

  play() { this.setPlayState('playing'); }
  pause() { this.setPlayState('paused'); }
  stop() { this.setPlayState('stopped'); }

  // ===== 清理 =====

  destroy() {
    // 如果 src 是 blob URL，释放它
    if (this.config.src?.startsWith('blob:')) {
      URL.revokeObjectURL(this.config.src);
    }
    this.lottieData = null;
    this.lottieEditableInfo = null;
    this.fileInfo = null;
    this.setPlayState('idle');
  }
}
