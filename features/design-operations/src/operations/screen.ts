import type { DesignProject } from '@globallink/design-schema';
import { deepClone, generateScreenId, generateNodeId } from '@globallink/design-schema';
import type {
  ScreenAddOp,
  ScreenRemoveOp,
  ScreenSetActiveOp,
  ScreenRenameOp,
  ScreenReorderOp,
  OperationResult,
  InverseData,
} from '../types';

type Result = { project: DesignProject; result: OperationResult; inverse: InverseData };

// ===== screen.add =====

export function executeAddScreen(project: DesignProject, params: ScreenAddOp['params']): Result {
  const newProject = deepClone(project);

  const screenId = params.screenId ?? generateScreenId();
  const rootNodeId = params.rootNodeId ?? generateNodeId();
  params.screenId = screenId;
  params.rootNodeId = rootNodeId;

  const newScreen = {
    id: screenId,
    name: params.name,
    rootNode: {
      id: rootNodeId,
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
    },
    dataSources: [],
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
      type: 'screen.remove',
      params: { screenId: newScreen.id },
    },
  };
}

// ===== screen.remove =====

export function executeRemoveScreen(project: DesignProject, params: ScreenRemoveOp['params']): Result {
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

// ===== screen.setActive =====

/**
 * UI 概念：DesignProject 不含 activeScreenId；本 op 仅记录 intent，
 * 真正的 active 屏由前端 editor.store 维护。这里做存在性校验后返回 success。
 */
export function executeSetActiveScreen(project: DesignProject, params: ScreenSetActiveOp['params']): Result {
  const screenExists = project.screens.some((s) => s.id === params.screenId);

  if (!screenExists) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  return {
    project,
    result: {
      success: true,
      description: `Set active screen to ${params.screenId}`,
      affectedNodeIds: [params.screenId],
    },
    inverse: { type: 'noop', params: {} },
  };
}

// ===== screen.rename =====

export function executeRenameScreen(project: DesignProject, params: ScreenRenameOp['params']): Result {
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
      type: 'screen.rename',
      params: { screenId: params.screenId, name: oldName },
    },
  };
}

// ===== screen.reorder =====

export function executeReorderScreen(project: DesignProject, params: ScreenReorderOp['params']): Result {
  const newProject = deepClone(project);
  const currentIndex = newProject.screens.findIndex((s) => s.id === params.screenId);

  if (currentIndex === -1) {
    return {
      project,
      result: { success: false, description: `Screen ${params.screenId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

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
      type: 'screen.reorder',
      params: { screenId: params.screenId, newIndex: currentIndex },
    },
  };
}
