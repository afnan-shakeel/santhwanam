import { z } from 'zod';

/**
 * Response DTOs for Organization Bodies Module API
 * These schemas define the response structure for each endpoint
 */

// Admin details schema (reusable)
const AdminDetailsDto = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
}).nullable().optional();

// Admin summary schema (for list items)
const AdminSummaryDto = z.object({
  userId: z.string(),
  name: z.string(),
}).nullable().optional();

// Forum response
export const ForumResponseDto = z.object({
  forumId: z.string(),
  forumCode: z.string(),
  forumName: z.string(),
  adminUserId: z.string(),
  establishedDate: z.date(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  admin: AdminDetailsDto,
});

// Forum with admin details response (enhanced GET)
export const ForumWithDetailsResponseDto = z.object({
  forumId: z.string(),
  forumCode: z.string(),
  forumName: z.string(),
  adminUserId: z.string(),
  establishedDate: z.date(),
  createdAt: z.date(),
  createdBy: z.string().optional(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  admin: AdminDetailsDto,
});

// Forum stats response
export const ForumStatsResponseDto = z.object({
  forumId: z.string(),
  totalAreas: z.number(),
  totalUnits: z.number(),
  totalAgents: z.number(),
  activeAgents: z.number(),
  totalMembers: z.number(),
  activeMembers: z.number(),
  pendingApprovals: z.number(),
});

// Forum list response
export const ForumListResponseDto = z.array(ForumResponseDto);

// Forums search response
export const ForumsSearchResponseDto = z.object({
  items: z.array(ForumResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Area response
export const AreaResponseDto = z.object({
  areaId: z.string(),
  forumId: z.string(),
  areaCode: z.string(),
  areaName: z.string(),
  adminUserId: z.string(),
  establishedDate: z.date(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  forum: z
    .object({
      forumId: z.string(),
      forumCode: z.string(),
      forumName: z.string(),
    })
    .nullable()
    .optional(),
  admin: z
    .object({
      userId: z.string(),
      email: z.string(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

// Area with details response (enhanced GET)
export const AreaWithDetailsResponseDto = z.object({
  areaId: z.string(),
  areaCode: z.string(),
  areaName: z.string(),
  establishedDate: z.date(),
  forumId: z.string(),
  forumName: z.string(),
  adminUserId: z.string(),
  admin: AdminDetailsDto,
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Area stats response
export const AreaStatsResponseDto = z.object({
  areaId: z.string(),
  totalUnits: z.number(),
  totalAgents: z.number(),
  activeAgents: z.number(),
  totalMembers: z.number(),
  activeMembers: z.number(),
});

// Area list item with counts
const AreaListItemDto = z.object({
  areaId: z.string(),
  areaCode: z.string(),
  areaName: z.string(),
  establishedDate: z.date(),
  forumId: z.string(),
  adminUserId: z.string(),
  admin: AdminSummaryDto,
  unitCount: z.number(),
  memberCount: z.number(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

// Areas list with summary response (enhanced)
export const AreasListWithSummaryResponseDto = z.object({
  summary: z.object({
    totalAreas: z.number(),
    totalUnits: z.number(),
    totalMembers: z.number(),
  }),
  items: z.array(AreaListItemDto),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

// Area list response (simple)
export const AreaListResponseDto = z.array(AreaResponseDto);

// Areas search response
export const AreasSearchResponseDto = z.object({
  items: z.array(AreaResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Unit response
export const UnitResponseDto = z.object({
  unitId: z.string(),
  areaId: z.string(),
  forumId: z.string(),
  unitCode: z.string(),
  unitName: z.string(),
  adminUserId: z.string(),
  establishedDate: z.date(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
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
  admin: z
    .object({
      userId: z.string(),
      email: z.string(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

// Unit with details response (enhanced GET)
export const UnitWithDetailsResponseDto = z.object({
  unitId: z.string(),
  unitCode: z.string(),
  unitName: z.string(),
  establishedDate: z.date(),
  areaId: z.string(),
  areaName: z.string(),
  forumId: z.string(),
  forumName: z.string(),
  adminUserId: z.string(),
  admin: AdminDetailsDto,
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Unit stats response
export const UnitStatsResponseDto = z.object({
  unitId: z.string(),
  totalAgents: z.number(),
  activeAgents: z.number(),
  totalMembers: z.number(),
  activeMembers: z.number(),
  suspendedMembers: z.number(),
  pendingApprovals: z.number(),
});

// Unit list item with counts
const UnitListItemDto = z.object({
  unitId: z.string(),
  unitCode: z.string(),
  unitName: z.string(),
  establishedDate: z.date(),
  areaId: z.string(),
  forumId: z.string(),
  adminUserId: z.string(),
  admin: AdminSummaryDto,
  agentCount: z.number(),
  memberCount: z.number(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

// Units list with summary response (enhanced)
export const UnitsListWithSummaryResponseDto = z.object({
  summary: z.object({
    totalUnits: z.number(),
    totalAgents: z.number(),
    totalMembers: z.number(),
  }),
  items: z.array(UnitListItemDto),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

// Unit list response (simple)
export const UnitListResponseDto = z.array(UnitResponseDto);

// Units search response
export const UnitsSearchResponseDto = z.object({
  items: z.array(UnitResponseDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Type exports
export type ForumResponse = z.infer<typeof ForumResponseDto>;
export type ForumWithDetailsResponse = z.infer<typeof ForumWithDetailsResponseDto>;
export type ForumStatsResponse = z.infer<typeof ForumStatsResponseDto>;
export type ForumListResponse = z.infer<typeof ForumListResponseDto>;
export type ForumsSearchResponse = z.infer<typeof ForumsSearchResponseDto>;
export type AreaResponse = z.infer<typeof AreaResponseDto>;
export type AreaWithDetailsResponse = z.infer<typeof AreaWithDetailsResponseDto>;
export type AreaStatsResponse = z.infer<typeof AreaStatsResponseDto>;
export type AreasListWithSummaryResponse = z.infer<typeof AreasListWithSummaryResponseDto>;
export type AreaListResponse = z.infer<typeof AreaListResponseDto>;
export type AreasSearchResponse = z.infer<typeof AreasSearchResponseDto>;
export type UnitResponse = z.infer<typeof UnitResponseDto>;
export type UnitWithDetailsResponse = z.infer<typeof UnitWithDetailsResponseDto>;
export type UnitStatsResponse = z.infer<typeof UnitStatsResponseDto>;
export type UnitsListWithSummaryResponse = z.infer<typeof UnitsListWithSummaryResponseDto>;
export type UnitListResponse = z.infer<typeof UnitListResponseDto>;
export type UnitsSearchResponse = z.infer<typeof UnitsSearchResponseDto>;
