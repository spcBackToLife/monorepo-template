import type { DesignProject, ComponentState } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  AddStateOp,
  RemoveStateOp,
  UpdateStateOp,
  SetActiveStateOp,
  SetChildVisibilityOp,
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

// ===== addState =====

export function executeAddState(
  project: DesignProject,
  params: AddStateOp['params'],
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

  if (!node.states) {
    node.states = [];
  }
  if (node.states.some((s) => s.name === params.stateName)) {
    return {
      project,
      result: { success: false, description: `State "${params.stateName}" already exists on ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newState: ComponentState = {
    name: params.stateName,
    styles: params.styles ?? {},
    props: params.props,
    ...(params.transition != null ? { transition: params.transition } : {}),
  };

  node.states.push(newState);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added state "${params.stateName}" to ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'removeState',
      params: { nodeId: params.nodeId, stateName: params.stateName },
    },
  };
}

// ===== removeState =====

export function executeRemoveState(
  project: DesignProject,
  params: RemoveStateOp['params'],
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

  const stateIndex = node.states.findIndex((s) => s.name === params.stateName);
  if (stateIndex === -1) {
    return {
      project,
      result: { success: false, description: `State "${params.stateName}" not found on ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedState] = node.states.splice(stateIndex, 1);

  // If the active state was removed, reset to default
  if (node.activeState === params.stateName) {
    node.activeState = 'default';
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed state "${params.stateName}" from ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'addState',
      params: {
        nodeId: params.nodeId,
        stateName: removedState.name,
        styles: removedState.styles,
        props: removedState.props,
        transition: removedState.transition,
      },
    },
  };
}

// ===== updateState =====

export function executeUpdateState(
  project: DesignProject,
  params: UpdateStateOp['params'],
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
  const oldTransition =
    state.transition === undefined ? undefined : { ...state.transition };

  state.styles = { ...state.styles, ...params.styles };
  if (params.props !== undefined) {
    state.props = { ...(state.props ?? {}), ...params.props };
  }
  if (params.transition !== undefined) {
    state.transition = { ...(state.transition ?? {}), ...params.transition };
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated state "${params.stateName}" on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: '_restoreState',
      params: {
        nodeId: params.nodeId,
        stateName: params.stateName,
        styles: oldStyles,
        props: oldProps,
        transition: oldTransition,
      },
    },
  };
}

// ===== setActiveState =====

export function executeSetActiveState(
  project: DesignProject,
  params: SetActiveStateOp['params'],
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

  const oldState = node.activeState;
  node.activeState = params.stateName;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set active state to "${params.stateName}" on ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'setActiveState',
      params: { nodeId: params.nodeId, stateName: oldState },
    },
  };
}

// ===== setChildVisibility =====

export function executeSetChildVisibility(
  project: DesignProject,
  params: SetChildVisibilityOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
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

  // Ensure a 'default' state entry exists so childrenVisibility
  // can be tracked for the implicit default state as well.
  const hasDefaultState = parent.states.some((s) => s.name === 'default');
  if (!hasDefaultState) {
    parent.states.unshift({ name: 'default', styles: {} });
  }

  // Save old childrenVisibility for undo
  const oldVisMap: Record<string, boolean | undefined> = {};
  const oldHadDefaultState = hasDefaultState;
  for (const state of parent.states) {
    oldVisMap[state.name] = state.childrenVisibility?.[params.childNodeId];
  }

  const visibleSet = new Set(params.visibleInStates);

  for (const state of parent.states) {
    if (!state.childrenVisibility) state.childrenVisibility = {};

    if (visibleSet.has(state.name)) {
      delete state.childrenVisibility[params.childNodeId];
    } else {
      state.childrenVisibility[params.childNodeId] = false;
    }

    if (Object.keys(state.childrenVisibility).length === 0) {
      delete state.childrenVisibility;
    }
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set child ${params.childNodeId} visibility in states [${params.visibleInStates.join(', ')}]`,
      affectedNodeIds: [params.parentNodeId, params.childNodeId],
    },
    inverse: {
      type: '_restoreChildVisibility',
      params: {
        parentNodeId: params.parentNodeId,
        childNodeId: params.childNodeId,
        oldVisMap,
      },
    },
  };
}
