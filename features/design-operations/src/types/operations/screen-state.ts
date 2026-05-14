/**
 * 屏幕级 ScreenStateInit 操作 op 类型。
 *
 * view 变量是自由 JSON 默认值；条件渲染 / 样式分支用表达式表达，
 * 无需显式枚举 + binding。
 *
 * 写入到 Screen.stateInit.view[name] / Screen.stateInit.data[key]。
 */

import type { ViewVariableDef, DataTypeAnnotation } from '@globallink/design-schema';

export interface ScreenStateAddViewVariableOp {
  type: 'screenState.addViewVariable';
  params: {
    screenId: string;
    variable: ViewVariableDef;
  };
}

export interface ScreenStateRemoveViewVariableOp {
  type: 'screenState.removeViewVariable';
  params: {
    screenId: string;
    name: string;
  };
}

export interface ScreenStateUpdateViewVariableOp {
  type: 'screenState.updateViewVariable';
  params: {
    screenId: string;
    name: string;
    patch: {
      label?: string;
      defaultValue?: unknown;
      enum?: { value: unknown; label: string }[];
    };
  };
}

/** 编辑期切换 view 变量的预览值（不进运行时） */
export interface ScreenStateSetViewPreviewOp {
  type: 'screenState.setViewPreview';
  params: {
    screenId: string;
    name: string;
    /** 传 undefined 清空 previewValue */
    previewValue: unknown;
  };
}

/** 设置 stateInit.data 的某个 key 的初始值（手动加常量） */
export interface ScreenStateSetDataInitOp {
  type: 'screenState.setDataInit';
  params: {
    screenId: string;
    key: string;
    value: unknown;
    /** 类型注解，写入 stateInit.dataTypes[key] */
    typeAnnotation?: DataTypeAnnotation;
  };
}

export interface ScreenStateRemoveDataInitOp {
  type: 'screenState.removeDataInit';
  params: {
    screenId: string;
    key: string;
  };
}

export type ScreenStateOperation =
  | ScreenStateAddViewVariableOp
  | ScreenStateRemoveViewVariableOp
  | ScreenStateUpdateViewVariableOp
  | ScreenStateSetViewPreviewOp
  | ScreenStateSetDataInitOp
  | ScreenStateRemoveDataInitOp;
