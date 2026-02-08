// Module: System Configuration
// Provides application-wide configuration management

import { ConfigService } from './application/configService';
import { PrismaSystemConfigurationRepository } from './infrastructure/prisma/systemConfigurationRepository';
import { SystemConfigController } from './api/controller';
import { createSystemConfigRouter } from './api/router';

// Initialize repository
const configRepo = new PrismaSystemConfigurationRepository();

// Initialize service
export const configService = new ConfigService(configRepo);

// Initialize API
const controller = new SystemConfigController(configRepo);
export const systemConfigRouter = createSystemConfigRouter(controller);

// Re-export types and constants
export { CONFIG_KEYS, DEFAULT_CONFIG } from './domain/entities';
export type { SystemConfiguration, ConfigValues } from './domain/entities';
export { ConfigService } from './application/configService';
