/**
 * Router for Death Claims API
 */

import { Router } from 'express';
import type { DeathClaimsController } from './controller';
import { validateBody, validateParams, validateQuery } from '@/shared/middleware/validateZod';
import {
  reportDeathSchema,
  uploadClaimDocumentSchema,
  verifyClaimDocumentsSchema,
  submitClaimForApprovalSchema,
  settleDeathClaimSchema,
  getClaimByIdSchema,
  listClaimsSchema,
  getClaimDocumentsSchema,
} from './validators';

export function createDeathClaimsRouter(controller: DeathClaimsController): Router {
  const router = Router();

  // ===== REPORT DEATH =====

  router.post(
    '/report',
    validateBody(reportDeathSchema),
    controller.reportDeath
  );

  // ===== DOCUMENT UPLOAD =====

  router.post(
    '/:claimId/documents',
    validateParams(uploadClaimDocumentSchema),
    validateBody(uploadClaimDocumentSchema),
    controller.uploadDocument
  );

  router.get(
    '/:claimId/documents',
    validateParams(getClaimDocumentsSchema),
    controller.getClaimDocuments
  );

  // ===== VERIFICATION =====

  router.post(
    '/:claimId/verify',
    validateParams(verifyClaimDocumentsSchema),
    validateBody(verifyClaimDocumentsSchema),
    controller.verifyDocuments
  );

  // ===== APPROVAL =====

  router.post(
    '/:claimId/submit',
    validateParams(submitClaimForApprovalSchema),
    controller.submitForApproval
  );

  // ===== SETTLEMENT =====

  router.post(
    '/:claimId/settle',
    validateParams(settleDeathClaimSchema),
    validateBody(settleDeathClaimSchema),
    controller.settleClaim
  );

  // ===== QUERIES =====

  router.get(
    '/:claimId',
    validateParams(getClaimByIdSchema),
    controller.getClaimById
  );

  router.get(
    '/',
    validateQuery(listClaimsSchema),
    controller.listClaims
  );

  return router;
}
