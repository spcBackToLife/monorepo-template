/**
 * Action 参数表单共享：CSS class、helpers、Props 类型。
 * 单独抽出避免 StateForms / MiscForms 互相依赖。
 */

import type { LooseAction, FlatNode } from './constants';
import type { DataSource } from '@globallink/design-schema';

export const labelCls = 'text-[10px] text-gray-500 w-12 flex-shrink-0';
export const inputCls = 'flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none';
export const selectCls = 'flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none';
export const rowCls = 'flex items-center gap-1';

export interface FormProps {
  action: LooseAction;
  /** 单字段更新 */
  update: (field: string, value: unknown) => void;
  /** 多字段批量 */
  updateMany?: (fields: Record<string, unknown>) => void;
}

export interface FormCtx extends FormProps {
  screens: Array<{ id: string; name: string }>;
  allNodes: FlatNode[];
  dataSources: DataSource[];
  /** 宿主节点 id（state.set 等默认目标兜底） */
  hostNodeId: string;
}

export const str = (a: LooseAction, k: string): string =>
  typeof a[k] === 'string' ? (a[k] as string) : '';
export const num = (a: LooseAction, k: string): number | undefined =>
  typeof a[k] === 'number' ? (a[k] as number) : undefined;
