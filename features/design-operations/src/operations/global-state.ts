/**
 * 项目级 GlobalStateInit 操作。
 * 写入 DesignProject.globalStateInit.view[name]。
 */

import type { DesignProject, ViewVariableDef, GlobalStateInit } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  GlobalStateAddViewVariableOp,
  GlobalStateRemoveViewVariableOp,
  GlobalStateUpdateViewVariableOp,
  GlobalStateSetViewPreviewOp,
  OperationResult,
  InverseData,
} from '../types';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

function ensureGlobal(project: DesignProject): GlobalStateInit {
  if (!project.globalStateInit) project.globalStateInit = { view: {} };
  if (!project.globalStateInit.view) project.globalStateInit.view = {};
  return project.globalStateInit;
}

// ===== globalState.addViewVariable =====

export function executeAddGlobalViewVariable(
  project: DesignProject,
  params: GlobalStateAddViewVariableOp['params'],
): Result {
  const newProject = deepClone(project);
  const init = ensureGlobal(newProject);

  if (init.view![params.variable.name]) {
    return {
      project,
      result: {
        success: false,
        description: `Global view variable "${params.variable.name}" already exists`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  init.view![params.variable.name] = params.variable;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added global view variable "${params.variable.name}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'globalState.removeViewVariable',
      params: { name: params.variable.name },
    },
  };
}

// ===== globalState.removeViewVariable =====

export function executeRemoveGlobalViewVariable(
  project: DesignProject,
  params: GlobalStateRemoveViewVariableOp['params'],
): Result {
  const newProject = deepClone(project);
  const init = newProject.globalStateInit;

  if (!init?.view?.[params.name]) {
    return {
      project,
      result: { success: false, description: `Global view variable "${params.name}" not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const removed: ViewVariableDef = deepClone(init.view[params.name]);
  delete init.view[params.name];
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed global view variable "${params.name}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'globalState.addViewVariable',
      params: { variable: removed },
    },
  };
}

// ===== globalState.updateViewVariable =====

export function executeUpdateGlobalViewVariable(
  project: DesignProject,
  params: GlobalStateUpdateViewVariableOp['params'],
): Result {
  const newProject = deepClone(project);
  const variable = newProject.globalStateInit?.view?.[params.name];

  if (!variable) {
    return {
      project,
      result: { success: false, description: `Global view variable "${params.name}" not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPatch: GlobalStateUpdateViewVariableOp['params']['patch'] = {};
  if (params.patch.label !== undefined) {
    oldPatch.label = variable.label;
    variable.label = params.patch.label;
  }
  if (params.patch.defaultValue !== undefined) {
    oldPatch.defaultValue = variable.defaultValue;
    variable.defaultValue = params.patch.defaultValue;
  }
  if (params.patch.enum !== undefined) {
    oldPatch.enum = variable.enum ? deepClone(variable.enum) : undefined;
    variable.enum = params.patch.enum;
  }
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated global view variable "${params.name}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'globalState.updateViewVariable',
      params: { name: params.name, patch: oldPatch },
    },
  };
}

// ===== globalState.setViewPreview =====

export function executeSetGlobalViewPreview(
  project: DesignProject,
  params: GlobalStateSetViewPreviewOp['params'],
): Result {
  const newProject = deepClone(project);
  const variable = newProject.globalStateInit?.view?.[params.name];

  if (!variable) {
    return {
      project,
      result: { success: false, description: `Global view variable "${params.name}" not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = variable.previewValue;
  if (params.previewValue === undefined) {
    delete variable.previewValue;
  } else {
    variable.previewValue = params.previewValue;
  }
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set preview for global view variable "${params.name}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'globalState.setViewPreview',
      params: { name: params.name, previewValue: previous },
    },
  };
}
