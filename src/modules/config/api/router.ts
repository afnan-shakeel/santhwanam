/**
 * Router for System Configuration API
 */

import { Router } from "express";
import type { SystemConfigController } from "./controller";
import { validateParams } from "@/shared/middleware/validateZod";
import { configKeyParamSchema } from "./validators";

export function createSystemConfigRouter(controller: SystemConfigController): Router {
  const router = Router();

  router.get(
    "/:key",
    validateParams(configKeyParamSchema),
    controller.getByKey
  );

  return router;
}
