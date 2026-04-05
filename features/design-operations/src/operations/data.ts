import type { DesignProject, DataSource } from '@globallink/design-schema';
import { deepClone, API_DATA_SOURCE_PHASES } from '@globallink/design-schema';
import type {
  AddDataSourceOp,
  RemoveDataSourceOp,
  UpdateDataSourceOp,
  SwitchDataSourcePhaseOp,
  AddDataScenarioOp,
  UpdateDataScenarioOp,
  RemoveDataScenarioOp,
  SwitchDataScenarioOp,
  BindDataOp,
  OperationResult,
  InverseData,
} from '../types';
import { findNodeById } from '../utils/tree';

function findNodeInProject(project: DesignProject, nodeId: string) {
  for (const screen of project.screens) {
    const node = findNodeById(screen.rootNode, nodeId);
    if (node) return node;
  }
  return undefined;
}

function getScreen(project: DesignProject, screenId: string) {
  return project.screens.find((s) => s.id === screenId);
}

function getDataSource(project: DesignProject, screenId: string, dataSourceId: string) {
  const screen = getScreen(project, screenId);
  if (!screen) return { screen: undefined, dataSource: undefined };
  const list = Array.isArray(screen.dataSources) ? screen.dataSources : [];
  const dataSource = list.find((ds) => ds.id === dataSourceId);
  return { screen, dataSource };
}

// ===== addDataSource =====

export function executeAddDataSource(
  project: DesignProject,
  params: AddDataSourceOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screen = getScreen(newProject, params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!params?.dataSource?.id) {
    return {
      project,
      result: { success: false, description: 'addDataSource 缺少 dataSource.id', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // 旧快照 / 外部 JSON 可能缺少 dataSources，避免 .some / .push 在 undefined 上报错
  if (!Array.isArray(screen.dataSources)) {
    screen.dataSources = [];
  }

  if (screen.dataSources.some((ds) => ds.id === params.dataSource.id)) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSource.id}" already exists on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const phases =
    params.dataSource.lifecycle === 'api' ? deepClone(API_DATA_SOURCE_PHASES) : [];

  // 所有 ID 和数据结构由调用方提供，执行器不产生任何随机值。
  // 对于旧操作日志（没有 scenarios 字段），用数据源 ID 派生确定性 scenario ID。
  const scenarios = params.dataSource.scenarios
    ? deepClone(params.dataSource.scenarios)
    : [{ id: `${params.dataSource.id}_sc0`, name: '默认', data: {}, isDefault: true }];
  const activeScenarioId = params.dataSource.activeScenarioId
    ?? scenarios[0]?.id
    ?? '';

  const dataSource: DataSource = {
    id: params.dataSource.id,
    name: params.dataSource.name,
    description: params.dataSource.description,
    lifecycle: params.dataSource.lifecycle,
    phases,
    activePhase: 'loaded',
    scenarios,
    activeScenarioId,
  };

  screen.dataSources.push(dataSource);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added data source "${params.dataSource.name}" to screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'removeDataSource',
      params: { screenId: params.screenId, dataSourceId: params.dataSource.id },
    },
  };
}

// ===== removeDataSource =====

export function executeRemoveDataSource(
  project: DesignProject,
  params: RemoveDataSourceOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screen = getScreen(newProject, params.screenId);

  if (!screen) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!Array.isArray(screen.dataSources)) {
    screen.dataSources = [];
  }

  const dsIndex = screen.dataSources.findIndex((ds) => ds.id === params.dataSourceId);
  if (dsIndex === -1) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSourceId}" not found on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = screen.dataSources.splice(dsIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed data source "${removed.name}" from screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreDataSource',
      params: {
        screenId: params.screenId,
        dataSource: removed,
        position: dsIndex,
      },
    },
  };
}

// ===== updateDataSource =====

export function executeUpdateDataSource(
  project: DesignProject,
  params: UpdateDataSourceOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, dataSource } = getDataSource(newProject, params.screenId, params.dataSourceId);

  if (!screen || !dataSource) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSourceId}" not found on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const hasName = params.name !== undefined;
  const hasDesc = params.description !== undefined;
  if (!hasName && !hasDesc) {
    return {
      project,
      result: { success: false, description: 'updateDataSource requires at least one of name, description', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldName = dataSource.name;
  const oldDesc = dataSource.description;

  if (hasName) dataSource.name = params.name!;
  if (hasDesc) dataSource.description = params.description;

  newProject.updatedAt = new Date().toISOString();

  const inverseParams: UpdateDataSourceOp['params'] = {
    screenId: params.screenId,
    dataSourceId: params.dataSourceId,
  };
  if (hasName) inverseParams.name = oldName;
  if (hasDesc) inverseParams.description = oldDesc;

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated data source "${dataSource.name}" on screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'updateDataSource',
      params: inverseParams,
    },
  };
}

// ===== switchDataSourcePhase =====

export function executeSwitchDataSourcePhase(
  project: DesignProject,
  params: SwitchDataSourcePhaseOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, dataSource } = getDataSource(newProject, params.screenId, params.dataSourceId);

  if (!screen || !dataSource) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSourceId}" not found on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (dataSource.phases.length === 0) {
    return {
      project,
      result: {
        success: false,
        description: `Cannot switch phase on static data source "${params.dataSourceId}" (no lifecycle phases)`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (!dataSource.phases.some((p) => p.name === params.phase)) {
    return {
      project,
      result: {
        success: false,
        description: `Phase "${params.phase}" is not defined on data source "${params.dataSourceId}"`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldPhase = dataSource.activePhase;
  dataSource.activePhase = params.phase;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Switched data source "${params.dataSourceId}" to phase "${params.phase}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'switchDataSourcePhase',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        phase: oldPhase,
      },
    },
  };
}

// ===== addDataScenario =====

export function executeAddDataScenario(
  project: DesignProject,
  params: AddDataScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, dataSource } = getDataSource(newProject, params.screenId, params.dataSourceId);

  if (!screen || !dataSource) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSourceId}" not found on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (dataSource.scenarios.some((s) => s.id === params.scenario.id)) {
    return {
      project,
      result: {
        success: false,
        description: `Scenario "${params.scenario.id}" already exists on data source ${params.dataSourceId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const scenario = {
    id: params.scenario.id,
    name: params.scenario.name,
    data: params.scenario.data,
    description: params.scenario.description,
    isDefault: params.scenario.isDefault,
  };

  if (scenario.isDefault) {
    for (const s of dataSource.scenarios) {
      s.isDefault = false;
    }
  }

  dataSource.scenarios.push(scenario);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added scenario "${params.scenario.name}" to data source ${params.dataSourceId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'removeDataScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenarioId: params.scenario.id,
      },
    },
  };
}

// ===== updateDataScenario =====

export function executeUpdateDataScenario(
  project: DesignProject,
  params: UpdateDataScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, dataSource } = getDataSource(newProject, params.screenId, params.dataSourceId);

  if (!screen || !dataSource) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSourceId}" not found on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const scenario = dataSource.scenarios.find((s) => s.id === params.scenarioId);
  if (!scenario) {
    return {
      project,
      result: {
        success: false,
        description: `Scenario "${params.scenarioId}" not found on data source ${params.dataSourceId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const hasData = params.data !== undefined;
  const hasName = params.name !== undefined;
  const hasDesc = params.description !== undefined;
  if (!hasData && !hasName && !hasDesc) {
    return {
      project,
      result: {
        success: false,
        description: 'updateDataScenario requires at least one of data, name, description',
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldData = deepClone(scenario.data);
  const oldName = scenario.name;
  const oldDesc = scenario.description;

  if (hasData) scenario.data = params.data!;
  if (hasName) scenario.name = params.name!;
  if (hasDesc) scenario.description = params.description;

  newProject.updatedAt = new Date().toISOString();

  const inverseParams: UpdateDataScenarioOp['params'] = {
    screenId: params.screenId,
    dataSourceId: params.dataSourceId,
    scenarioId: params.scenarioId,
  };
  if (hasData) inverseParams.data = oldData;
  if (hasName) inverseParams.name = oldName;
  if (hasDesc) inverseParams.description = oldDesc;

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated scenario "${scenario.name}" on data source ${params.dataSourceId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'updateDataScenario',
      params: inverseParams,
    },
  };
}

// ===== removeDataScenario =====

export function executeRemoveDataScenario(
  project: DesignProject,
  params: RemoveDataScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, dataSource } = getDataSource(newProject, params.screenId, params.dataSourceId);

  if (!screen || !dataSource) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSourceId}" not found on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const idx = dataSource.scenarios.findIndex((s) => s.id === params.scenarioId);
  if (idx === -1) {
    return {
      project,
      result: {
        success: false,
        description: `Scenario "${params.scenarioId}" not found on data source ${params.dataSourceId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = dataSource.scenarios.splice(idx, 1);
  const previousActiveScenarioId = dataSource.activeScenarioId;

  if (dataSource.activeScenarioId === params.scenarioId) {
    dataSource.activeScenarioId = dataSource.scenarios.length > 0 ? dataSource.scenarios[0].id : '';
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed scenario "${removed.name}" from data source ${params.dataSourceId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreDataScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenario: removed,
        position: idx,
        previousActiveScenarioId,
      },
    },
  };
}

// ===== switchDataScenario =====

export function executeSwitchDataScenario(
  project: DesignProject,
  params: SwitchDataScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, dataSource } = getDataSource(newProject, params.screenId, params.dataSourceId);

  if (!screen || !dataSource) {
    return {
      project,
      result: {
        success: false,
        description: `Data source "${params.dataSourceId}" not found on screen ${params.screenId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (
    params.scenarioId !== '' &&
    !dataSource.scenarios.some((s) => s.id === params.scenarioId)
  ) {
    return {
      project,
      result: {
        success: false,
        description: `Scenario "${params.scenarioId}" not found on data source ${params.dataSourceId}`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldId = dataSource.activeScenarioId;
  dataSource.activeScenarioId = params.scenarioId;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Switched active scenario to "${params.scenarioId}" on data source ${params.dataSourceId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'switchDataScenario',
      params: {
        screenId: params.screenId,
        dataSourceId: params.dataSourceId,
        scenarioId: oldId,
      },
    },
  };
}

// ===== bindData =====

export function executeBindData(
  project: DesignProject,
  params: BindDataOp['params'],
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

  const oldValue = node.props[params.propKey];
  node.props[params.propKey] = params.expression;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Bound data expression to "${params.propKey}" on node ${params.nodeId}`,
      affectedNodeIds: [params.nodeId],
    },
    inverse: {
      type: 'bindData',
      params: {
        nodeId: params.nodeId,
        propKey: params.propKey,
        expression: oldValue !== undefined ? String(oldValue) : '',
      },
    },
  };
}
