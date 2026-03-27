import type { DesignProject } from '@globallink/design-schema';
import { deepClone } from '@globallink/design-schema';
import type {
  SwitchViewportOp,
  AddViewportPresetOp,
  OperationResult,
  InverseData,
} from '../types';

// ===== switchViewport =====

export function executeSwitchViewport(
  project: DesignProject,
  params: SwitchViewportOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);
  const oldViewport = { ...newProject.currentViewport };

  newProject.currentViewport = params.viewport;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Switched viewport to ${params.viewport.name} (${params.viewport.width}x${params.viewport.height})`,
      affectedNodeIds: [],
    },
    inverse: {
      type: 'switchViewport',
      params: { viewport: oldViewport },
    },
  };
}

// ===== addViewportPreset =====

export function executeAddViewportPreset(
  project: DesignProject,
  params: AddViewportPresetOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  // Check for duplicate
  const exists = newProject.viewportPresets.some(
    (v) => v.name === params.viewport.name && v.width === params.viewport.width && v.height === params.viewport.height,
  );

  if (exists) {
    return {
      project,
      result: { success: false, description: `Viewport preset "${params.viewport.name}" already exists`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  newProject.viewportPresets.push(params.viewport);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Added viewport preset "${params.viewport.name}"`,
      affectedNodeIds: [],
    },
    inverse: {
      type: '_removeViewportPreset',
      params: { viewport: params.viewport },
    },
  };
}
