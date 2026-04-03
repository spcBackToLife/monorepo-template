import type { DesignProject, DomainStateBinding, DomainStateVariable } from '@globallink/design-schema';
import { deepClone, generateId } from '@globallink/design-schema';
import type {
  AddDomainStateOp,
  AddDomainStateBindingOp,
  RemoveDomainStateOp,
  RemoveDomainStateBindingOp,
  SetDomainStatePreviewOp,
  UpdateDomainStateOp,
  UpdateDomainStateBindingOp,
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

function getDomainStateList(
  project: DesignProject,
  ownerId: string,
  ownerType: 'screen' | 'node',
): { list: DomainStateVariable[] } | { error: string } {
  if (ownerType === 'screen') {
    const screen = project.screens.find((s) => s.id === ownerId);
    if (!screen) {
      return { error: `Screen ${ownerId} not found` };
    }
    return { list: screen.domainStates };
  }
  const node = findNodeInProject(project, ownerId);
  if (!node) {
    return { error: `Node ${ownerId} not found` };
  }
  if (!node.domainStates) {
    node.domainStates = [];
  }
  return { list: node.domainStates };
}

function findDomainStateBindingIndex(
  bindings: DomainStateBinding[],
  variableName: string,
  value: string,
): number {
  return bindings.findIndex((b) => b.variableName === variableName && b.value === value);
}

// ===== addDomainState =====

export function executeAddDomainState(
  project: DesignProject,
  params: AddDomainStateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const resolved = getDomainStateList(newProject, params.ownerId, params.ownerType);

  if ('error' in resolved) {
    return {
      project,
      result: { success: false, description: resolved.error, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const { list } = resolved;

  if (list.some((v) => v.name === params.name)) {
    return {
      project,
      result: {
        success: false,
        description: `Domain state variable "${params.name}" already exists on ${params.ownerType} ${params.ownerId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  list.push({
    id: generateId(),
    name: params.name,
    label: params.label,
    values: params.values,
    defaultValue: params.defaultValue,
  });

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added domain state variable "${params.name}" to ${params.ownerType} ${params.ownerId}`,
      affectedNodeIds: [params.ownerId],
    },
    inverse: {
      type: 'removeDomainState',
      params: {
        ownerId: params.ownerId,
        ownerType: params.ownerType,
        variableName: params.name,
      },
    },
  };
}

// ===== removeDomainState =====

export function executeRemoveDomainState(
  project: DesignProject,
  params: RemoveDomainStateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const resolved = getDomainStateList(newProject, params.ownerId, params.ownerType);

  if ('error' in resolved) {
    return {
      project,
      result: { success: false, description: resolved.error, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const { list } = resolved;
  const varIndex = list.findIndex((v) => v.name === params.variableName);
  if (varIndex === -1) {
    return {
      project,
      result: {
        success: false,
        description: `Domain state variable "${params.variableName}" not found on ${params.ownerType} ${params.ownerId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedVariable] = list.splice(varIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed domain state variable "${params.variableName}" from ${params.ownerType} ${params.ownerId}`,
      affectedNodeIds: [params.ownerId],
    },
    inverse: {
      type: '_restoreDomainState',
      params: {
        ownerId: params.ownerId,
        ownerType: params.ownerType,
        variable: removedVariable,
        position: varIndex,
      },
    },
  };
}

// ===== updateDomainState =====

export function executeUpdateDomainState(
  project: DesignProject,
  params: UpdateDomainStateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const resolved = getDomainStateList(newProject, params.ownerId, params.ownerType);

  if ('error' in resolved) {
    return {
      project,
      result: { success: false, description: resolved.error, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const variable = resolved.list.find((v) => v.name === params.variableName);
  if (!variable) {
    return {
      project,
      result: {
        success: false,
        description: `Domain state variable "${params.variableName}" not found on ${params.ownerType} ${params.ownerId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPatch: UpdateDomainStateOp['params']['patch'] = {};
  if (params.patch.label !== undefined) {
    oldPatch.label = variable.label;
  }
  if (params.patch.values !== undefined) {
    oldPatch.values = variable.values.map((v) => ({ ...v }));
  }
  if (params.patch.defaultValue !== undefined) {
    oldPatch.defaultValue = variable.defaultValue;
  }

  if (params.patch.label !== undefined) {
    variable.label = params.patch.label;
  }
  if (params.patch.values !== undefined) {
    variable.values = params.patch.values.map((v) => ({ ...v }));
  }
  if (params.patch.defaultValue !== undefined) {
    variable.defaultValue = params.patch.defaultValue;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated domain state variable "${params.variableName}" on ${params.ownerType} ${params.ownerId}`,
      affectedNodeIds: [params.ownerId],
    },
    inverse: {
      type: 'updateDomainState',
      params: {
        ownerId: params.ownerId,
        ownerType: params.ownerType,
        variableName: params.variableName,
        patch: oldPatch,
      },
    },
  };
}

// ===== setDomainStatePreview =====

export function executeSetDomainStatePreview(
  project: DesignProject,
  params: SetDomainStatePreviewOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const resolved = getDomainStateList(newProject, params.ownerId, params.ownerType);

  if ('error' in resolved) {
    return {
      project,
      result: { success: false, description: resolved.error, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const variable = resolved.list.find((v) => v.name === params.variableName);
  if (!variable) {
    return {
      project,
      result: {
        success: false,
        description: `Domain state variable "${params.variableName}" not found on ${params.ownerType} ${params.ownerId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previousValue = variable.currentPreviewValue;
  variable.currentPreviewValue = params.value;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set domain state preview "${params.variableName}" to "${params.value}" on ${params.ownerType} ${params.ownerId}`,
      affectedNodeIds: [params.ownerId],
    },
    inverse: {
      type: '_restoreDomainStatePreview',
      params: {
        ownerId: params.ownerId,
        ownerType: params.ownerType,
        variableName: params.variableName,
        previousValue,
        replacedWith: params.value,
      },
    },
  };
}

// ===== addDomainStateBinding =====

export function executeAddDomainStateBinding(
  project: DesignProject,
  params: AddDomainStateBindingOp['params'],
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

  if (!node.domainStateBindings) {
    node.domainStateBindings = [];
  }

  if (findDomainStateBindingIndex(node.domainStateBindings, params.binding.variableName, params.binding.value) !== -1) {
    return {
      project,
      result: {
        success: false,
        description: `Domain state binding for "${params.binding.variableName}" / "${params.binding.value}" already exists on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const binding: DomainStateBinding = {
    variableName: params.binding.variableName,
    ownerNodeId: params.binding.ownerNodeId,
    value: params.binding.value,
    styles: params.binding.styles,
    props: params.binding.props,
    visible: params.binding.visible,
    childrenVisibility: params.binding.childrenVisibility,
    disabledEvents: params.binding.disabledEvents,
  };

  node.domainStateBindings.push(binding);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added domain state binding for "${params.binding.variableName}" on node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'removeDomainStateBinding',
      params: {
        nodeId: params.nodeId,
        variableName: params.binding.variableName,
        value: params.binding.value,
      },
    },
  };
}

// ===== removeDomainStateBinding =====

export function executeRemoveDomainStateBinding(
  project: DesignProject,
  params: RemoveDomainStateBindingOp['params'],
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

  if (!node.domainStateBindings?.length) {
    return {
      project,
      result: {
        success: false,
        description: `No domain state bindings on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const bindingIndex = findDomainStateBindingIndex(
    node.domainStateBindings,
    params.variableName,
    params.value,
  );
  if (bindingIndex === -1) {
    return {
      project,
      result: {
        success: false,
        description: `Domain state binding for "${params.variableName}" / "${params.value}" not found on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedBinding] = node.domainStateBindings.splice(bindingIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed domain state binding for "${params.variableName}" from node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'addDomainStateBinding',
      params: {
        nodeId: params.nodeId,
        binding: {
          variableName: removedBinding.variableName,
          ownerNodeId: removedBinding.ownerNodeId,
          value: removedBinding.value,
          styles: removedBinding.styles,
          props: removedBinding.props,
          visible: removedBinding.visible,
          childrenVisibility: removedBinding.childrenVisibility,
          disabledEvents: removedBinding.disabledEvents,
        },
      },
    },
  };
}

// ===== updateDomainStateBinding =====

export function executeUpdateDomainStateBinding(
  project: DesignProject,
  params: UpdateDomainStateBindingOp['params'],
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

  if (!node.domainStateBindings?.length) {
    return {
      project,
      result: {
        success: false,
        description: `No domain state bindings on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const binding = node.domainStateBindings.find(
    (b) => b.variableName === params.variableName && b.value === params.value,
  );
  if (!binding) {
    return {
      project,
      result: {
        success: false,
        description: `Domain state binding for "${params.variableName}" / "${params.value}" not found on node ${params.nodeId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPatch: UpdateDomainStateBindingOp['params']['patch'] = {};
  if (params.patch.styles !== undefined) {
    oldPatch.styles = binding.styles ? { ...binding.styles } : undefined;
  }
  if (params.patch.props !== undefined) {
    oldPatch.props = binding.props ? { ...binding.props } : undefined;
  }
  if (params.patch.visible !== undefined) {
    oldPatch.visible = binding.visible;
  }
  if (params.patch.childrenVisibility !== undefined) {
    oldPatch.childrenVisibility = binding.childrenVisibility
      ? { ...binding.childrenVisibility }
      : undefined;
  }
  if (params.patch.disabledEvents !== undefined) {
    oldPatch.disabledEvents = binding.disabledEvents ? [...binding.disabledEvents] : undefined;
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
  if (params.patch.childrenVisibility !== undefined) {
    binding.childrenVisibility = params.patch.childrenVisibility;
  }
  if (params.patch.disabledEvents !== undefined) {
    binding.disabledEvents = params.patch.disabledEvents;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated domain state binding for "${params.variableName}" / "${params.value}" on node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'updateDomainStateBinding',
      params: {
        nodeId: params.nodeId,
        variableName: params.variableName,
        value: params.value,
        patch: oldPatch,
      },
    },
  };
}
