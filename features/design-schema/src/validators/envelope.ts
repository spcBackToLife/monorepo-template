import { z } from 'zod';

export const OperationEnvelopeSchema = z.object({
  id: z.string().min(1),
  fingerprint: z.string().min(1),
  operation: z.unknown(),
  author: z.enum(['user', 'ai']),
  authorId: z.string().optional(),
  seq: z.number().int().optional(),
  timestamp: z.string(),
});
