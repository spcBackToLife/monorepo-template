import { z } from 'zod';

// ===== Domain State Validators =====

export const DomainStateValueSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export const DomainStateVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  values: z.array(DomainStateValueSchema).min(1),
  defaultValue: z.string(),
  currentPreviewValue: z.string().optional(),
  source: z.enum(['manual', 'dataSource']).optional(),
  dataSourceId: z.string().optional(),
}).refine(
  (data) => data.values.some((v) => v.value === data.defaultValue),
  { message: 'defaultValue must be one of the defined values' },
);

export const DomainStateBindingSchema = z.object({
  variableName: z.string().min(1),
  ownerNodeId: z.string().optional(),
  value: z.string().min(1),
  styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  visible: z.boolean().optional(),
  childrenVisibility: z.record(z.string(), z.boolean()).optional(),
  disabledEvents: z.array(z.string()).optional(),
});

// ===== Environment State Validators =====

export const EnvironmentVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  values: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).min(1),
  defaultValue: z.string(),
  currentPreviewValue: z.string().optional(),
}).refine(
  (data) => data.values.some((v) => v.value === data.defaultValue),
  { message: 'defaultValue must be one of the defined values' },
);

export const EnvironmentStateBindingSchema = z.object({
  variableName: z.string().min(1),
  value: z.string().min(1),
  styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  visible: z.boolean().optional(),
});

// ===== Props Validators =====

export const PropTypeSchema = z.enum([
  'string', 'number', 'boolean', 'enum', 'color',
  'image', 'url', 'action', 'textarea', 'options',
]);

export const ComponentPropDefinitionSchema = z.object({
  key: z.string().min(1),
  type: PropTypeSchema,
  label: z.string().min(1),
  defaultValue: z.unknown(),
  group: z.string().optional(),
  description: z.string().optional(),
  enumValues: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

export const PropBindingSchema = z.object({
  propKey: z.string().min(1),
  targetNodePath: z.string().min(1),
  targetField: z.enum(['props', 'styles', 'children']),
  targetKey: z.string().min(1),
});
