/**
 * Router for Members API
 */

import { Router } from "express";
import type { MembersController } from "./controller";
import { validateBody, validateParams } from "@/shared/middleware/validateZod";
import {
  startMemberRegistrationSchema,
  savePersonalDetailsAsDraftSchema,
  addNomineeSchema,
  updateNomineeSchema,
  uploadMemberDocumentSchema,
  recordRegistrationPaymentSchema,
  suspendMemberSchema,
  reactivateMemberSchema,
  closeMemberAccountSchema,
  updateMemberProfileSchema,
  memberIdParamSchema,
  documentIdParamSchema,
} from "./validators";
import { searchValidationSchema } from "@/shared/validators/searchValidator";

export function createMembersRouter(controller: MembersController): Router {
  const router = Router();

  // ===== SEARCH =====
  
  router.post("/search", validateBody(searchValidationSchema), controller.searchMembers);

  // ===== STEP 1: PERSONAL DETAILS =====

  router.post(
    "/register",
    validateBody(startMemberRegistrationSchema),
    controller.startRegistration
  );

  router.patch(
    "/:memberId/draft/personal-details",
    validateBody(savePersonalDetailsAsDraftSchema),
    controller.savePersonalDetailsAsDraft
  );

  router.post(
    "/:memberId/complete/personal-details",
    controller.completePersonalDetailsStep
  );

  // ===== STEP 2: NOMINEES =====

  router.post(
    "/:memberId/nominees",
    validateBody(addNomineeSchema),
    controller.addNominee
  );

  router.get("/:memberId/nominees", controller.getNominees);

  router.patch(
    "/:memberId/nominees/:nomineeId",
    validateBody(updateNomineeSchema),
    controller.updateNominee
  );

  router.delete("/:memberId/nominees/:nomineeId", controller.removeNominee);

  router.post(
    "/:memberId/complete/nominees",
    controller.completeNomineesStep
  );

  // ===== STEP 3: DOCUMENTS & PAYMENT =====

  router.post(
    "/:memberId/documents",
    validateBody(uploadMemberDocumentSchema),
    controller.uploadDocument
  );

  router.get("/:memberId/documents", controller.getDocuments);

  router.delete(
    "/:memberId/documents/:documentId",
    controller.removeDocument
  );

  router.post(
    "/:memberId/payment",
    validateBody(recordRegistrationPaymentSchema),
    controller.recordPayment
  );

  router.get("/:memberId/payment", controller.getPayment);

  // ===== SUBMISSION =====

  router.post("/:memberId/submit", controller.submitRegistration);

  // ===== MEMBER MANAGEMENT =====

  router.post(
    "/:memberId/suspend",
    validateBody(suspendMemberSchema),
    controller.suspendMember
  );

  router.post(
    "/:memberId/reactivate",
    validateBody(reactivateMemberSchema),
    controller.reactivateMember
  );

  router.post(
    "/:memberId/close",
    validateBody(closeMemberAccountSchema),
    controller.closeMemberAccount
  );

  // ===== QUERIES =====

  router.get("/metadata", controller.getMetadata);

  // ===== PROFILE MANAGEMENT =====

  router.get("/my-profile", controller.getMyProfile);

  router.get(
    "/:memberId/profile",
    validateParams(memberIdParamSchema),
    controller.getMemberProfile
  );

  router.put(
    "/:memberId/profile",
    validateParams(memberIdParamSchema),
    validateBody(updateMemberProfileSchema),
    controller.updateMemberProfile
  );

  router.get(
    "/:memberId/documents/:documentId/download",
    validateParams(documentIdParamSchema),
    controller.downloadDocument
  );

  router.get(
    "/:memberId/benefit",
    validateParams(memberIdParamSchema),
    controller.getMemberBenefit
  );

  router.get("/:memberId", controller.getMemberDetails);

  router.get("/", controller.listMembers);

  return router;
}
