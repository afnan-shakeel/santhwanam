// Domain: System Configuration
// Key-value store for application settings
// See docs/implementations/update-99-remove-wallet-debit-request.md

export interface SystemConfiguration {
  configId: string;
  key: string;
  value: string;
  description: string | null;
  dataType: 'string' | 'boolean' | 'number' | 'json';
  updatedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
}

// Well-known configuration keys
export const CONFIG_KEYS = {
  /**
   * When enabled, wallet debits for contributions are processed automatically
   * without agent acknowledgment. Members with sufficient wallet balance will
   * have their contributions collected immediately when a cycle starts.
   * 
   * Default: true (auto-debit enabled)
   * See docs/implementations/update-99-remove-wallet-debit-request.md
   */
  WALLET_AUTO_DEBIT_ENABLED: 'wallet.autoDebitEnabled',

  /**
   * Minimum wallet balance threshold for low balance alerts.
   * Members with balance below this value are flagged as low-balance.
   * 
   * Default: 200
   */
  MIN_WALLET_BALANCE: 'min_wallet_balance',
} as const;

// Configuration value types for type safety
export interface ConfigValues {
  [CONFIG_KEYS.WALLET_AUTO_DEBIT_ENABLED]: boolean;
  [CONFIG_KEYS.MIN_WALLET_BALANCE]: number;
}

// Default configuration values
export const DEFAULT_CONFIG: Record<string, { value: string; description: string; dataType: string }> = {
  [CONFIG_KEYS.WALLET_AUTO_DEBIT_ENABLED]: {
    value: 'true',
    description: 'When enabled, wallet debits for contributions are processed automatically without agent acknowledgment',
    dataType: 'boolean',
  },
  [CONFIG_KEYS.MIN_WALLET_BALANCE]: {
    value: '200',
    description: 'Minimum wallet balance threshold for low balance alerts',
    dataType: 'number',
  },
};
