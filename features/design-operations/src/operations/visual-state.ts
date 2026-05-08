import type { DesignProject, VisualState, CSSProperties } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  VisualStateAddOp,
  VisualStateRemoveOp,
  VisualStateUpdateOp,
  VisualStateSetActiveOp,
  VisualStateSetChildVisibilityOp,
  VisualStateResetStyleOp,
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

// ===== visualState.add =====

export function executeAddState(project: DesignProject, params: VisualStateAddOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!node.states) node.states = [];
  if (node.states.some((s) => s.name === params.stateName)) {
    return {
      project,
      result: { success: false, description: `State "${params.stateName}" already exists on ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newState: VisualState = {
    name: params.stateName,
    styles: (params.styles ?? {}) as Partial<CSSProperties>,
    props: params.props,
    ...(params.transition != null ? { transition: params.transition } : {}),
    ...(params.childrenStates != null ? { childrenStates: params.childrenStates } : {}),
    ...(params.childrenVisibility != null ? { childrenVisibility: params.childrenVisibility } : {}),
    ...(params.disabledEvents != null ? { disabledEvents: params.disabledEvents } : {}),
  };

  node.states.push(newState);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added visual state "${params.stateName}" to ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'visualState.remove',
      params: { nodeId: params.nodeId, stateName: params.stateName },
    },
  };
}

// ===== visualState.remove =====

export function executeRemoveState(project: DesignProject, params: VisualStateRemoveOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const stateIndex = node.states.findIndex((s) => s.name === params.stateName);
  if (stateIndex === -1) {
    return {
      project,
      result: { success: false, description: `State "${params.stateName}" not found on ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedState] = node.states.splice(stateIndex, 1);

  if (node.activeState === params.stateName) {
    node.activeState = 'default';
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed visual state "${params.stateName}" from ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'visualState.add',
      params: {
        nodeId: params.nodeId,
        stateName: removedState.name,
        styles: removedState.styles,
        props: removedState.props,
        transition: removedState.transition,
        childrenStates: removedState.childrenStates,
        childrenVisibility: removedState.childrenVisibility,
        disabledEvents: removedState.disabledEvents,
      },
    },
  };
}

// ===== visualState.update =====

export function executeUpdateState(project: DesignProject, params: VisualStateUpdateOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const state = node.states.find((s) => s.name === params.stateName);
  if (!state) {
    return {
      project,
      result: { success: false, description: `State "${params.stateName}" not found on ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldStyles = { ...state.styles };
  const oldProps = state.props ? { ...state.props } : undefined;
  const oldTransition = state.transition === undefined ? undefined : { ...state.transition };
  const oldChildrenStates =
    state.childrenStates === undefined ? undefined : { ...state.childrenStates };
  const oldChildrenVisibility =
    state.childrenVisibility === undefined ? undefined : { ...state.childrenVisibility };
  const oldDisabledEvents =
    state.disabledEvents === undefined ? undefined : [...state.disabledEvents];

  if (params.styles !== undefined) {
    state.styles = { ...state.styles, ...(params.styles as Partial<CSSProperties>) };
  }
  if (params.props !== undefined) {
    state.props = { ...(state.props ?? {}), ...params.props };
  }
  if (params.transition !== undefined) {
    state.transition = { ...(state.transition ?? {}), ...params.transition };
  }
  if (params.childrenStates !== undefined) {
    state.childrenStates = { ...(state.childrenStates ?? {}), ...params.childrenStates };
  }
  if (params.childrenVisibility !== undefined) {
    state.childrenVisibility = { ...(state.childrenVisibility ?? {}), ...params.childrenVisibility };
  }
  if (params.disabledEvents !== undefined) {
    state.disabledEvents = [...params.disabledEvents];
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated visual state "${params.stateName}" on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: '_restoreVisualState',
      params: {
        nodeId: params.nodeId,
        stateName: params.stateName,
        styles: oldStyles,
        props: oldProps,
        transition: oldTransition,
        childrenStates: oldChildrenStates,
        childrenVisibility: oldChildrenVisibility,
        disabledEvents: oldDisabledEvents,
      },
    },
  };
}

// ===== visualState.setActive =====

export function executeSetActiveState(project: DesignProject, params: VisualStateSetActiveOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldState = node.activeState;
  node.activeState = params.stateName;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set active visual state to "${params.stateName}" on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'visualState.setActive',
      params: { nodeId: params.nodeId, stateName: oldState },
    },
  };
}

// ===== visualState.setChildVisibility =====

export function executeSetChildVisibility(
  project: DesignProject,
  params: VisualStateSetChildVisibilityOp['params'],
): Result {
  const newProject = deepClone(project);
  const parent = findNodeInProject(newProject, params.parentNodeId);

  if (!parent) {
    return {
      project,
      result: { success: false, description: `Parent node ${params.parentNodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!parent.states) parent.states = [];

  let targetState = parent.states.find((s) => s.name === params.stateName);
  if (!targetState) {
    targetState = { name: params.stateName, styles: {} };
    if (params.stateName === 'default') {
      parent.states.unshift(targetState);
    } else {
      parent.states.push(targetState);
    }
  }

  const oldValue = targetState.childrenVisibility?.[params.childNodeId];

  if (params.visible === undefined) {
    if (targetState.childrenVisibility) {
      delete targetState.childrenVisibility[params.childNodeId];
      if (Object.keys(targetState.childrenVisibility).length === 0) {
        delete targetState.childrenVisibility;
      }
    }
  } else if (params.visible === true && params.stateName === 'default') {
    if (targetState.childrenVisibility) {
      delete targetState.childrenVisibility[params.childNodeId];
      if (Object.keys(targetState.childrenVisibility).length === 0) {
        delete targetState.childrenVisibility;
      }
    }
  } else {
    if (!targetState.childrenVisibility) targetState.childrenVisibility = {};
    targetState.childrenVisibility[params.childNodeId] = params.visible;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set child ${params.childNodeId} visibility=${params.visible} in state "${params.stateName}"`,
      affectedNodeIds: [params.parentNodeId, params.childNodeId],
    },
    inverse: {
      type: '_restoreChildVisibility',
      params: {
        parentNodeId: params.parentNodeId,
        childNodeId: params.childNodeId,
        stateName: params.stateName,
        oldValue,
      },
    },
  };
}

// ===== visualState.resetStyle =====

export function executeResetStateStyle(project: DesignProject, params: VisualStateResetStyleOp['params']): Result {
  const newProject = deepClone(project);
  const node = findNodeInProject(newProject, params.nodeId);

  if (!node) {
    return {
      project,
      result: { success: false, description: `Node ${params.nodeId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const state = node.states?.find((s) => s.name === params.stateName);
  if (!state) {
    return {
      project,
      result: { success: false, description: `State "${params.stateName}" not found on ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldValues: Record<string, unknown> = {};
  const stylesRecord = state.styles as Record<string, unknown>;
  for (const prop of params.properties) {
    if (prop in stylesRecord) {
      oldValues[prop] = stylesRecord[prop];
      delete stylesRecord[prop];
    }
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Reset visual state style [${params.properties.join(', ')}] on "${params.stateName}" of ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'visualState.update',
      params: {
        nodeId: params.nodeId,
        stateName: params.stateName,
        styles: oldValues,
      },
    },
  };
}
