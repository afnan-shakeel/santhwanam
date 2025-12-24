import { z } from 'zod';

/**
 * Response DTOs for Organization Bodies Module API
 * These schemas define the response structure for each endpoint
 */

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

// Area list response
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

// Unit list response
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
export type ForumListResponse = z.infer<typeof ForumListResponseDto>;
export type ForumsSearchResponse = z.infer<typeof ForumsSearchResponseDto>;
export type AreaResponse = z.infer<typeof AreaResponseDto>;
export type AreaListResponse = z.infer<typeof AreaListResponseDto>;
export type AreasSearchResponse = z.infer<typeof AreasSearchResponseDto>;
export type UnitResponse = z.infer<typeof UnitResponseDto>;
export type UnitListResponse = z.infer<typeof UnitListResponseDto>;
export type UnitsSearchResponse = z.infer<typeof UnitsSearchResponseDto>;
