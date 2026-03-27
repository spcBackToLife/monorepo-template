import { z } from 'zod';

// ===== Component State Schema =====

const ComponentStateSchema = z.object({
  name: z.string().min(1),
  styles: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  props: z.record(z.string(), z.unknown()).optional(),
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

const CustomActionSchema = z.object({
  type: z.literal('custom'),
  handler: z.string().min(1),
});

const EventActionSchema = z.discriminatedUnion('type', [
  NavigateActionSchema,
  SetStateActionSchema,
  OpenUrlActionSchema,
  CustomActionSchema,
]);

// ===== Component Event Schema =====

const ComponentEventSchema = z.object({
  trigger: z.enum(['click', 'hover', 'focus', 'blur', 'longPress']),
  action: EventActionSchema,
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
