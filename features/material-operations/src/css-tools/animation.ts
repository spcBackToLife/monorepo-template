/**
 * CSS 动画工具集
 *
 * 提供 CSS 关键帧动画的生成、解析和预设模板。
 */

import type { CSSAnimationConfig, AnimationPreset } from './types';

/** 将动画配置转为 CSS @keyframes + animation 声明 */
export function animationToCSS(config: CSSAnimationConfig): {
  keyframesCSS: string;
  animationShorthand: string;
} {
  // 生成 @keyframes
  const keyframeRules = config.keyframes
    .map((kf) => {
      const offset = kf.offset === 0 ? 'from' : kf.offset === 1 ? 'to' : `${Math.round(kf.offset * 100)}%`;
      const props = Object.entries(kf.styles)
        .map(([key, val]) => {
          const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
          return `    ${cssKey}: ${val};`;
        })
        .join('\n');
      return `  ${offset} {\n${props}\n  }`;
    })
    .join('\n');

  const keyframesCSS = `@keyframes ${config.name} {\n${keyframeRules}\n}`;

  // 生成 animation 简写
  const parts = [
    config.name,
    config.duration,
    config.timingFunction,
    config.delay ?? '0s',
    String(config.iterationCount ?? 1),
    config.direction ?? 'normal',
    config.fillMode ?? 'none',
  ];
  const animationShorthand = parts.join(' ');

  return { keyframesCSS, animationShorthand };
}

/** 创建默认动画配置 */
export function createAnimation(options?: Partial<CSSAnimationConfig>): CSSAnimationConfig {
  return {
    name: options?.name ?? 'customAnimation',
    duration: options?.duration ?? '0.3s',
    timingFunction: options?.timingFunction ?? 'ease',
    delay: options?.delay,
    iterationCount: options?.iterationCount ?? 1,
    direction: options?.direction ?? 'normal',
    fillMode: options?.fillMode ?? 'both',
    keyframes: options?.keyframes ?? [
      { offset: 0, styles: { opacity: '0' } },
      { offset: 1, styles: { opacity: '1' } },
    ],
  };
}

// ===== 动画预设模板 =====

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    name: '淡入',
    nameEn: 'fadeIn',
    config: {
      name: 'fadeIn',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0' } },
        { offset: 1, styles: { opacity: '1' } },
      ],
    },
  },
  {
    name: '淡出',
    nameEn: 'fadeOut',
    config: {
      name: 'fadeOut',
      duration: '0.5s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1' } },
        { offset: 1, styles: { opacity: '0' } },
      ],
    },
  },
  {
    name: '从上滑入',
    nameEn: 'slideInDown',
    config: {
      name: 'slideInDown',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'translateY(-30px)' } },
        { offset: 1, styles: { opacity: '1', transform: 'translateY(0)' } },
      ],
    },
  },
  {
    name: '从下滑入',
    nameEn: 'slideInUp',
    config: {
      name: 'slideInUp',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'translateY(30px)' } },
        { offset: 1, styles: { opacity: '1', transform: 'translateY(0)' } },
      ],
    },
  },
  {
    name: '从左滑入',
    nameEn: 'slideInLeft',
    config: {
      name: 'slideInLeft',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'translateX(-30px)' } },
        { offset: 1, styles: { opacity: '1', transform: 'translateX(0)' } },
      ],
    },
  },
  {
    name: '从右滑入',
    nameEn: 'slideInRight',
    config: {
      name: 'slideInRight',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'translateX(30px)' } },
        { offset: 1, styles: { opacity: '1', transform: 'translateX(0)' } },
      ],
    },
  },
  {
    name: '弹入',
    nameEn: 'bounceIn',
    config: {
      name: 'bounceIn',
      duration: '0.6s',
      timingFunction: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'scale(0.3)' } },
        { offset: 0.2, styles: { transform: 'scale(1.1)' } },
        { offset: 0.4, styles: { transform: 'scale(0.9)' } },
        { offset: 0.6, styles: { opacity: '1', transform: 'scale(1.03)' } },
        { offset: 0.8, styles: { transform: 'scale(0.97)' } },
        { offset: 1, styles: { opacity: '1', transform: 'scale(1)' } },
      ],
    },
  },
  {
    name: '脉冲',
    nameEn: 'pulse',
    config: {
      name: 'pulse',
      duration: '1s',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
      keyframes: [
        { offset: 0, styles: { transform: 'scale(1)' } },
        { offset: 0.5, styles: { transform: 'scale(1.05)' } },
        { offset: 1, styles: { transform: 'scale(1)' } },
      ],
    },
  },
  {
    name: '抖动',
    nameEn: 'shake',
    config: {
      name: 'shake',
      duration: '0.5s',
      timingFunction: 'ease-in-out',
      keyframes: [
        { offset: 0, styles: { transform: 'translateX(0)' } },
        { offset: 0.1, styles: { transform: 'translateX(-10px)' } },
        { offset: 0.2, styles: { transform: 'translateX(10px)' } },
        { offset: 0.3, styles: { transform: 'translateX(-10px)' } },
        { offset: 0.4, styles: { transform: 'translateX(10px)' } },
        { offset: 0.5, styles: { transform: 'translateX(-10px)' } },
        { offset: 0.6, styles: { transform: 'translateX(10px)' } },
        { offset: 0.7, styles: { transform: 'translateX(-10px)' } },
        { offset: 0.8, styles: { transform: 'translateX(8px)' } },
        { offset: 0.9, styles: { transform: 'translateX(-8px)' } },
        { offset: 1, styles: { transform: 'translateX(0)' } },
      ],
    },
  },
  {
    name: '放大入场',
    nameEn: 'zoomIn',
    config: {
      name: 'zoomIn',
      duration: '0.4s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'scale(0.5)' } },
        { offset: 1, styles: { opacity: '1', transform: 'scale(1)' } },
      ],
    },
  },
  {
    name: '旋转入场',
    nameEn: 'rotateIn',
    config: {
      name: 'rotateIn',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'rotate(-200deg)' } },
        { offset: 1, styles: { opacity: '1', transform: 'rotate(0)' } },
      ],
    },
  },
  {
    name: '呼吸灯',
    nameEn: 'breathing',
    config: {
      name: 'breathing',
      duration: '2s',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
      keyframes: [
        { offset: 0, styles: { opacity: '0.4' } },
        { offset: 0.5, styles: { opacity: '1' } },
        { offset: 1, styles: { opacity: '0.4' } },
      ],
    },
  },

  // ===== 新增动画预设 (Phase 8) =====

  {
    name: '弹出',
    nameEn: 'bounceOut',
    config: {
      name: 'bounceOut',
      duration: '0.6s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'scale(1)' } },
        { offset: 0.2, styles: { transform: 'scale(0.9)' } },
        { offset: 0.5, styles: { opacity: '1', transform: 'scale(1.1)' } },
        { offset: 0.55, styles: { opacity: '1', transform: 'scale(1.1)' } },
        { offset: 1, styles: { opacity: '0', transform: 'scale(0.3)' } },
      ],
    },
  },
  {
    name: '摇摆',
    nameEn: 'wobble',
    config: {
      name: 'wobble',
      duration: '1s',
      timingFunction: 'ease-in-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { transform: 'translateX(0) rotate(0)' } },
        { offset: 0.15, styles: { transform: 'translateX(-25%) rotate(-5deg)' } },
        { offset: 0.3, styles: { transform: 'translateX(20%) rotate(3deg)' } },
        { offset: 0.45, styles: { transform: 'translateX(-15%) rotate(-3deg)' } },
        { offset: 0.6, styles: { transform: 'translateX(10%) rotate(2deg)' } },
        { offset: 0.75, styles: { transform: 'translateX(-5%) rotate(-1deg)' } },
        { offset: 1, styles: { transform: 'translateX(0) rotate(0)' } },
      ],
    },
  },
  {
    name: '缩小退出',
    nameEn: 'zoomOut',
    config: {
      name: 'zoomOut',
      duration: '0.4s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'scale(1)' } },
        { offset: 0.5, styles: { opacity: '1', transform: 'scale(1.05)' } },
        { offset: 1, styles: { opacity: '0', transform: 'scale(0.5)' } },
      ],
    },
  },
  {
    name: '旋转退出',
    nameEn: 'rotateOut',
    config: {
      name: 'rotateOut',
      duration: '0.5s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'rotate(0)' } },
        { offset: 1, styles: { opacity: '0', transform: 'rotate(200deg)' } },
      ],
    },
  },
  {
    name: '水平翻转入',
    nameEn: 'flipInX',
    config: {
      name: 'flipInX',
      duration: '0.6s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'perspective(400px) rotateX(90deg)' } },
        { offset: 0.4, styles: { transform: 'perspective(400px) rotateX(-20deg)' } },
        { offset: 0.6, styles: { opacity: '1', transform: 'perspective(400px) rotateX(10deg)' } },
        { offset: 0.8, styles: { transform: 'perspective(400px) rotateX(-5deg)' } },
        { offset: 1, styles: { opacity: '1', transform: 'perspective(400px) rotateX(0)' } },
      ],
    },
  },
  {
    name: '垂直翻转入',
    nameEn: 'flipInY',
    config: {
      name: 'flipInY',
      duration: '0.6s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'perspective(400px) rotateY(90deg)' } },
        { offset: 0.4, styles: { transform: 'perspective(400px) rotateY(-20deg)' } },
        { offset: 0.6, styles: { opacity: '1', transform: 'perspective(400px) rotateY(10deg)' } },
        { offset: 0.8, styles: { transform: 'perspective(400px) rotateY(-5deg)' } },
        { offset: 1, styles: { opacity: '1', transform: 'perspective(400px) rotateY(0)' } },
      ],
    },
  },
  {
    name: '水平翻转出',
    nameEn: 'flipOutX',
    config: {
      name: 'flipOutX',
      duration: '0.5s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'perspective(400px) rotateX(0)' } },
        { offset: 0.3, styles: { opacity: '1', transform: 'perspective(400px) rotateX(-20deg)' } },
        { offset: 1, styles: { opacity: '0', transform: 'perspective(400px) rotateX(90deg)' } },
      ],
    },
  },
  {
    name: '垂直翻转出',
    nameEn: 'flipOutY',
    config: {
      name: 'flipOutY',
      duration: '0.5s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'perspective(400px) rotateY(0)' } },
        { offset: 0.3, styles: { opacity: '1', transform: 'perspective(400px) rotateY(-20deg)' } },
        { offset: 1, styles: { opacity: '0', transform: 'perspective(400px) rotateY(90deg)' } },
      ],
    },
  },
  {
    name: '向上滑出',
    nameEn: 'slideOutUp',
    config: {
      name: 'slideOutUp',
      duration: '0.4s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'translateY(0)' } },
        { offset: 1, styles: { opacity: '0', transform: 'translateY(-30px)' } },
      ],
    },
  },
  {
    name: '向下滑出',
    nameEn: 'slideOutDown',
    config: {
      name: 'slideOutDown',
      duration: '0.4s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'translateY(0)' } },
        { offset: 1, styles: { opacity: '0', transform: 'translateY(30px)' } },
      ],
    },
  },
  {
    name: '向左滑出',
    nameEn: 'slideOutLeft',
    config: {
      name: 'slideOutLeft',
      duration: '0.4s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'translateX(0)' } },
        { offset: 1, styles: { opacity: '0', transform: 'translateX(-30px)' } },
      ],
    },
  },
  {
    name: '向右滑出',
    nameEn: 'slideOutRight',
    config: {
      name: 'slideOutRight',
      duration: '0.4s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'translateX(0)' } },
        { offset: 1, styles: { opacity: '0', transform: 'translateX(30px)' } },
      ],
    },
  },
  {
    name: '秋千',
    nameEn: 'swing',
    config: {
      name: 'swing',
      duration: '1s',
      timingFunction: 'ease-in-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { transform: 'rotate(0)' } },
        { offset: 0.2, styles: { transform: 'rotate(15deg)' } },
        { offset: 0.4, styles: { transform: 'rotate(-10deg)' } },
        { offset: 0.6, styles: { transform: 'rotate(5deg)' } },
        { offset: 0.8, styles: { transform: 'rotate(-5deg)' } },
        { offset: 1, styles: { transform: 'rotate(0)' } },
      ],
    },
  },
  {
    name: '哒哒',
    nameEn: 'tada',
    config: {
      name: 'tada',
      duration: '1s',
      timingFunction: 'ease-in-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { transform: 'scale(1) rotate(0)' } },
        { offset: 0.1, styles: { transform: 'scale(0.9) rotate(-3deg)' } },
        { offset: 0.2, styles: { transform: 'scale(0.9) rotate(-3deg)' } },
        { offset: 0.3, styles: { transform: 'scale(1.1) rotate(3deg)' } },
        { offset: 0.4, styles: { transform: 'scale(1.1) rotate(-3deg)' } },
        { offset: 0.5, styles: { transform: 'scale(1.1) rotate(3deg)' } },
        { offset: 0.6, styles: { transform: 'scale(1.1) rotate(-3deg)' } },
        { offset: 0.7, styles: { transform: 'scale(1.1) rotate(3deg)' } },
        { offset: 0.8, styles: { transform: 'scale(1.1) rotate(-3deg)' } },
        { offset: 0.9, styles: { transform: 'scale(1.1) rotate(3deg)' } },
        { offset: 1, styles: { transform: 'scale(1) rotate(0)' } },
      ],
    },
  },
  {
    name: '果冻',
    nameEn: 'jello',
    config: {
      name: 'jello',
      duration: '1s',
      timingFunction: 'ease-in-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { transform: 'skewX(0) skewY(0)' } },
        { offset: 0.111, styles: { transform: 'skewX(0) skewY(0)' } },
        { offset: 0.222, styles: { transform: 'skewX(-12.5deg) skewY(-12.5deg)' } },
        { offset: 0.333, styles: { transform: 'skewX(6.25deg) skewY(6.25deg)' } },
        { offset: 0.444, styles: { transform: 'skewX(-3.125deg) skewY(-3.125deg)' } },
        { offset: 0.555, styles: { transform: 'skewX(1.5625deg) skewY(1.5625deg)' } },
        { offset: 0.666, styles: { transform: 'skewX(-0.78125deg) skewY(-0.78125deg)' } },
        { offset: 0.777, styles: { transform: 'skewX(0.390625deg) skewY(0.390625deg)' } },
        { offset: 0.888, styles: { transform: 'skewX(-0.1953125deg) skewY(-0.1953125deg)' } },
        { offset: 1, styles: { transform: 'skewX(0) skewY(0)' } },
      ],
    },
  },
  {
    name: '心跳',
    nameEn: 'heartBeat',
    config: {
      name: 'heartBeat',
      duration: '1.3s',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
      keyframes: [
        { offset: 0, styles: { transform: 'scale(1)' } },
        { offset: 0.14, styles: { transform: 'scale(1.3)' } },
        { offset: 0.28, styles: { transform: 'scale(1)' } },
        { offset: 0.42, styles: { transform: 'scale(1.3)' } },
        { offset: 0.7, styles: { transform: 'scale(1)' } },
        { offset: 1, styles: { transform: 'scale(1)' } },
      ],
    },
  },
  {
    name: '光速进入（左）',
    nameEn: 'lightSpeedInLeft',
    config: {
      name: 'lightSpeedInLeft',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'translateX(-100%) skewX(30deg)' } },
        { offset: 0.6, styles: { opacity: '1', transform: 'translateX(0) skewX(-20deg)' } },
        { offset: 0.8, styles: { transform: 'translateX(0) skewX(5deg)' } },
        { offset: 1, styles: { opacity: '1', transform: 'translateX(0) skewX(0)' } },
      ],
    },
  },
  {
    name: '光速进入（右）',
    nameEn: 'lightSpeedInRight',
    config: {
      name: 'lightSpeedInRight',
      duration: '0.5s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'translateX(100%) skewX(-30deg)' } },
        { offset: 0.6, styles: { opacity: '1', transform: 'translateX(0) skewX(20deg)' } },
        { offset: 0.8, styles: { transform: 'translateX(0) skewX(-5deg)' } },
        { offset: 1, styles: { opacity: '1', transform: 'translateX(0) skewX(0)' } },
      ],
    },
  },
  {
    name: '滚动进入',
    nameEn: 'rollIn',
    config: {
      name: 'rollIn',
      duration: '0.6s',
      timingFunction: 'ease-out',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '0', transform: 'translateX(-100%) rotate(-120deg)' } },
        { offset: 1, styles: { opacity: '1', transform: 'translateX(0) rotate(0)' } },
      ],
    },
  },
  {
    name: '滚动退出',
    nameEn: 'rollOut',
    config: {
      name: 'rollOut',
      duration: '0.6s',
      timingFunction: 'ease-in',
      fillMode: 'both',
      keyframes: [
        { offset: 0, styles: { opacity: '1', transform: 'translateX(0) rotate(0)' } },
        { offset: 1, styles: { opacity: '0', transform: 'translateX(100%) rotate(120deg)' } },
      ],
    },
  },
];

/** 预置的缓动曲线 */
export const EASING_PRESETS = [
  { name: 'ease', value: 'ease', label: '默认缓动' },
  { name: 'linear', value: 'linear', label: '线性' },
  { name: 'ease-in', value: 'ease-in', label: '缓入' },
  { name: 'ease-out', value: 'ease-out', label: '缓出' },
  { name: 'ease-in-out', value: 'ease-in-out', label: '缓入缓出' },
  { name: 'spring', value: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', label: '弹性' },
  { name: 'bounce', value: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)', label: '弹跳' },
  { name: 'snap', value: 'cubic-bezier(0, 1, 0.5, 1)', label: '快速' },
] as const;
