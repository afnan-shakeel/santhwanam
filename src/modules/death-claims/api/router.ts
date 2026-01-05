/**
 * Router for Death Claims API
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { DeathClaimsController } from './controller';
import { validateBody, validateParams, validateQuery } from '@/shared/middleware/validateZod';
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import wrapMulter  from '@/shared/middleware/multerWrapper';
import {
  reportDeathSchema,
  uploadClaimDocumentSchema,
  verifyClaimDocumentsSchema,
  verifyIndividualDocumentBodySchema,
  verifyIndividualDocumentParamsSchema,
  downloadDocumentSchema,
  submitClaimForApprovalSchema,
  settleDeathClaimSchema,
  getClaimByIdSchema,
  listClaimsSchema,
  getClaimDocumentsSchema,
} from './validators';

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

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
    wrapMulter(upload.single('file')),
    controller.uploadDocument
  );

  router.get(
    '/:claimId/documents',
    validateParams(getClaimDocumentsSchema),
    controller.getClaimDocuments
  );

  router.get(
    '/:claimId/documents/:documentId/download',
    validateParams(downloadDocumentSchema),
    controller.downloadDocument
  );

  // ===== VERIFICATION =====

  router.post(
    '/:claimId/documents/:documentId/verify',
    validateParams(verifyIndividualDocumentParamsSchema),
    validateBody(verifyIndividualDocumentBodySchema),
    controller.verifyIndividualDocument
  );

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
    wrapMulter(upload.single('acknowledgmentFile')),
    controller.settleClaim
  );

  // ===== QUERIES =====

  router.get(
    '/dashboard/stats',
    controller.getDashboardStats
  );

  router.get(
    '/requiring-action',
    controller.getRequiringAction
  );

  router.post(
    '/search',
    controller.searchClaims
  );

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
