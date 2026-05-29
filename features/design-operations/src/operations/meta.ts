/**
 * Meta 操作实现 —— 设计意图 / 溯源 / 完成度 的写入（Schema-First 架构）。
 *
 * - 写入策略：默认 deep-merge（保留未提供字段）；mode='replace' 整体替换；patch=null 清空
 * - inverse：保存旧 meta 整对象，撤销直接恢复
 * - 渲染契约不读 meta，所以这些 op 不会引起视觉变化
 */

import type { DesignProject, ComponentNode, PlanTask } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  MetaSetNodeOp,
  MetaSetNodeStatusOp,
  MetaSetScreenOp,
  MetaSetProjectOp,
  MetaAddPlanTasksOp,
  MetaUpdatePlanTaskOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById } from '../utils/tree';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

function findNodeAcrossScreens(project: DesignProject, nodeId: string): ComponentNode | undefined {
  for (const screen of project.screens) {
    const found = findNodeById(screen.rootNode, nodeId);
    if (found) return found;
  }
  return undefined;
}

/**
 * 深合并：
 *   - patch 内字段递归合并到 target
 *   - patch 中显式为 null 的字段在结果里删除
 *   - 数组按"整体替换"（不数组合并，避免歧义）
 */
function deepMergeRaw(
  target: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(target ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (
      value !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMergeRaw(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function deepMergeMeta<T>(target: T | undefined, patch: Partial<T>): T {
  return deepMergeRaw(
    target as Record<string, unknown> | undefined,
    patch as Record<string, unknown>,
  ) as T;
}

// ===== meta.setNode =====

export function executeSetNodeMeta(project: DesignProject, params: MetaSetNodeOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = node.meta ? deepClone(node.meta) : undefined;

  if (params.patch === null) {
    delete node.meta;
  } else if (params.mode === 'replace') {
    node.meta = deepClone(params.patch);
  } else {
    // merge（默认）
    node.meta = deepMergeMeta(node.meta, params.patch);
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated meta on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'meta.setNode',
      params: { nodeId: params.nodeId, patch: previous ?? null, mode: 'replace' },
    },
  };
}

// ===== meta.setNodeStatus =====

export function executeSetNodeStatus(project: DesignProject, params: MetaSetNodeStatusOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeAcrossScreens(newProject, params.nodeId);
  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = node.meta?.status ? deepClone(node.meta.status) : undefined;

  if (params.status === null) {
    if (node.meta) {
      delete node.meta.status;
      // meta 变空对象时清掉，避免冗余字段
      if (Object.keys(node.meta).length === 0) {
        delete node.meta;
      }
    }
  } else {
    node.meta = node.meta ?? {};
    node.meta.status = deepClone(params.status);
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated meta.status on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'meta.setNodeStatus',
      params: { nodeId: params.nodeId, status: previous ?? null },
    },
  };
}

// ===== meta.setScreen =====

export function executeSetScreenMeta(project: DesignProject, params: MetaSetScreenOp['params']): Result {
  const newProject = deepClone(project);
  const screen = newProject.screens.find((s) => s.id === params.screenId);
  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = screen.meta ? deepClone(screen.meta) : undefined;

  if (params.patch === null) {
    delete screen.meta;
  } else if (params.mode === 'replace') {
    screen.meta = deepClone(params.patch);
  } else {
    screen.meta = deepMergeMeta(screen.meta, params.patch);
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated meta on screen ${params.screenId}`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'meta.setScreen',
      params: { screenId: params.screenId, patch: previous ?? null, mode: 'replace' },
    },
  };
}

// ===== meta.setProject =====

export function executeSetProjectMeta(project: DesignProject, params: MetaSetProjectOp['params']): Result {
  const newProject = deepClone(project);

  const previous = newProject.meta ? deepClone(newProject.meta) : undefined;

  if (params.patch === null) {
    delete newProject.meta;
  } else if (params.mode === 'replace') {
    newProject.meta = deepClone(params.patch);
  } else {
    newProject.meta = deepMergeMeta(newProject.meta, params.patch);
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated project meta`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'meta.setProject',
      params: { patch: previous ?? null, mode: 'replace' },
    },
  };
}

// ===== meta.addPlanTasks =====

function getPlanContainer(
  project: DesignProject,
  scope: 'project' | 'screen',
  screenId?: string,
): { plan: PlanTask[] | undefined; setPlan: (plan: PlanTask[] | undefined) => void; description: string } | null {
  if (scope === 'project') {
    if (!project.meta) project.meta = {};
    return {
      plan: project.meta.plan,
      setPlan: (p) => { project.meta!.plan = p; },
      description: 'project',
    };
  }
  const screen = project.screens.find((s) => s.id === screenId);
  if (!screen) return null;
  if (!screen.meta) screen.meta = {};
  return {
    plan: screen.meta.plan,
    setPlan: (p) => { screen.meta!.plan = p; },
    description: `screen ${screenId}`,
  };
}

export function executeAddPlanTasks(project: DesignProject, params: MetaAddPlanTasksOp['params']): Result {
  const newProject = deepClone(project);
  const container = getPlanContainer(newProject, params.scope, params.screenId);
  if (!container) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = container.plan ? deepClone(container.plan) : undefined;
  const existingIds = new Set((container.plan ?? []).map((t) => t.id));
  const conflictIds = params.tasks.filter((t) => existingIds.has(t.id)).map((t) => t.id);
  if (conflictIds.length > 0) {
    return {
      project,
      result: { success: false, description: `Task IDs already exist: ${conflictIds.join(', ')}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const next = [...(container.plan ?? []), ...params.tasks];
  container.setPlan(next);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added ${params.tasks.length} task(s) to ${container.description} plan`,
      affectedNodeIds: [],
    },
    // inverse：恢复原 plan（用 setProject/setScreen replace 模式语义不直接对应，
    // 这里发回 noop——若用户需要 undo plan 操作，可后续扩展专门的 inverse op）
    inverse: previous
      ? { type: 'noop', params: { restored: previous } as never }
      : { type: 'noop', params: {} },
  };
}

// ===== meta.updatePlanTask =====

/** 递归在任务树中查找/更新一个任务（按 id） */
function updateTaskInTree(tasks: PlanTask[], taskId: string, patch: Partial<Omit<PlanTask, 'id'>>): boolean {
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]!;
    if (t.id === taskId) {
      tasks[i] = { ...t, ...patch, id: t.id };
      return true;
    }
    if (t.subtasks && t.subtasks.length > 0) {
      if (updateTaskInTree(t.subtasks, taskId, patch)) return true;
    }
  }
  return false;
}

export function executeUpdatePlanTask(project: DesignProject, params: MetaUpdatePlanTaskOp['params']): Result {
  const newProject = deepClone(project);
  const container = getPlanContainer(newProject, params.scope, params.screenId);
  if (!container || !container.plan || container.plan.length === 0) {
    return {
      project,
      result: { success: false, description: `No plan tasks found in ${params.scope}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const found = updateTaskInTree(container.plan, params.taskId, params.patch);
  if (!found) {
    return {
      project,
      result: { success: false, description: `Task ${params.taskId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated task ${params.taskId} in ${container.description} plan`,
      affectedNodeIds: [],
    },
    inverse: { type: 'noop', params: {} },
  };
}
