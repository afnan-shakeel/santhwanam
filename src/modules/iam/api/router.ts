import { Router } from 'express'
import * as ctrl from './controller'
import { validateBody } from '@/shared/middleware/validateZod'
import requirePermission from '@/shared/middleware/requirePermission'
import { PermissionsSearchResponseDto, PermissionDto } from './dtos/permissionDtos'
import { RolesSearchResponseDto, RoleDto } from './dtos/roleDtos'
import { createPermissionSchema, createRoleSchema, updatePermissionSchema, updateRoleSchema, inviteUserSchema, updateUserSchema, assignRoleToUserSchema } from './validators'
import { searchValidationSchema } from '@/shared/validators/searchValidator'

const router = Router()

// User invites
router.post(
	'/users/invite',
	validateBody(inviteUserSchema),
	// requirePermission('user.invite'),
	ctrl.inviteUser,
)

// Permissions
router.post(
	'/permissions/search',
	validateBody(searchValidationSchema),
	ctrl.searchPermissions,
)

router.post(
	'/permissions',
	validateBody(createPermissionSchema),
	ctrl.createPermission,
)

router.patch(
	'/permissions/:id',
	validateBody(updatePermissionSchema),
	ctrl.updatePermission,
)

// Roles
router.post(
	'/roles/search',
	validateBody(searchValidationSchema),
	ctrl.searchRoles,
)

router.post(
	'/roles',
	validateBody(createRoleSchema),
	ctrl.createRole,
)

router.patch(
	'/roles/:id',
	validateBody(updateRoleSchema),
	ctrl.updateRole,
)

router.get(
	'/roles/:id',
	// requirePermission('role.read'),
	ctrl.getRole,
)

// Users
router.post(
	'/users/search',
	validateBody(searchValidationSchema),
	ctrl.searchUsers,
)

router.patch(
	'/users/:id',
	validateBody(updateUserSchema),
	ctrl.updateUser,
)

router.get(
	'/users/:id',
	// requirePermission('user.read'),
	ctrl.getUser,
)

// User Role Assignment
router.post(
	'/users/:userId/roles',
	validateBody(assignRoleToUserSchema),
	// requirePermission('role.assign'),
	ctrl.assignRoleToUser,
)

// User Role Revocation
router.delete(
	'/users/:userId/roles/:userRoleId',
	// requirePermission('role.revoke'),
	ctrl.revokeRoleFromUser,
)

// Get User with Roles
router.get(
	'/users/:userId/roles',
	// requirePermission('user.read'),
	ctrl.getUserWithRoles,
)

export default router
