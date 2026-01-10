// API: Contribution Router
// Express routes for contribution endpoints

import { Router } from 'express';
import { ContributionController } from './controller';
import { validateBody, validateParams, validateQuery } from '@/shared/middleware/validateZod';
import {
  getCycleByIdParamsSchema,
  searchCyclesBodySchema,
  closeCycleParamsSchema,
  getContributionByIdParamsSchema,
  acknowledgeDebitParamsSchema,
  recordCashParamsSchema,
  recordCashBodySchema,
  markMissedParamsSchema,
  searchContributionsBodySchema,
  getMemberHistoryParamsSchema,
  getMemberHistoryQuerySchema,
  myContributionsHistoryQuerySchema,
  getCycleContributionsParamsSchema,
  getCycleContributionsQuerySchema,
} from './validators';
import { searchValidationSchema } from "@/shared/validators/searchValidator";


export function createContributionRouter(controller: ContributionController): Router {
  const router = Router();

  // ==================== Contribution Cycle Routes ====================

  // GET /api/contributions/cycles/:cycleId
  router.get(
    '/cycles/:cycleId',
    validateParams(getCycleByIdParamsSchema),
    controller.getCycleById
  );

  // POST /api/contributions/cycles/search
  router.post(
    '/cycles/search',
    validateBody(searchCyclesBodySchema),
    controller.searchCycles
  );

  // POST /api/contributions/cycles/:cycleId/close
  router.post(
    '/cycles/:cycleId/close',
    validateParams(closeCycleParamsSchema),
    controller.closeCycle
  );

  // GET /api/contributions/cycles/:cycleId/contributions - Get contributions in a cycle with filters
  router.get(
    '/cycles/:cycleId/contributions',
    validateParams(getCycleContributionsParamsSchema),
    validateQuery(getCycleContributionsQuerySchema),
    controller.getCycleContributions
  );

  // ==================== My Contributions Routes (Authenticated Member) ====================

  // GET /api/contributions/my-contributions/summary
  router.get('/my-contributions/summary', controller.myContributionsSummary);

  // GET /api/contributions/my-contributions/pending
  router.get('/my-contributions/pending', controller.myPendingContributions);

  // GET /api/contributions/my-contributions/history
  router.get(
    '/my-contributions/history',
    validateQuery(myContributionsHistoryQuerySchema),
    controller.myContributionHistory
  );

  // ==================== Member Contribution Routes ====================

  // GET /api/contributions/:contributionId
  router.get(
    '/:contributionId',
    validateParams(getContributionByIdParamsSchema),
    controller.getContributionById
  );

  // POST /api/contributions/:contributionId/acknowledge
  router.post(
    '/:contributionId/acknowledge',
    validateParams(acknowledgeDebitParamsSchema),
    controller.acknowledgeDebit
  );

  // POST /api/contributions/:contributionId/record-cash
  router.post(
    '/:contributionId/record-cash',
    validateParams(recordCashParamsSchema),
    validateBody(recordCashBodySchema),
    controller.recordCash
  );

  // POST /api/contributions/:contributionId/mark-missed
  router.post(
    '/:contributionId/mark-missed',
    validateParams(markMissedParamsSchema),
    controller.markMissed
  );

  // POST /api/contributions/search
  router.post(
    '/search',
    validateBody(searchValidationSchema),
    controller.searchContributions
  );

  // GET /api/contributions/member/:memberId/history
  router.get(
    '/member/:memberId/history',
    validateParams(getMemberHistoryParamsSchema),
    validateQuery(getMemberHistoryQuerySchema),
    controller.getMemberHistory
  );

  return router;
}
