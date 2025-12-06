import { z } from 'zod'

export const PermissionDto = z.object({
  permissionId: z.string(),
  permissionCode: z.string(),
  permissionName: z.string(),
  description: z.string().nullable().optional(),
  module: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
})

export type Permission = z.infer<typeof PermissionDto>

export const PermissionsSearchResponseDto = z.object({
  items: z.array(PermissionDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export type PermissionsSearchResponse = z.infer<typeof PermissionsSearchResponseDto>

export default PermissionDto
