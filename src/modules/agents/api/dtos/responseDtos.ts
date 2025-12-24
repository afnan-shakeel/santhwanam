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

// Type exports
export type AgentResponse = z.infer<typeof AgentResponseDto>;
export type AgentListResponse = z.infer<typeof AgentListResponseDto>;
export type AgentSubmissionResponse = z.infer<typeof AgentSubmissionResponseDto>;
export type AgentsSearchResponse = z.infer<typeof AgentsSearchResponseDto>;
