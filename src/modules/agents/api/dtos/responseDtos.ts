import { z } from 'zod';

/**
 * Response DTOs for Agents Module API
 * These schemas define the response structure for each endpoint
 */

// Single agent response
export const AgentResponseDto = z.object({
  agentId: z.string(),
  agentCode: z.string(),
  registrationStatus: z.string(),
  unitId: z.string(),
  areaId: z.string(),
  forumId: z.string(),
  userId: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  middleName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  dateOfBirth: z.date().nullable().optional(),
  gender: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  agentStatus: z.string().nullable().optional(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  unit: z
    .object({
      unitId: z.string(),
      unitCode: z.string(),
      unitName: z.string(),
    })
    .nullable()
    .optional(),
  area: z
    .object({
      areaId: z.string(),
      areaCode: z.string(),
      areaName: z.string(),
    })
    .nullable()
    .optional(),
  forum: z
    .object({
      forumId: z.string(),
      forumCode: z.string(),
      forumName: z.string(),
    })
    .nullable()
    .optional(),
});

// Agent list response
export const AgentListResponseDto = z.object({
  items: z.array(AgentResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Agent list item with member count (for unit agents list)
const AgentListItemDto = z.object({
  agentId: z.string(),
  agentCode: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  status: z.string(),
  memberCount: z.number(),
});

// Agents list with summary response (enhanced)
export const AgentsListWithSummaryResponseDto = z.object({
  summary: z.object({
    totalAgents: z.number(),
    activeAgents: z.number(),
    totalMembers: z.number(),
  }),
  items: z.array(AgentListItemDto),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

// Agent submission response
export const AgentSubmissionResponseDto = z.object({
  agent: AgentResponseDto,
  approvalRequest: z.object({
    requestId: z.string(),
    status: z.string().optional(),
    requestedBy: z.string().optional(),
    requestedAt: z.date().optional(),
  }),
});

// Search agents response
export const AgentsSearchResponseDto = z.object({
  items: z.array(AgentResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// ===== AGENT PROFILE APIs =====

// Organization body reference
const OrganizationBodyDto = z.object({
  unitId: z.string().optional(),
  unitCode: z.string().optional(),
  unitName: z.string().optional(),
  areaId: z.string().optional(),
  areaCode: z.string().optional(),
  areaName: z.string().optional(),
  forumId: z.string().optional(),
  forumCode: z.string().optional(),
  forumName: z.string().optional(),
});

// Agent Profile response (extended with hierarchy)
export const AgentProfileResponseDto = AgentResponseDto.extend({
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  alternateContactNumber: z.string().nullable().optional(),
  totalActiveMembers: z.number().optional(),
  totalRegistrations: z.number().optional(),
  joinedDate: z.date().nullable().optional(),
  terminatedDate: z.date().nullable().optional(),
  terminationReason: z.string().nullable().optional(),
});

// Agent Stats response
export const AgentStatsResponseDto = z.object({
  totalMembers: z.number(),
  activeMembers: z.number(),
  suspendedMembers: z.number(),
  frozenMembers: z.number(),
  closedMembers: z.number(),
  pendingApprovals: z.number(),
  newMembersThisMonth: z.number(),
});

// Agent Member item
const AgentMemberDto = z.object({
  memberId: z.string(),
  memberCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  contactNumber: z.string(),
  email: z.string().nullable(),
  memberStatus: z.string().nullable(),
  registrationStatus: z.string(),
  tier: z.object({
    tierId: z.string(),
    tierCode: z.string(),
    tierName: z.string(),
  }),
  createdAt: z.date(),
  registeredAt: z.date().nullable(),
  contributions: z.object({
    count: z.object({
      pending: z.number().optional()
    })
  })
});

// Agent Members list response
export const AgentMembersResponseDto = z.object({
  members: z.array(AgentMemberDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// Agent Members export response
export const AgentMembersExportResponseDto = z.object({
  members: z.array(AgentMemberDto),
});

// Monthly trend item
const MonthlyTrendDto = z.object({
  month: z.string(),
  count: z.number(),
});

// Retention trend item
const RetentionTrendDto = z.object({
  month: z.string(),
  rate: z.number(),
});

// Agent Performance response
export const AgentPerformanceResponseDto = z.object({
  period: z.string(),
  memberAcquisition: z.object({
    newMembersThisMonth: z.number(),
    monthlyTrend: z.array(MonthlyTrendDto),
  }),
  retention: z.object({
    retentionRate: z.number(),
    totalMembers: z.number(),
    activeMembers: z.number(),
    suspendedMembers: z.number(),
    frozenMembers: z.number(),
    closedMembers: z.number(),
    retentionTrend: z.array(RetentionTrendDto),
  }),
});

// Agent Hierarchy response
export const AgentHierarchyResponseDto = z.object({
  unit: z.object({
    unitId: z.string(),
    unitCode: z.string(),
    unitName: z.string(),
  }).nullable(),
  area: z.object({
    areaId: z.string(),
    areaCode: z.string(),
    areaName: z.string(),
  }).nullable(),
  forum: z.object({
    forumId: z.string(),
    forumCode: z.string(),
    forumName: z.string(),
  }).nullable(),
});

// Type exports
export type AgentResponse = z.infer<typeof AgentResponseDto>;
export type AgentListResponse = z.infer<typeof AgentListResponseDto>;
export type AgentSubmissionResponse = z.infer<typeof AgentSubmissionResponseDto>;
export type AgentsSearchResponse = z.infer<typeof AgentsSearchResponseDto>;
export type AgentProfileResponse = z.infer<typeof AgentProfileResponseDto>;
export type AgentStatsResponse = z.infer<typeof AgentStatsResponseDto>;
export type AgentMembersResponse = z.infer<typeof AgentMembersResponseDto>;
export type AgentMembersExportResponse = z.infer<typeof AgentMembersExportResponseDto>;
export type AgentPerformanceResponse = z.infer<typeof AgentPerformanceResponseDto>;
export type AgentHierarchyResponse = z.infer<typeof AgentHierarchyResponseDto>;
