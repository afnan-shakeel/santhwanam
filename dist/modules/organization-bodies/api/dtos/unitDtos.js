import { z } from 'zod';
export const UnitDto = z.object({
    unitId: z.string(),
    areaId: z.string(),
    forumId: z.string(),
    unitCode: z.string(),
    unitName: z.string(),
    adminUserId: z.string(),
    establishedDate: z.date(),
    createdAt: z.date(),
    createdBy: z.string(),
    updatedAt: z.date().nullable().optional(),
    updatedBy: z.string().nullable().optional(),
});
export const UnitListDto = z.array(UnitDto);
export const UnitsSearchResponseDto = z.object({
    items: z.array(UnitDto),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
});
export default UnitDto;
//# sourceMappingURL=unitDtos.js.map