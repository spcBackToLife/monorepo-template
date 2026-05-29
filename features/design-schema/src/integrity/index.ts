/**
 * Design Integrity Checker —— Schema-First 架构的"完成度对账"。
 *
 * 与现有 `validators/`（zod 结构校验，校验 schema 形状）不同，本模块校验
 * **设计完成度**：一份 schema 中"该有的东西到底有没有"，例如：
 *
 *   - 节点 meta.interaction.summary 描述了 trigger，但 node.events[] 是空 → ❌ 缺 actions
 *   - 节点 meta.status.ready.events=true，但 node.events[] 实际为空 → ❌ 假完成
 *   - 节点 meta.status.phase='verified'，但任一 ready.* 为 false → ❌ 阶段不一致
 *
 * 这取代了旧 design-registry 的外部 `validate.ts` 自我指涉式校验，把
 * "完成度真相"内建到 schema 自身——以真实 events/styles/states 算账，
 * 杜绝平行真相造假。详见 SCHEMA-FIRST-REFACTOR.md §6。
 *
 * 纯函数，零 I/O：传入 DesignProject → 返回 issue 数组。可被 design-api /
 * design-mcp / 校验脚本任何一处复用。
 */

import type { ComponentNode } from '../types/node';
import type { Screen } from '../types/screen';
import type { DesignProject } from '../types/project';
import type { NodeStatus } from '../types/meta';

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

/** 已知会触发用户操作的 EventTrigger，需要配套 actions */
const INTERACTIVE_TRIGGERS = new Set([
  'click',
  'doubleClick',
  'longPress',
  'change',
  'submit',
]);

/**
 * 规则 R-EVENTS-01：
 * 节点 meta.interaction.summary 暗示了"用户触发"（trigger 字段或包含交互动词），
 * 但 node.events 中没有任何 interactive trigger 的 event。
 *
 * 这是"events 全空但 checklist 标完成"问题的事前根因检测。
 */
function checkNodeEventsCoverage(node: ComponentNode, issues: IntegrityIssue[]): void {
  const interaction = node.meta?.interaction;
  if (!interaction) return;

  // 收集 meta 中暗示的 trigger（结构化字段优先；其次 summary 启发式）
  const declaredTriggers = new Set<string>();
  // 后续 meta.interaction 可能扩展 triggers 字段；当前用 summary 启发：含"click/点击/tap"
  const hint = (interaction.summary ?? '').toLowerCase();
  if (/click|tap|点击|按下|长按|hover|焦点|focus|blur|change|输入/.test(hint)) {
    declaredTriggers.add('click'); // 通用占位：只要暗示交互
  }
  if (declaredTriggers.size === 0) return;

  const actualInteractiveEvents = (node.events ?? []).filter((e) =>
    INTERACTIVE_TRIGGERS.has(e.trigger),
  );

  if (actualInteractiveEvents.length === 0) {
    issues.push({
      severity: 'error',
      code: 'R-EVENTS-01',
      target: { kind: 'node', id: node.id, name: node.name },
      path: 'events',
      message:
        `节点声明了交互意图（meta.interaction.summary="${interaction.summary ?? ''}"），` +
        `但 events[] 中没有任何 interactive trigger（click/change/submit/...）。` +
        `这通常意味着上游已结构化的 actions 没被写入 schema。`,
    });
    return;
  }

  // 进一步：每个 interactive event 必须有 actions
  for (let i = 0; i < actualInteractiveEvents.length; i++) {
    const ev = actualInteractiveEvents[i]!;
    if (!ev.actions || ev.actions.length === 0) {
      issues.push({
        severity: 'error',
        code: 'R-EVENTS-02',
        target: { kind: 'node', id: node.id, name: node.name },
        path: `events[${i}].actions`,
        message: `事件 trigger="${ev.trigger}" 没有 actions —— 触发后无任何动作。`,
      });
    }
  }
}

/**
 * 规则 R-STATUS-01：
 * meta.status.ready.events=true 但 node.events 实际为空 / 无 interactive event。
 * 这是"假完成"的兜底检测——直接对照真实 schema 算账。
 */
function checkNodeStatusConsistency(node: ComponentNode, issues: IntegrityIssue[]): void {
  const status = node.meta?.status;
  if (!status) return;
  const ready = status.ready ?? {};

  if (ready.events === true) {
    const hasInteractive = (node.events ?? []).some((e) =>
      INTERACTIVE_TRIGGERS.has(e.trigger),
    );
    if (!hasInteractive) {
      issues.push({
        severity: 'error',
        code: 'R-STATUS-01',
        target: { kind: 'node', id: node.id, name: node.name },
        path: 'meta.status.ready.events',
        message:
          `meta.status.ready.events=true，但 node.events[] 不含任何 interactive trigger —— "假完成"。`,
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
  checkNodeEventsCoverage(node, issues);
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
}

// ===== 公共 API =====

/** 校验完整项目 */
export function checkProjectIntegrity(project: DesignProject): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  for (const screen of project.screens ?? []) {
    checkScreen(screen, issues);
  }
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
