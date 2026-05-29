import type { CSSProperties } from './css';

/**
 * 预置动画名称。覆盖 80% 常用场景，无需手写 keyframes。
 */
export type PresetAnimation =
  | 'shake'        // 表单错误抖动 (X轴 ±4px ×3)
  | 'fadeIn'       // 淡入
  | 'fadeOut'      // 淡出
  | 'scaleIn'     // 缩放淡入 (0.9→1)
  | 'scaleOut'    // 缩放淡出 (1→0.9)
  | 'slideUp'     // 从下方滑入
  | 'slideDown'   // 从上方滑入
  | 'bounce'      // 弹跳 (scale 1→1.05→1)
  | 'pulse'       // 脉冲 (opacity 1→0.7→1)
  | 'spin';       // 旋转 (loading spinner)

/**
 * 动画描述。可引用预置动画名或自定义 keyframes。
 */
export interface AnimationDef {
  /** 预置动画名 或 自定义 keyframes CSS 字符串 */
  name: PresetAnimation | string;
  /** ms，默认 300 */
  duration?: number;
  /** 默认 'ease' */
  easing?: string;
  /** 默认 1；传 'infinite' 可无限循环 */
  iterationCount?: number | 'infinite';
  /** 默认 'normal' */
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  /** 动画结束后保持最终帧（默认 'forwards'） */
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

/**
 * 节点视觉态：描述节点的 hover/pressed/disabled/custom 等视觉变体。
 *
 * 与 ScreenState 正交：state（屏幕态）改数据；VisualState（节点态）改样式。
 */
export interface VisualState {
  /** 态名 — "default" | "hover" | "pressed" | "disabled" | 自定义 */
  name: string;
  /** 进入该态时覆盖的 CSS 属性 */
  styles: Partial<CSSProperties>;
  /** 进入该态时覆盖的 props */
  props?: Record<string, unknown>;
  /** 进入该态时的 CSS transition 描述 */
  transition?: {
    /** ms，默认 200 */
    duration?: number;
    /** 默认 'ease' */
    easing?: string;
    /** 指定 CSS 属性列表；默认 ['all'] */
    properties?: string[];
  };
  /**
   * 进入该态时触发的动画。
   * 用于 shake（表单错误）、fadeIn（弹窗出现）、bounce（成功反馈）等效果。
   */
  animation?: AnimationDef;
  /**
   * 父态进入时，强制把指定子节点临时切到某个 visualState。
   * key = 子节点 id，value = 目标 visualState 名。
   */
  childrenStates?: Record<string, string>;
  /**
   * 父态进入时，强制隐藏/显示指定子节点。
   * key = 子节点 id，value = 是否可见。
   */
  childrenVisibility?: Record<string, boolean>;
  /** 此态下需禁用的事件触发器（trigger 名） */
  disabledEvents?: string[];
  /**
   * 自动激活条件表达式。当表达式求值为 truthy 时，自动进入该视觉状态。
   *
   * 示例:
   *   activeWhen: "{{ state.view.loginMode === 'code' }}"
   *
   * 优先级: activeWhen 求值优先于 node.activeState；
   *          多个 state 的 activeWhen 同时为 true 时，取 states 数组中的第一个匹配。
   */
  activeWhen?: string;
}
