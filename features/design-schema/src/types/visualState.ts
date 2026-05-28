import type { CSSProperties } from './css';

/**
 * 节点视觉态：描述节点的 hover/pressed/disabled/custom 等视觉变体。
 *
 * 与 ScreenState 正交：state（屏幕态）改数据；VisualState（节点态）改样式。
 */
export interface VisualState {
  /** 态名 —— "default" | "hover" | "pressed" | "disabled" | 自定义 */
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
   * 用于替代 node.setVisualState 事件联动，实现"state 变化→视觉自动响应"。
   *
   * 示例:
   *   activeWhen: "{{ state.view.loginMode === 'code' }}"
   *   → 当 loginMode 为 'code' 时，此节点自动切换到该 visualState
   *
   * 优先级: activeWhen 求值优先于 node.activeState；
   *          多个 state 的 activeWhen 同时为 true 时，取 states 数组中的第一个匹配。
   */
  activeWhen?: string;
}
