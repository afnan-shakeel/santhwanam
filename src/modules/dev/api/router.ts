/**
 * Router for Dev API
 * DEV-ONLY: These routes are only available in non-production environments
 */

import { Router } from "express";
import type { DevController } from "./controller";
import { validateBody } from "@/shared/middleware/validateZod";
import { quickMemberRegistrationSchema } from "./validators";

export function createDevRouter(controller: DevController): Router {
  const router = Router();

  // Quick member registration (bypasses approval workflow)
  router.post(
    "/members/quick-register",
    validateBody(quickMemberRegistrationSchema),
    controller.quickRegisterMember
  );

  return router;
}
