import { Request, Response, NextFunction } from 'express'
import { requestPasswordReset, resetPassword } from '@/modules/auth/application/passwordResetService'
import { supabase } from '@/shared/infrastructure/auth/client/supaBaseClient'
import prisma from '@/shared/infrastructure/prisma/prismaClient'
import AppError from '@/shared/utils/error-handling/AppError'
import { signAccessToken } from '@/shared/infrastructure/auth/jwtService'

export async function requestPasswordResetController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    await requestPasswordReset(email)
    return res.json({ message: 'If email exists, a reset link has been sent' })
  } catch (err) {
    console.error(err)
    next(err)
  }
}

export async function resetPasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body
    await resetPassword(token, newPassword)
    return res.json({ message: 'Password reset successful' })
  } catch (err) {
    next(err)
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({ email, password } as any)
    if (error) {
      console.error('Supabase login error:', error)
      return next(new AppError(error.message || 'Authentication failed', 401, error))}

    const session = (data as any)?.session
    const user = (data as any)?.user

    let localUser = null
    if (user && user.id) {
      localUser = await prisma.user.findUnique({ where: { externalAuthId: user.id } })
    }

    // Build our JWT payload from local user + supabase user
    const subjectId = localUser?.userId ?? user?.id
    // Fetch roles from local DB (if user exists locally)
    let roles: string[] = []
    if (localUser && localUser.userId) {
      const userRoles = await prisma.userRole.findMany({ where: { userId: localUser.userId }, include: { role: true } })
      roles = userRoles.map((ur: any) => ur.role?.roleCode).filter(Boolean)
    }

    const jwtPayload = {
      sub: subjectId,
      userId: subjectId,
      authUserId: user?.id,
      email: localUser?.email ?? user?.email,
      roles,
    }

    const appAccessToken = signAccessToken(jwtPayload)

    return res.json({
      // Our own signed access token
      accessToken: appAccessToken,
      // Keep Supabase refresh token if present (optional)
      refreshToken: session?.refresh_token ?? null,
      expiresAt: session?.expires_at ?? null,
      user: localUser ?? null,
      roles: roles
    })
  } catch (err) {
    next(err)
  }
}

export default { requestPasswordResetController, resetPasswordController, loginController }
