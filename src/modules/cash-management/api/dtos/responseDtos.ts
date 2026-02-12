import { z } from 'zod';

/**
 * Response DTOs for Cash Management Module API
 * These schemas define the response structure for each endpoint
 */

// ==================== BASE SCHEMAS ====================

// User reference in responses
const UserRefDto = z.object({
  userId: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  // role: z.string().nullable(),
});

// User with unit info (for handover detail)
const UserWithUnitDto = z.object({
  userId: z.string(),
  fullName: z.string().nullable(),
  role: z.string().nullable(),
  unit: z.string().nullable(),
});

// Pagination schema
const PaginationDto = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

// ==================== CUSTODY RESPONSE DTOs ====================

// Single cash custody response
export const CashCustodyDto = z.object({
  custodyId: z.string(),
  userId: z.string(),
  userRole: z.string(),
  glAccountCode: z.string(),
  glAccountName: z.string().optional(),
  status: z.string(),
  currentBalance: z.number(),
  totalReceived: z.number(),
  totalTransferred: z.number(),
  lastTransactionAt: z.date().nullable(),
  unitId: z.string().nullable(),
  areaId: z.string().nullable(),
  forumId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  deactivatedAt: z.date().nullable(),
  deactivatedBy: z.string().nullable(),
  deactivatedReason: z.string().nullable(),
  user: UserRefDto.nullable().optional(),
  unit: z.object({
    unitId: z.string(),
    unitCode: z.string(),
    unitName: z.string(),
  }).nullable().optional(),
  area: z.object({
    areaId: z.string(),
    areaCode: z.string(),
    areaName: z.string(),
  }).nullable().optional(),
  forum: z.object({
    forumId: z.string(),
    forumCode: z.string(),
    forumName: z.string(),
  }).nullable().optional(),
});

// Pending outgoing handover summary (for my-custody response)
const PendingOutgoingDto = z.object({
  handoverId: z.string(),
  handoverNumber: z.string(),
  toUserId: z.string(),
  toUserName: z.string().nullable(),
  toUserRole: z.string(),
  amount: z.number(),
  status: z.string(),
  requiresApproval: z.boolean(),
  initiatedAt: z.date(),
});

// Pending incoming handover summary (for my-custody response)
const PendingIncomingDto = z.object({
  handoverId: z.string(),
  handoverNumber: z.string(),
  fromUserId: z.string(),
  fromUserName: z.string().nullable(),
  fromUserRole: z.string(),
  amount: z.number(),
  status: z.string(),
  initiatedAt: z.date(),
});

// My custody response (matches API spec)
export const MyCustodyResponseDto = z.object({
  custody: CashCustodyDto.nullable(),
  pendingOutgoing: z.array(PendingOutgoingDto),
  pendingIncoming: z.array(PendingIncomingDto),
});

// Cash custody response wrapper (for admin endpoints)
export const CashCustodyResponseDto = CashCustodyDto;

// Cash custody list response
export const CashCustodyListResponseDto = z.object({
  items: z.array(CashCustodyDto),
  pagination: PaginationDto,
});

// Cash custody summary by GL account
export const CashCustodySummaryResponseDto = z.object({
  glAccountCode: z.string(),
  totalBalance: z.number(),
  activeCustodies: z.number(),
});

// ==================== HANDOVER RESPONSE DTOs ====================

// Single cash handover response (base)
export const CashHandoverDto = z.object({
  handoverId: z.string(),
  handoverNumber: z.string(),
  fromUserId: z.string(),
  fromUserRole: z.string(),
  fromCustodyId: z.string().nullable(),
  fromGlAccountCode: z.string(),
  toUserId: z.string(),
  toUserRole: z.string(),
  toCustodyId: z.string().nullable(),
  toGlAccountCode: z.string(),
  amount: z.number(),
  status: z.string(),
  handoverType: z.string(),
  requiresApproval: z.boolean(),
  approvalRequestId: z.string().nullable(),
  journalEntryId: z.string().nullable(),
  unitId: z.string().nullable(),
  areaId: z.string().nullable(),
  forumId: z.string(),
  sourceHandoverId: z.string().nullable(),
  initiatedAt: z.date(),
  acknowledgedAt: z.date().nullable(),
  rejectedAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  initiatorNotes: z.string().nullable(),
  receiverNotes: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().nullable().optional(),
  fromUser: UserRefDto.nullable().optional(),
  toUser: UserRefDto.nullable().optional(),
});

// Timeline entry for handover detail
const TimelineEntryDto = z.object({
  action: z.string(),
  timestamp: z.date(),
  userId: z.string(),
  userName: z.string().nullable(),
  notes: z.string().nullable(),
});

// Handover detail response (rich response with fromUser/toUser objects and timeline)
export const CashHandoverDetailDto = z.object({
  handoverId: z.string(),
  handoverNumber: z.string(),
  fromUser: UserWithUnitDto,
  toUser: UserWithUnitDto,
  amount: z.number(),
  status: z.string(),
  handoverType: z.string(),
  requiresApproval: z.boolean(),
  approvalRequestId: z.string().nullable(),
  journalEntryId: z.string().nullable(),
  timeline: z.array(TimelineEntryDto),
  initiatedAt: z.date(),
  acknowledgedAt: z.date().nullable(),
  rejectedAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  initiatorNotes: z.string().nullable(),
  receiverNotes: z.string().nullable(),
  rejectionReason: z.string().nullable(),
});

// Cash handover response wrapper
export const CashHandoverResponseDto = CashHandoverDto;

// Cash handover creation response (with message)
export const CashHandoverCreatedResponseDto = z.object({
  handover: CashHandoverDto,
  message: z.string(),
});

// Cash handover list response
export const CashHandoverListResponseDto = z.object({
  items: z.array(CashHandoverDto),
  pagination: PaginationDto,
});

// Pending handover item (with ageHours)
const PendingHandoverItemDto = CashHandoverDto.extend({
  ageHours: z.number().optional(),
});

// Summary for pending handovers
const PendingSummaryDto = z.object({
  totalIncoming: z.number(),
  totalIncomingAmount: z.number(),
  totalOutgoing: z.number(),
  totalOutgoingAmount: z.number(),
});

// Pending handovers response (both incoming and outgoing with summary)
export const PendingHandoversResponseDto = z.object({
  incoming: z.array(PendingHandoverItemDto),
  outgoing: z.array(PendingHandoverItemDto),
  summary: PendingSummaryDto,
});

// Simple pending list (for SuperAdmin view)
export const PendingHandoversListResponseDto = z.object({
  items: z.array(PendingHandoverItemDto),
  total: z.number(),
});

// ==================== RECEIVER RESPONSE DTOs ====================

// Valid receiver for handover
const ValidReceiverDto = z.object({
  userId: z.string().nullable(),
  fullName: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable().optional(),
  role: z.string(),
  roleDisplayName: z.string(),
  hierarchyLevel: z.string().nullable(),
  hierarchyName: z.string().nullable(),
  requiresApproval: z.boolean(),
});

// Valid receivers list response
export const ValidReceiversResponseDto = z.object({
  recipients: z.array(ValidReceiverDto),
});

// ==================== ACTIVITY RESPONSE DTOs ====================

// Custody activity item (stub - empty for now)
const CustodyActivityDto = z.object({
  activityId: z.string(),
  type: z.string(),
  direction: z.enum(['in', 'out']),
  amount: z.number(),
  description: z.string(),
  sourceModule: z.string(),
  sourceEntityId: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  memberCode: z.string().nullable(),
  memberName: z.string().nullable(),
  createdAt: z.date(),
});

// My custody activity response
export const MyCustodyActivityResponseDto = z.object({
  activities: z.array(CustodyActivityDto),
  pagination: PaginationDto,
});

// ==================== HANDOVER HISTORY RESPONSE DTOs ====================

// Handover history item
const HandoverHistoryItemDto = z.object({
  handoverId: z.string(),
  handoverNumber: z.string(),
  direction: z.enum(['sent', 'received']),
  counterpartyName: z.string().nullable(),
  counterpartyRole: z.string().nullable(),
  amount: z.number(),
  status: z.string(),
  initiatedAt: z.date(),
  completedAt: z.date().nullable(),
});

// Handover history summary
const HandoverHistorySummaryDto = z.object({
  totalSent: z.number(),
  totalReceived: z.number(),
  countSent: z.number(),
  countReceived: z.number(),
});

// Handover history response
export const HandoverHistoryResponseDto = z.object({
  items: z.array(CashHandoverDto),
  summary: HandoverHistorySummaryDto,
  pagination: PaginationDto,
});

// ==================== ADMIN DASHBOARD RESPONSE DTOs ====================

// Dashboard summary
const DashboardSummaryDto = z.object({
  totalCash: z.number(),
  bankBalance: z.number(),
  totalInCustody: z.number(),
  pendingHandovers: z.number(),
  pendingHandoverAmount: z.number(),
});

// Dashboard by level
const DashboardByLevelItemDto = z.object({
  count: z.number(),
  totalBalance: z.number(),
  glAccountCode: z.string(),
});

// Dashboard alerts
const DashboardAlertsDto = z.object({
  overdueCount: z.number(),
  overdueAmount: z.number(),
  overdueThresholdDays: z.number(),
  pendingOverdue: z.number(),
  pendingOverdueHours: z.number(),
  reconciled: z.boolean(),
  lastReconciliationAt: z.date().nullable(),
});

// Recent activity item
const RecentActivityItemDto = z.object({
  type: z.string(),
  amount: z.number(),
  fromUserName: z.string().nullable(),
  toUserName: z.string().nullable().optional(),
  timestamp: z.date(),
});

// Admin dashboard response
export const AdminDashboardResponseDto = z.object({
  summary: DashboardSummaryDto,
  byLevel: z.record(z.string(), DashboardByLevelItemDto),
  alerts: DashboardAlertsDto,
  recentActivity: z.array(RecentActivityItemDto),
});

// ==================== CUSTODY BY LEVEL RESPONSE DTOs ====================

// Custody by level item
const CustodyByLevelItemDto = z.object({
  level: z.string(),
  glAccountCode: z.string(),
  glAccountName: z.string(),
  userCount: z.number(),
  totalBalance: z.number(),
  glBalance: z.number(),
  reconciled: z.boolean(),
});

// Custody by level response
export const CustodyByLevelResponseDto = z.object({
  levels: z.array(CustodyByLevelItemDto),
  totalInCustody: z.number(),
  bankBalance: z.number(),
  totalCash: z.number(),
});

// ==================== CUSTODY REPORT RESPONSE DTOs ====================

// Custody report item
const CustodyReportItemDto = z.object({
  custodyId: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  userRole: z.string(),
  unitName: z.string().nullable(),
  areaName: z.string().nullable(),
  glAccountCode: z.string(),
  status: z.string(),
  currentBalance: z.number(),
  totalReceived: z.number(),
  totalTransferred: z.number(),
  lastTransactionAt: z.date().nullable(),
  daysSinceLastTransaction: z.number().nullable(),
  isOverdue: z.boolean(),
});

// Custody report summary
const CustodyReportSummaryDto = z.object({
  totalUsers: z.number(),
  totalBalance: z.number(),
  activeUsers: z.number(),
  inactiveUsers: z.number(),
});

// Custody report response
export const CustodyReportResponseDto = z.object({
  items: z.array(CustodyReportItemDto),
  summary: CustodyReportSummaryDto,
  pagination: PaginationDto,
});

// ==================== OVERDUE RESPONSE DTOs ====================

// Overdue user contact
const OverdueContactDto = z.object({
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

// Overdue user item
const OverdueUserItemDto = z.object({
  custodyId: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  userRole: z.string(),
  unitName: z.string().nullable(),
  areaName: z.string().nullable(),
  currentBalance: z.number(),
  lastTransactionAt: z.date().nullable(),
  daysSinceLastTransaction: z.number(),
  contact: OverdueContactDto,
});

// Overdue summary
const OverdueSummaryDto = z.object({
  totalOverdueUsers: z.number(),
  totalOverdueAmount: z.number(),
});

// Overdue response
export const OverdueResponseDto = z.object({
  thresholdDays: z.number(),
  overdueUsers: z.array(OverdueUserItemDto),
  summary: OverdueSummaryDto,
});

// ==================== RECONCILIATION RESPONSE DTOs ====================

// Reconciliation account item
const ReconciliationAccountItemDto = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  glBalance: z.number(),
  custodyTotal: z.number(),
  difference: z.number(),
  isReconciled: z.boolean(),
  userCount: z.number(),
});

// Reconciliation summary
const ReconciliationSummaryDto = z.object({
  totalGlBalance: z.number(),
  totalCustodyBalance: z.number(),
  totalDifference: z.number(),
  allReconciled: z.boolean(),
});

// Bank account info
const BankAccountInfoDto = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  balance: z.number(),
});

// Reconciliation response
export const ReconciliationResponseDto = z.object({
  accounts: z.array(ReconciliationAccountItemDto),
  summary: ReconciliationSummaryDto,
  bankAccount: BankAccountInfoDto,
  lastCheckedAt: z.date(),
});

// ==================== PENDING TRANSFERS RESPONSE DTOs ====================

// Pending transfer item (admin view)
const PendingTransferItemDto = z.object({
  handoverId: z.string(),
  handoverNumber: z.string(),
  fromUserName: z.string().nullable(),
  fromUserRole: z.string(),
  fromUnit: z.string().nullable(),
  toUserName: z.string().nullable(),
  toUserRole: z.string(),
  amount: z.number(),
  status: z.string(),
  requiresApproval: z.boolean(),
  approvalStatus: z.string().nullable().optional(),
  initiatedAt: z.date(),
  ageHours: z.number(),
});

// Pending transfers summary
const PendingTransfersSummaryDto = z.object({
  total: z.number(),
  totalAmount: z.number(),
  requiresApproval: z.number(),
  overdue: z.number(),
});

// Pending transfers response
export const PendingTransfersResponseDto = z.object({
  transfers: z.array(PendingTransferItemDto),
  summary: PendingTransfersSummaryDto,
  pagination: PaginationDto,
});

// ==================== APPROVE RESPONSE DTOs ====================

// Approve handover response
export const ApproveHandoverResponseDto = z.object({
  handoverId: z.string(),
  handoverNumber: z.string(),
  status: z.string(),
  approvalStatus: z.string(),
  approvedAt: z.date(),
  approvedBy: z.string(),
  message: z.string(),
});

// ==================== TYPE EXPORTS ====================

export type MyCustodyResponse = z.infer<typeof MyCustodyResponseDto>;
export type MyCustodyActivityResponse = z.infer<typeof MyCustodyActivityResponseDto>;
export type CashCustodyResponse = z.infer<typeof CashCustodyDto>;
export type CashCustodyListResponse = z.infer<typeof CashCustodyListResponseDto>;
export type CashCustodySummaryResponse = z.infer<typeof CashCustodySummaryResponseDto>;
export type CashHandoverResponse = z.infer<typeof CashHandoverDto>;
export type CashHandoverDetailResponse = z.infer<typeof CashHandoverDetailDto>;
export type CashHandoverCreatedResponse = z.infer<typeof CashHandoverCreatedResponseDto>;
export type CashHandoverListResponse = z.infer<typeof CashHandoverListResponseDto>;
export type PendingHandoversResponse = z.infer<typeof PendingHandoversResponseDto>;
export type PendingHandoversListResponse = z.infer<typeof PendingHandoversListResponseDto>;
export type ValidReceiversResponse = z.infer<typeof ValidReceiversResponseDto>;
export type HandoverHistoryResponse = z.infer<typeof HandoverHistoryResponseDto>;
export type AdminDashboardResponse = z.infer<typeof AdminDashboardResponseDto>;
export type CustodyByLevelResponse = z.infer<typeof CustodyByLevelResponseDto>;
export type CustodyReportResponse = z.infer<typeof CustodyReportResponseDto>;
export type OverdueResponse = z.infer<typeof OverdueResponseDto>;
export type ReconciliationResponse = z.infer<typeof ReconciliationResponseDto>;
export type PendingTransfersResponse = z.infer<typeof PendingTransfersResponseDto>;
export type ApproveHandoverResponse = z.infer<typeof ApproveHandoverResponseDto>;
