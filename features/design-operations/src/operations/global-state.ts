import type { DesignProject } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  AddGlobalStateVariableOp,
  RemoveGlobalStateVariableOp,
  SetGlobalStateOp,
  AddGlobalStateBindingOp,
  RemoveGlobalStateBindingOp,
  UpdateGlobalStateBindingOp,
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

// ===== addGlobalStateVariable =====

export function executeAddGlobalStateVariable(
  project: DesignProject,
  params: AddGlobalStateVariableOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screen = newProject.screens.find((s) => s.id === params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Check for duplicate variable name
  if (screen.globalStates.some((v) => v.name === params.name)) {
    return {
      project,
      result: { success: false, description: `Global state variable "${params.name}" already exists on screen ${params.screenId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  screen.globalStates.push({
    name: params.name,
    values: params.values,
    defaultValue: params.defaultValue,
    description: params.description,
  });

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added global state variable "${params.name}" to screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'removeGlobalStateVariable',
      params: { screenId: params.screenId, variableName: params.name },
    },
  };
}

// ===== removeGlobalStateVariable =====

export function executeRemoveGlobalStateVariable(
  project: DesignProject,
  params: RemoveGlobalStateVariableOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screen = newProject.screens.find((s) => s.id === params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const varIndex = screen.globalStates.findIndex((v) => v.name === params.variableName);
  if (varIndex === -1) {
    return {
      project,
      result: { success: false, description: `Global state variable "${params.variableName}" not found on screen ${params.screenId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedVariable] = screen.globalStates.splice(varIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed global state variable "${params.variableName}" from screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreGlobalStateVariable',
      params: {
        screenId: params.screenId,
        variable: removedVariable,
        position: varIndex,
      },
    },
  };
}

// ===== setGlobalState =====

export function executeSetGlobalState(
  project: DesignProject,
  params: SetGlobalStateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  // Validate that the screen and variable exist
  const screen = project.screens.find((s) => s.id === params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const variable = screen.globalStates.find((v) => v.name === params.variableName);
  if (!variable) {
    return {
      project,
      result: { success: false, description: `Global state variable "${params.variableName}" not found on screen ${params.screenId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // This is a UI-only operation (runtime state, not persisted in schema)
  // The frontend store manages actual runtime global state values
  return {
    project,
    result: {
      success: true,
      description: `Set global state "${params.variableName}" to "${params.value}" on screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'noop',
      params: {},
    },
  };
}

// ===== addGlobalStateBinding =====

export function executeAddGlobalStateBinding(
  project: DesignProject,
  params: AddGlobalStateBindingOp['params'],
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

  // Check for duplicate binding id
  if (node.globalStateBindings.some((b) => b.id === params.binding.id)) {
    return {
      project,
      result: { success: false, description: `Binding "${params.binding.id}" already exists on node ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  node.globalStateBindings.push({
    id: params.binding.id,
    variableName: params.binding.variableName,
    value: params.binding.value,
    styles: params.binding.styles,
    props: params.binding.props,
    visible: params.binding.visible,
  });

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added global state binding "${params.binding.id}" to node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'removeGlobalStateBinding',
      params: { nodeId: params.nodeId, bindingId: params.binding.id },
    },
  };
}

// ===== removeGlobalStateBinding =====

export function executeRemoveGlobalStateBinding(
  project: DesignProject,
  params: RemoveGlobalStateBindingOp['params'],
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

  const bindingIndex = node.globalStateBindings.findIndex((b) => b.id === params.bindingId);
  if (bindingIndex === -1) {
    return {
      project,
      result: { success: false, description: `Binding "${params.bindingId}" not found on node ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedBinding] = node.globalStateBindings.splice(bindingIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed global state binding "${params.bindingId}" from node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'addGlobalStateBinding',
      params: {
        nodeId: params.nodeId,
        binding: removedBinding,
      },
    },
  };
}

// ===== updateGlobalStateBinding =====

export function executeUpdateGlobalStateBinding(
  project: DesignProject,
  params: UpdateGlobalStateBindingOp['params'],
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

  const binding = node.globalStateBindings.find((b) => b.id === params.bindingId);
  if (!binding) {
    return {
      project,
      result: { success: false, description: `Binding "${params.bindingId}" not found on node ${params.nodeId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Save old values for inverse
  const oldPatch: UpdateGlobalStateBindingOp['params']['patch'] = {};
  if (params.patch.styles !== undefined) {
    oldPatch.styles = binding.styles ? { ...binding.styles } : undefined;
  }
  if (params.patch.props !== undefined) {
    oldPatch.props = binding.props ? { ...binding.props } : undefined;
  }
  if (params.patch.visible !== undefined) {
    oldPatch.visible = binding.visible;
  }

  // Apply patch
  if (params.patch.styles !== undefined) {
    binding.styles = params.patch.styles;
  }
  if (params.patch.props !== undefined) {
    binding.props = params.patch.props;
  }
  if (params.patch.visible !== undefined) {
    binding.visible = params.patch.visible;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated global state binding "${params.bindingId}" on node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'updateGlobalStateBinding',
      params: {
        nodeId: params.nodeId,
        bindingId: params.bindingId,
        patch: oldPatch,
      },
    },
  };
}
