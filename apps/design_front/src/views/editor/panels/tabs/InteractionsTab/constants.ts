/**
 * InteractionsTab 常量与共享类型（v2 动词模型）。
 *
 * v2 设计要点（与 design-schema/src/types/action.ts 对齐）：
 * - 动词 dot-namespace：state.* / effect.* / nav.* / node.* / ui.* / custom
 * - 触发器新增 change / submit
 * - 条件用 { when: Expression<boolean> } 替代 v1 'domainState' / 'expression' 二元
 */

import type { ActionType } from '@globallink/design-schema';

// ===== Triggers =====

export const TRIGGER_OPTIONS = [
  { value: 'click', label: '点击 (Click)' },
  { value: 'doubleClick', label: '双击 (DblClick)' },
  { value: 'hover', label: '悬停 (Hover)' },
  { value: 'focus', label: '聚焦 (Focus)' },
  { value: 'blur', label: '失焦 (Blur)' },
  { value: 'longPress', label: '长按 (LongPress)' },
  { value: 'change', label: '变更 (Change)' },
  { value: 'submit', label: '提交 (Submit)' },
  { value: 'screenEnter', label: '页面进入 (ScreenEnter)' },
  { value: 'screenExit', label: '页面离开 (ScreenExit)' },
  { value: 'screenVisible', label: '页面可见 (Visible)' },
  { value: 'screenHidden', label: '页面隐藏 (Hidden)' },
  { value: 'scrollReachBottom', label: '滚动到底 (ScrollBottom)' },
  { value: 'scrollReachTop', label: '滚动到顶 (ScrollTop)' },
  { value: 'navigateBack', label: '返回键 (Back)' },
] as const;

export type TriggerType = typeof TRIGGER_OPTIONS[number]['value'];

// ===== Action Types =====
// 顺序按使用频率分组：state / effect / nav / node / ui / custom

export const ACTION_TYPES: ReadonlyArray<{ value: ActionType; label: string; group: string }> = [
  // State
  { value: 'state.set', label: '设置状态 (state.set)', group: 'state' },
  { value: 'state.append', label: '追加数组项 (state.append)', group: 'state' },
  { value: 'state.remove', label: '删除数组项 (state.remove)', group: 'state' },
  { value: 'state.merge', label: '浅合并对象 (state.merge)', group: 'state' },
  { value: 'state.toggle', label: '反转布尔 (state.toggle)', group: 'state' },
  // Effect
  { value: 'effect.fetch', label: '触发数据请求 (effect.fetch)', group: 'effect' },
  { value: 'effect.cancel', label: '取消请求 (effect.cancel)', group: 'effect' },
  // Nav
  { value: 'nav.go', label: '跳转页面 (nav.go)', group: 'nav' },
  { value: 'nav.back', label: '返回上一页 (nav.back)', group: 'nav' },
  // Node visual state
  { value: 'node.setVisualState', label: '切换视觉态 (node.setVisualState)', group: 'node' },
  // UI side-effects
  { value: 'ui.showToast', label: '展示提示 (ui.showToast)', group: 'ui' },
  { value: 'ui.openUrl', label: '打开链接 (ui.openUrl)', group: 'ui' },
  { value: 'ui.delay', label: '延时 (ui.delay)', group: 'ui' },
  // Custom
  { value: 'custom', label: '自定义 (custom)', group: 'custom' },
];

/**
 * effect.fetch 嵌套二级时禁止再嵌 effect.fetch，避免无限循环 UI。
 * 二级链允许的动词：除 effect.fetch 外的其他全部。
 */
export const ACTION_TYPES_NO_EFFECT_FETCH = ACTION_TYPES.filter(
  (a) => a.value !== 'effect.fetch',
);

// ===== Loose action shape =====
// 动作在编辑期是 patch 状态，参数可能不全；运行期由 dispatch 时 zod 校验严格化。

export type LooseAction = { type: ActionType; [key: string]: unknown };

// ===== Tree flatten helper =====

export interface NodeWithChildren {
  id: string;
  name?: string;
  type: string;
  /** schema v2 字段名（视觉态数组） */
  states?: Array<{ name: string }>;
  children?: NodeWithChildren[];
}

export interface FlatNode {
  id: string;
  name: string;
  type: string;
  depth: number;
  /** 节点的 visual states（hover/pressed/disabled/custom） */
  states: Array<{ name: string }>;
}

export function collectFlatNodes(node: NodeWithChildren, depth = 0): FlatNode[] {
  const result: FlatNode[] = [{
    id: node.id,
    name: node.name || node.type,
    type: node.type,
    depth,
    states: node.states ?? [],
  }];
  for (const child of node.children ?? []) {
    result.push(...collectFlatNodes(child, depth + 1));
  }
  return result;
}
