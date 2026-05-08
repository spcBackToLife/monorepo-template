/**
 * 节点视觉态（VisualState）操作 op 类型。
 *
 * 旧 `state.*` op（v1 ComponentState）改名 `visualState.*`，
 * 与屏幕级 `screenState.*` 区分语义：
 *   - visualState = 节点的 hover/pressed/disabled/custom 视觉变体（改样式）
 *   - screenState = 屏幕的运行时状态（改数据）
 */

import type { CSSProperties, VisualState, ExpressionStyles } from '@globallink/design-schema';

export interface VisualStateAddOp {
  type: 'visualState.add';
  params: {
    nodeId: string;
    stateName: string;
    styles?: Partial<CSSProperties> | Partial<ExpressionStyles>;
    props?: Record<string, unknown>;
    transition?: VisualState['transition'];
    childrenStates?: Record<string, string>;
    childrenVisibility?: Record<string, boolean>;
    disabledEvents?: string[];
  };
}

export interface VisualStateRemoveOp {
  type: 'visualState.remove';
  params: {
    nodeId: string;
    stateName: string;
  };
}

export interface VisualStateUpdateOp {
  type: 'visualState.update';
  params: {
    nodeId: string;
    stateName: string;
    styles?: Partial<CSSProperties> | Partial<ExpressionStyles>;
    props?: Record<string, unknown>;
    transition?: VisualState['transition'];
    childrenStates?: Record<string, string>;
    childrenVisibility?: Record<string, boolean>;
    disabledEvents?: string[];
  };
}

export interface VisualStateSetActiveOp {
  type: 'visualState.setActive';
  params: {
    nodeId: string;
    stateName: string;
  };
}

export interface VisualStateResetStyleOp {
  type: 'visualState.resetStyle';
  params: {
    nodeId: string;
    stateName: string;
    /** 要从此态 styles 中删除的 CSS 属性键 */
    properties: string[];
  };
}

export interface VisualStateSetChildVisibilityOp {
  type: 'visualState.setChildVisibility';
  params: {
    parentNodeId: string;
    childNodeId: string;
    /** 写入哪个态的 childrenVisibility */
    stateName: string;
    /**
     * true = 此态显式可见
     * false = 此态显式隐藏
     * undefined = 删除 override（继承 default）
     */
    visible: boolean | undefined;
  };
}

export type VisualStateOperation =
  | VisualStateAddOp
  | VisualStateRemoveOp
  | VisualStateUpdateOp
  | VisualStateSetActiveOp
  | VisualStateResetStyleOp
  | VisualStateSetChildVisibilityOp;
