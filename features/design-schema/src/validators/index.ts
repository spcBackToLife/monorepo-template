import { z } from 'zod';
import {
  DomainStateVariableSchema,
  DomainStateBindingSchema,
  EnvironmentVariableSchema,
  EnvironmentStateBindingSchema,
  ComponentPropDefinitionSchema,
  PropBindingSchema,
} from './props';
import { DataSourceSchema } from './data';

// ===== Component State Schema =====

const ComponentStateSchema = z.object({
  name: z.string().min(1),
  styles: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  props: z.record(z.string(), z.unknown()).optional(),
  transition: z
    .object({
      duration: z.number().positive().optional(),
      easing: z.string().optional(),
      properties: z.array(z.string()).optional(),
    })
    .optional(),
  childrenVisibility: z.record(z.string(), z.boolean()).optional(),
  disabledEvents: z.array(z.string()).optional(),
});

// ===== Transition Animation Schema =====

const TransitionAnimationSchema = z.object({
  type: z.enum(['fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'none']),
  duration: z.number().positive().optional(),
  easing: z.string().optional(),
});

// ===== Event Action Schemas =====

const NavigateActionSchema = z.object({
  type: z.literal('navigate'),
  targetScreenId: z.string().min(1),
  animation: TransitionAnimationSchema.optional(),
});

const SetStateActionSchema = z.object({
  type: z.literal('setState'),
  targetId: z.string().min(1),
  state: z.string().min(1),
});

const OpenUrlActionSchema = z.object({
  type: z.literal('openUrl'),
  url: z.string().url(),
});

const DelayActionSchema = z.object({
  type: z.literal('delay'),
  duration: z.number().positive(),
});

const CustomActionSchema = z.object({
  type: z.literal('custom'),
  handler: z.string().min(1),
});

const SetDomainStateActionSchema = z.object({
  type: z.literal('setDomainState'),
  variableName: z.string().min(1),
  value: z.string().min(1),
});

const SetEnvironmentStateActionSchema = z.object({
  type: z.literal('setEnvironmentState'),
  variableName: z.string().min(1),
  value: z.string().min(1),
});

const ToggleVisibleActionSchema = z.object({
  type: z.literal('toggleVisible'),
  targetId: z.string().min(1),
});

const EventActionSchema = z.discriminatedUnion('type', [
  NavigateActionSchema,
  SetStateActionSchema,
  OpenUrlActionSchema,
  DelayActionSchema,
  CustomActionSchema,
  SetDomainStateActionSchema,
  SetEnvironmentStateActionSchema,
  ToggleVisibleActionSchema,
]);

const EventConditionSchema = z.object({
  type: z.enum(['domainState', 'environmentState', 'dataBinding', 'propValue']),
  variableName: z.string().min(1),
  value: z.string().min(1),
});

// ===== Component Event Schema =====

export const ComponentEventSchema = z.object({
  trigger: z.enum(['click', 'hover', 'focus', 'blur', 'longPress']),
  actions: z.array(EventActionSchema).min(1),
  condition: EventConditionSchema.optional(),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
});

// ===== Layout Constraints Schema =====

const LayoutConstraintsSchema = z
  .object({
    horizontal: z.enum(['left', 'right', 'center', 'stretch', 'scale']).optional(),
    vertical: z.enum(['top', 'bottom', 'center', 'stretch', 'scale']).optional(),
    fixed: z.boolean().optional(),
  })
  .optional();

// ===== Template Ref Schema =====

const TemplateRefSchema = z
  .object({
    templateId: z.string().min(1),
    mode: z.enum(['reference', 'detached']),
  })
  .optional();

// ===== Node Type Schema =====

const PrimitiveNodeTypeSchema = z.enum([
  'div', 'span', 'p', 'h1', 'h2', 'h3',
  'button', 'input', 'textarea', 'select',
  'img', 'a', 'ul', 'ol', 'li',
  'nav', 'header', 'footer', 'section', 'main',
  'annotation',
]);

const NodeTypeSchema = z.union([
  PrimitiveNodeTypeSchema,
  z.string().regex(/^component:.+$/),
]);

// ===== Component Node Schema (recursive) =====

const BaseComponentNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  name: z.string().optional(),
  styles: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  props: z.record(z.string(), z.unknown()).default({}),
  states: z.array(ComponentStateSchema).default([]),
  activeState: z.string().default('default'),
  events: z.array(ComponentEventSchema).default([]),
  constraints: LayoutConstraintsSchema,
  templateRef: TemplateRefSchema,
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  domainStates: z.array(DomainStateVariableSchema).optional(),
  domainStateBindings: z.array(DomainStateBindingSchema).optional(),
  environmentBindings: z.array(EnvironmentStateBindingSchema).optional(),
});

type ComponentNodeInput = z.input<typeof BaseComponentNodeSchema> & {
  children?: ComponentNodeInput[];
};

export const ComponentNodeSchema: z.ZodType<ComponentNodeInput> = BaseComponentNodeSchema.extend({
  children: z.lazy(() => z.array(ComponentNodeSchema)).optional(),
});

// ===== Screen Schema =====

export const ScreenSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rootNode: ComponentNodeSchema,
  backgroundColor: z.string().optional(),
  domainStates: z.array(DomainStateVariableSchema).default([]),
  dataSources: z.array(DataSourceSchema).default([]),
});

// ===== Viewport Schema =====

export const ViewportSchema = z.object({
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  devicePixelRatio: z.number().positive().optional(),
  platform: z.enum(['pc', 'mobile', 'tablet']),
});

// ===== Component Template Schema =====

export const ComponentTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().optional(),
  schema: ComponentNodeSchema,
  scope: z.enum(['project', 'team', 'global']),
  kind: z.enum(['skeleton', 'styled']).default('styled'),
  propDefinitions: z.array(ComponentPropDefinitionSchema).default([]),
  propBindings: z.array(PropBindingSchema).default([]),
  version: z.number().int().nonnegative().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ===== Design Project Schema =====

export const DesignProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  platform: z.enum(['pc', 'mobile']),
  defaultViewport: ViewportSchema,
  currentViewport: ViewportSchema,
  viewportPresets: z.array(ViewportSchema).default([]),
  screens: z.array(ScreenSchema).min(1),
  componentAssets: z.array(ComponentTemplateSchema).default([]),
  environmentStates: z.array(EnvironmentVariableSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ===== Validation Result =====

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

// ===== Validation Functions =====

/** Validate a ComponentNode tree */
export function validateNode(data: unknown): ValidationResult<ComponentNodeInput> {
  const result = ComponentNodeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/** Validate a Screen */
export function validateScreen(data: unknown): ValidationResult<z.infer<typeof ScreenSchema>> {
  const result = ScreenSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/** Validate a DesignProject */
export function validateProject(data: unknown): ValidationResult<z.infer<typeof DesignProjectSchema>> {
  const result = DesignProjectSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/** Validate a Viewport */
export function validateViewport(data: unknown): ValidationResult<z.infer<typeof ViewportSchema>> {
  const result = ViewportSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/** Validate a ComponentTemplate */
export function validateTemplate(data: unknown): ValidationResult<z.infer<typeof ComponentTemplateSchema>> {
  const result = ComponentTemplateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
