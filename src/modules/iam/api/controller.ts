import { Request, Response, NextFunction } from 'express'
import { permissionService, roleService, inviteUserHandler } from '../index'
import { PermissionDto, PermissionsSearchResponseDto } from './dtos/permissionDtos'
import { RoleDto, RolesSearchResponseDto } from './dtos/roleDtos'
import { UserDto } from './dtos/userDtos'
import { InviteUserCommand } from '@/modules/iam/application/commands/inviteUserCommand'

export async function searchPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await permissionService.searchPermissions(req.body)
    // Forward raw result to the global response handler for validation/mapping
    return next({ dto: PermissionsSearchResponseDto, data: result, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function createPermission(req: Request, res: Response, next: NextFunction) {
  try {
    // request body is already validated and parsed by centralized middleware
    const p = await permissionService.createPermission(req.body)
    return next({ dto: PermissionDto, data: p, status: 201 })
  } catch (err) {
    next(err)
  }
}

export async function updatePermission(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const p = await permissionService.updatePermission(id, req.body)
    return next({ dto: PermissionDto, data: p, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function searchRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await roleService.searchRoles(req.body)
    return next({ dto: RolesSearchResponseDto, data: result, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function createRole(req: Request, res: Response, next: NextFunction) {
  try {
    // request body is already validated and parsed by centralized middleware
    const r = await roleService.createRole(req.body)
    return next({ dto: RoleDto, data: r, status: 201 })
  } catch (err) {
    next(err)
  }
}

export async function inviteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as InviteUserCommand
    const created = await inviteUserHandler.execute(payload)
    return next({ dto: UserDto, data: created, status: 201 })
  } catch (err) {
    next(err)
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction) {
  try {
    // request validated by middleware
    const result = await (await import('../index')).userService.searchUsers(req.body)
    return next({ dto: (await import('./dtos/userDtos')).UsersSearchResponseDto, data: result, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const updated = await (await import('../index')).userService.updateUser(id, req.body)
    return next({ dto: UserDto, data: updated, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const r = await roleService.updateRole(id, req.body)
    return next({ dto: RoleDto, data: r, status: 200 })
  } catch (err) {
    next(err)
  }
}
