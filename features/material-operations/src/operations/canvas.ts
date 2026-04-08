/**
 * 画布操作：setBackgroundColor, resizeCanvas, resizeReferenceFrame
 */

import type { MaterialProjectSchema } from '../schema';
import type {
  SetBackgroundColorOp,
  ResizeCanvasOp,
  ResizeReferenceFrameOp,
  OperationResult,
  InverseData,
} from '../types';
import { deepClone } from '../utils';

type ExecResult = { project: MaterialProjectSchema; result: OperationResult; inverse: InverseData };

// ===== setBackgroundColor =====

export function executeSetBackgroundColor(
  project: MaterialProjectSchema,
  params: SetBackgroundColorOp['params'],
): ExecResult {
  const newProject = deepClone(project);
  const oldColor = newProject.backgroundColor;
  newProject.backgroundColor = params.color;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Set background color to ${params.color}`,
      affectedObjectIds: [],
    },
    inverse: {
      type: 'me:setBackgroundColor',
      params: { color: oldColor },
    },
  };
}

// ===== resizeCanvas =====

export function executeResizeCanvas(
  project: MaterialProjectSchema,
  params: ResizeCanvasOp['params'],
): ExecResult {
  const newProject = deepClone(project);
  const oldWidth = newProject.canvasWidth;
  const oldHeight = newProject.canvasHeight;

  newProject.canvasWidth = params.width;
  newProject.canvasHeight = params.height;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Resized canvas to ${params.width}×${params.height}`,
      affectedObjectIds: [],
    },
    inverse: {
      type: 'me:resizeCanvas',
      params: { width: oldWidth, height: oldHeight },
    },
  };
}

// ===== resizeReferenceFrame =====

export function executeResizeReferenceFrame(
  project: MaterialProjectSchema,
  params: ResizeReferenceFrameOp['params'],
): ExecResult {
  const newProject = deepClone(project);
  const oldWidth = newProject.referenceFrame.width;
  const oldHeight = newProject.referenceFrame.height;

  newProject.referenceFrame.width = params.width;
  newProject.referenceFrame.height = params.height;
  newProject.version++;
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Resized reference frame to ${params.width}×${params.height}`,
      affectedObjectIds: [],
    },
    inverse: {
      type: 'me:resizeReferenceFrame',
      params: { width: oldWidth, height: oldHeight },
    },
  };
}
