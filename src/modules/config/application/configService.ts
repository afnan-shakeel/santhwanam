// Application: Configuration Service
// Provides typed access to system configuration values

import { SystemConfigurationRepository } from '../domain/repositories';
import { CONFIG_KEYS, DEFAULT_CONFIG, SystemConfiguration } from '../domain/entities';
import { logger } from '@/shared/utils/logger';

export class ConfigService {
  constructor(private readonly configRepo: SystemConfigurationRepository) {}

  /**
   * Get a configuration value by key
   * Returns the default value if the key is not found
   */
  async getValue<T = string>(key: string): Promise<T> {
    const config = await this.configRepo.findByKey(key);
    
    if (!config) {
      // Return default value if exists
      const defaultConfig = DEFAULT_CONFIG[key];
      if (defaultConfig) {
        return this.parseValue<T>(defaultConfig.value, defaultConfig.dataType);
      }
      throw new Error(`Configuration key not found: ${key}`);
    }

    return this.parseValue<T>(config.value, config.dataType);
  }

  /**
   * Get boolean configuration value
   */
  async getBoolean(key: string): Promise<boolean> {
    return await this.getValue<boolean>(key);
  }

  /**
   * Get number configuration value
   */
  async getNumber(key: string): Promise<number> {
    return await this.getValue<number>(key);
  }

  /**
   * Get string configuration value
   */
  async getString(key: string): Promise<string> {
    return await this.getValue<string>(key);
  }

  /**
   * Check if wallet auto-debit is enabled
   * This controls whether contributions are collected automatically from wallets
   * or require manual agent acknowledgment.
   * 
   * See docs/implementations/update-99-remove-wallet-debit-request.md
   */
  async isWalletAutoDebitEnabled(): Promise<boolean> {
    try {
      return await this.getBoolean(CONFIG_KEYS.WALLET_AUTO_DEBIT_ENABLED);
    } catch (error) {
      // Default to true (auto-debit enabled) if config not found
      logger.warn('wallet.autoDebitEnabled config not found, defaulting to true');
      return true;
    }
  }

  /**
   * Set a configuration value
   */
  async setValue(
    key: string,
    value: string,
    updatedBy?: string
  ): Promise<SystemConfiguration> {
    return await this.configRepo.update(key, { value, updatedBy });
  }

  /**
   * Upsert a configuration value (create or update)
   */
  async upsertValue(
    key: string,
    value: string,
    options?: {
      description?: string;
      dataType?: string;
      updatedBy?: string;
    }
  ): Promise<SystemConfiguration> {
    return await this.configRepo.upsert({
      key,
      value,
      description: options?.description,
      dataType: options?.dataType,
      updatedBy: options?.updatedBy,
    });
  }

  /**
   * Get all configuration values
   */
  async getAllConfigs(): Promise<SystemConfiguration[]> {
    return await this.configRepo.findAll();
  }

  /**
   * Initialize default configurations if they don't exist
   * Called during application startup or seed
   */
  async initializeDefaults(): Promise<void> {
    logger.info('Initializing default configurations...');
    
    for (const [key, config] of Object.entries(DEFAULT_CONFIG)) {
      const existing = await this.configRepo.findByKey(key);
      if (!existing) {
        await this.configRepo.upsert({
          key,
          value: config.value,
          description: config.description,
          dataType: config.dataType,
        });
        logger.info(`Created default config: ${key} = ${config.value}`);
      }
    }

    logger.info('Default configurations initialized');
  }

  /**
   * Parse configuration value based on data type
   */
  private parseValue<T>(value: string, dataType: string): T {
    switch (dataType) {
      case 'boolean':
        return (value.toLowerCase() === 'true') as unknown as T;
      case 'number':
        return Number(value) as unknown as T;
      case 'json':
        return JSON.parse(value) as T;
      default:
        return value as unknown as T;
    }
  }
}
