import type { DesignProject } from '@globallink/design-schema';
import { deepClone, generateScreenId, generateNodeId } from '@globallink/design-schema';
import type {
  AddScreenOp,
  RemoveScreenOp,
  SetActiveScreenOp,
  RenameScreenOp,
  ReorderScreenOp,
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
      locked: false,
      visible: true,
      globalStateBindings: [],
    },
    globalStates: [],
    dataSets: [],
    activeDataSetId: '',
  };
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

// ===== renameScreen =====

export function executeRenameScreen(
  project: DesignProject,
  params: RenameScreenOp['params'],
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

  const oldName = screen.name;
  const nextName = params.name.trim();
  if (!nextName) {
    return {
      project,
      result: { success: false, description: 'Screen name cannot be empty', affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  screen.name = nextName;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Renamed screen to "${nextName}"`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'renameScreen',
      params: { screenId: params.screenId, name: oldName },
    },
  };
}

// ===== reorderScreen =====

export function executeReorderScreen(
  project: DesignProject,
  params: ReorderScreenOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const currentIndex = newProject.screens.findIndex((s) => s.id === params.screenId);

  if (currentIndex === -1) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Remove from current position and insert at new position
  const [screen] = newProject.screens.splice(currentIndex, 1);
  const clampedIndex = Math.min(params.newIndex, newProject.screens.length);
  newProject.screens.splice(clampedIndex, 0, screen);

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Reordered screen "${screen.name}" from index ${currentIndex} to ${clampedIndex}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: {
      type: 'reorderScreen',
      params: {
        screenId: params.screenId,
        newIndex: currentIndex,
      },
    },
  };
}
