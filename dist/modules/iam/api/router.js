import { Router } from 'express';
import * as ctrl from './controller';
import { validateBody } from '@/shared/middleware/validateZod';
import { createPermissionSchema, createRoleSchema, updatePermissionSchema, updateRoleSchema, inviteUserSchema, updateUserSchema } from './validators';
import { searchValidationSchema } from '@/shared/validators/searchValidator';
const router = Router();
// User invites
router.post('/users/invite', validateBody(inviteUserSchema), 
// requirePermission('user.invite'),
ctrl.inviteUser);
// Permissions
router.post('/permissions/search', validateBody(searchValidationSchema), ctrl.searchPermissions);
router.post('/permissions', validateBody(createPermissionSchema), ctrl.createPermission);
router.patch('/permissions/:id', validateBody(updatePermissionSchema), ctrl.updatePermission);
// Roles
router.post('/roles/search', validateBody(searchValidationSchema), ctrl.searchRoles);
router.post('/roles', validateBody(createRoleSchema), ctrl.createRole);
router.patch('/roles/:id', validateBody(updateRoleSchema), ctrl.updateRole);
router.get('/roles/:id', 
// requirePermission('role.read'),
ctrl.getRole);
// Users
router.post('/users/search', validateBody(searchValidationSchema), ctrl.searchUsers);
router.patch('/users/:id', validateBody(updateUserSchema), ctrl.updateUser);
router.get('/users/:id', 
// requirePermission('user.read'),
ctrl.getUser);
export default router;
//# sourceMappingURL=router.js.map