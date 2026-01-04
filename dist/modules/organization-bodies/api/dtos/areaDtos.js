import { z } from 'zod';
export const AreaDto = z.object({
    areaId: z.string(),
    forumId: z.string(),
    areaCode: z.string(),
    areaName: z.string(),
    adminUserId: z.string(),
    establishedDate: z.date(),
    createdAt: z.date(),
    createdBy: z.string(),
    updatedAt: z.date().nullable().optional(),
    updatedBy: z.string().nullable().optional(),
});
export const AreaListDto = z.array(AreaDto);
export const AreasSearchResponseDto = z.object({
    items: z.array(AreaDto),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
});
export default AreaDto;
//# sourceMappingURL=areaDtos.js.map