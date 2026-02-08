/**
 * System Configuration Data
 * System-wide configuration settings
 */

export const SYSTEM_CONFIG = [
  {
    key: 'min_wallet_balance',
    value: '200',
    description: 'Minimum wallet balance threshold for low balance alerts',
    dataType: 'number',
  },
  {
    key: 'wallet.autoDebitEnabled',
    value: 'true',
    description: 'Whether contributions are automatically debited from wallets or require manual acknowledgment',
    dataType: 'boolean',
  },
];
