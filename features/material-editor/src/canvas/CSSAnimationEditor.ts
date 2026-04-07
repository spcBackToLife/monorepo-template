/**
 * CSS 动画编辑器核心管理器
 *
 * Phase 5: CSS 动画编辑器
 *   - 关键帧增删改
 *   - 缓动曲线管理（贝塞尔曲线解析/生成）
 *   - 动画属性配置
 *   - 生成 @keyframes CSS 代码
 *   - 与 Schema 节点的桥接
 *
 * 依赖：
 *   - bezier-easing: 精确的三次贝塞尔缓动曲线计算
 */

import type { CSSAnimationConfig, CSSKeyframe } from '../types';
import { animationToCSS, createAnimation, ANIMATION_PRESETS, EASING_PRESETS } from '../core/animation';
import BezierEasing from 'bezier-easing';

// ===== 贝塞尔曲线 =====

/** 贝塞尔曲线控制点 */
export interface BezierControlPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 解析 CSS timing-function 为贝塞尔控制点 */
export function parseTimingFunction(value: string): BezierControlPoints | null {
  // 预设关键字映射
  const presets: Record<string, BezierControlPoints> = {
    'linear': { x1: 0, y1: 0, x2: 1, y2: 1 },
    'ease': { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
    'ease-in': { x1: 0.42, y1: 0, x2: 1, y2: 1 },
    'ease-out': { x1: 0, y1: 0, x2: 0.58, y2: 1 },
    'ease-in-out': { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  };

  if (presets[value]) {
    return presets[value];
  }

  // 解析 cubic-bezier(x1, y1, x2, y2)
  const match = value.match(/cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.-]+)\s*,\s*([\d.]+)\s*,\s*([\d.-]+)\s*\)/);
  if (match) {
    return {
      x1: parseFloat(match[1]),
      y1: parseFloat(match[2]),
      x2: parseFloat(match[3]),
      y2: parseFloat(match[4]),
    };
  }

  return null;
}

/** 将贝塞尔控制点转为 CSS timing-function 字符串 */
export function bezierToCSS(points: BezierControlPoints): string {
  // 检查是否匹配预设
  const presetMap: [BezierControlPoints, string][] = [
    [{ x1: 0, y1: 0, x2: 1, y2: 1 }, 'linear'],
    [{ x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 }, 'ease'],
    [{ x1: 0.42, y1: 0, x2: 1, y2: 1 }, 'ease-in'],
    [{ x1: 0, y1: 0, x2: 0.58, y2: 1 }, 'ease-out'],
    [{ x1: 0.42, y1: 0, x2: 0.58, y2: 1 }, 'ease-in-out'],
  ];

  for (const [preset, name] of presetMap) {
    if (
      Math.abs(points.x1 - preset.x1) < 0.01 &&
      Math.abs(points.y1 - preset.y1) < 0.01 &&
      Math.abs(points.x2 - preset.x2) < 0.01 &&
      Math.abs(points.y2 - preset.y2) < 0.01
    ) {
      return name;
    }
  }

  return `cubic-bezier(${round3(points.x1)}, ${round3(points.y1)}, ${round3(points.x2)}, ${round3(points.y2)})`;
}

/** 计算三次贝塞尔曲线上的点 (用于可视化绘制)
 *  使用 bezier-easing 库进行精确的缓动曲线计算
 */
export function bezierCurvePoints(
  points: BezierControlPoints,
  steps: number = 64,
): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  // 使用 bezier-easing 创建精确的缓动函数
  const easing = BezierEasing(
    points.x1 as 0,
    points.y1 as 0,
    points.x2 as 0,
    points.y2 as 0,
  );

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // easing(t) 返回 y 值，精确匹配 CSS cubic-bezier 行为
    result.push({ x: t, y: easing(t) });
  }

  return result;
}

/**
 * 计算给定时间进度下的缓动输出值
 * 使用 bezier-easing 进行精确计算，与 CSS transition 行为完全一致
 * @param points - 贝塞尔控制点
 * @param progress - 输入进度 0~1
 * @returns 缓动输出值 0~1
 */
export function evaluateBezierEasing(
  points: BezierControlPoints,
  progress: number,
): number {
  const easing = BezierEasing(
    points.x1 as 0,
    points.y1 as 0,
    points.x2 as 0,
    points.y2 as 0,
  );
  return easing(Math.max(0, Math.min(1, progress)));
}

// ===== 常用 CSS 动画属性 =====

/** 可动画的 CSS 属性列表 */
export const ANIMATABLE_CSS_PROPERTIES = [
  { key: 'opacity', label: '透明度', defaultFrom: '0', defaultTo: '1' },
  { key: 'transform', label: '变换', defaultFrom: 'none', defaultTo: 'none' },
  { key: 'backgroundColor', label: '背景色', defaultFrom: '#ffffff', defaultTo: '#000000' },
  { key: 'color', label: '文字颜色', defaultFrom: '#000000', defaultTo: '#ffffff' },
  { key: 'width', label: '宽度', defaultFrom: '0px', defaultTo: '100%' },
  { key: 'height', label: '高度', defaultFrom: '0px', defaultTo: '100%' },
  { key: 'marginTop', label: '上外边距', defaultFrom: '0px', defaultTo: '20px' },
  { key: 'marginLeft', label: '左外边距', defaultFrom: '0px', defaultTo: '20px' },
  { key: 'padding', label: '内边距', defaultFrom: '0px', defaultTo: '20px' },
  { key: 'borderRadius', label: '圆角', defaultFrom: '0px', defaultTo: '50%' },
  { key: 'borderColor', label: '边框色', defaultFrom: '#000000', defaultTo: '#ffffff' },
  { key: 'borderWidth', label: '边框宽', defaultFrom: '0px', defaultTo: '2px' },
  { key: 'boxShadow', label: '阴影', defaultFrom: 'none', defaultTo: '0 4px 12px rgba(0,0,0,0.2)' },
  { key: 'filter', label: '滤镜', defaultFrom: 'none', defaultTo: 'blur(4px)' },
  { key: 'letterSpacing', label: '字间距', defaultFrom: '0px', defaultTo: '4px' },
] as const;

/** transform 快捷值 */
export const TRANSFORM_PRESETS = [
  { label: '无', value: 'none' },
  { label: '上移20px', value: 'translateY(-20px)' },
  { label: '下移20px', value: 'translateY(20px)' },
  { label: '左移20px', value: 'translateX(-20px)' },
  { label: '右移20px', value: 'translateX(20px)' },
  { label: '放大1.1x', value: 'scale(1.1)' },
  { label: '缩小0.8x', value: 'scale(0.8)' },
  { label: '旋转45°', value: 'rotate(45deg)' },
  { label: '旋转90°', value: 'rotate(90deg)' },
  { label: '旋转180°', value: 'rotate(180deg)' },
  { label: '倾斜5°', value: 'skewX(5deg)' },
] as const;

// ===== CSS 动画编辑器 =====

/** 动画编辑器事件回调 */
export interface CSSAnimationEditorEvents {
  /** 配置变化 */
  configChanged?: (config: CSSAnimationConfig) => void;
  /** CSS 代码生成 */
  cssGenerated?: (keyframesCSS: string, animationShorthand: string) => void;
}

/**
 * CSS 动画编辑器管理器
 *
 * 管理当前正在编辑的动画配置，提供关键帧 CRUD、缓动曲线编辑、CSS 生成等功能。
 */
export class CSSAnimationEditorManager {
  private config: CSSAnimationConfig;
  private events: CSSAnimationEditorEvents;

  constructor(
    initialConfig?: Partial<CSSAnimationConfig>,
    events?: CSSAnimationEditorEvents,
  ) {
    this.config = createAnimation(initialConfig);
    this.events = events ?? {};
  }

  // ===== 获取/设置配置 =====

  getConfig(): CSSAnimationConfig {
    return { ...this.config, keyframes: [...this.config.keyframes] };
  }

  setConfig(config: CSSAnimationConfig): void {
    this.config = { ...config };
    this.notifyChange();
  }

  // ===== 动画属性 =====

  setName(name: string): void {
    this.config.name = name;
    this.notifyChange();
  }

  setDuration(duration: string): void {
    this.config.duration = duration;
    this.notifyChange();
  }

  setDelay(delay: string): void {
    this.config.delay = delay;
    this.notifyChange();
  }

  setTimingFunction(tf: string): void {
    this.config.timingFunction = tf;
    this.notifyChange();
  }

  setIterationCount(count: string | number): void {
    this.config.iterationCount = count;
    this.notifyChange();
  }

  setDirection(dir: CSSAnimationConfig['direction']): void {
    this.config.direction = dir;
    this.notifyChange();
  }

  setFillMode(fm: CSSAnimationConfig['fillMode']): void {
    this.config.fillMode = fm;
    this.notifyChange();
  }

  // ===== 关键帧 CRUD =====

  getKeyframes(): CSSKeyframe[] {
    return [...this.config.keyframes];
  }

  /**
   * 添加关键帧
   * @param offset — 0~1 的位置
   * @param styles — CSS 属性
   */
  addKeyframe(offset: number, styles?: Record<string, string | number>): void {
    const clamped = Math.max(0, Math.min(1, offset));

    // 已有同 offset 则合并
    const existing = this.config.keyframes.find((kf) => Math.abs(kf.offset - clamped) < 0.001);
    if (existing) {
      existing.styles = { ...existing.styles, ...(styles ?? {}) };
    } else {
      this.config.keyframes.push({
        offset: clamped,
        styles: styles ?? {},
      });
    }

    // 按 offset 排序
    this.config.keyframes.sort((a, b) => a.offset - b.offset);
    this.notifyChange();
  }

  /**
   * 更新指定关键帧的样式
   */
  updateKeyframe(index: number, styles: Record<string, string | number>): void {
    if (index < 0 || index >= this.config.keyframes.length) return;
    this.config.keyframes[index].styles = { ...styles };
    this.notifyChange();
  }

  /**
   * 更新关键帧的 offset 位置
   */
  updateKeyframeOffset(index: number, offset: number): void {
    if (index < 0 || index >= this.config.keyframes.length) return;
    this.config.keyframes[index].offset = Math.max(0, Math.min(1, offset));
    this.config.keyframes.sort((a, b) => a.offset - b.offset);
    this.notifyChange();
  }

  /**
   * 更新关键帧中的单个属性
   */
  updateKeyframeProperty(index: number, key: string, value: string | number): void {
    if (index < 0 || index >= this.config.keyframes.length) return;
    this.config.keyframes[index].styles[key] = value;
    this.notifyChange();
  }

  /**
   * 删除关键帧中的某个属性
   */
  removeKeyframeProperty(index: number, key: string): void {
    if (index < 0 || index >= this.config.keyframes.length) return;
    delete this.config.keyframes[index].styles[key];
    this.notifyChange();
  }

  /**
   * 删除关键帧
   */
  removeKeyframe(index: number): void {
    if (index < 0 || index >= this.config.keyframes.length) return;
    this.config.keyframes.splice(index, 1);
    this.notifyChange();
  }

  // ===== 缓动曲线 =====

  getBezierPoints(): BezierControlPoints | null {
    return parseTimingFunction(this.config.timingFunction);
  }

  setBezierPoints(points: BezierControlPoints): void {
    this.config.timingFunction = bezierToCSS(points);
    this.notifyChange();
  }

  // ===== CSS 生成 =====

  generateCSS(): { keyframesCSS: string; animationShorthand: string } {
    const result = animationToCSS(this.config);
    this.events.cssGenerated?.(result.keyframesCSS, result.animationShorthand);
    return result;
  }

  /**
   * 生成完整的 CSS 代码块（@keyframes + .selector 规则）
   */
  generateFullCSS(selector?: string): string {
    const { keyframesCSS, animationShorthand } = this.generateCSS();
    const sel = selector ?? '.animated-element';
    return `${keyframesCSS}\n\n${sel} {\n  animation: ${animationShorthand};\n}`;
  }

  /**
   * 生成应用于 style 属性的内联样式对象
   * 用于实时预览
   */
  generatePreviewStyle(): Record<string, string> {
    const { animationShorthand } = animationToCSS(this.config);
    return {
      animation: animationShorthand,
    };
  }

  // ===== 预设模板 =====

  static getPresets() {
    return ANIMATION_PRESETS;
  }

  static getEasingPresets() {
    return EASING_PRESETS;
  }

  /**
   * 从预设加载
   */
  loadPreset(presetNameEn: string): boolean {
    const preset = ANIMATION_PRESETS.find((p) => p.nameEn === presetNameEn);
    if (!preset) return false;
    this.config = { ...preset.config, keyframes: preset.config.keyframes.map((kf) => ({ ...kf, styles: { ...kf.styles } })) };
    this.notifyChange();
    return true;
  }

  // ===== 内部 =====

  private notifyChange(): void {
    this.events.configChanged?.(this.getConfig());
  }
}

// ===== 辅助 =====

function round3(n: number): string {
  return Number(n.toFixed(3)).toString();
}
