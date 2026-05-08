import type { DesignProject, ComponentEvent, Action } from '@globallink/design-schema';
import { deepClone, generateScreenId, generateNodeId } from '@globallink/design-schema';
import type {
  EventAddOp,
  EventRemoveOp,
  EventUpdateOp,
  EventAddNavigationOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById } from '../utils/tree';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

// ===== event.add =====

export function executeAddEvent(project: DesignProject, params: EventAddOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!node.events) node.events = [];
  node.events.push(params.event);
  const eventIndex = node.events.length - 1;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added ${params.event.trigger} event to ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
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

  const previousEvent: ComponentEvent = { ...node.events[params.eventIndex] };
  const evt = node.events[params.eventIndex];
  if (params.event.trigger !== undefined) evt.trigger = params.event.trigger;
  if (params.event.actions !== undefined) evt.actions = params.event.actions;
  if (params.event.condition !== undefined) evt.condition = params.event.condition;
  if (params.event.description !== undefined) evt.description = params.event.description;
  if (params.event.disabled !== undefined) evt.disabled = params.event.disabled;
  if (params.event.scrollConfig !== undefined) evt.scrollConfig = params.event.scrollConfig;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated event at index ${params.eventIndex} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
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
  const node = findNodeInProject(newProject, params.nodeId);

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
    const screenId = (p._generatedScreenId as string) || generateScreenId();
    const rootNodeId = (p._generatedRootNodeId as string) || generateNodeId();

    const newScreen = {
      id: screenId,
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
    targetScreenId = screenId;
    affectedIds.push(screenId);
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

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added navigation to ${targetScreenId} on ${params.nodeId}`,
      affectedNodeIds: affectedIds,
    },
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
