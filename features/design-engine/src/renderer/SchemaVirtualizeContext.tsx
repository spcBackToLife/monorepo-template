import React from 'react';
import type { CoordinateMap } from '../overlay/coordinateMap';
import { nodeRectIntersectsCull } from '../overlay/schemaLayoutMap';

export interface SchemaVirtualizeContextValue {
  enabled: boolean;
  layoutMap: CoordinateMap;
  cullRect: { x: number; y: number; width: number; height: number };
  /** `repeat` 展开的列表子树：禁用裁剪，避免重复 node id 与多实例错位 */
  cullDisabledForSubtree: boolean;
}

const defaultValue: SchemaVirtualizeContextValue = {
  enabled: false,
  layoutMap: new Map(),
  cullRect: { x: 0, y: 0, width: 0, height: 0 },
  cullDisabledForSubtree: false,
};

export const SchemaVirtualizeContext = React.createContext<SchemaVirtualizeContextValue>(defaultValue);

export function useSchemaVirtualize(): SchemaVirtualizeContextValue {
  return React.useContext(SchemaVirtualizeContext);
}

/** 是否应跳过本节点 DOM（根与无估计盒的节点不裁剪） */
export function shouldVirtualizeCullNode(
  ctx: SchemaVirtualizeContextValue,
  options: { nodeId: string; rootNodeId?: string },
): boolean {
  if (!ctx.enabled || ctx.cullDisabledForSubtree) return false;
  if (options.rootNodeId && options.nodeId === options.rootNodeId) return false;
  const entry = ctx.layoutMap.get(options.nodeId);
  if (!entry) return false;
  const r = entry.rect;
  return !nodeRectIntersectsCull(r, ctx.cullRect);
}
