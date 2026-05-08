/**
 * Operation 联合 + Result + InverseData + Description 元类型。
 *
 * 各域 op 子集分文件定义；本文件聚合并导出。
 */

import type { ElementOperation } from './element';
import type { StyleOperation } from './style';
import type { VisualStateOperation } from './visual-state';
import type { EventOperation } from './event';
import type {
  ScreenOperation,
  ViewportOperation,
  AssetOperation,
  TemplateOperation,
  ComponentPropsOperation,
  AnnotationOperation,
  MaterialOperation,
} from './misc';
import type { DataSourceOperation } from './data-source';
import type { ScreenStateOperation } from './screen-state';
import type { GlobalStateOperation } from './global-state';

// ===== Operation 联合 =====

export type Operation =
  | ElementOperation
  | StyleOperation
  | VisualStateOperation
  | EventOperation
  | ScreenOperation
  | ViewportOperation
  | AssetOperation
  | TemplateOperation
  | ComponentPropsOperation
  | AnnotationOperation
  | MaterialOperation
  | DataSourceOperation
  | ScreenStateOperation
  | GlobalStateOperation;

export type OperationType = Operation['type'];

// ===== Operation Result =====

export interface OperationResult {
  success: boolean;
  description: string;
  affectedNodeIds: string[];
}

// ===== Inverse Data =====

/** 与一条 op 配对存放，用于 undo */
export interface InverseData {
  type: string;
  params: Record<string, unknown>;
}

// ===== Operation Description (for MCP / AI) =====

export interface OperationParamSchema {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface OperationDescription {
  type: OperationType;
  description: string;
  category: string;
  params: OperationParamSchema[];
}

// ===== Re-export 各域类型（便于外部 import） =====

export type * from './element';
export type * from './style';
export type * from './visual-state';
export type * from './event';
export type * from './misc';
export type * from './data-source';
export type * from './screen-state';
export type * from './global-state';
