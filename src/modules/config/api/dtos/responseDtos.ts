import { z } from "zod";

/**
 * Response DTO for a system configuration value
 */
export const SystemConfigResponseDto = z.object({
  key: z.string(),
  value: z.string(),
  dataType: z.string(),
  description: z.string().nullable(),
});

export type SystemConfigResponse = z.infer<typeof SystemConfigResponseDto>;
