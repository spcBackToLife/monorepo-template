/**
 * 动画资源管理器 (Animation Resource Manager)
 * 依赖：chroma-js
 */

import chroma from 'chroma-js';
import type { ExternalAnimationConfig } from './types';

export type AnimationResourceType = 'lottie' | 'pag' | 'rive' | 'gif';
export type AnimationPlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export interface AnimationFileInfo {
  type: AnimationResourceType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  meta?: { version?: string; frameRate?: number; totalFrames?: number; width?: number; height?: number; name?: string; layers?: number; };
}

export interface LottieTextReplacement { layerName: string; originalText: string; newText: string; }
export interface LottieColorReplacement { path: string; layerName: string; originalColor: [number, number, number, number]; newColor: [number, number, number, number]; }

export interface LottieEditableInfo {
  texts: { layerName: string; text: string; layerIndex: number; }[];
  colors: { layerName: string; path: string; color: [number, number, number, number]; }[];
  frameRate: number; totalFrames: number; duration: number; width: number; height: number;
}

export interface AnimationPlayer {
  play(): void; pause(): void; stop(): void; setSpeed(speed: number): void;
  setLoop(loop: boolean): void; seek(frame: number): void; getTotalFrames(): number;
  getCurrentFrame(): number; getPlayState(): AnimationPlayState; destroy(): void;
}

export interface AnimationResourceEvents {
  loaded: (info: AnimationFileInfo) => void;
  stateChanged: (state: AnimationPlayState) => void;
  lottieInfoParsed: (info: LottieEditableInfo) => void;
  error: (msg: string) => void;
}

const EXTENSION_MAP: Record<string, AnimationResourceType> = { '.json': 'lottie', '.lottie': 'lottie', '.pag': 'pag', '.riv': 'rive', '.gif': 'gif' };
const MIME_MAP: Record<string, AnimationResourceType> = { 'application/json': 'lottie', 'image/gif': 'gif' };

export function detectAnimationType(file: File | { name: string; type: string; size: number }): AnimationResourceType | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (ext && EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];
  if (file.type && MIME_MAP[file.type]) return MIME_MAP[file.type];
  return null;
}

export function isAnimationFile(file: File | { name: string; type: string }): boolean {
  return detectAnimationType(file as File) !== null;
}

export function getAnimationTypeName(type: AnimationResourceType): string {
  const names: Record<AnimationResourceType, string> = { lottie: 'Lottie 动画', pag: 'PAG 动画', rive: 'Rive 动画', gif: 'GIF 动画' };
  return names[type];
}

export function getAnimationTypeIcon(type: AnimationResourceType): string {
  const icons: Record<AnimationResourceType, string> = { lottie: '🎬', pag: '🎞️', rive: '🎮', gif: '🖼️' };
  return icons[type];
}

export function getAcceptedExtensions(type?: AnimationResourceType): string {
  if (type === 'lottie') return '.json,.lottie';
  if (type === 'pag') return '.pag';
  if (type === 'rive') return '.riv';
  if (type === 'gif') return '.gif';
  return '.json,.lottie,.pag,.riv,.gif';
}

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
  const layers = (data.layers ?? []) as Record<string, unknown>[];
  layers.forEach((layer, layerIndex) => {
    const nm = (layer.nm as string) ?? `Layer ${layerIndex}`;
    const ty = layer.ty as number;
    if (ty === 5) {
      const t = layer.t as Record<string, unknown> | undefined;
      if (t) {
        const d = t.d as Record<string, unknown> | undefined;
        if (d) {
          const k = (d.k ?? []) as Record<string, unknown>[];
          k.forEach((keyframe) => {
            const s = keyframe.s as Record<string, unknown> | undefined;
            if (s && typeof s.t === 'string') { texts.push({ layerName: nm, text: s.t, layerIndex }); }
          });
        }
      }
    }
    if (ty === 4) {
      const shapes = (layer.shapes ?? []) as Record<string, unknown>[];
      extractColorsFromShapes(shapes, nm, `layers.${layerIndex}.shapes`, colors);
    }
  });
  return { texts, colors, frameRate: fr, totalFrames, duration, width: w, height: h };
}

function extractColorsFromShapes(shapes: Record<string, unknown>[], layerName: string, basePath: string, colors: LottieEditableInfo['colors']) {
  shapes.forEach((shape, idx) => {
    const ty = shape.ty as string | undefined;
    if (ty === 'fl' || ty === 'st') {
      const c = shape.c as Record<string, unknown> | undefined;
      if (c) {
        const k = c.k as number[] | undefined;
        if (k && Array.isArray(k) && k.length >= 3) {
          colors.push({ layerName, path: `${basePath}.${idx}.c.k`, color: [k[0], k[1], k[2], k[3] ?? 1] });
        }
      }
    }
    if (ty === 'gr') {
      const it = (shape.it ?? []) as Record<string, unknown>[];
      extractColorsFromShapes(it, layerName, `${basePath}.${idx}.it`, colors);
    }
  });
}

export function replaceLottieText(data: Record<string, unknown>, layerIndex: number, newText: string): Record<string, unknown> {
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
        if (s && typeof s.t === 'string') { s.t = newText; }
      });
    }
  }
  return clone;
}

export function replaceLottieColor(data: Record<string, unknown>, path: string, newColor: [number, number, number, number]): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  const parts = path.split('.');
  let current: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current == null || typeof current !== 'object') return clone;
    current = (current as Record<string, unknown>)[parts[i]];
  }
  if (current != null && typeof current === 'object') {
    (current as Record<string, unknown>)[parts[parts.length - 1]] = newColor;
  }
  return clone;
}

export function hexToLottieColor(colorStr: string): [number, number, number, number] {
  try {
    const c = chroma(colorStr);
    const [r, g, b] = c.gl();
    const a = c.alpha();
    return [Math.round(r * 1000) / 1000, Math.round(g * 1000) / 1000, Math.round(b * 1000) / 1000, Math.round(a * 1000) / 1000];
  } catch { return [0, 0, 0, 1]; }
}

export function lottieColorToHex(color: [number, number, number, number]): string {
  try { return chroma.gl(color[0], color[1], color[2], color[3] ?? 1).hex(); }
  catch { return '#000000'; }
}

export function blendColors(color1: string, color2: string, ratio: number, mode: 'rgb' | 'lrgb' | 'lab' | 'lch' = 'lrgb'): string {
  try { return chroma.mix(color1, color2, ratio, mode).hex(); }
  catch { return color1; }
}

export function generateColorScale(colors: string[], steps: number = 10): string[] {
  try { return chroma.scale(colors).mode('lrgb').colors(steps); }
  catch { return colors; }
}

export function generateAnimationExportCode(config: ExternalAnimationConfig): { html: string; js: string; dependencies: string[]; } {
  const { type, src, autoplay = true, loop = true, speed = 1 } = config;
  switch (type) {
    case 'lottie': return {
      html: `<div id="lottie-container" style="width: 100%; height: 100%;"></div>`,
      js: [`import lottie from 'lottie-web';`, ``, `const animation = lottie.loadAnimation({`, `  container: document.getElementById('lottie-container'),`, `  renderer: 'svg',`, `  loop: ${loop},`, `  autoplay: ${autoplay},`, `  path: '${src}',`, `});`, speed !== 1 ? `animation.setSpeed(${speed});` : ''].filter(Boolean).join('\n'),
      dependencies: ['lottie-web'],
    };
    case 'pag': return {
      html: `<canvas id="pag-canvas" style="width: 100%; height: 100%;"></canvas>`,
      js: [`import { PAGInit } from 'libpag';`, ``, `async function initPAG() {`, `  const PAG = await PAGInit();`, `  const buffer = await fetch('${src}').then(r => r.arrayBuffer());`, `  const pagFile = await PAG.PAGFile.load(buffer);`, `  const canvas = document.getElementById('pag-canvas');`, `  const pagView = await PAG.PAGView.init(pagFile, canvas);`, `  pagView.setRepeatCount(${loop ? 0 : 1});`, autoplay ? `  await pagView.play();` : '', `}`, `initPAG();`].filter(Boolean).join('\n'),
      dependencies: ['libpag'],
    };
    case 'rive': return {
      html: `<canvas id="rive-canvas" style="width: 100%; height: 100%;"></canvas>`,
      js: [`import { Rive } from '@rive-app/canvas';`, ``, `const rive = new Rive({`, `  src: '${src}',`, `  canvas: document.getElementById('rive-canvas'),`, `  autoplay: ${autoplay},`, `  onLoad: () => { rive.resizeDrawingSurfaceToCanvas(); },`, `});`].join('\n'),
      dependencies: ['@rive-app/canvas'],
    };
    case 'gif': return {
      html: `<img src="${src}" alt="animation" style="width: 100%; height: 100%; object-fit: contain;" />`,
      js: `// GIF 通过 <img> 标签原生播放`, dependencies: [],
    };
    default: return { html: '', js: '', dependencies: [] };
  }
}

export function generateSchemaAnimationProp(config: ExternalAnimationConfig): string { return JSON.stringify(config); }

export function createExternalAnimationConfig(type: AnimationResourceType, src: string, options?: Partial<ExternalAnimationConfig>): ExternalAnimationConfig {
  return { type, src, autoplay: options?.autoplay ?? true, loop: options?.loop ?? true, speed: options?.speed ?? 1 };
}

export class AnimationResourceManager {
  private config: ExternalAnimationConfig;
  private fileInfo: AnimationFileInfo | null = null;
  private lottieData: Record<string, unknown> | null = null;
  private lottieEditableInfo: LottieEditableInfo | null = null;
  private events: Partial<AnimationResourceEvents>;
  private playState: AnimationPlayState = 'idle';

  constructor(config: ExternalAnimationConfig, events?: Partial<AnimationResourceEvents>) {
    this.config = { ...config }; this.events = events ?? {};
  }

  getConfig(): ExternalAnimationConfig { return { ...this.config }; }
  getFileInfo(): AnimationFileInfo | null { return this.fileInfo; }
  getLottieData(): Record<string, unknown> | null { return this.lottieData; }
  getLottieEditableInfo(): LottieEditableInfo | null { return this.lottieEditableInfo; }
  getPlayState(): AnimationPlayState { return this.playState; }
  setConfig(config: Partial<ExternalAnimationConfig>) { this.config = { ...this.config, ...config }; }
  setSpeed(speed: number) { this.config.speed = Math.max(0.1, Math.min(5, speed)); }
  setLoop(loop: boolean) { this.config.loop = loop; }
  setAutoplay(autoplay: boolean) { this.config.autoplay = autoplay; }

  async loadFromFile(file: File): Promise<AnimationFileInfo | null> {
    const type = detectAnimationType(file);
    if (!type) { this.events.error?.('不支持的文件格式'); return null; }
    this.setPlayState('loading');
    this.config.type = type;
    this.fileInfo = { type, fileName: file.name, fileSize: file.size, mimeType: file.type || 'application/octet-stream' };
    if (type === 'lottie') {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;
        this.lottieData = json;
        const info = parseLottieJSON(json);
        this.lottieEditableInfo = info;
        this.fileInfo.meta = { version: json.v as string | undefined, frameRate: info.frameRate, totalFrames: info.totalFrames, width: info.width, height: info.height, name: json.nm as string | undefined, layers: ((json.layers ?? []) as unknown[]).length };
        this.events.lottieInfoParsed?.(info);
      } catch (e) { this.setPlayState('error'); this.events.error?.(`Lottie JSON 解析失败: ${e}`); return null; }
    }
    if (type === 'gif' || type === 'pag' || type === 'rive') { this.config.src = URL.createObjectURL(file); }
    this.setPlayState('idle');
    this.events.loaded?.(this.fileInfo);
    return this.fileInfo;
  }

  async loadFromUrl(url: string, type: AnimationResourceType): Promise<void> {
    this.config.type = type; this.config.src = url; this.setPlayState('loading');
    if (type === 'lottie') {
      try {
        const res = await fetch(url);
        const json = await res.json() as Record<string, unknown>;
        this.lottieData = json;
        const info = parseLottieJSON(json);
        this.lottieEditableInfo = info;
        this.fileInfo = { type, fileName: url.split('/').pop() ?? 'animation.json', fileSize: 0, mimeType: 'application/json', meta: { version: json.v as string | undefined, frameRate: info.frameRate, totalFrames: info.totalFrames, width: info.width, height: info.height, name: json.nm as string | undefined, layers: ((json.layers ?? []) as unknown[]).length } };
        this.events.lottieInfoParsed?.(info);
      } catch (e) { this.setPlayState('error'); this.events.error?.(`Lottie 远程加载失败: ${e}`); return; }
    } else {
      this.fileInfo = { type, fileName: url.split('/').pop() ?? 'animation', fileSize: 0, mimeType: type === 'gif' ? 'image/gif' : 'application/octet-stream' };
    }
    this.setPlayState('idle');
    this.events.loaded?.(this.fileInfo);
  }

  replaceLottieText(layerIndex: number, newText: string): Record<string, unknown> | null {
    if (!this.lottieData) return null;
    this.lottieData = replaceLottieText(this.lottieData, layerIndex, newText);
    this.lottieEditableInfo = parseLottieJSON(this.lottieData);
    this.events.lottieInfoParsed?.(this.lottieEditableInfo);
    return this.lottieData;
  }

  replaceLottieColor(path: string, newColor: [number, number, number, number]): Record<string, unknown> | null {
    if (!this.lottieData) return null;
    this.lottieData = replaceLottieColor(this.lottieData, path, newColor);
    this.lottieEditableInfo = parseLottieJSON(this.lottieData);
    this.events.lottieInfoParsed?.(this.lottieEditableInfo);
    return this.lottieData;
  }

  exportLottieJSON(): string | null { if (!this.lottieData) return null; return JSON.stringify(this.lottieData); }
  generateExportCode() { return generateAnimationExportCode(this.config); }
  generateSchemaProps(): Record<string, string> { return { 'data-animation': generateSchemaAnimationProp(this.config) }; }

  private setPlayState(state: AnimationPlayState) { this.playState = state; this.events.stateChanged?.(state); }
  play() { this.setPlayState('playing'); }
  pause() { this.setPlayState('paused'); }
  stop() { this.setPlayState('stopped'); }

  destroy() {
    if (this.config.src?.startsWith('blob:')) { URL.revokeObjectURL(this.config.src); }
    this.lottieData = null; this.lottieEditableInfo = null; this.fileInfo = null; this.setPlayState('idle');
  }
}
