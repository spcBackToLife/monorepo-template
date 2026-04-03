import type { DesignProject, ComponentTemplate, PropBinding } from '@globallink/design-schema';
import { deepClone, PropBindingSchema } from '@globallink/design-schema';
import type {
  UpdateTemplateOp,
  DeleteTemplateOp,
  DuplicateTemplateOp,
  OperationResult,
  InverseData,
} from '../types';

// ===== updateTemplate =====

export function executeUpdateTemplate(
  project: DesignProject,
  params: UpdateTemplateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const template = newProject.componentAssets.find((t) => t.id === params.templateId);
  if (!template) {
    return {
      project,
      result: { success: false, description: `Template ${params.templateId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  // Save old values for inverse
  const oldValues: Record<string, unknown> = {};
  let changed = false;

  if (params.patch.name !== undefined) {
    oldValues.name = template.name;
    template.name = params.patch.name;
    changed = true;
  }
  if (params.patch.category !== undefined) {
    oldValues.category = template.category;
    template.category = params.patch.category;
    changed = true;
  }
  if (params.patch.tags !== undefined) {
    oldValues.tags = template.tags ? [...template.tags] : undefined;
    template.tags = params.patch.tags;
    changed = true;
  }
  if (params.patch.description !== undefined) {
    oldValues.description = template.description;
    template.description = params.patch.description;
    changed = true;
  }
  if (params.patch.thumbnail !== undefined) {
    oldValues.thumbnail = template.thumbnail;
    const t = params.patch.thumbnail.trim();
    template.thumbnail = t.length > 0 ? t : undefined;
    changed = true;
  }
  if (params.patch.propBindings !== undefined) {
    const next: PropBinding[] = [];
    for (let i = 0; i < params.patch.propBindings.length; i++) {
      const r = PropBindingSchema.safeParse(params.patch.propBindings[i]);
      if (!r.success) {
        return {
          project,
          result: {
            success: false,
            description: `propBindings[${i}] 校验失败: ${r.error.message}`,
            affectedNodeIds: [],
          },
          inverse: { type: 'noop', params: {} },
        };
      }
      next.push(r.data);
    }
    oldValues.propBindings = template.propBindings ? [...template.propBindings] : [];
    template.propBindings = next;
    changed = true;
  }

  if (changed) {
    oldValues.version = template.version;
    oldValues.updatedAt = template.updatedAt;
    template.version = (template.version ?? 0) + 1;
    template.updatedAt = new Date().toISOString();
  }

  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Updated template "${template.name}" (${params.templateId})`,
      affectedNodeIds: [params.templateId],
    },
    inverse: {
      type: 'updateTemplate',
      params: { templateId: params.templateId, patch: oldValues },
    },
  };
}

// ===== deleteTemplate =====

export function executeDeleteTemplate(
  project: DesignProject,
  params: DeleteTemplateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const idx = newProject.componentAssets.findIndex((t) => t.id === params.templateId);
  if (idx === -1) {
    return {
      project,
      result: { success: false, description: `Template ${params.templateId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const removedTemplate = newProject.componentAssets.splice(idx, 1)[0];
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Deleted template "${removedTemplate.name}" (${params.templateId})`,
      affectedNodeIds: [params.templateId],
    },
    inverse: {
      type: '_restoreDeletedTemplate',
      params: { template: removedTemplate, position: idx },
    },
  };
}

// ===== duplicateTemplate =====

export function executeDuplicateTemplate(
  project: DesignProject,
  params: DuplicateTemplateOp['params'],
): { project: DesignProject; result: OperationResult; inverse: InverseData } {
  const newProject = deepClone(project);

  const source = newProject.componentAssets.find((t) => t.id === params.sourceTemplateId);
  if (!source) {
    return {
      project,
      result: { success: false, description: `Source template ${params.sourceTemplateId} not found`, affectedNodeIds: [] },
      inverse: { type: 'noop', params: {} },
    };
  }

  const cloned: ComponentTemplate = deepClone(source);
  cloned.id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  cloned.name = params.newName ?? `${source.name} (Copy)`;
  cloned.version = 1;
  cloned.createdAt = new Date().toISOString();
  cloned.updatedAt = new Date().toISOString();

  newProject.componentAssets.push(cloned);
  newProject.updatedAt = new Date().toISOString();

  return {
    project: newProject,
    result: {
      success: true,
      description: `Duplicated template "${source.name}" as "${cloned.name}"`,
      affectedNodeIds: [cloned.id],
    },
    inverse: {
      type: 'deleteTemplate',
      params: { templateId: cloned.id },
    },
  };
}
