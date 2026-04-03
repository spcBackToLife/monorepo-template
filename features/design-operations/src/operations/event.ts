import type { DesignProject, ComponentEvent } from '@globallink/design-schema';
import { deepClone, generateScreenId, generateNodeId } from '@globallink/design-schema';
import type {
  AddEventOp,
  RemoveEventOp,
  UpdateEventOp,
  AddNavigationOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById } from '../utils/tree';

/** Find a node across all screens */
function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

// ===== addEvent =====

export function executeAddEvent(
  project: DesignProject,
  params: AddEventOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

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
      type: 'removeEvent',
      params: { nodeId: params.nodeId, eventIndex },
    },
  };
}

// ===== removeEvent =====

export function executeRemoveEvent(
  project: DesignProject,
  params: RemoveEventOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
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
      type: 'addEvent',
      params: { nodeId: params.nodeId, event: removedEvent },
    },
  };
}

// ===== updateEvent =====

export function executeUpdateEvent(
  project: DesignProject,
  params: UpdateEventOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
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

  const previousEvent = { ...node.events[params.eventIndex] };
  const evt = node.events[params.eventIndex];
  if (params.event.trigger !== undefined) evt.trigger = params.event.trigger;
  if (params.event.actions !== undefined) evt.actions = params.event.actions;
  if (params.event.condition !== undefined) evt.condition = params.event.condition;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated event at index ${params.eventIndex} on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'updateEvent',
      params: { nodeId: params.nodeId, eventIndex: params.eventIndex, event: previousEvent },
    },
  };
}

// ===== addNavigation =====

export function executeAddNavigation(
  project: DesignProject,
  params: AddNavigationOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
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

  // If targetScreenId is "new", auto-create a new screen
  if (targetScreenId === 'new') {
    const newScreen = {
      id: generateScreenId(),
      name: `Screen ${newProject.screens.length + 1}`,
      rootNode: {
        id: generateNodeId(),
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
      domainStates: [],
      dataSources: [],
    };
    targetScreenId = newScreen.id;
    affectedIds.push(newScreen.id);
  }

  const navEvent: ComponentEvent = {
    trigger: params.trigger as ComponentEvent['trigger'],
    actions: [{
      type: 'navigate',
      targetScreenId,
    }],
  };

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
