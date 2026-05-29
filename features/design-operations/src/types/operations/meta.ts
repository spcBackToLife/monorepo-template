/**
 * Meta 操作 op 类型 —— 设计意图 / 溯源 / 完成度 的写入入口（Schema-First 架构）。
 *
 * 设计原则：
 *   - meta 是 B 类信息（渲染不读），但仍走 op 链路（保证 undo/redo / 时间线一致）
 *   - 与节点/屏幕/项目三层一一对应，结构镜像 NodeMeta / ScreenMeta / ProjectMeta
 *   - 写入采用 deep-merge（不传的字段保留），但传 `null` 表示显式清空
 */

import type { NodeMeta, ScreenMeta, ProjectMeta, NodeStatus, PlanTask } from '@globallink/design-schema';

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

// ===== Plan（任务清单）便捷操作 =====

/**
 * 添加任务到计划清单（追加，不覆盖已有任务）。
 * scope='project' 写到 project.meta.plan；scope='screen' 写到 screen.meta.plan。
 */
export interface MetaAddPlanTasksOp {
  type: 'meta.addPlanTasks';
  params: {
    scope: 'project' | 'screen';
    screenId?: string;       // scope='screen' 时必填
    tasks: PlanTask[];
  };
}

/**
 * 更新单条任务（按 id 定位）。可改 status / notes / blockedReason / 添加 subtasks。
 */
export interface MetaUpdatePlanTaskOp {
  type: 'meta.updatePlanTask';
  params: {
    scope: 'project' | 'screen';
    screenId?: string;
    taskId: string;
    patch: Partial<Omit<PlanTask, 'id'>>;
  };
}

// ===== 联合 =====

export type MetaOperation =
  | MetaSetNodeOp
  | MetaSetNodeStatusOp
  | MetaSetScreenOp
  | MetaSetProjectOp
  | MetaAddPlanTasksOp
  | MetaUpdatePlanTaskOp;
