/**
 * 事件（ComponentEvent + Action[]）op 类型。
 *
 * 设计要点：
 *   - actions 类型为 Action 联合（state.* / effect.* / nav.* / ui.* / node.* / custom）
 *   - condition 用 Expression<boolean> 表达任意布尔判断
 *   - addNavigation 是便捷形式，等价于 add 一个 trigger=click + actions=[{type:'nav.go'}] 的事件
 */

import type { ComponentEvent } from '@globallink/design-schema';

export interface EventAddOp {
  type: 'event.add';
  params: {
    nodeId: string;
    event: ComponentEvent;
  };
}

export interface EventRemoveOp {
  type: 'event.remove';
  params: {
    nodeId: string;
    eventIndex: number;
  };
}

export interface EventUpdateOp {
  type: 'event.update';
  params: {
    nodeId: string;
    eventIndex: number;
    /** 局部 patch；actions 替换式更新（不做合并） */
    event: Partial<ComponentEvent>;
  };
}

/**
 * 一个常用便捷操作：在节点上添加一条 click 事件，actions 仅为单个 nav.go。
 *
 * targetScreenId === 'new' 时由调用方负责先创建新屏幕（不在本 op 内分裂出新 screen）。
 */
export interface EventAddNavigationOp {
  type: 'event.addNavigation';
  params: {
    nodeId: string;
    trigger: 'click' | 'doubleClick';
    targetScreenId: string;
    /** 事件描述 */
    description?: string;
    /** 如需附加单一 action 之外的链可整体走 event.add */
  };
}

export type EventOperation =
  | EventAddOp
  | EventRemoveOp
  | EventUpdateOp
  | EventAddNavigationOp;
