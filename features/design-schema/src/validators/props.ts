import { z } from 'zod';

// ===== Global State Validators =====

export const GlobalStateVariableSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string()).min(1),
  defaultValue: z.string(),
  description: z.string().optional(),
}).refine(
  (data) => data.values.includes(data.defaultValue),
  { message: 'defaultValue must be one of the defined values' },
);

export const GlobalStateBindingSchema = z.object({
  id: z.string().min(1),
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
