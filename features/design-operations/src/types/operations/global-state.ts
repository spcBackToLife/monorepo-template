/**
 * 项目级 GlobalStateInit 操作 op 类型。
 * 所有屏幕共享的 view 变量定义。
 */

import type { ViewVariableDef } from '@globallink/design-schema';

export interface GlobalStateAddViewVariableOp {
  type: 'globalState.addViewVariable';
  params: {
    variable: ViewVariableDef;
  };
}

export interface GlobalStateRemoveViewVariableOp {
  type: 'globalState.removeViewVariable';
  params: {
    name: string;
  };
}

export interface GlobalStateUpdateViewVariableOp {
  type: 'globalState.updateViewVariable';
  params: {
    name: string;
    patch: {
      label?: string;
      defaultValue?: unknown;
      enum?: { value: unknown; label: string }[];
    };
  };
}

export interface GlobalStateSetViewPreviewOp {
  type: 'globalState.setViewPreview';
  params: {
    name: string;
    /** 传 undefined 清空 previewValue */
    previewValue: unknown;
  };
}

export type GlobalStateOperation =
  | GlobalStateAddViewVariableOp
  | GlobalStateRemoveViewVariableOp
  | GlobalStateUpdateViewVariableOp
  | GlobalStateSetViewPreviewOp;
