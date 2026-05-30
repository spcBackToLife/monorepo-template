/**
 * Meta 操作 op 类型 —— 设计意图 / 溯源 / 完成度 的写入入口（Schema-First 架构）。
 *
 * 设计原则：
 *   - meta 是 B 类信息（渲染不读），但仍走 op 链路（保证 undo/redo / 时间线一致）
 *   - 与节点/屏幕/项目三层一一对应，结构镜像 NodeMeta / ScreenMeta / ProjectMeta
 *   - 写入采用 deep-merge（不传的字段保留），但传 `null` 表示显式清空
 */

import type { NodeMeta, ScreenMeta, ProjectMeta, NodeStatus, PlanTask, UpstreamChallengeRef } from '@globallink/design-schema';

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

// ===== Upstream Challenge（v2.3 跨阶段回流协议） =====

/**
 * 触发跨阶段回流挑战（meta.raiseUpstreamChallenge）。
 *
 * service 端原子地：
 *   1. 校验 raisedBy 任务存在 + 当前不处于 blocked
 *   2. 校验 challengeMd 路径风格合法（不读文件，只校 md 路径写法）
 *   3. 校验同一 raisedBy 当前没有 phase='open'/'accepted' 的 challenge（R-CHALLENGE-04）
 *   4. 在 project.meta.plan 末尾追加一条 stage='product' 的 P-revise-* 任务，
 *      含 upstreamChallenge ref（phase='open'）
 *   5. 把 raisedBy 任务置 status='blocked' + blockedReason + upstreamChallenge ref
 */
export interface MetaRaiseUpstreamChallengeOp {
  type: 'meta.raiseUpstreamChallenge';
  params: {
    /** challenge 的所有元数据（phase 强制写为 'open'，service 会覆盖） */
    challenge: Omit<UpstreamChallengeRef, 'phase' | 'decision' | 'decisionMd'>;
    /** 自动追加的 revise 任务标题，如"[challenge] wrap NormalFormView 重构 00-login Root 三节点" */
    reviseTaskTitle: string;
    /** 自动追加的 revise 任务 id（必须以 P-revise- 开头），约定 = `P-revise-${challengeId}` */
    reviseTaskId: string;
  };
}

/**
 * 关闭一个 challenge（meta.resolveUpstreamChallenge）。
 *
 * service 端原子地：
 *   1. 校验 challenge 存在且 phase='open'
 *   2. 标 P-revise-* 任务 status='done'（accepted）或 'skipped'（rejected）
 *   3. unblock raisedBy 任务（恢复 pending；保留 challenge ref 用于追溯）
 *   4. accepted 时重跑受影响 targetTaskIds 的 expectedArtifacts（R-CHALLENGE-03）
 *   5. 写入 challenge.decision 字段
 */
export interface MetaResolveUpstreamChallengeOp {
  type: 'meta.resolveUpstreamChallenge';
  params: {
    challengeId: string;
    accepted: boolean;
    rationale: string;
    /** decision md 相对路径 */
    decisionMd: string;
  };
}

// ===== 联合 =====

export type MetaOperation =
  | MetaSetNodeOp
  | MetaSetNodeStatusOp
  | MetaSetScreenOp
  | MetaSetProjectOp
  | MetaAddPlanTasksOp
  | MetaUpdatePlanTaskOp
  | MetaRaiseUpstreamChallengeOp
  | MetaResolveUpstreamChallengeOp;
