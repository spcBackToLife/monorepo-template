import { z } from 'zod';

// ===== EffectStatus =====

export const EffectStatusSchema = z.object({
  status: z.enum(['idle', 'pending', 'success', 'error']),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.union([z.string(), z.number()]).optional(),
      message: z.string(),
    })
    .optional(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
});

// ===== ScreenState (运行时容器；通常不直接序列化) =====

export const ScreenStateSchema = z.object({
  data: z.record(z.string(), z.unknown()).default({}),
  view: z.record(z.string(), z.unknown()).default({}),
  effects: z.record(z.string(), EffectStatusSchema).default({}),
});

// ===== ViewVariableDef =====

export const ViewVariableDefSchema = z.object({
  name: z.string().min(1),
  label: z.string().optional(),
  defaultValue: z.unknown(),
  enum: z
    .array(
      z.object({
        value: z.unknown(),
        label: z.string(),
      }),
    )
    .optional(),
  previewValue: z.unknown().optional(),
});

// ===== ScreenStateInit =====

export const ScreenStateInitSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  view: z.record(z.string(), ViewVariableDefSchema).optional(),
});

// ===== GlobalStateInit =====

export const GlobalStateInitSchema = z.object({
  view: z.record(z.string(), ViewVariableDefSchema).optional(),
});
