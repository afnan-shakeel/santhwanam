import { z } from 'zod'

export const UserDto = z.object({
  userId: z.string(),
  externalAuthId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  isActive: z.boolean(),
  userMetadata: z.any().nullable().optional(),
  createdAt: z.string(),
  lastSyncedAt: z.string().nullable().optional(),
})

export type User = z.infer<typeof UserDto>

export default UserDto

export const UsersSearchResponseDto = z.object({
  items: z.array(UserDto),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export type UsersSearchResponse = z.infer<typeof UsersSearchResponseDto>
