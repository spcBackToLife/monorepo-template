import type { DesignProject, ComponentEvent, Action } from '@globallink/design-schema';
import { deepClone, normalizeExpression } from '@globallink/design-schema';
import { walkExpressionsInEvent } from '@globallink/design-expression';
import type {
  EventAddOp,
  EventRemoveOp,
  EventUpdateOp,
  EventAddNavigationOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById } from '../utils/tree';
import { assertPregeneratedId } from '../utils/assert-id';
import { findLintErrors, buildLintFailResult, attachLintWarnings } from '../utils/lint-guard';
import { lintActionChain, type SchemaFieldLintRef } from '../utils/component-node-lint';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

/** 查找节点 + 它所在的 screenId（schema lint 需要 screenId 给 issue 定位） */
function findNodeAndScreenInProject(
  project: DesignProject,
  nodeId: string,
): { node: ReturnType<typeof findNodeById>; screenId?: string } {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return { node, screenId: screen.id };
  }
  return { node: undefined };
}

/**
 * 把 SchemaFieldLintRef[] 合并到 OperationResult.issues。
 * 与 attachLintWarnings(ExpressionFieldRef) 形态对齐:同一个 result.issues 数组承载两类来源。
 */
function attachSchemaRefs(
  result: OperationResult,
  refs: SchemaFieldLintRef[],
): OperationResult {
  if (!refs.length) return result;
  return { ...result, issues: [...(result.issues ?? []), ...refs] };
}

/**
 * 规范化 Action 链中的强 Expression 字段（state.remove.predicate / 子链 onSuccess|onError）。
 * value / params / message / url 等"字面量也合法"的字段保持原样。
 */
function normalizeActionChain(actions: Action[] | undefined): void {
  if (!Array.isArray(actions)) return;
  for (const a of actions) {
    if (a.type === 'state.remove' && typeof a.predicate === 'string') {
      a.predicate = normalizeExpression(a.predicate);
    } else if (a.type === 'effect.fetch') {
      normalizeActionChain(a.onSuccess);
      normalizeActionChain(a.onError);
    }
  }
}

/** 规范化整个事件配置：condition.when + actions 链 */
function normalizeEvent(event: ComponentEvent | undefined): void {
  if (!event) return;
  if (event.condition && typeof event.condition.when === 'string') {
    event.condition.when = normalizeExpression(event.condition.when);
  }
  normalizeActionChain(event.actions);
}

// ===== event.add =====

export function executeAddEvent(project: DesignProject, params: EventAddOp['params']): Result {
  if (!params.event) {
    return {
      project,
      result: { success: false, description: 'event.add: params.event is required but received undefined', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);
  const { node, screenId } = findNodeAndScreenInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!node.events) node.events = [];
  normalizeEvent(params.event);

  // ★ EXPR-C: lint 门禁 —— 表达式必须通过 spec v1.0 校验才能落库
  const refs = walkExpressionsInEvent(params.event, { nodeId: params.nodeId, screenId });
  const errs = findLintErrors(refs);
  if (errs) {
    const fail = buildLintFailResult(errs, [params.nodeId], 'event.add');
    return { project, result: fail.result, inverse: fail.inverse };
  }

  node.events.push(params.event);
  const eventIndex = node.events.length - 1;

  // ★ F5/F7: schema 字段关系 lint —— case.when→match 迁移 + nav.go 目标屏存在性
  // 与 expression lint 解耦的"非表达式语义"层契约;均为 warning,不阻塞落库
  const schemaRefs = lintActionChain(
    params.event.actions,
    `events[${eventIndex}].actions`,
    { project: newProject, nodeId: params.nodeId, screenId },
  );

  newProject.updatedAt = new Date().toISOString();

  const successResult: OperationResult = {
    success: true,
    description: `Added ${params.event.trigger} event to ${params.nodeId}`,
    affectedNodeIds: [params.nodeId],
  };

  return {
    project: newProject,
    result: attachSchemaRefs(attachLintWarnings(successResult, refs), schemaRefs),
    inverse: {
      type: 'event.remove',
      params: { nodeId: params.nodeId, eventIndex },
    },
  };
}

// ===== event.remove =====

export function executeRemoveEvent(project: DesignProject, params: EventRemoveOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (params.eventIndex < 0 || params.eventIndex >= node.events.length) {
    return {
      project,
      result: { success: false, description: `Event index ${params.eventIndex} out of range`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedEvent] = node.events.splice(params.eventIndex, 1);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed event at index ${params.eventIndex} from ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'event.add',
      params: { nodeId: params.nodeId, event: removedEvent },
    },
  };
}

// ===== event.update =====

export function executeUpdateEvent(project: DesignProject, params: EventUpdateOp['params']): Result {
  if (!params.event) {
    return {
      project,
      result: { success: false, description: 'event.update: params.event is required but received undefined', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);
  const { node, screenId } = findNodeAndScreenInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (params.eventIndex < 0 || params.eventIndex >= node.events.length) {
    return {
      project,
      result: { success: false, description: `Event index ${params.eventIndex} out of range`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previousEvent: ComponentEvent = { ...node.events[params.eventIndex] };
  const evt = node.events[params.eventIndex];
  if (params.event.trigger !== undefined) evt.trigger = params.event.trigger;
  if (params.event.actions !== undefined) evt.actions = params.event.actions;
  if (params.event.condition !== undefined) evt.condition = params.event.condition;
  if (params.event.description !== undefined) evt.description = params.event.description;
  if (params.event.disabled !== undefined) evt.disabled = params.event.disabled;
  if (params.event.scrollConfig !== undefined) evt.scrollConfig = params.event.scrollConfig;

  // patch 写入后再统一规范化（覆盖原 condition / 新 actions 中的强 Expression 字段）
  normalizeEvent(evt);

  // ★ EXPR-C: lint 门禁
  const refs = walkExpressionsInEvent(evt, { nodeId: params.nodeId, screenId });
  const errs = findLintErrors(refs);
  if (errs) {
    const fail = buildLintFailResult(errs, [params.nodeId], 'event.update');
    return { project, result: fail.result, inverse: fail.inverse };
  }

  // ★ F5/F7: schema 字段关系 lint
  const schemaRefs = lintActionChain(
    evt.actions,
    `events[${params.eventIndex}].actions`,
    { project: newProject, nodeId: params.nodeId, screenId },
  );

  newProject.updatedAt = new Date().toISOString();

  const successResult: OperationResult = {
    success: true,
    description: `Updated event at index ${params.eventIndex} on ${params.nodeId}`,
    affectedNodeIds: [params.nodeId],
  };

  return {
    project: newProject,
    result: attachSchemaRefs(attachLintWarnings(successResult, refs), schemaRefs),
    inverse: {
      type: 'event.update',
      params: { nodeId: params.nodeId, eventIndex: params.eventIndex, event: previousEvent },
    },
  };
}

// ===== event.addNavigation =====

/**
 * 便捷操作：给节点加一条 trigger=click + 单 nav.go action 的事件。
 *
 * targetScreenId === 'new' 时自动建一个新空白屏；服务端 ensureDeterministicIds 可
 * 通过 _generatedScreenId / _generatedRootNodeId 预填充 ID 保证重放幂等。
 */
export function executeAddNavigation(project: DesignProject, params: EventAddNavigationOp['params']): Result {
  const newProject = deepClone(project);
  const { node, screenId } = findNodeAndScreenInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  let targetScreenId = params.targetScreenId;
  const affectedIds: string[] = [params.nodeId];

  if (targetScreenId === 'new') {
    const p = params as Record<string, unknown>;
    // ID 严格契约：新屏 + root 节点 ID 必须由 ensureDeterministicIds 预生成
    assertPregeneratedId(p._generatedScreenId as string | undefined, 'event.addNavigation', '_generatedScreenId');
    assertPregeneratedId(p._generatedRootNodeId as string | undefined, 'event.addNavigation', '_generatedRootNodeId');
    const screenIdNew = p._generatedScreenId as string;
    const rootNodeId = p._generatedRootNodeId as string;

    const newScreen = {
      id: screenIdNew,
      name: `Screen ${newProject.screens.length + 1}`,
      rootNode: {
        id: rootNodeId,
        type: 'div' as const,
        styles: {
          display: 'flex',
          flexDirection: 'column' as string,
          width: '100%',
          minHeight: '100%',
        },
        children: [],
        props: {},
        states: [],
        activeState: 'default',
        events: [],
        locked: false,
        visible: true,
      },
      dataSources: [],
    };
    newProject.screens.push(newScreen);
    targetScreenId = screenIdNew;
    affectedIds.push(screenIdNew);
  }

  const navAction: Action = {
    type: 'nav.go',
    targetScreenId,
  };
  const navEvent: ComponentEvent = {
    trigger: params.trigger,
    actions: [navAction],
    description: params.description,
  };

  if (!node.events) node.events = [];
  node.events.push(navEvent);
  const eventIndex = node.events.length - 1;

  // ★ F7: nav.go 目标屏存在性 lint(targetScreenId='new' 时已新建,验证通过;
  // 字面量 targetScreenId 必须存在于项目内;表达式 / 模板形式跳过)
  const schemaRefs = lintActionChain(
    [navAction],
    `events[${eventIndex}].actions`,
    { project: newProject, nodeId: params.nodeId, screenId },
  );

  newProject.updatedAt = new Date().toISOString();

  const successResult: OperationResult = {
    success: true,
    description: `Added navigation to ${targetScreenId} on ${params.nodeId}`,
    affectedNodeIds: affectedIds,
  };

  return {
    project: newProject,
    result: attachSchemaRefs(successResult, schemaRefs),
    inverse: {
      type: '_removeNavigationAndScreen',
      params: {
        nodeId: params.nodeId,
        eventIndex,
        createdScreenId: params.targetScreenId === 'new' ? targetScreenId : undefined,
      },
    },
  };
}
