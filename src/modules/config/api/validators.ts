import { z } from "zod";

/**
 * Validators for System Configuration API
 */

export const configKeyParamSchema = z.object({
  key: z.string().min(1).max(100),
});

export type ConfigKeyParamDTO = z.infer<typeof configKeyParamSchema>;
