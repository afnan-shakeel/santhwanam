/**
 * Router for Organization Bodies API
 */
import { Router } from 'express';
import { validateBody } from '@/shared/middleware/validateZod';
import { createForumSchema, updateForumSchema, assignForumAdminSchema, createAreaSchema, updateAreaSchema, assignAreaAdminSchema, createUnitSchema, updateUnitSchema, assignUnitAdminSchema, } from './validators';
import { searchValidationSchema } from '@/shared/validators/searchValidator';
export function createOrganizationBodiesRouter(controller) {
    const router = Router();
    // Forum routes
    router.post('/forums/search', validateBody(searchValidationSchema), controller.searchForums);
    router.post('/forums', validateBody(createForumSchema), controller.createForum);
    router.patch('/forums/:forumId', validateBody(updateForumSchema), controller.updateForum);
    router.post('/forums/:forumId/assign-admin', validateBody(assignForumAdminSchema), controller.assignForumAdmin);
    router.get('/forums/:forumId', controller.getForumById);
    router.get('/forums/code/:forumCode', controller.getForumByCode);
    router.get('/forums', controller.listForums);
    // Area routes
    router.post('/areas/search', validateBody(searchValidationSchema), controller.searchAreas);
    router.post('/areas', validateBody(createAreaSchema), controller.createArea);
    router.patch('/areas/:areaId', validateBody(updateAreaSchema), controller.updateArea);
    router.post('/areas/:areaId/assign-admin', validateBody(assignAreaAdminSchema), controller.assignAreaAdmin);
    router.get('/areas/:areaId', controller.getAreaById);
    router.get('/forums/:forumId/areas', controller.listAreasByForum);
    // Unit routes
    router.post('/units/search', validateBody(searchValidationSchema), controller.searchUnits);
    router.post('/units', validateBody(createUnitSchema), controller.createUnit);
    router.patch('/units/:unitId', validateBody(updateUnitSchema), controller.updateUnit);
    router.post('/units/:unitId/assign-admin', validateBody(assignUnitAdminSchema), controller.assignUnitAdmin);
    router.get('/units/:unitId', controller.getUnitById);
    router.get('/areas/:areaId/units', controller.listUnitsByArea);
    router.get('/forums/:forumId/units', controller.listUnitsByForum);
    return router;
}
//# sourceMappingURL=router.js.map