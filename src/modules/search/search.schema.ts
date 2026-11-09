import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(255),
  type: z.enum(['all', 'files', 'folders', 'images', 'documents']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;