import { Request, Response, NextFunction } from 'express'
import { permissionService, roleService, inviteUserHandler, assignRoleToUserHandler, revokeRoleFromUserHandler } from '../index'
import {
  PermissionResponseDto,
  PermissionsSearchResponseDto,
  RoleResponseDto,
  RolesSearchResponseDto,
  UserResponseDto,
  UsersSearchResponseDto,
  UserRoleResponseDto,
} from './dtos/responseDtos'
import { InviteUserCommand } from '@/modules/iam/application/commands/inviteUserCommand'
import { AssignRoleCommand } from '@/modules/iam/application/commands/assignRoleToUserCommand'
import { RevokeRoleCommand } from '@/modules/iam/application/commands/revokeRoleFromUserCommand'

export async function searchPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await permissionService.searchPermissions(req.body)
    // Forward raw result to the global response handler for validation/mapping
    return next({ responseSchema: PermissionsSearchResponseDto, data: result, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function createPermission(req: Request, res: Response, next: NextFunction) {
  try {
    // request body is already validated and parsed by centralized middleware
    const p = await permissionService.createPermission(req.body)
    return next({ responseSchema: PermissionResponseDto, data: p, status: 201 })
  } catch (err) {
    next(err)
  }
}

export async function updatePermission(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const p = await permissionService.updatePermission(id, req.body)
    return next({ responseSchema: PermissionResponseDto, data: p, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function searchRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await roleService.searchRoles(req.body)
    return next({ responseSchema: RolesSearchResponseDto, data: result, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function getRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const r = await roleService.getRoleById(id)
    return next({ responseSchema: RoleResponseDto, data: r, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function createRole(req: Request, res: Response, next: NextFunction) {
  try {
    // request body is already validated and parsed by centralized middleware
    const r = await roleService.createRole(req.body)
    return next({ responseSchema: RoleResponseDto, data: r, status: 201 })
  } catch (err) {
    next(err)
  }
}

export async function inviteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as InviteUserCommand
    const created = await inviteUserHandler.execute(payload)
    return next({ responseSchema: UserResponseDto, data: created, status: 201 })
  } catch (err) {
    next(err)
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction) {
  try {
    // request validated by middleware
    const result = await (await import('../index')).userService.searchUsers(req.body)
    return next({ responseSchema: UsersSearchResponseDto, data: result, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const updated = await (await import('../index')).userService.updateUser(id, req.body)
    return next({ responseSchema: UserResponseDto, data: updated, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const u = await (await import('../index')).userService.getUserById(id)
    return next({ responseSchema: UserResponseDto, data: u, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const r = await roleService.updateRole(id, req.body)
    return next({ responseSchema: RoleResponseDto, data: r, status: 200 })
  } catch (err) {
    next(err)
  }
}

export async function assignRoleToUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId
    const payload: AssignRoleCommand = {
      userId,
      ...req.body,
    }
    const userRole = await assignRoleToUserHandler.execute(payload)
    return next({ responseSchema: UserRoleResponseDto, data: userRole, status: 201 })
  } catch (err) {
    next(err)
  }
}

export async function revokeRoleFromUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userRoleId = req.params.userRoleId
    const payload: RevokeRoleCommand = { userRoleId }
    const userRole = await revokeRoleFromUserHandler.execute(payload)
    return next({ responseSchema: UserRoleResponseDto, data: userRole, status: 200 })
  } catch (err) {
    next(err)
  }
}
