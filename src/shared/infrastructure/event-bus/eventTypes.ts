/**
 * Domain Event Types
 * Define all event type constants here for type safety
 */

// IAM Events
export const IAM_EVENTS = {
  USER_REGISTERED: 'UserRegistered',
  USER_ROLE_ASSIGNED: 'UserRoleAssigned',
  USER_ROLE_REVOKED: 'UserRoleRevoked',
  ROLE_CREATED: 'RoleCreated',
  PERMISSION_ASSIGNED: 'PermissionAssigned',
} as const;

// Membership Events
export const MEMBERSHIP_EVENTS = {
  MEMBER_REGISTRATION_APPROVED: 'MemberRegistrationApproved',
  MEMBER_REGISTRATION_REJECTED: 'MemberRegistrationRejected',
  MEMBER_SUSPENDED: 'MemberSuspended',
  MEMBER_ACTIVATED: 'MemberActivated',
} as const;

// Wallet Events
export const WALLET_EVENTS = {
  WALLET_CREATED: 'WalletCreated',
  WALLET_DEPOSIT_APPROVED: 'WalletDepositApproved',
  WALLET_WITHDRAWAL_APPROVED: 'WalletWithdrawalApproved',
} as const;

// Death Claims Events
export const DEATH_CLAIMS_EVENTS = {
  DEATH_CLAIM_SUBMITTED: 'DeathClaimSubmitted',
  DEATH_CLAIM_APPROVED: 'DeathClaimApproved',
  DEATH_CLAIM_REJECTED: 'DeathClaimRejected',
  CONTRIBUTION_COLLECTED: 'ContributionCollected',
} as const;

// Finance/GL Events
export const FINANCE_EVENTS = {
  JOURNAL_ENTRY_CREATED: 'JournalEntryCreated',
  TRANSACTION_POSTED: 'TransactionPosted',
} as const;

// Export all event types as a union
export type DomainEventType =
  | typeof IAM_EVENTS[keyof typeof IAM_EVENTS]
  | typeof MEMBERSHIP_EVENTS[keyof typeof MEMBERSHIP_EVENTS]
  | typeof WALLET_EVENTS[keyof typeof WALLET_EVENTS]
  | typeof DEATH_CLAIMS_EVENTS[keyof typeof DEATH_CLAIMS_EVENTS]
  | typeof FINANCE_EVENTS[keyof typeof FINANCE_EVENTS];
