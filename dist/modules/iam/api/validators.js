import { z } from 'zod';
export const createPermissionSchema = z.object({
    permissionCode: z.string().min(1),
    permissionName: z.string().min(1),
    description: z.string().optional(),
    module: z.string().optional(),
    action: z.string().optional(),
});
export const createRoleSchema = z.object({
    roleCode: z.string().min(1),
    roleName: z.string().min(1),
    description: z.string().optional().nullable(),
    scopeType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent']),
    isSystemRole: z.boolean().optional(),
    permissionIds: z.array(z.string()).optional(),
});
export const updatePermissionSchema = z.object({
    permissionCode: z.string().min(1).optional(),
    permissionName: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    module: z.string().optional().nullable(),
    action: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});
export const updateRoleSchema = z.object({
    roleCode: z.string().min(1).optional(),
    roleName: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    scopeType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent']).optional(),
    isActive: z.boolean().optional(),
    isSystemRole: z.boolean().optional(),
    permissionIds: z.array(z.string()).optional(),
});
export const inviteUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    // userMetadata: z.record(z.any()).optional(),
    roles: z.array(z.object({
        roleId: z.string(),
        scopeEntityType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent']).optional(),
        scopeEntityId: z.string().optional(),
    })).optional(),
});
export const updateUserSchema = z.object({
    email: z.string().email().optional(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    userMetadata: z.any().optional(),
});
export const assignRoleToUserSchema = z.object({
    roleId: z.string().min(1, 'Role ID is required'),
    scopeEntityType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent']).optional(),
    scopeEntityId: z.string().optional().nullable(),
});
//# sourceMappingURL=validators.js.map