import { z } from 'zod';

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).optional(),
  offset: z.number().int().min(0).default(0).optional(),
}).strict();

export const ResponseFormatSchema = z.enum(['markdown', 'json']).default('markdown').optional();

export const SessionIdSchema = z.string().min(1).describe('Session ID');
export const DaysSchema = z.number().int().min(1).max(365).default(30).optional();
