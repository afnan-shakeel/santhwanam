import { z } from 'zod'

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

export default { requestPasswordResetSchema, resetPasswordSchema }

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
