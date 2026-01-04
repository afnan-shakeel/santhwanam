import { z } from 'zod';
export const searchValidationSchema = z.object({
    searchTerm: z.string().optional(),
    searchFields: z.array(z.string()).optional(),
    filters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'notEquals', 'contains', 'in', 'notIn', 'gte', 'lte', 'gt', 'lt', 'between', 'isNull', 'isNotNull']),
        value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any()), z.object({ from: z.any(), to: z.any() })]),
        negate: z.boolean().optional()
    })).optional(),
    sortBy: z.union([z.string(), z.array(z.string())]).optional(),
    sortOrder: z.union([z.enum(['asc', 'desc']), z.record(z.string(), z.enum(['asc', 'desc']))]).optional(),
    page: z.number().min(1).optional(),
    pageSize: z.number().min(1).max(100).optional(),
    eagerLoad: z.array(z.string()).optional()
});
//# sourceMappingURL=searchValidator.js.map