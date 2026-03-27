import type { DesignProject } from '@globallink/design-schema';
import { deepClone, generateScreenId, generateNodeId } from '@globallink/design-schema';
import type {
  AddScreenOp,
  RemoveScreenOp,
  SetActiveScreenOp,
  OperationResult,
  InverseData,
} from '../types';

// ===== addScreen =====

export function executeAddScreen(
  project: DesignProject,
  params: AddScreenOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const newScreen = {
    id: generateScreenId(),
    name: params.name,
    rootNode: {
      id: generateNodeId(),
      type: 'div' as const,
      styles: {
        display: 'flex',
        flexDirection: 'column' as string,
        width: '100%',
        minHeight: '100%',
      },
      children: [],
      props: {},
      states: [],
      activeState: 'default',
      events: [],
    },
  };

  newProject.screens.push(newScreen);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added screen "${params.name}"`,
      affectedNodeIds: [newScreen.id],
    },
    inverse: {
      type: 'removeScreen',
      params: { screenId: newScreen.id },
    },
  };
}

// ===== removeScreen =====

export function executeRemoveScreen(
  project: DesignProject,
  params: RemoveScreenOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const screenIndex = newProject.screens.findIndex((s) => s.id === params.screenId);

  if (screenIndex === -1) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  if (newProject.screens.length <= 1) {
    return {
      project,
      result: { success: false, description: 'Cannot remove the last screen', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const [removedScreen] = newProject.screens.splice(screenIndex, 1);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Removed screen "${removedScreen.name}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: '_restoreScreen',
      params: {
        screen: removedScreen,
        position: screenIndex,
      },
    },
  };
}

// ===== setActiveScreen =====

/**
 * Note: "active screen" is a UI concept. We track it by convention as a lightweight
 * metadata field. Since DesignProject doesn't have an explicit activeScreenId field,
 * this operation is a no-op at the data level but records the intent for the frontend
 * to consume via the operation result.
 *
 * In practice the frontend editor.store handles active screen state.
 * This operation exists so it can be issued by AI / MCP and recorded in the operation log.
 */
export function executeSetActiveScreen(
  project: DesignProject,
  params: SetActiveScreenOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const screenExists = project.screens.some((s) => s.id === params.screenId);

  if (!screenExists) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // This is a UI-only operation - project data doesn't change
  return {
    project,
    result: {
      success: true,
      description: `Set active screen to ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'noop',
      params: {},
    },
  };
}
