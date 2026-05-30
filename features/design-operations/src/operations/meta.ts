/**
 * Meta 操作实现 —— 设计意图 / 溯源 / 完成度 的写入（Schema-First 架构）。
 *
 * - 写入策略：默认 deep-merge（保留未提供字段）；mode='replace' 整体替换；patch=null 清空
 * - inverse：保存旧 meta 整对象，撤销直接恢复
 * - 渲染契约不读 meta，所以这些 op 不会引起视觉变化
 */

import type { DesignProject, ComponentNode, PlanTask, UpstreamChallengeRef } from '@globallink/design-schema';
import { deepClone, verifyArtifacts } from '@globallink/design-schema';
import type {
  MetaSetNodeOp,
  MetaSetNodeStatusOp,
  MetaSetScreenOp,
  MetaSetProjectOp,
  MetaAddPlanTasksOp,
  MetaUpdatePlanTaskOp,
  MetaRaiseUpstreamChallengeOp,
  MetaResolveUpstreamChallengeOp,
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

/**
 * 顶层一等字段名（属于 DesignProject 直接字段而非 ProjectMeta）。
 * 严禁通过 meta.setProject 写入——会被 deep-merge 静默放进 meta 命名空间，
 * 形成"幽灵字段"（type 不认 / 渲染不读 / 工具乱）。
 *
 * 它们各自有专门的 op：
 *   - globalOverlays  → project.setGlobalOverlays
 *   - globalStateInit → globalState.* 系列
 *   - themeConfig     → theme.* 系列
 *   - screens / componentAssets → screen.* / asset.*
 */
const FORBIDDEN_PROJECT_TOP_LEVEL_FIELDS = new Set([
  'globalOverlays',
  'globalStateInit',
  'themeConfig',
  'screens',
  'componentAssets',
  'currentViewport',
  'defaultViewport',
  'viewportPresets',
  'id',
  'name',
  'platform',
  'createdAt',
  'updatedAt',
]);

export function executeSetProjectMeta(project: DesignProject, params: MetaSetProjectOp['params']): Result {
  // 拒绝顶层字段被误塞进 meta（参见 FORBIDDEN_PROJECT_TOP_LEVEL_FIELDS）
  // 例外：patch[field] === null 视为"清理幽灵字段"——允许，用于历史数据迁移
  if (params.patch && typeof params.patch === 'object') {
    const violators = Object.keys(params.patch).filter((k) => {
      if (!FORBIDDEN_PROJECT_TOP_LEVEL_FIELDS.has(k)) return false;
      // null 表示清理 meta 里残留的幽灵同名字段，允许
      const v = (params.patch as Record<string, unknown>)[k];
      return v !== null;
    });
    if (violators.length > 0) {
      const hints = violators
        .map((f) => {
          if (f === 'globalOverlays') return `· "${f}" → 走 project.setGlobalOverlays op`;
          if (f === 'globalStateInit') return `· "${f}" → 走 globalState.addViewVariable / updateViewVariable 等 op`;
          if (f === 'themeConfig') return `· "${f}" → 走 theme.* 系列 op`;
          return `· "${f}" → 顶层字段，不属 meta`;
        })
        .join('\n');
      return {
        project,
        result: {
          success: false,
          description:
            `meta.setProject 不能写入顶层一等字段（这些是 A 类，渲染契约会读，` +
            `与 meta 严格分离）：\n${hints}\n` +
            `如果你想做的是修改 ProjectMeta（targetUser / coreScenarios / ` +
            `styleDirection / constraints / modules / navigation / globalConcerns / plan），` +
            `请只在 patch 中传这些字段。\n` +
            `（提示：传 ${violators[0]}: null 可清理历史遗留的同名 meta 字段）`,
          affectedNodeIds: [],
        },
        inverse: { type: 'noop', params: {} },
      };
    }
  }

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

/** 递归查找任务（不修改） */
function findTaskInTree(tasks: PlanTask[], taskId: string): PlanTask | undefined {
  for (const t of tasks) {
    if (t.id === taskId) return t;
    if (t.subtasks && t.subtasks.length > 0) {
      const found = findTaskInTree(t.subtasks, taskId);
      if (found) return found;
    }
  }
  return undefined;
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

  // ★ 产物指纹机器对账（Schema-First 第一性原理）
  // 标 done 时强制校验该任务的 expectedArtifacts；未通过则拒绝写入
  // ⚠️ 取 expectedArtifacts 来源优先级：patch.expectedArtifacts > task.expectedArtifacts
  // （允许在 update 时一并补声明产物指纹；正常路径是 add_plan_tasks 时就声明好）
  if (params.patch.status === 'done') {
    const existing = findTaskInTree(container.plan, params.taskId);
    if (!existing) {
      return {
        project,
        result: { success: false, description: `Task ${params.taskId} not found`, affectedNodeIds: [] },
        inverse: { type: 'noop', params: {} },
      };
    }
    const checks =
      (params.patch.expectedArtifacts as PlanTask['expectedArtifacts']) ??
      existing.expectedArtifacts;
    if (checks && checks.length > 0) {
      // root：scope=project 用 newProject；scope=screen 用对应 screen 对象
      const root: unknown =
        params.scope === 'project'
          ? newProject
          : newProject.screens.find((s) => s.id === params.screenId);
      const verdict = verifyArtifacts(root, checks);
      if (!verdict.ok) {
        const detail = verdict.failures.map((f) => `· ${f.detail}`).join('\n');
        return {
          project,
          result: {
            success: false,
            description:
              `任务 ${params.taskId} 不能标 done —— expectedArtifacts 未满足:\n${detail}\n\n` +
              `请先把缺失的 schema 字段写到位（参考任务声明的产物路径），再标 done。\n` +
              `若该任务确实不需要做，请改为 status: 'skipped' 并在 notes 写否决理由。`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} },
        };
      }
    }
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

// ===== Upstream Challenge（v2.3 跨阶段回流协议） =====

/** 在 PlanTask 子树里收集所有 challenge ref（不修改） */
function collectChallenges(tasks: PlanTask[] | undefined): UpstreamChallengeRef[] {
  if (!tasks) return [];
  const out: UpstreamChallengeRef[] = [];
  const walk = (list: PlanTask[]) => {
    for (const t of list) {
      if (t.upstreamChallenge) out.push(t.upstreamChallenge);
      if (t.subtasks && t.subtasks.length > 0) walk(t.subtasks);
    }
  };
  walk(tasks);
  return out;
}

/** 项目+所有屏的全量 challenge ref 收集（包括重复——各处都会写一份引用） */
function collectAllChallenges(project: DesignProject): UpstreamChallengeRef[] {
  const out: UpstreamChallengeRef[] = [];
  out.push(...collectChallenges(project.meta?.plan));
  for (const scr of project.screens) {
    out.push(...collectChallenges(scr.meta?.plan));
  }
  return out;
}

/** 找触发任务的具体定位（用于 raise / resolve 时定位 raisedBy） */
function locateTask(
  project: DesignProject,
  scope: 'project' | 'screen',
  screenId: string | undefined,
  taskId: string,
): { container: PlanTask[]; index: number; task: PlanTask } | null {
  const visit = (list: PlanTask[] | undefined): { container: PlanTask[]; index: number; task: PlanTask } | null => {
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      const t = list[i]!;
      if (t.id === taskId) return { container: list, index: i, task: t };
      if (t.subtasks && t.subtasks.length > 0) {
        const found = visit(t.subtasks);
        if (found) return found;
      }
    }
    return null;
  };
  if (scope === 'project') {
    return visit(project.meta?.plan);
  }
  const scr = project.screens.find((s) => s.id === screenId);
  if (!scr) return null;
  return visit(scr.meta?.plan);
}

// ===== meta.raiseUpstreamChallenge =====

export function executeRaiseUpstreamChallenge(
  project: DesignProject,
  params: MetaRaiseUpstreamChallengeOp['params'],
): Result {
  const { challenge, reviseTaskTitle, reviseTaskId } = params;

  // R-CHALLENGE-04：同一 raisedBy 不允许并存多个 open challenge
  const existingOpen = collectAllChallenges(project).find(
    (c) => c.raisedBy === challenge.raisedBy && (c.phase === 'open' || c.phase === 'accepted'),
  );
  if (existingOpen) {
    return {
      project,
      result: {
        success: false,
        description:
          `R-CHALLENGE-04 违反：raisedBy=${challenge.raisedBy} 已存在 open/accepted challenge ` +
          `(${existingOpen.challengeId})。请先 resolve 已有 challenge，再发起新的。`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  // R-CHALLENGE-04 之 challengeId 唯一
  const dupId = collectAllChallenges(project).find((c) => c.challengeId === challenge.challengeId);
  if (dupId) {
    return {
      project,
      result: {
        success: false,
        description: `challengeId=${challenge.challengeId} 已存在（phase=${dupId.phase}）。请换 ID 或先 resolve。`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 校验 reviseTaskId 命名约定
  if (!reviseTaskId.startsWith('P-revise-')) {
    return {
      project,
      result: {
        success: false,
        description: `reviseTaskId 必须以 "P-revise-" 开头（当前：${reviseTaskId}）`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 校验 challengeMd 路径合法（以 .md 结尾，非空）
  if (!challenge.challengeMd || !challenge.challengeMd.endsWith('.md')) {
    return {
      project,
      result: {
        success: false,
        description: `R-CHALLENGE-01 违反：challengeMd 必须是相对 .md 路径（当前：${challenge.challengeMd}）`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);

  // 1. 找到 raisedBy 任务
  const located = locateTask(newProject, challenge.raisedByScope, challenge.raisedByScreenId, challenge.raisedBy);
  if (!located) {
    return {
      project,
      result: {
        success: false,
        description:
          `raisedBy 任务未找到：scope=${challenge.raisedByScope} ` +
          `screenId=${challenge.raisedByScreenId ?? '-'} taskId=${challenge.raisedBy}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (located.task.status === 'blocked') {
    return {
      project,
      result: {
        success: false,
        description: `raisedBy 任务已 blocked（reason=${located.task.blockedReason ?? 'unknown'}），不能重复发起 challenge`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 2. 构造 challenge ref（强制 phase='open'）
  const ref: UpstreamChallengeRef = {
    ...challenge,
    phase: 'open',
  };

  // 3. raisedBy 标 blocked + 写 ref
  located.task.status = 'blocked';
  located.task.blockedReason = `upstream-challenge: ${ref.challengeId}（targetStage=${ref.targetStage}）`;
  located.task.upstreamChallenge = deepClone(ref);

  // 4. 在 project.meta.plan 末尾追加 P-revise-* 任务
  if (!newProject.meta) newProject.meta = {};
  if (!newProject.meta.plan) newProject.meta.plan = [];

  const reviseTask: PlanTask = {
    id: reviseTaskId,
    title: reviseTaskTitle,
    stage: 'product',
    status: 'pending',
    notes: `自动追加：来自 challenge ${ref.challengeId}；处理流程见 STAGE-CONTRACT.md §0.1.9`,
    upstreamChallenge: deepClone(ref),
  };
  newProject.meta.plan.push(reviseTask);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description:
        `已发起 challenge ${ref.challengeId}：` +
        `raisedBy=${ref.raisedBy} → blocked；新增 ${reviseTaskId}（stage=product, status=pending）。` +
        `下一步：切到 ${ref.targetStage} SKILL 接管处理。`,
      affectedNodeIds: [],
    },
    inverse: { type: 'noop', params: {} },
  };
}

// ===== meta.resolveUpstreamChallenge =====

export function executeResolveUpstreamChallenge(
  project: DesignProject,
  params: MetaResolveUpstreamChallengeOp['params'],
): Result {
  const { challengeId, accepted, rationale, decisionMd } = params;

  // R-CHALLENGE-02：decisionMd 必须存在且合法
  if (!decisionMd || !decisionMd.endsWith('.md')) {
    return {
      project,
      result: {
        success: false,
        description: `R-CHALLENGE-02 违反：decisionMd 必须是相对 .md 路径（当前：${decisionMd}）`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (!rationale || rationale.trim().length < 10) {
    return {
      project,
      result: {
        success: false,
        description: `R-CHALLENGE-02 违反：rationale 必须 ≥ 10 字符（当前长度：${rationale.length}）`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);

  // 1. 在所有 plan（project + screens）找 challenge ref
  const allRefs: Array<{ ref: UpstreamChallengeRef; task: PlanTask }> = [];
  const collect = (list: PlanTask[] | undefined) => {
    if (!list) return;
    for (const t of list) {
      if (t.upstreamChallenge?.challengeId === challengeId) {
        allRefs.push({ ref: t.upstreamChallenge, task: t });
      }
      if (t.subtasks && t.subtasks.length > 0) collect(t.subtasks);
    }
  };
  collect(newProject.meta?.plan);
  for (const scr of newProject.screens) collect(scr.meta?.plan);

  if (allRefs.length === 0) {
    return {
      project,
      result: {
        success: false,
        description: `challengeId=${challengeId} 未找到（可能已 resolved 或拼写错）`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const firstRef = allRefs[0]!.ref;
  if (firstRef.phase !== 'open') {
    return {
      project,
      result: {
        success: false,
        description: `challenge ${challengeId} 当前 phase=${firstRef.phase}，只能 resolve open 状态的 challenge`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const decision = {
    accepted,
    rationale,
    appliedAt: new Date().toISOString(),
  };
  const newPhase: UpstreamChallengeRef['phase'] = accepted ? 'accepted' : 'rejected';

  // 2. 更新所有引用本 challenge 的 task：phase / decision / decisionMd
  for (const { task } of allRefs) {
    if (task.upstreamChallenge) {
      task.upstreamChallenge.phase = newPhase;
      task.upstreamChallenge.decision = decision;
      task.upstreamChallenge.decisionMd = decisionMd;
    }
  }

  // 3. 找 P-revise-* 任务并标完成
  // P-revise 任务约定挂在 project.meta.plan 顶层
  const revisePlan = newProject.meta?.plan;
  if (revisePlan) {
    for (const t of revisePlan) {
      if (t.upstreamChallenge?.challengeId === challengeId && t.id.startsWith('P-revise-')) {
        t.status = accepted ? 'done' : 'skipped';
        const baseNotes = t.notes ?? '';
        t.notes = `${baseNotes}\n[resolved at ${decision.appliedAt}] accepted=${accepted}; decision: ${decisionMd}`;
      }
    }
  }

  // 4. unblock raisedBy 任务（phase='open' 时是 blocked，无论 accepted/rejected 都恢复 pending）
  const located = locateTask(
    newProject,
    firstRef.raisedByScope,
    firstRef.raisedByScreenId,
    firstRef.raisedBy,
  );
  if (located) {
    if (located.task.status === 'blocked') {
      located.task.status = 'pending';
      delete located.task.blockedReason;
    }
    // 注意：raisedBy 上的 upstreamChallenge ref 已经被上面的循环更新过 phase/decision
  }

  // 5. R-CHALLENGE-03：accepted 时重跑受影响 expectedArtifacts
  if (accepted && firstRef.targetTaskIds.length > 0) {
    const failures: string[] = [];
    for (const target of firstRef.targetTaskIds) {
      const targetLocated = locateTask(newProject, target.scope, target.screenId, target.taskId);
      if (!targetLocated) {
        failures.push(
          `target task 不存在: scope=${target.scope} screenId=${target.screenId ?? '-'} taskId=${target.taskId}`,
        );
        continue;
      }
      const checks = targetLocated.task.expectedArtifacts;
      if (!checks || checks.length === 0) continue; // 无指纹声明就跳过
      // 只校验 status='done' 的任务（pending/skipped/blocked 不参与）
      if (targetLocated.task.status !== 'done') continue;
      const root: unknown =
        target.scope === 'project'
          ? newProject
          : newProject.screens.find((s) => s.id === target.screenId);
      const verdict = verifyArtifacts(root, checks);
      if (!verdict.ok) {
        const detail = verdict.failures.map((f) => `· ${f.detail}`).join('\n');
        failures.push(`task ${target.taskId} expectedArtifacts 重对账失败:\n${detail}`);
      }
    }
    if (failures.length > 0) {
      return {
        project,
        result: {
          success: false,
          description:
            `R-CHALLENGE-03 违反：accepted 后受影响 task 的产物指纹重对账未通过（schema 改动破坏了下游已 done 任务）。\n` +
            failures.map((f) => `[${f}]`).join('\n\n') +
            `\n\n请上游 SKILL 在改 schema 时，把受影响 task 的产物补回再 resolve；或考虑改成 rejected。`,
          affectedNodeIds: [],
        },
        inverse: { type: 'noop', params: {} },
      };
    }
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description:
        `challenge ${challengeId} 已 ${accepted ? 'accepted' : 'rejected'}：` +
        `${allRefs.length} 处 ref 同步更新；` +
        `raisedBy=${firstRef.raisedBy} 解除 blocked → pending；` +
        `下一步：切回 ${firstRef.raisedBy} 所属 SKILL 续做。`,
      affectedNodeIds: [],
    },
    inverse: { type: 'noop', params: {} },
  };
}
