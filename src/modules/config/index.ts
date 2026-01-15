// Module: System Configuration
// Provides application-wide configuration management

import { ConfigService } from './application/configService';
import { PrismaSystemConfigurationRepository } from './infrastructure/prisma/systemConfigurationRepository';

// Initialize repository
const configRepo = new PrismaSystemConfigurationRepository();

// Initialize service
export const configService = new ConfigService(configRepo);

// Re-export types and constants
export { CONFIG_KEYS, DEFAULT_CONFIG } from './domain/entities';
export type { SystemConfiguration, ConfigValues } from './domain/entities';
export { ConfigService } from './application/configService';
