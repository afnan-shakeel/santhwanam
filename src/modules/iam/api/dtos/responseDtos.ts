import { z } from 'zod';

/**
 * Response DTOs for IAM Module API
 * These schemas define the response structure for each endpoint
 */

// Permission response
export const PermissionResponseDto = z.object({
  permissionId: z.string(),
  permissionCode: z.string(),
  permissionName: z.string(),
  description: z.string().nullable().optional(),
  module: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
});

// Permissions search response
export const PermissionsSearchResponseDto = z.object({
  items: z.array(PermissionResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Role response
export const RoleResponseDto = z.object({
  roleId: z.string(),
  roleCode: z.string(),
  roleName: z.string(),
  description: z.string().nullable().optional(),
  scopeType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent', 'Member']),
  isActive: z.boolean(),
  isSystemRole: z.boolean(),
  permissionIds: z.array(z.string()).optional(),
  permissions: z.array(PermissionResponseDto).optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Roles search response
export const RolesSearchResponseDto = z.object({
  items: z.array(RoleResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// User response
export const UserResponseDto = z.object({
  userId: z.string(),
  externalAuthId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  isActive: z.boolean(),
  userMetadata: z.any().nullable().optional(),
  roles: z.array(RoleResponseDto).optional(),
  createdAt: z.date(),
  lastSyncedAt: z.date().nullable().optional(),
});

// Users search response
export const UsersSearchResponseDto = z.object({
  items: z.array(UserResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// UserRole response
export const UserRoleResponseDto = z.object({
  userRoleId: z.string(),
  userId: z.string(),
  roleId: z.string(),
  scopeEntityType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent', 'Member']).nullable().optional(),
  scopeEntityId: z.string().nullable().optional(),
  isActive: z.boolean(),
  assignedAt: z.date(),
  assignedBy: z.string().nullable().optional(),
  revokedAt: z.date().nullable().optional(),
  revokedBy: z.string().nullable().optional(),
  role: RoleResponseDto.optional(),
});

// User with roles detailed response
export const UserRoleDetailDto = z.object({
  userRoleId: z.string(),
  roleId: z.string(),
  roleCode: z.string(),
  roleName: z.string(),
  scopeType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent', 'Member']),
  scopeEntityType: z.enum(['None', 'Forum', 'Area', 'Unit', 'Agent', 'Member']).nullable().optional(),
  scopeEntityId: z.string().nullable().optional(),
  scopeEntityName: z.string().nullable().optional(),
  isSystemRole: z.boolean(),
  isActive: z.boolean(),
  assignedAt: z.date(),
  assignedBy: z.object({
    userId: z.string(),
    name: z.string()
  }).nullable().optional(),
});

export const UserWithRolesResponseDto = z.object({
  userId: z.string(),
  externalAuthId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  lastSyncedAt: z.date().nullable().optional(),
  roles: z.array(UserRoleDetailDto),
});

// Type exports
export type PermissionResponse = z.infer<typeof PermissionResponseDto>;
export type PermissionsSearchResponse = z.infer<typeof PermissionsSearchResponseDto>;
export type RoleResponse = z.infer<typeof RoleResponseDto>;
export type RolesSearchResponse = z.infer<typeof RolesSearchResponseDto>;
export type UserResponse = z.infer<typeof UserResponseDto>;
export type UsersSearchResponse = z.infer<typeof UsersSearchResponseDto>;
export type UserRoleResponse = z.infer<typeof UserRoleResponseDto>;
export type UserRoleDetail = z.infer<typeof UserRoleDetailDto>;
export type UserWithRolesResponse = z.infer<typeof UserWithRolesResponseDto>;
