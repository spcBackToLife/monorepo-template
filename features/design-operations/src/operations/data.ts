import type { DesignProject } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  AddDataSetOp,
  RemoveDataSetOp,
  UpdateDataSetOp,
  SwitchDataSetOp,
  BindDataOp,
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

// ===== addDataSet =====

export function executeAddDataSet(
  project: DesignProject,
  params: AddDataSetOp['params'],
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

  // Check for duplicate data set id
  if (screen.dataSets.some((ds) => ds.id === params.dataSet.id)) {
    return {
      project,
      result: { success: false, description: `DataSet "${params.dataSet.id}" already exists on screen ${params.screenId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  screen.dataSets.push({
    id: params.dataSet.id,
    name: params.dataSet.name,
    data: params.dataSet.data,
    description: params.dataSet.description,
  });

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added data set "${params.dataSet.name}" to screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'removeDataSet',
      params: { screenId: params.screenId, dataSetId: params.dataSet.id },
    },
  };
}

// ===== removeDataSet =====

export function executeRemoveDataSet(
  project: DesignProject,
  params: RemoveDataSetOp['params'],
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

  const dsIndex = screen.dataSets.findIndex((ds) => ds.id === params.dataSetId);
  if (dsIndex === -1) {
    return {
      project,
      result: { success: false, description: `DataSet "${params.dataSetId}" not found on screen ${params.screenId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedDataSet] = screen.dataSets.splice(dsIndex, 1);

  // If the removed data set was active, switch to the first available
  if (screen.activeDataSetId === params.dataSetId && screen.dataSets.length > 0) {
    screen.activeDataSetId = screen.dataSets[0].id;
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed data set "${removedDataSet.name}" from screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreDataSet',
      params: {
        screenId: params.screenId,
        dataSet: removedDataSet,
        position: dsIndex,
      },
    },
  };
}

// ===== updateDataSet =====

export function executeUpdateDataSet(
  project: DesignProject,
  params: UpdateDataSetOp['params'],
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

  const dataSet = screen.dataSets.find((ds) => ds.id === params.dataSetId);
  if (!dataSet) {
    return {
      project,
      result: { success: false, description: `DataSet "${params.dataSetId}" not found on screen ${params.screenId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const hasData = params.data !== undefined;
  const hasName = params.name !== undefined;
  const hasDesc = params.description !== undefined;
  if (!hasData && !hasName && !hasDesc) {
    return {
      project,
      result: { success: false, description: 'updateDataSet requires at least one of data, name, description', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldData = deepClone(dataSet.data);
  const oldName = dataSet.name;
  const oldDesc = dataSet.description;

  if (hasData) dataSet.data = params.data!;
  if (hasName) dataSet.name = params.name!;
  if (hasDesc) dataSet.description = params.description;

  newProject.updatedAt = new Date().toISOString();

  const inverseParams: UpdateDataSetOp['params'] = {
    screenId: params.screenId,
    dataSetId: params.dataSetId,
  };
  if (hasData) inverseParams.data = oldData;
  if (hasName) inverseParams.name = oldName;
  if (hasDesc) inverseParams.description = oldDesc;

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated data set "${dataSet.name}" on screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'updateDataSet',
      params: inverseParams,
    },
  };
}

// ===== switchDataSet =====

export function executeSwitchDataSet(
  project: DesignProject,
  params: SwitchDataSetOp['params'],
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

  // Validate the target data set exists
  if (!screen.dataSets.some((ds) => ds.id === params.dataSetId)) {
    return {
      project,
      result: { success: false, description: `DataSet "${params.dataSetId}" not found on screen ${params.screenId}`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const oldActiveDataSetId = screen.activeDataSetId;
  screen.activeDataSetId = params.dataSetId;

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Switched active data set to "${params.dataSetId}" on screen ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'switchDataSet',
      params: {
        screenId: params.screenId,
        dataSetId: oldActiveDataSetId,
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

  // Save old prop value for inverse
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
