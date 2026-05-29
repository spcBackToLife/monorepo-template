/**
 * Meta 操作 op 类型 —— 设计意图 / 溯源 / 完成度 的写入入口（Schema-First 架构）。
 *
 * 设计原则：
 *   - meta 是 B 类信息（渲染不读），但仍走 op 链路（保证 undo/redo / 时间线一致）
 *   - 与节点/屏幕/项目三层一一对应，结构镜像 NodeMeta / ScreenMeta / ProjectMeta
 *   - 写入采用 deep-merge（不传的字段保留），但传 `null` 表示显式清空
 */

import type { NodeMeta, ScreenMeta, ProjectMeta, NodeStatus } from '@globallink/design-schema';

// ===== Node Meta =====

/** 整体替换 / 深合并节点 meta */
export interface MetaSetNodeOp {
  type: 'meta.setNode';
  params: {
    nodeId: string;
    /** 深合并（mode='merge'，默认）：未提供字段保留；显式传 null 清空字段 */
    /** 整体替换（mode='replace'）：直接替换 node.meta */
    patch: Partial<NodeMeta> | null;
    mode?: 'merge' | 'replace';
  };
}

/** 节点完成度便捷更新：仅更新 meta.status */
export interface MetaSetNodeStatusOp {
  type: 'meta.setNodeStatus';
  params: {
    nodeId: string;
    status: NodeStatus | null;
  };
}

// ===== Screen Meta =====

export interface MetaSetScreenOp {
  type: 'meta.setScreen';
  params: {
    screenId: string;
    patch: Partial<ScreenMeta> | null;
    mode?: 'merge' | 'replace';
  };
}

// ===== Project Meta =====

export interface MetaSetProjectOp {
  type: 'meta.setProject';
  params: {
    patch: Partial<ProjectMeta> | null;
    mode?: 'merge' | 'replace';
  };
}

// ===== 联合 =====

export type MetaOperation =
  | MetaSetNodeOp
  | MetaSetNodeStatusOp
  | MetaSetScreenOp
  | MetaSetProjectOp;
