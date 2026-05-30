/**
 * Design Integrity Checker —— Schema-First 架构的"完成度对账"。
 *
 * 与现有 `validators/`（zod 结构校验，校验 schema 形状）不同，本模块校验
 * **设计完成度**：一份 schema 中"该有的东西到底有没有"，例如：
 *
 *   - 节点 events 的某项 trigger 写了但 actions=[] → ❌ 空壳事件
 *   - effect.fetch 缺 onSuccess/onError 分支 → ❌ 失败用户没反馈
 *   - 节点 meta.status.ready.events=true 但 events 实际无任何带 actions 的事件 → ❌ 假完成
 *   - 节点 meta.status.phase='verified'，但任一 ready.* 为 false → ❌ 阶段不一致
 *
 * 这取代了旧 design-registry 的外部 `validate.ts` 自我指涉式校验，把
 * "完成度真相"内建到 schema 自身——以真实 events/styles/states 算账，
 * 杜绝平行真相造假。详见 SCHEMA-FIRST-REFACTOR.md §6。
 *
 * 设计原则（v2.4 重构）：
 *   - **零自然语言启发式**：不再用 meta.summary 关键词正则猜测节点交互意图
 *   - **零硬编码白名单**：不再维护"哪些 EventTrigger 算交互"的白名单
 *   - 所有合法 EventTrigger 都可承载真交互；判定一律走结构：actions.length > 0
 *   - "屏内有没有真交互"由 plan 任务的 expectedArtifacts(kind=anyNodeHasEvents) 守，
 *     checker 只兜底单节点级一致性
 *
 * 纯函数，零 I/O：传入 DesignProject → 返回 issue 数组。可被 design-api /
 * design-mcp / 校验脚本任何一处复用。
 */

import type { ComponentNode } from '../types/node';
import type { Action, EffectFetchAction } from '../types/action';
import type { Screen } from '../types/screen';
import type { DesignProject } from '../types/project';
import type { NodeStatus, PlanTask } from '../types/meta';
import { verifyArtifacts } from './verify-artifact';

export type IntegritySeverity = 'error' | 'warning' | 'info';

export interface IntegrityIssue {
  /** 严重级别 */
  severity: IntegritySeverity;
  /** 检查规则代码，便于过滤 / 抑制 */
  code: string;
  /** 出问题的节点/屏幕/项目层级标识 */
  target: { kind: 'node' | 'screen' | 'project'; id: string; name?: string };
  /** 人类可读描述 */
  message: string;
  /** 触发字段路径（如 'events' / 'meta.status.ready.events'） */
  path?: string;
}

export interface IntegrityReport {
  issues: IntegrityIssue[];
  counts: { error: number; warning: number; info: number };
}

// ===== 规则 =====

/** 判定一个 event 是否承载真交互：actions 是非空数组。 */
function eventHasRealActions(ev: { actions?: unknown }): boolean {
  return Array.isArray(ev.actions) && ev.actions.length > 0;
}

/**
 * 规则 R-EVENTS-02：每个声明的 event 都必须有 actions —— "trigger 写了占坑没填行为"。
 *
 * 纯结构判断，不依赖任何白名单或关键词。任何合法 EventTrigger（含 blur/focus/hover/
 * screenEnter 等）一旦写到 schema 里就必须配 actions，否则就是空壳事件。
 *
 * 规则 R-EVENTS-03：effect.fetch 必须含 onSuccess 或 onError（至少一个）。
 *
 * 失败路径没分支 = 用户失败时无任何反馈，是典型坑。这条同样纯结构。
 */
function checkNodeEventActions(node: ComponentNode, issues: IntegrityIssue[]): void {
  const events = node.events ?? [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    if (!eventHasRealActions(ev)) {
      issues.push({
        severity: 'error',
        code: 'R-EVENTS-02',
        target: { kind: 'node', id: node.id, name: node.name },
        path: `events[${i}].actions`,
        message: `事件 trigger="${ev.trigger}" 没有 actions —— 触发后无任何动作。`,
      });
      continue; // 没 actions 就不用进去查 fetch 分支了
    }
    // 递归扫 actions 链中所有 effect.fetch，校验 onSuccess/onError 至少有一
    walkEffectFetches(ev.actions as Action[], (fetch, where) => {
      const hasSuccess = Array.isArray(fetch.onSuccess) && fetch.onSuccess.length > 0;
      const hasError = Array.isArray(fetch.onError) && fetch.onError.length > 0;
      if (!hasSuccess && !hasError) {
        issues.push({
          severity: 'error',
          code: 'R-EVENTS-03',
          target: { kind: 'node', id: node.id, name: node.name },
          path: `events[${i}].actions${where} (effect.fetch dataSourceId="${fetch.dataSourceId}")`,
          message:
            `effect.fetch（dataSourceId="${fetch.dataSourceId}"）既无 onSuccess 也无 onError —— ` +
            `成功/失败都不会有任何反馈，用户会"沉默失败"。至少补一个分支。`,
        });
      }
    });
  }
}

/** 递归扫 actions 链找 effect.fetch（含 logic.if / logic.switch 内部嵌套）。 */
function walkEffectFetches(
  actions: Action[],
  visit: (fetch: EffectFetchAction, where: string) => void,
  prefix = '',
): void {
  if (!Array.isArray(actions)) return;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    const here = `${prefix}[${i}]`;
    if (a.type === 'effect.fetch') {
      visit(a, here);
      // onSuccess / onError 内可能还有嵌套 fetch
      if (Array.isArray(a.onSuccess)) walkEffectFetches(a.onSuccess, visit, `${here}.onSuccess`);
      if (Array.isArray(a.onError)) walkEffectFetches(a.onError, visit, `${here}.onError`);
    } else if (a.type === 'logic.if') {
      if (Array.isArray(a.then)) walkEffectFetches(a.then, visit, `${here}.then`);
      if (Array.isArray(a.else)) walkEffectFetches(a.else, visit, `${here}.else`);
    } else if (a.type === 'logic.switch') {
      if (Array.isArray(a.cases)) {
        for (let j = 0; j < a.cases.length; j++) {
          const c = a.cases[j];
          if (c && Array.isArray(c.actions)) {
            walkEffectFetches(c.actions, visit, `${here}.cases[${j}].actions`);
          }
        }
      }
      if (Array.isArray(a.default)) walkEffectFetches(a.default, visit, `${here}.default`);
    }
  }
}

/**
 * 规则 R-STATUS-01：meta.status.ready.events=true 但节点 events 实际无任何"真 event"。
 *
 * "真 event" 判定（纯结构，零白名单）：
 *   - events 数组非空
 *   - 至少一项 actions.length > 0
 *
 * 任何合法 EventTrigger（blur/focus/hover/click/...）配齐 actions 都算数；
 * 不再筛选 trigger 类型——AI 在交互阶段对输入框加 blur 校验、对滚动容器加
 * scrollReachBottom 是常态，把它们排除在"交互"外是错的。
 */
function checkNodeStatusConsistency(node: ComponentNode, issues: IntegrityIssue[]): void {
  const status = node.meta?.status;
  if (!status) return;
  const ready = status.ready ?? {};

  if (ready.events === true) {
    const hasReal = (node.events ?? []).some(eventHasRealActions);
    if (!hasReal) {
      issues.push({
        severity: 'error',
        code: 'R-STATUS-01',
        target: { kind: 'node', id: node.id, name: node.name },
        path: 'meta.status.ready.events',
        message:
          `meta.status.ready.events=true，但 node.events[] 中没有任何带 actions 的事件 —— "假完成"。`,
      });
    }
  }

  if (ready.styles === true) {
    const styleCount = Object.keys(node.styles ?? {}).length;
    if (styleCount === 0) {
      issues.push({
        severity: 'warning',
        code: 'R-STATUS-02',
        target: { kind: 'node', id: node.id, name: node.name },
        path: 'meta.status.ready.styles',
        message: `meta.status.ready.styles=true，但 node.styles 为空。`,
      });
    }
  }

  if (ready.visualStates === true) {
    const stateCount = (node.states ?? []).length;
    if (stateCount === 0) {
      issues.push({
        severity: 'warning',
        code: 'R-STATUS-03',
        target: { kind: 'node', id: node.id, name: node.name },
        path: 'meta.status.ready.visualStates',
        message: `meta.status.ready.visualStates=true，但 node.states 为空。`,
      });
    }
  }
}

/**
 * 规则 R-PHASE-01：阶段一致性。
 * phase='verified' 要求所有 ready.* 都已就绪。
 */
function checkPhaseConsistency(
  target: { kind: 'node' | 'screen' | 'project'; id: string; name?: string },
  status: NodeStatus | undefined,
  issues: IntegrityIssue[],
): void {
  if (!status) return;
  if (status.phase === 'verified' && status.ready) {
    const incomplete = Object.entries(status.ready)
      .filter(([, v]) => v === false)
      .map(([k]) => k);
    if (incomplete.length > 0) {
      issues.push({
        severity: 'error',
        code: 'R-PHASE-01',
        target,
        path: 'meta.status',
        message: `phase='verified' 但 ready 中仍有 false: ${incomplete.join(', ')}`,
      });
    }
  }
}

/** 遍历节点树 */
function walkNode(node: ComponentNode, visit: (n: ComponentNode) => void): void {
  visit(node);
  if (node.children) {
    for (const child of node.children) walkNode(child, visit);
  }
  if (node.repeat?.template) {
    walkNode(node.repeat.template, visit);
  }
}

/** 检查单个节点 */
function checkNode(node: ComponentNode, issues: IntegrityIssue[]): void {
  checkNodeEventActions(node, issues);
  checkNodeStatusConsistency(node, issues);
  checkPhaseConsistency(
    { kind: 'node', id: node.id, name: node.name },
    node.meta?.status,
    issues,
  );
}

/** 检查屏幕 */
function checkScreen(screen: Screen, issues: IntegrityIssue[]): void {
  checkPhaseConsistency(
    { kind: 'screen', id: screen.id, name: screen.name },
    screen.meta?.status,
    issues,
  );
  walkNode(screen.rootNode, (n) => checkNode(n, issues));
  // R-PLAN-01：屏级 plan 任务的产物指纹回归检查
  checkPlanArtifacts(
    screen.meta?.plan,
    screen,
    { kind: 'screen', id: screen.id, name: screen.name },
    issues,
  );
}

/**
 * R-PLAN-01：已 done 的 plan 任务，其 expectedArtifacts 必须仍然满足。
 *
 * 用途：
 *   - 任务标 done 时由 service 端在 op 层强制（这里是兜底）
 *   - 后续 schema 被改动后，发现产物消失就立即冒红
 *
 * 不校验 status='skipped'/'blocked'/'pending'/'doing' 的任务。
 */
function checkPlanArtifacts(
  plan: PlanTask[] | undefined,
  root: unknown,
  target: { kind: 'node' | 'screen' | 'project'; id: string; name?: string },
  issues: IntegrityIssue[],
): void {
  if (!plan || plan.length === 0) return;

  const visit = (task: PlanTask) => {
    if (task.status === 'done' && task.expectedArtifacts && task.expectedArtifacts.length > 0) {
      const r = verifyArtifacts(root, task.expectedArtifacts);
      if (!r.ok) {
        for (const f of r.failures) {
          issues.push({
            severity: 'error',
            code: 'R-PLAN-01',
            target,
            path: `meta.plan[id="${task.id}"].expectedArtifacts`,
            message: `任务 ${task.id} 标 done 但产物不再满足：${f.detail ?? ''}`,
          });
        }
      }
    }
    if (task.subtasks) {
      for (const sub of task.subtasks) visit(sub);
    }
  };

  for (const t of plan) visit(t);
}

// ===== 公共 API =====

/** 校验完整项目 */
export function checkProjectIntegrity(project: DesignProject): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  for (const screen of project.screens ?? []) {
    checkScreen(screen, issues);
  }
  // 项目级 plan 任务的产物指纹回归检查（root = project 自身）
  checkPlanArtifacts(
    project.meta?.plan,
    project,
    { kind: 'project', id: project.id, name: project.name },
    issues,
  );
  return makeReport(issues);
}

/** 仅校验单屏（按 screen.id） */
export function checkScreenIntegrity(screen: Screen): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  checkScreen(screen, issues);
  return makeReport(issues);
}

/** 仅校验单节点（无父上下文） */
export function checkNodeIntegrity(node: ComponentNode): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  walkNode(node, (n) => checkNode(n, issues));
  return makeReport(issues);
}

function makeReport(issues: IntegrityIssue[]): IntegrityReport {
  return {
    issues,
    counts: {
      error: issues.filter((i) => i.severity === 'error').length,
      warning: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    },
  };
}
