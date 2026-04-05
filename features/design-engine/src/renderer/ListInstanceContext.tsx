import React, { createContext, useContext } from 'react';

/**
 * 列表（__listData）展开时，从根到当前子树的「第几行」路径。
 * 用于生成全局唯一的 DOM `data-node-instance-key`，使坐标图与命中不再依赖启发式。
 */
export interface ListInstanceSegment {
  listHostId: string;
  index: number;
}

export const ListInstanceContext = createContext<ListInstanceSegment[] | undefined>(undefined);

export function useListInstancePath(): ListInstanceSegment[] {
  return useContext(ListInstanceContext) ?? [];
}

/**
 * 无列表上下文时 key === nodeId；有列表时 `listHost:index/...|nodeId`，与 Schema 节点 id 可逆区分。
 */
export function encodeNodeInstanceKey(segments: ListInstanceSegment[], nodeId: string): string {
  if (segments.length === 0) return nodeId;
  const path = segments.map((s) => `${s.listHostId}:${s.index}`).join('/');
  return `${path}|${nodeId}`;
}
