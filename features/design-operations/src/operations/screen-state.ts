/**
 * 屏幕级 ScreenStateInit 操作。
 * 写入 Screen.stateInit.view[name] 与 Screen.stateInit.data[key]。
 */

import type {
  DesignProject,
  ViewVariableDef,
  ScreenStateInit,
  DataTypeAnnotation,
  Screen,
  ComponentNode,
  ApiDataSource,
} from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  ScreenStateAddViewVariableOp,
  ScreenStateRemoveViewVariableOp,
  ScreenStateUpdateViewVariableOp,
  ScreenStateSetViewPreviewOp,
  ScreenStateSetDataInitOp,
  ScreenStateRemoveDataInitOp,
  OperationResult,
  InverseData,
} from '../types';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

function findScreen(project: DesignProject, screenId: string) {
  return project.screens.find((s) => s.id === screenId);
}

function ensureStateInit(screen: { stateInit?: ScreenStateInit }): ScreenStateInit {
  if (!screen.stateInit) screen.stateInit = { view: {}, data: {} };
  if (!screen.stateInit.view) screen.stateInit.view = {};
  if (!screen.stateInit.data) screen.stateInit.data = {};
  return screen.stateInit;
}

// ===== screenState.addViewVariable =====

export function executeAddViewVariable(
  project: DesignProject,
  params: ScreenStateAddViewVariableOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const stateInit = ensureStateInit(screen);
  if (stateInit.view![params.variable.name]) {
    return {
      project,
      result: {
        success: false,
        description: `View variable "${params.variable.name}" already exists`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  stateInit.view![params.variable.name] = params.variable;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added screen view variable "${params.variable.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'screenState.removeViewVariable',
      params: { screenId: params.screenId, name: params.variable.name },
    },
  };
}

// ===== screenState.removeViewVariable =====

export function executeRemoveViewVariable(
  project: DesignProject,
  params: ScreenStateRemoveViewVariableOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);

  if (!screen?.stateInit?.view?.[params.name]) {
    return {
      project,
      result: { success: false, description: `View variable "${params.name}" not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const removed: ViewVariableDef = deepClone(screen.stateInit.view[params.name]);
  delete screen.stateInit.view[params.name];
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed screen view variable "${params.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'screenState.addViewVariable',
      params: { screenId: params.screenId, variable: removed },
    },
  };
}

// ===== screenState.updateViewVariable =====

export function executeUpdateViewVariable(
  project: DesignProject,
  params: ScreenStateUpdateViewVariableOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const variable = screen?.stateInit?.view?.[params.name];

  if (!variable) {
    return {
      project,
      result: { success: false, description: `View variable "${params.name}" not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPatch: ScreenStateUpdateViewVariableOp['params']['patch'] = {};
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
      description: `Updated screen view variable "${params.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'screenState.updateViewVariable',
      params: { screenId: params.screenId, name: params.name, patch: oldPatch },
    },
  };
}

// ===== screenState.setViewPreview =====

export function executeSetViewPreview(
  project: DesignProject,
  params: ScreenStateSetViewPreviewOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const variable = screen?.stateInit?.view?.[params.name];

  if (!variable) {
    return {
      project,
      result: { success: false, description: `View variable "${params.name}" not found`, affectedNodeIds: [] },
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
      description: `Set preview for view variable "${params.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'screenState.setViewPreview',
      params: { screenId: params.screenId, name: params.name, previewValue: previous },
    },
  };
}

// ===== Auto-bridge helpers: infer DataTypeAnnotation from DataSource.typeDef =====

/**
 * Recursively scan node tree events looking for effect.fetch actions
 * whose onSuccess contains a state.set targeting `data.${key}`.
 */
function scanEventsForFetchTarget(node: ComponentNode, dataSourceId: string, key: string): boolean {
  for (const event of node.events) {
    for (const action of event.actions) {
      if (action.type === 'effect.fetch' && action.dataSourceId === dataSourceId) {
        // Check onSuccess for state.set with path matching data.<key>
        if (action.onSuccess) {
          for (const subAction of action.onSuccess) {
            if (subAction.type === 'state.set' && matchesDataPath(subAction.path, key)) {
              return true;
            }
          }
        }
      }
    }
  }
  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      if (scanEventsForFetchTarget(child, dataSourceId, key)) {
        return true;
      }
    }
  }
  return false;
}

/** Check if a state.set path targets data.<key> */
function matchesDataPath(path: string, key: string): boolean {
  // Matches "data.messages", "data.messages[0]" etc.
  return path === `data.${key}` || path.startsWith(`data.${key}[`) || path.startsWith(`data.${key}.`);
}

function matchesDataSourceToKey(screen: Screen, ds: ApiDataSource, key: string): boolean {
  // Strategy 1: Name-based matching (ds.name or ds.id matches the key)
  const dsNameNorm = ds.name.replace(/[-_]/g, '').toLowerCase();
  const dsIdNorm = ds.id.replace(/[-_]/g, '').toLowerCase();
  const keyNorm = key.replace(/[-_]/g, '').toLowerCase();
  if (dsNameNorm === keyNorm || dsIdNorm === keyNorm) {
    return true;
  }

  // Strategy 2: Scan events for effect.fetch that writes to this key
  return scanEventsForFetchTarget(screen.rootNode, ds.id, key);
}

/**
 * Auto-infer DataTypeAnnotation from matching DataSources on the same screen.
 * Called when params.typeAnnotation is not explicitly provided in setDataInit.
 */
function autoInferTypeAnnotationFromDataSources(
  screen: Screen,
  key: string,
): DataTypeAnnotation | undefined {
  for (const ds of screen.dataSources) {
    if (ds.type !== 'api' || !ds.typeDef) continue;
    const typeDef = ds.typeDef;
    if (matchesDataSourceToKey(screen, ds, key)) {
      return {
        typeName: typeDef.responseName,
        isArray: typeDef.responseShape === 'array',
      };
    }
  }
  return undefined;
}

// ===== screenState.setDataInit =====

export function executeSetDataInit(
  project: DesignProject,
  params: ScreenStateSetDataInitOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const stateInit = ensureStateInit(screen);
  const had = params.key in stateInit.data!;
  const previous = had ? deepClone(stateInit.data![params.key]) : undefined;
  const previousTypeAnnotation = stateInit.dataTypes?.[params.key]
    ? deepClone(stateInit.dataTypes[params.key])
    : undefined;

  stateInit.data![params.key] = params.value;

  // Persist type annotation if provided
  if (params.typeAnnotation) {
    if (!stateInit.dataTypes) stateInit.dataTypes = {};
    stateInit.dataTypes[params.key] = params.typeAnnotation;
  }

  // Auto-bridge: if no typeAnnotation provided, try to infer from DataSource.typeDef
  if (!params.typeAnnotation) {
    const inferred = autoInferTypeAnnotationFromDataSources(screen, params.key);
    if (inferred) {
      if (!stateInit.dataTypes) stateInit.dataTypes = {};
      stateInit.dataTypes[params.key] = inferred;
    }
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set stateInit.data["${params.key}"] on screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: had
      ? {
          type: 'screenState.setDataInit',
          params: {
            screenId: params.screenId,
            key: params.key,
            value: previous,
            typeAnnotation: previousTypeAnnotation as DataTypeAnnotation | undefined,
          },
        }
      : {
          type: 'screenState.removeDataInit',
          params: { screenId: params.screenId, key: params.key },
        },
  };
}

// ===== screenState.removeDataInit =====

export function executeRemoveDataInit(
  project: DesignProject,
  params: ScreenStateRemoveDataInitOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);

  if (!screen?.stateInit?.data || !(params.key in screen.stateInit.data)) {
    return {
      project,
      result: { success: false, description: `data["${params.key}"] not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = deepClone(screen.stateInit.data[params.key]);
  const previousTypeAnnotation = screen.stateInit.dataTypes?.[params.key]
    ? deepClone(screen.stateInit.dataTypes[params.key])
    : undefined;

  delete screen.stateInit.data[params.key];

  // Clean up type annotation for removed data key
  if (screen.stateInit.dataTypes?.[params.key]) {
    delete screen.stateInit.dataTypes[params.key];
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed stateInit.data["${params.key}"]`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'screenState.setDataInit',
      params: {
        screenId: params.screenId,
        key: params.key,
        value: previous,
        typeAnnotation: previousTypeAnnotation as DataTypeAnnotation | undefined,
      },
    },
  };
}
