import { z } from 'zod';

// Helper function to parse filter parameter from string or object
export const parseFilter = (filter: unknown): Record<string, unknown> | undefined => {
  if (!filter) return undefined;
  if (typeof filter === 'object' && filter !== null) return filter as Record<string, unknown>;
  if (typeof filter === 'string') {
    try {
      return JSON.parse(filter);
    } catch (_e) {
      return undefined;
    }
  }
  return undefined;
};

// Query parameter schema for validation
export const queryParamsSchema = z.object({
  // Filtering - can be stringified JSON or object
  filter: z.union([
    z.record(z.string(), z.unknown()),
    z.string().transform((val, ctx) => {
      try {
        return JSON.parse(val);
      } catch (_e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Filter must be a valid JSON object or stringified JSON',
        });
        return z.NEVER;
      }
    })
  ]).optional().transform(parseFilter),
  
  // Pagination
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  
  // Sorting
  sort: z.string().optional(),
  
  // Field selection
  fields: z.string().optional(),

  // Continuation token for pagination
  continuationToken: z.string().optional(),
});

// Type for the parsed query parameters
export type QueryParams = z.infer<typeof queryParamsSchema>;
