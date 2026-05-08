import type { ComponentNode } from './node';
import type { DataSource } from './dataSource';
import type { ScreenStateInit } from './state';

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
}
