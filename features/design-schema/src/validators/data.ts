import { z } from 'zod';

// ===== DataSet Validator =====

export const DataSetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  description: z.string().optional(),
});
