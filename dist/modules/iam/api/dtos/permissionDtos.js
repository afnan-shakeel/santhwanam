import { z } from 'zod';
export const PermissionDto = z.object({
    permissionId: z.string(),
    permissionCode: z.string(),
    permissionName: z.string(),
    description: z.string().nullable().optional(),
    module: z.string().nullable().optional(),
    action: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.date(),
});
export const PermissionsSearchResponseDto = z.object({
    items: z.array(PermissionDto),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
});
export default PermissionDto;
//# sourceMappingURL=permissionDtos.js.map