import type { DesignProject, ApiEndpoint, MockScenario } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  AddApiEndpointOp,
  RemoveApiEndpointOp,
  UpdateApiEndpointOp,
  AddMockScenarioOp,
  UpdateMockScenarioOp,
  RemoveMockScenarioOp,
  SwitchMockScenarioOp,
  OperationResult,
  InverseData,
} from '../types';

function getScreen(project: DesignProject, screenId: string) {
  return project.screens.find((s) => s.id === screenId);
}

function getEndpoint(project: DesignProject, screenId: string, endpointId: string) {
  const screen = getScreen(project, screenId);
  if (!screen) return { screen: undefined, endpoint: undefined };
  const list = screen.apiEndpoints ?? [];
  const endpoint = list.find((ep) => ep.definition.id === endpointId);
  return { screen, endpoint };
}

// ===== addApiEndpoint =====

export function executeAddApiEndpoint(
  project: DesignProject,
  params: AddApiEndpointOp['params'],
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

  if (!screen.apiEndpoints) {
    screen.apiEndpoints = [];
  }

  if (screen.apiEndpoints.some((ep) => ep.definition.id === params.endpoint.definition.id)) {
    return {
      project,
      result: {
        success: false,
        description: `API endpoint "${params.endpoint.definition.id}" already exists`,
        affectedNodeIds: [],
      },
      inverse: { type: 'noop', params: {} },
    };
  }

  screen.apiEndpoints.push(deepClone(params.endpoint));
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added API endpoint "${params.endpoint.definition.name}" to screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'removeApiEndpoint',
      params: { screenId: params.screenId, endpointId: params.endpoint.definition.id },
    },
  };
}

// ===== removeApiEndpoint =====

export function executeRemoveApiEndpoint(
  project: DesignProject,
  params: RemoveApiEndpointOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screen = getScreen(newProject, params.screenId);

  if (!screen || !screen.apiEndpoints) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const idx = screen.apiEndpoints.findIndex((ep) => ep.definition.id === params.endpointId);
  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `API endpoint ${params.endpointId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = screen.apiEndpoints.splice(idx, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed API endpoint "${removed.definition.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreApiEndpoint',
      params: { screenId: params.screenId, endpoint: removed, position: idx },
    },
  };
}

// ===== updateApiEndpoint =====

export function executeUpdateApiEndpoint(
  project: DesignProject,
  params: UpdateApiEndpointOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, endpoint } = getEndpoint(newProject, params.screenId, params.endpointId);

  if (!screen || !endpoint) {
    return {
      project,
      result: { success: false, description: `API endpoint ${params.endpointId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previousDefinition = deepClone(endpoint.definition);

  if (params.definition) {
    Object.assign(endpoint.definition, params.definition);
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated API endpoint "${endpoint.definition.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'updateApiEndpoint',
      params: { screenId: params.screenId, endpointId: params.endpointId, definition: previousDefinition },
    },
  };
}

// ===== addMockScenario =====

export function executeAddMockScenario(
  project: DesignProject,
  params: AddMockScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, endpoint } = getEndpoint(newProject, params.screenId, params.endpointId);

  if (!screen || !endpoint) {
    return {
      project,
      result: { success: false, description: `API endpoint ${params.endpointId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  endpoint.scenarios.push(deepClone(params.scenario));
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added mock scenario "${params.scenario.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'removeMockScenario',
      params: { screenId: params.screenId, endpointId: params.endpointId, scenarioId: params.scenario.id },
    },
  };
}

// ===== updateMockScenario =====

export function executeUpdateMockScenario(
  project: DesignProject,
  params: UpdateMockScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, endpoint } = getEndpoint(newProject, params.screenId, params.endpointId);

  if (!screen || !endpoint) {
    return {
      project,
      result: { success: false, description: `API endpoint ${params.endpointId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const scenario = endpoint.scenarios.find((s) => s.id === params.scenarioId);
  if (!scenario) {
    return {
      project,
      result: { success: false, description: `Scenario ${params.scenarioId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previous = deepClone(scenario);
  Object.assign(scenario, params.changes);
  scenario.id = params.scenarioId; // preserve id

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated mock scenario "${scenario.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'updateMockScenario',
      params: { screenId: params.screenId, endpointId: params.endpointId, scenarioId: params.scenarioId, changes: previous },
    },
  };
}

// ===== removeMockScenario =====

export function executeRemoveMockScenario(
  project: DesignProject,
  params: RemoveMockScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, endpoint } = getEndpoint(newProject, params.screenId, params.endpointId);

  if (!screen || !endpoint) {
    return {
      project,
      result: { success: false, description: `API endpoint ${params.endpointId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const idx = endpoint.scenarios.findIndex((s) => s.id === params.scenarioId);
  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `Scenario ${params.scenarioId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removed] = endpoint.scenarios.splice(idx, 1);

  if (endpoint.activeScenarioId === params.scenarioId && endpoint.scenarios.length > 0) {
    endpoint.activeScenarioId = endpoint.scenarios[0].id;
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
        endpointId: params.endpointId,
        scenario: removed,
        position: idx,
        previousActiveScenarioId: endpoint.activeScenarioId,
      },
    },
  };
}

// ===== switchMockScenario =====

export function executeSwitchMockScenario(
  project: DesignProject,
  params: SwitchMockScenarioOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const { screen, endpoint } = getEndpoint(newProject, params.screenId, params.endpointId);

  if (!screen || !endpoint) {
    return {
      project,
      result: { success: false, description: `API endpoint ${params.endpointId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const previousActiveId = endpoint.activeScenarioId;
  endpoint.activeScenarioId = params.scenarioId;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Switched to mock scenario "${params.scenarioId}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'switchMockScenario',
      params: { screenId: params.screenId, endpointId: params.endpointId, scenarioId: previousActiveId },
    },
  };
}
