/**
 * Screen / Viewport / Asset / Template / Annotation / Material / Component-Props
 * 这些域无 v1 状态字段直接相关，op 类型保持原结构、仅命名改 dot-namespace。
 */

import type {
  Viewport,
  TemplateScope,
  PropBinding,
  CSSProperties,
} from '@globallink/design-schema';

// ========== Screen ==========

export interface ScreenAddOp {
  type: 'screen.add';
  params: {
    name: string;
    /** Pre-generated IDs for deterministic replay */
    screenId?: string;
    rootNodeId?: string;
  };
}

export interface ScreenRemoveOp {
  type: 'screen.remove';
  params: { screenId: string };
}

export interface ScreenSetActiveOp {
  type: 'screen.setActive';
  params: { screenId: string };
}

export interface ScreenRenameOp {
  type: 'screen.rename';
  params: { screenId: string; name: string };
}

export interface ScreenReorderOp {
  type: 'screen.reorder';
  params: { screenId: string; newIndex: number };
}

export type ScreenOperation =
  | ScreenAddOp
  | ScreenRemoveOp
  | ScreenSetActiveOp
  | ScreenRenameOp
  | ScreenReorderOp;

// ========== Viewport ==========

export interface ViewportSwitchOp {
  type: 'viewport.switch';
  params: { viewport: Viewport };
}

export interface ViewportAddPresetOp {
  type: 'viewport.addPreset';
  params: { viewport: Viewport };
}

export type ViewportOperation = ViewportSwitchOp | ViewportAddPresetOp;

// ========== Asset / Template Instance ==========

export interface AssetInstantiateTemplateOp {
  type: 'asset.instantiateTemplate';
  params: {
    templateId: string;
    parentId: string;
    position?: number;
    mode?: 'reference' | 'detached';
    /** DFS 顺序的节点 ID 序列（含 root），由 ensureDeterministicIds 预生成 */
    _nodeIds?: string[];
  };
}

export interface AssetSaveAsTemplateOp {
  type: 'asset.saveAsTemplate';
  params: {
    nodeId: string;
    name: string;
    category: string;
    tags?: string[];
    description?: string;
    scope?: TemplateScope;
    templateId?: string;
  };
}

export interface AssetDetachInstanceOp {
  type: 'asset.detachInstance';
  params: { nodeId: string };
}

export interface AssetSyncInstanceOp {
  type: 'asset.syncInstance';
  params: { nodeId: string };
}

export type AssetOperation =
  | AssetInstantiateTemplateOp
  | AssetSaveAsTemplateOp
  | AssetDetachInstanceOp
  | AssetSyncInstanceOp;

// ========== Template (CRUD) ==========

export interface TemplateUpdateOp {
  type: 'template.update';
  params: {
    templateId: string;
    patch: {
      name?: string;
      category?: string;
      tags?: string[];
      description?: string;
      thumbnail?: string;
      propBindings?: PropBinding[];
    };
  };
}

export interface TemplateDeleteOp {
  type: 'template.delete';
  params: { templateId: string };
}

export interface TemplateDuplicateOp {
  type: 'template.duplicate';
  params: { sourceTemplateId: string; newName?: string };
}

export type TemplateOperation =
  | TemplateUpdateOp
  | TemplateDeleteOp
  | TemplateDuplicateOp;

// ========== Component Props (template & instance) ==========

export interface ComponentPropsUpdateOp {
  type: 'componentProps.update';
  params: {
    nodeId: string;
    props: Record<string, unknown>;
  };
}

export interface ComponentPropsAddDefinitionOp {
  type: 'componentProps.addDefinition';
  params: {
    templateId: string;
    definition: {
      key: string;
      type: string;
      label: string;
      defaultValue: unknown;
      group?: string;
      description?: string;
      enumValues?: string[];
      required?: boolean;
    };
  };
}

export interface ComponentPropsRemoveDefinitionOp {
  type: 'componentProps.removeDefinition';
  params: {
    templateId: string;
    propKey: string;
  };
}

export type ComponentPropsOperation =
  | ComponentPropsUpdateOp
  | ComponentPropsAddDefinitionOp
  | ComponentPropsRemoveDefinitionOp;

// ========== Annotation ==========

export interface AnnotationAddOp {
  type: 'annotation.add';
  params: {
    parentId: string;
    content: string;
    author?: string;
    styles?: Partial<CSSProperties>;
    position?: number;
  };
}

export interface AnnotationRemoveOp {
  type: 'annotation.remove';
  params: { annotationId: string };
}

export type AnnotationOperation = AnnotationAddOp | AnnotationRemoveOp;

// ========== Material ==========

export interface MaterialApplyDesignOp {
  type: 'material.applyDesign';
  params: {
    nodeId: string;
    /** Batch style updates (gradient, shadow, filter, animation, etc.) */
    styleUpdates?: Partial<CSSProperties>;
    /** 在写入 styleUpdates 之前删除这些键，撤销时自动恢复原值 */
    clearStyleKeys?: string[];
    propUpdates?: Record<string, unknown>;
    materialProjectId?: string;
  };
}

export type MaterialOperation = MaterialApplyDesignOp;
