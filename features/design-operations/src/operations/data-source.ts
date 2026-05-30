import type {
  DesignProject,
  DataSource,
  ApiDataSource,
  MockScenario,
  DataSourceTypeDef,
} from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  DataSourceAddOp,
  DataSourceRemoveOp,
  DataSourceUpdateOp,
  DataSourceSetEndpointOp,
  DataSourceSetNetworkPolicyOp,
  DataSourceSetDefaultParamsOp,
  DataSourceSetStaticInitialOp,
  DataSourceAddMockScenarioOp,
  DataSourceUpdateMockScenarioOp,
  DataSourceRemoveMockScenarioOp,
  DataSourceSwitchMockScenarioOp,
  OperationResult,
  InverseData,
} from '../types';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

function findScreen(project: DesignProject, screenId: string) {
  return project.screens.find((s) => s.id === screenId);
}

// ===== dataSource.add =====

export function executeAddDataSource(project: DesignProject, params: DataSourceAddOp['params']): Result {
  // 防御性检查：batch 路径可能传入不完整的 params
  if (!params || !params.dataSource) {
    return {
      project,
      result: {
        success: false,
        description: 'Missing required field "dataSource" in params. Expected: { screenId: string, dataSource: { id, name, type, ... } }',
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!screen.dataSources) screen.dataSources = [];

  if (!params.dataSource.id) {
    return {
      project,
      result: {
        success: false,
        description: 'Data source must have an "id" field',
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (screen.dataSources.some((ds) => ds.id === params.dataSource.id)) {
    return {
      project,
      result: {
        success: false,
        description: `Data source ${params.dataSource.id} already exists on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  screen.dataSources.push(params.dataSource);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added data source "${params.dataSource.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.remove',
      params: { screenId: params.screenId, dataSourceId: params.dataSource.id },
    },
  };
}

// ===== dataSource.remove =====

export function executeRemoveDataSource(project: DesignProject, params: DataSourceRemoveOp['params']): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const idx = screen.dataSources.findIndex((ds) => ds.id === params.dataSourceId);
  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `Data source ${params.dataSourceId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = screen.dataSources.splice(idx, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed data source "${removed.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreDataSource',
      params: { screenId: params.screenId, dataSource: removed, position: idx },
    },
  };
}

// ===== dataSource.update =====

export function executeUpdateDataSource(project: DesignProject, params: DataSourceUpdateOp['params']): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId);

  if (!screen || !ds) {
    return {
      project,
      result: { success: false, description: `Data source ${params.dataSourceId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldName = ds.name;
  const oldDescription = ds.description;
  const oldAutoFetchOnEnter = ds.type === 'api' ? ds.autoFetchOnEnter : undefined;
  const oldTypeDef = (ds.type === 'api' && ds.typeDef) ? deepClone(ds.typeDef) : undefined;

  if (params.name !== undefined) ds.name = params.name;
  if (params.description !== undefined) ds.description = params.description;
  if (params.autoFetchOnEnter !== undefined && ds.type === 'api') {
    ds.autoFetchOnEnter = params.autoFetchOnEnter;
  }
  if (params.typeDef !== undefined && ds.type === 'api') {
    ds.typeDef = params.typeDef;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated data source "${ds.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.update',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        name: oldName,
        description: oldDescription,
        autoFetchOnEnter: oldAutoFetchOnEnter,
        typeDef: oldTypeDef as DataSourceTypeDef | undefined,
      },
    },
  };
}

// ===== dataSource.setEndpoint =====

export function executeSetEndpoint(project: DesignProject, params: DataSourceSetEndpointOp['params']): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId);

  if (!screen || !ds) {
    return {
      project,
      result: { success: false, description: `Data source ${params.dataSourceId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (ds.type !== 'api') {
    return {
      project,
      result: { success: false, description: `Data source ${params.dataSourceId} is not type=api`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldEndpoint = deepClone(ds.endpoint);
  ds.endpoint = params.endpoint;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated endpoint of "${ds.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.setEndpoint',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        endpoint: oldEndpoint,
      },
    },
  };
}

// ===== dataSource.setNetworkPolicy（v2.6 ★） =====

export function executeSetNetworkPolicy(
  project: DesignProject,
  params: DataSourceSetNetworkPolicyOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId) as ApiDataSource | undefined;

  if (!screen || !ds || ds.type !== 'api') {
    return {
      project,
      result: { success: false, description: `Api data source ${params.dataSourceId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPolicy = ds.endpoint.networkPolicy ? deepClone(ds.endpoint.networkPolicy) : null;
  if (params.networkPolicy === null) {
    delete ds.endpoint.networkPolicy;
  } else {
    ds.endpoint.networkPolicy = params.networkPolicy;
  }
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: params.networkPolicy === null
        ? `Cleared networkPolicy of "${ds.name}"`
        : `Updated networkPolicy of "${ds.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.setNetworkPolicy',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        networkPolicy: oldPolicy,
      },
    },
  };
}

// ===== dataSource.setDefaultParams =====

export function executeSetDefaultParams(
  project: DesignProject,
  params: DataSourceSetDefaultParamsOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId) as ApiDataSource | undefined;

  if (!screen || !ds || ds.type !== 'api') {
    return {
      project,
      result: { success: false, description: `Api data source ${params.dataSourceId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldDefaultParams = ds.defaultParams ? deepClone(ds.defaultParams) : null;
  if (params.defaultParams === null) {
    delete ds.defaultParams;
  } else {
    ds.defaultParams = params.defaultParams;
  }
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated defaultParams of "${ds.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.setDefaultParams',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        defaultParams: oldDefaultParams,
      },
    },
  };
}

// ===== dataSource.setStaticInitial =====

export function executeSetStaticInitial(
  project: DesignProject,
  params: DataSourceSetStaticInitialOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId);

  if (!screen || !ds) {
    return {
      project,
      result: { success: false, description: `Data source ${params.dataSourceId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }
  if (ds.type !== 'static') {
    return {
      project,
      result: { success: false, description: `Data source ${params.dataSourceId} is not type=static`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldInitial = deepClone(ds.initial);
  ds.initial = params.initial;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated initial of static data source "${ds.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.setStaticInitial',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        initial: oldInitial,
      },
    },
  };
}

// ===== Mock scenarios =====

function ensureMockConfig(ds: DataSource): ApiDataSource | null {
  if (ds.type !== 'api') return null;
  if (!ds.mock) ds.mock = { scenarios: [], activeScenarioId: '' };
  return ds;
}

export function executeAddMockScenario(
  project: DesignProject,
  params: DataSourceAddMockScenarioOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId);
  const apiDs = ds ? ensureMockConfig(ds) : null;

  if (!screen || !apiDs) {
    return {
      project,
      result: { success: false, description: `Api data source ${params.dataSourceId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (apiDs.mock!.scenarios.some((s: MockScenario) => s.id === params.scenario.id)) {
    return {
      project,
      result: {
        success: false,
        description: `Mock scenario ${params.scenario.id} already exists`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  apiDs.mock!.scenarios.push(params.scenario);
  if (!apiDs.mock!.activeScenarioId) {
    apiDs.mock!.activeScenarioId = params.scenario.id;
  }
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added mock scenario "${params.scenario.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.removeMockScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenarioId: params.scenario.id,
      },
    },
  };
}

export function executeUpdateMockScenario(
  project: DesignProject,
  params: DataSourceUpdateMockScenarioOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId) as ApiDataSource | undefined;

  if (!screen || !ds || ds.type !== 'api' || !ds.mock) {
    return {
      project,
      result: { success: false, description: `Mock config not found for ${params.dataSourceId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const scenario = ds.mock.scenarios.find((s) => s.id === params.scenarioId);
  if (!scenario) {
    return {
      project,
      result: { success: false, description: `Mock scenario ${params.scenarioId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldScenario = deepClone(scenario);
  Object.assign(scenario, params.changes);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated mock scenario "${scenario.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.updateMockScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenarioId: params.scenarioId,
        changes: oldScenario,
      },
    },
  };
}

export function executeRemoveMockScenario(
  project: DesignProject,
  params: DataSourceRemoveMockScenarioOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId) as ApiDataSource | undefined;

  if (!screen || !ds || ds.type !== 'api' || !ds.mock) {
    return {
      project,
      result: { success: false, description: `Mock config not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const idx = ds.mock.scenarios.findIndex((s) => s.id === params.scenarioId);
  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `Mock scenario ${params.scenarioId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = ds.mock.scenarios.splice(idx, 1);
  const previousActive = ds.mock.activeScenarioId;
  if (ds.mock.activeScenarioId === params.scenarioId) {
    ds.mock.activeScenarioId = ds.mock.scenarios[0]?.id ?? '';
  }
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed mock scenario "${removed.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreMockScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenario: removed,
        position: idx,
        previousActiveScenarioId: previousActive,
      },
    },
  };
}

export function executeSwitchMockScenario(
  project: DesignProject,
  params: DataSourceSwitchMockScenarioOp['params'],
): Result {
  const newProject = deepClone(project);
  const screen = findScreen(newProject, params.screenId);
  const ds = screen?.dataSources.find((d) => d.id === params.dataSourceId) as ApiDataSource | undefined;

  if (!screen || !ds || ds.type !== 'api' || !ds.mock) {
    return {
      project,
      result: { success: false, description: `Mock config not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!ds.mock.scenarios.some((s) => s.id === params.scenarioId)) {
    return {
      project,
      result: { success: false, description: `Mock scenario ${params.scenarioId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = ds.mock.activeScenarioId;
  ds.mock.activeScenarioId = params.scenarioId;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Switched mock scenario to ${params.scenarioId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'dataSource.switchMockScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenarioId: previous,
      },
    },
  };
}
