import { z } from 'zod';

// ===== Props Validators =====

export const PropTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'enum',
  'color',
  'image',
  'url',
  'action',
  'textarea',
  'options',
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
