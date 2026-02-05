/**
 * Router for Approval Workflow API
 */

import { Router } from 'express';
import type { ApprovalWorkflowController } from './controller';
import { validateBody } from '@/shared/middleware/validateZod';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  submitRequestSchema,
  processApprovalSchema,
} from './validators';
import { searchValidationSchema } from '@/shared/validators/searchValidator';

export function createApprovalWorkflowRouter(controller: ApprovalWorkflowController): Router {
  const router = Router();

  // Workflow management
  router.post('/workflows', validateBody(createWorkflowSchema), controller.createWorkflow);
  router.post('/workflows/search', validateBody(searchValidationSchema), controller.searchWorkflows);
  router.patch('/workflows/:workflowId', validateBody(updateWorkflowSchema), controller.updateWorkflow);
  router.get('/workflows/:workflowId', controller.getWorkflowById);
  router.get('/workflows/code/:workflowCode', controller.getWorkflowByCode);
  router.get('/workflows', controller.listActiveWorkflows);
  router.get('/workflows/all', controller.listAllWorkflows);

  // Request management
  router.post('/requests', validateBody(submitRequestSchema), controller.submitRequest);
  router.post('/requests/search', validateBody(searchValidationSchema), controller.searchRequests);
  router.post('/requests/process', validateBody(processApprovalSchema), controller.processApproval);
  router.get('/requests/:requestId', controller.getRequestById);
  router.get('/requests/entity/:entityType/:entityId', controller.getRequestByEntity);

  // Approver actions
  router.get('/approvals/pending/:approverId', controller.getPendingApprovals);
  router.get('/approvals/count', controller.getPendingApprovalsCount);

  return router;
}
