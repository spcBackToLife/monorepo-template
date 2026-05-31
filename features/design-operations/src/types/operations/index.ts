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
import type { MetaOperation } from './meta';
import type { ProjectOperation } from './project';

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
  | GlobalStateOperation
  | MetaOperation
  | ProjectOperation;

export type OperationType = Operation['type'];

// ===== Operation Result =====

export interface OperationResult {
  success: boolean;
  description: string;
  affectedNodeIds: string[];
  /**
   * Expression Lint v1.0 ★：表达式校验失败时挂载结构化 issues（含 errorCode / hint /
   * suggestedFix / specRef），供 MCP / AI / 编辑器消费。
   *
   * - success=false 时，issues 是 op 失败的原因
   * - success=true  时，可能含 warning 级 issue（lint 不拒，仅提示）
   *
   * 形态对齐 features/design-engine/src/expression/walker.ts 的 ExpressionFieldRef[]。
   */
  issues?: Array<{
    nodeId?: string;
    screenId?: string;
    fieldPath: string;
    rawValue: string;
    issues: Array<{
      code: string;
      level: 'error' | 'warning';
      message: string;
      pos?: { start: number; end: number };
      specRef?: string;
      hint?: string;
      suggestedFix?: string;
    }>;
  }>;
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
export type * from './meta';
export type * from './project';
