/**
 * Zod validators for Organization Bodies API
 */
import { z } from 'zod';
// Forum validators
export const createForumSchema = z.object({
    forumCode: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
    forumName: z.string().min(3).max(255),
    adminUserId: z.string().uuid(),
    establishedDate: z.coerce.date(),
});
export const updateForumSchema = z.object({
    forumName: z.string().min(3).max(255).optional(),
    establishedDate: z.coerce.date().optional(),
});
export const assignForumAdminSchema = z.object({
    newAdminUserId: z.string().uuid(),
});
// Area validators
export const createAreaSchema = z.object({
    forumId: z.string().uuid(),
    areaCode: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
    areaName: z.string().min(3).max(255),
    adminUserId: z.string().uuid(),
    establishedDate: z.coerce.date(),
});
export const updateAreaSchema = z.object({
    areaName: z.string().min(3).max(255).optional(),
    establishedDate: z.coerce.date().optional(),
});
export const assignAreaAdminSchema = z.object({
    newAdminUserId: z.string().uuid(),
});
// Unit validators
export const createUnitSchema = z.object({
    areaId: z.string().uuid(),
    unitCode: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
    unitName: z.string().min(3).max(255),
    adminUserId: z.string().uuid(),
    establishedDate: z.coerce.date(),
});
export const updateUnitSchema = z.object({
    unitName: z.string().min(3).max(255).optional(),
    establishedDate: z.coerce.date().optional(),
});
export const assignUnitAdminSchema = z.object({
    newAdminUserId: z.string().uuid(),
});
//# sourceMappingURL=validators.js.map