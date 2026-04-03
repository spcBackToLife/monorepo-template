import type { DesignProject, EnvironmentVariable } from '@globallink/design-schema';
import { deepClone, generateId } from '@globallink/design-schema';
import type {
  AddEnvironmentStateOp,
  RemoveEnvironmentStateOp,
  UpdateEnvironmentStateOp,
  SetEnvironmentPreviewOp,
  AddEnvironmentBindingOp,
  UpdateEnvironmentBindingOp,
  RemoveEnvironmentBindingOp,
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

// ===== addEnvironmentState =====

export function executeAddEnvironmentState(
  project: DesignProject,
  params: AddEnvironmentStateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  if (!newProject.environmentStates) {
    newProject.environmentStates = [];
  }

  if (newProject.environmentStates.some((v) => v.name === params.name)) {
    return {
      project,
      result: {
        success: false,
        description: `Environment variable "${params.name}" already exists`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const variable: EnvironmentVariable = {
    id: generateId(),
    name: params.name,
    label: params.label,
    values: params.values,
    defaultValue: params.defaultValue,
  };

  newProject.environmentStates.push(variable);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added environment variable "${params.name}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'removeEnvironmentState',
      params: { variableName: params.name },
    },
  };
}

// ===== removeEnvironmentState =====

export function executeRemoveEnvironmentState(
  project: DesignProject,
  params: RemoveEnvironmentStateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  if (!newProject.environmentStates) {
    newProject.environmentStates = [];
  }

  const varIndex = newProject.environmentStates.findIndex((v) => v.name === params.variableName);
  if (varIndex === -1) {
    return {
      project,
      result: {
        success: false,
        description: `Environment variable "${params.variableName}" not found`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = newProject.environmentStates.splice(varIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed environment variable "${params.variableName}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: '_restoreEnvironmentState',
      params: {
        variable: removed,
        position: varIndex,
      },
    },
  };
}

// ===== updateEnvironmentState =====

export function executeUpdateEnvironmentState(
  project: DesignProject,
  params: UpdateEnvironmentStateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  if (!newProject.environmentStates) {
    newProject.environmentStates = [];
  }

  const variable = newProject.environmentStates.find((v) => v.name === params.variableName);
  if (!variable) {
    return {
      project,
      result: {
        success: false,
        description: `Environment variable "${params.variableName}" not found`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPatch: UpdateEnvironmentStateOp['params']['patch'] = {};
  if (params.patch.label !== undefined) {
    oldPatch.label = variable.label;
  }
  if (params.patch.values !== undefined) {
    oldPatch.values = variable.values.map((x) => ({ ...x }));
  }
  if (params.patch.defaultValue !== undefined) {
    oldPatch.defaultValue = variable.defaultValue;
  }

  if (params.patch.label !== undefined) {
    variable.label = params.patch.label;
  }
  if (params.patch.values !== undefined) {
    variable.values = params.patch.values;
  }
  if (params.patch.defaultValue !== undefined) {
    variable.defaultValue = params.patch.defaultValue;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated environment variable "${params.variableName}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'updateEnvironmentState',
      params: {
        variableName: params.variableName,
        patch: oldPatch,
      },
    },
  };
}

// ===== setEnvironmentPreview =====

export function executeSetEnvironmentPreview(
  project: DesignProject,
  params: SetEnvironmentPreviewOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  if (!newProject.environmentStates) {
    newProject.environmentStates = [];
  }

  const variable = newProject.environmentStates.find((v) => v.name === params.variableName);
  if (!variable) {
    return {
      project,
      result: {
        success: false,
        description: `Environment variable "${params.variableName}" not found`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previousPreview = variable.currentPreviewValue;
  variable.currentPreviewValue = params.value;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set environment preview for "${params.variableName}" to "${params.value}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: '_restoreEnvironmentPreview',
      params: {
        variableName: params.variableName,
        previousPreview,
        redoValue: params.value,
      },
    },
  };
}

// ===== addEnvironmentBinding =====

export function executeAddEnvironmentBinding(
  project: DesignProject,
  params: AddEnvironmentBindingOp['params'],
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

  if (!node.environmentBindings) {
    node.environmentBindings = [];
  }

  const dup = node.environmentBindings.some(
    (b) => b.variableName === params.binding.variableName && b.value === params.binding.value,
  );
  if (dup) {
    return {
      project,
      result: {
        success: false,
        description: `Environment binding for "${params.binding.variableName}" / "${params.binding.value}" already exists on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  node.environmentBindings.push({
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
      description: `Added environment binding for "${params.binding.variableName}" on node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'removeEnvironmentBinding',
      params: {
        nodeId: params.nodeId,
        variableName: params.binding.variableName,
        value: params.binding.value,
      },
    },
  };
}

// ===== updateEnvironmentBinding =====

export function executeUpdateEnvironmentBinding(
  project: DesignProject,
  params: UpdateEnvironmentBindingOp['params'],
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

  if (!node.environmentBindings) {
    node.environmentBindings = [];
  }

  const binding = node.environmentBindings.find(
    (b) => b.variableName === params.variableName && b.value === params.value,
  );
  if (!binding) {
    return {
      project,
      result: {
        success: false,
        description: `Environment binding "${params.variableName}" / "${params.value}" not found on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPatch: UpdateEnvironmentBindingOp['params']['patch'] = {};
  if (params.patch.styles !== undefined) {
    oldPatch.styles = binding.styles ? { ...binding.styles } : undefined;
  }
  if (params.patch.props !== undefined) {
    oldPatch.props = binding.props ? { ...binding.props } : undefined;
  }
  if (params.patch.visible !== undefined) {
    oldPatch.visible = binding.visible;
  }

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
      description: `Updated environment binding on node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'updateEnvironmentBinding',
      params: {
        nodeId: params.nodeId,
        variableName: params.variableName,
        value: params.value,
        patch: oldPatch,
      },
    },
  };
}

// ===== removeEnvironmentBinding =====

export function executeRemoveEnvironmentBinding(
  project: DesignProject,
  params: RemoveEnvironmentBindingOp['params'],
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

  if (!node.environmentBindings) {
    node.environmentBindings = [];
  }

  const bindingIndex = node.environmentBindings.findIndex(
    (b) => b.variableName === params.variableName && b.value === params.value,
  );
  if (bindingIndex === -1) {
    return {
      project,
      result: {
        success: false,
        description: `Environment binding "${params.variableName}" / "${params.value}" not found on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = node.environmentBindings.splice(bindingIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed environment binding from node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'addEnvironmentBinding',
      params: {
        nodeId: params.nodeId,
        binding: {
          variableName: removed.variableName,
          value: removed.value,
          styles: removed.styles,
          props: removed.props,
          visible: removed.visible,
        },
      },
    },
  };
}
