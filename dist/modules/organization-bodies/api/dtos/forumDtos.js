import { z } from 'zod';
export const ForumDto = z.object({
    forumId: z.string(),
    forumCode: z.string(),
    forumName: z.string(),
    adminUserId: z.string(),
    establishedDate: z.date(),
    createdAt: z.date(),
    createdBy: z.string(),
    updatedAt: z.date().nullable().optional(),
    updatedBy: z.string().nullable().optional(),
});
export const ForumListDto = z.array(ForumDto);
export const ForumsSearchResponseDto = z.object({
    items: z.array(ForumDto),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
});
export default ForumDto;
//# sourceMappingURL=forumDtos.js.map