import { z } from 'zod';
import { ComponentPropDefinitionSchema, PropBindingSchema } from './props';
import { DataSourceSchema } from './data';
import { ComponentEventSchema } from './action';
import { ScreenStateInitSchema, GlobalStateInitSchema } from './state';

// ===== VisualState Schema (节点视觉态) =====
//
// CSS 值此处宽容地接受 string | number | undefined（含表达式字符串），
// 表达式语法在运行时由 evaluateExpression 解析。
const cssValueSchema = z.union([z.string(), z.number()]);

const VisualStateSchema = z.object({
  name: z.string().min(1),
  styles: z.record(z.string(), cssValueSchema).default({}),
  props: z.record(z.string(), z.unknown()).optional(),
  transition: z
    .object({
      duration: z.number().positive().optional(),
      easing: z.string().optional(),
      properties: z.array(z.string()).optional(),
    })
    .optional(),
  childrenStates: z.record(z.string(), z.string()).optional(),
  childrenVisibility: z.record(z.string(), z.boolean()).optional(),
  disabledEvents: z.array(z.string()).optional(),
  /**
   * v3 ★ 业务态自动激活表达式（如 `{{ state.view.loginMode === 'code' }}`）。
   * SchemaRenderer 在 Layer 1.5 扫描所有 visualState，遇 activeWhen 求值为 true 即激活该态。
   * 与 DOM 事件态（hover/pressed/focus）正交：interaction state 优先，未触发时 activeWhen 兜底。
   */
  activeWhen: z.string().optional(),
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

// ===== Component Node Schema (recursive, v2) =====

const BaseComponentNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  name: z.string().optional(),
  // styles 在 v2 中允许字符串/数字（含表达式字符串）
  styles: z.record(z.string(), cssValueSchema).default({}),
  props: z.record(z.string(), z.unknown()).default({}),
  states: z.array(VisualStateSchema).default([]),
  activeState: z.string().default('default'),
  events: z.array(ComponentEventSchema).default([]),
  constraints: LayoutConstraintsSchema,
  templateRef: TemplateRefSchema,
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  // v2 新字段
  visibleWhen: z.string().optional(),
  // v2.1 列表绑定 —— { expression, template }
  // repeat 的 template 同样是 ComponentNode；递归引用通过下面 z.lazy(ComponentNodeSchema) 兜底。
  bind: z.object({ path: z.string().min(1) }).optional(),
  // 编辑器 metadata
  editorMetadata: z
    .object({
      role: z.enum(['scroll-container', 'sticky-bottom', 'sticky-top']).optional(),
    })
    .optional(),
  // 动画 / 素材
  animation: z.unknown().optional(),
  materialProjectId: z.string().optional(),
});

type ComponentNodeInput = z.input<typeof BaseComponentNodeSchema> & {
  children?: ComponentNodeInput[];
  repeat?: { expression: string; template: ComponentNodeInput } | string;
};

export const ComponentNodeSchema: z.ZodType<ComponentNodeInput> = BaseComponentNodeSchema.extend({
  children: z.lazy(() => z.array(ComponentNodeSchema)).optional(),
  // 读入期接受两种形态：
  //   - v2.1 规范形态 `{ expression, template }`
  //   - v2.0 遗留字符串（serialization.normalizeNode 会再自愈）
  // 迁移完所有项目数据后，请删除 `z.string()` 分支（AGENTS.md §9.2 一次性迁移窗口）。
  repeat: z.lazy(() =>
    z.union([
      z.object({
        expression: z.string().min(1),
        template: ComponentNodeSchema,
      }),
      z.string(),
    ]),
  ).optional(),
});

// ===== Screen Schema =====

export const ScreenSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rootNode: ComponentNodeSchema,
  backgroundColor: z.string().optional(),
  dataSources: z.array(DataSourceSchema).default([]),
  stateInit: ScreenStateInitSchema.optional(),
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
  globalStateInit: GlobalStateInitSchema.optional(),
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

// ===== Re-export ComponentEventSchema =====
export { ComponentEventSchema };
