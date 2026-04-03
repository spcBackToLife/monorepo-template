import { z } from 'zod';

// ===== DataSource Validators =====

export const DataFieldSchema = z.object({
  path: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  label: z.string().optional(),
});

export const DataSchemaSchema = z.object({
  fields: z.array(DataFieldSchema),
});

export const DataSourcePhaseSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
});

export const DataScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  isDefault: z.boolean().optional(),
});

export const DataSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  lifecycle: z.enum(['api', 'static']),
  phases: z.array(DataSourcePhaseSchema).default([]),
  activePhase: z.string().default('loaded'),
  scenarios: z.array(DataScenarioSchema).default([]),
  activeScenarioId: z.string().default(''),
  schema: DataSchemaSchema.optional(),
});
