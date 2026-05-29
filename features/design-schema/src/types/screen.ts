import type { ComponentNode } from './node';
import type { DataSource } from './dataSource';
import type { ScreenStateInit } from './state';
import type { ScreenMeta } from './meta';

/** 全局覆盖层类型 */
export type OverlayType = 'modal' | 'bottomSheet' | 'drawer' | 'toast' | 'custom';

/** 覆盖层动画类型 */
export type OverlayAnimation = 'fade' | 'slideUp' | 'slideDown' | 'slideRight' | 'scaleIn' | 'none';

/**
 * 全局覆盖层节点 — Modal / BottomSheet / Drawer / Toast 等。
 * 脱离正常文档流渲染在页面最顶层，通过 ui.showOverlay/hideOverlay 控制显隐。
 */
export interface OverlayNode {
  /** 唯一标识 */
  id: string;
  /** 覆盖层名称（如"登录锁定弹窗"） */
  name: string;
  /** 覆盖层类型（影响默认样式和行为） */
  type: OverlayType;
  /** 覆盖层内部节点树 */
  rootNode: ComponentNode;
  /** 出现/消失动画 */
  animation?: OverlayAnimation;
  /** 蒙层配置 */
  backdrop?: {
    /** 蒙层颜色，默认 rgba(0,0,0,0.5) */
    color?: string;
    /** 点击蒙层是否关闭覆盖层，默认 true */
    dismissible?: boolean;
  };
  /**
   * 条件显示表达式。如设置，则由表达式自动控制显隐（无需手动 showOverlay）。
   * 例: "{{ state.view.showLoginModal }}"
   */
  showWhen?: string;
}

/** A single screen/page in the design project（v2） */
export interface Screen {
  /** Unique screen identifier */
  id: string;
  /** Screen name, e.g., "Home", "Login", "Profile" */
  name: string;
  /** Root node of the component tree for this screen */
  rootNode: ComponentNode;
  /** Background color (CSS color value) */
  backgroundColor?: string;

  /**
   * v2 数据源（含 endpoint+mock 共存）。
   * 运行时由 EffectExecutor 消费：static 同步注入 state.data[name]，
   * api 由 effect.fetch 触发。
   */
  dataSources: DataSource[];

  /** 屏幕级 state 初始化（替代 v1 domainStates） */
  stateInit?: ScreenStateInit;

  /**
   * 全局覆盖层列表。渲染在页面内容之上（z-index 最高层）。
   * 通过 ui.showOverlay / ui.hideOverlay 或 showWhen 表达式控制显隐。
   */
  overlays?: OverlayNode[];

  /**
   * 屏幕级设计意图 / 溯源 / 完成度（B 类，渲染契约不读）。
   * 取代旧 design-registry _page.json。详见 SCHEMA-FIRST-REFACTOR.md §4。
   */
  meta?: ScreenMeta;
}

