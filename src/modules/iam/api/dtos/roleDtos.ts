import { z } from 'zod'

export const RoleDto = z.object({
  roleId: z.string(),
  roleCode: z.string(),
  roleName: z.string(),
  description: z.string().nullable().optional(),
  scopeType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent', 'Member']),
  isActive: z.boolean(),
  isSystemRole: z.boolean(),
  permissionIds: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
})

export type Role = z.infer<typeof RoleDto>

export const RolesSearchResponseDto = z.object({
  items: z.array(RoleDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export type RolesSearchResponse = z.infer<typeof RolesSearchResponseDto>

export default RoleDto
