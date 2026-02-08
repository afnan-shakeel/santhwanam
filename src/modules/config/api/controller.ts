/**
 * Controller for System Configuration API
 */

import type { Request, Response, NextFunction } from "express";
import type { ConfigService } from "../application/configService";
import { SystemConfigResponseDto } from "./dtos/responseDtos";
import type { SystemConfigurationRepository } from "../domain/repositories";

export class SystemConfigController {
  constructor(
    private readonly configRepo: SystemConfigurationRepository,
  ) {}

  /**
   * GET /api/system-config/:key
   */
  getByKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      const config = await this.configRepo.findByKey(key);
      if (!config) {
        return next({ status: 404, message: `Configuration key '${key}' not found` });
      }
      return next({
        responseSchema: SystemConfigResponseDto,
        data: {
          key: config.key,
          value: config.value,
          dataType: config.dataType,
          description: config.description,
        },
        status: 200,
      });
    } catch (err) {
      next(err);
    }
  };
}
