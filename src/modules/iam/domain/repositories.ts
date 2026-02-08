import { Permission, Role } from './entities'

export interface PermissionRepository {
  create(data: {
    permissionCode: string
    permissionName: string
    description?: string | null
    module?: string | null
    action?: string | null
  }): Promise<Permission>

  findByCode(code: string): Promise<Permission | null>

  findById(id: string): Promise<Permission | null>

  updateById(id: string, updates: Partial<{
    permissionCode: string
    permissionName: string
    description?: string | null
    module?: string | null
    action?: string | null
    isActive?: boolean
  }>): Promise<Permission>

  listAll(): Promise<Permission[]>

  // Count records matching a where filter. Useful for validating existence.
  count(where?: any, tx?: any): Promise<number>

  // Count permissions by explicit id list. Returns number of matching ids.
  countByIds(ids: string[], tx?: any): Promise<number>
}

export interface RolePermissionRepository {
  // Create many role-permission rows in a transaction-aware way.
  createMany(data: Array<{ roleId: string; permissionId: string }>, tx?: any): Promise<void>

  // Delete role-permission rows by roleId (tx-aware).
  deleteByRoleId(roleId: string, tx?: any): Promise<void>
}

export interface RoleRepository {
  create(data: {
    roleCode: string
    roleName: string
    description?: string | null
    scopeType: Role['scopeType']
    isSystemRole?: boolean
  }, tx?: any): Promise<Role>

  findByCode(code: string, tx?: any): Promise<Role | null>

  findById(id: string, tx?: any): Promise<Role | null>

  updateById(id: string, updates: Partial<{
    roleCode: string
    roleName: string
    description?: string | null
    scopeType: Role['scopeType']
    isActive?: boolean
    isSystemRole?: boolean
  }>, tx?: any): Promise<Role>

  listAll(): Promise<Role[]>
}

export interface UserRepository {
  create(data: Partial<any>, tx?: any): Promise<any>
  findById(id: string, tx?: any): Promise<any | null>
  findByEmail(email: string, tx?: any): Promise<any | null>
  findByIdWithRoles(id: string, tx?: any): Promise<any | null>
  updateById(id: string, updates: Partial<any>, tx?: any): Promise<any>
  listAll(): Promise<any[]>
}

export interface UserRoleRepository {
  create(data: { userId: string; roleId: string; scopeEntityType?: string | null; scopeEntityId?: string | null; assignedBy?: string | null }, tx?: any): Promise<any>

  createMany(data: Array<{ userId: string; roleId: string; scopeEntityType?: string | null; scopeEntityId?: string | null; assignedBy?: string | null }>, tx?: any): Promise<void>

  findById(id: string, tx?: any): Promise<any | null>

  // Find an existing user role by userId+roleId+optional scopeEntityId
  findByUserAndRole(userId: string, roleId: string, scopeEntityId?: string | null, tx?: any): Promise<any | null>

  updateById(id: string, updates: Partial<any>, tx?: any): Promise<any>

  deleteByUserId(userId: string, tx?: any): Promise<void>
}
