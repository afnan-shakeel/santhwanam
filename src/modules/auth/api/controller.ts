import { Request, Response, NextFunction } from 'express'
import { requestPasswordReset, resetPassword } from '@/modules/auth/application/passwordResetService'
import { supabase } from '@/shared/infrastructure/auth/client/supaBaseClient'
import prisma from '@/shared/infrastructure/prisma/prismaClient'
import AppError from '@/shared/utils/error-handling/AppError'
import { signAccessToken } from '@/shared/infrastructure/auth/jwtService'
import { asyncLocalStorage } from '@/shared/infrastructure/context'
import { AccessCheckResult } from '@/shared/types/auth.types'
import { buildAuthContext } from '@/shared/infrastructure/auth/helpers/buildAuthContext'
import { JWT_EXPIRES_IN } from '@/config/env';

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
      return next(new AppError(error.message || 'Authentication failed', 401, error))
    }

    const session = (data as any)?.session
    const user = (data as any)?.user

    let localUser = null
    if (user && user.id) {
      localUser = await prisma.user.findUnique({ where: { externalAuthId: user.id } })
    }

    if (!localUser) {
      return next(new AppError('User not found in system', 401))
    }

    // Build our JWT payload from local user + supabase user
    const subjectId = localUser.userId

    // Fetch roles from local DB
    const userRoles = await prisma.userRole.findMany({ 
      where: { userId: localUser.userId }, 
      include: { role: true } 
    })
    const roles = userRoles.map((ur: any) => ur.role?.roleCode).filter(Boolean)

    const jwtPayload = {
      sub: subjectId,
      userId: subjectId,
      authUserId: user?.id,
      email: localUser.email,
      roles,
    }

    const appAccessToken = signAccessToken(jwtPayload)

    // Build full AuthContext for the response
    const authContext = await buildAuthContext(localUser.userId)

    const expiresIn = JWT_EXPIRES_IN
    const expiresAt = calculateExpiresAt(expiresIn)
    return res.json({
      accessToken: appAccessToken,
      refreshToken: session?.refresh_token ?? null,
      expiresAt: expiresAt ?? null,
      authContext: authContext,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 * Returns the full AuthContext for the authenticated user
 */
export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    const authContext = asyncLocalStorage.tryGetAuthContext()

    if (!authContext) {
      return next(new AppError('Not authenticated', 401))
    }

    return res.json(authContext)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/check-access
 * Check if current user has access to a specific resource
 * Query params: resource (string), resourceId (string)
 */
export async function checkAccessController(req: Request, res: Response, next: NextFunction) {
  try {
    const { resource, resourceId } = req.query

    if (!resource || typeof resource !== 'string') {
      return next(new AppError('resource query parameter is required', 400))
    }

    if (!resourceId || typeof resourceId !== 'string') {
      return next(new AppError('resourceId query parameter is required', 400))
    }

    const authContext = asyncLocalStorage.tryGetAuthContext()

    if (!authContext) {
      const result: AccessCheckResult = { allowed: false, reason: 'Not authenticated' }
      return res.json(result)
    }

    // Check access based on resource type and user's scope/hierarchy
    const result = await checkResourceAccess(resource, resourceId, authContext)
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Check if user has access to a specific resource based on their scope and hierarchy
 */
async function checkResourceAccess(
  resource: string,
  resourceId: string,
  authContext: NonNullable<ReturnType<typeof asyncLocalStorage.tryGetAuthContext>>
): Promise<AccessCheckResult> {
  const { scope, hierarchy } = authContext

  // Super Admin (None scope) has access to everything
  if (scope.type === 'None') {
    return { allowed: true }
  }

  switch (resource) {
    case 'member': {
      const member = await prisma.member.findUnique({
        where: { memberId: resourceId },
        select: { memberId: true, agentId: true, unitId: true, areaId: true, forumId: true },
      })

      if (!member) {
        return { allowed: false, reason: 'Resource not found' }
      }

      // Check based on scope type
      if (scope.type === 'Member') {
        return hierarchy.memberId === member.memberId
          ? { allowed: true }
          : { allowed: false, reason: 'You can only access your own profile' }
      }
      if (scope.type === 'Agent') {
        return scope.entityId === member.agentId
          ? { allowed: true }
          : { allowed: false, reason: 'Member not in your scope' }
      }
      if (scope.type === 'Unit') {
        return scope.entityId === member.unitId
          ? { allowed: true }
          : { allowed: false, reason: 'Member not in your unit' }
      }
      if (scope.type === 'Area') {
        return scope.entityId === member.areaId
          ? { allowed: true }
          : { allowed: false, reason: 'Member not in your area' }
      }
      if (scope.type === 'Forum') {
        return scope.entityId === member.forumId
          ? { allowed: true }
          : { allowed: false, reason: 'Member not in your forum' }
      }
      break
    }

    case 'agent': {
      const agent = await prisma.agent.findUnique({
        where: { agentId: resourceId },
        select: { agentId: true, unitId: true, areaId: true, forumId: true },
      })

      if (!agent) {
        return { allowed: false, reason: 'Resource not found' }
      }

      // Member can only see their own agent
      if (scope.type === 'Member') {
        return hierarchy.agentId === agent.agentId
          ? { allowed: true }
          : { allowed: false, reason: 'Not your agent' }
      }
      // Agent can see themselves
      if (scope.type === 'Agent') {
        return scope.entityId === agent.agentId
          ? { allowed: true }
          : { allowed: false, reason: 'You can only access your own profile' }
      }
      if (scope.type === 'Unit') {
        return scope.entityId === agent.unitId
          ? { allowed: true }
          : { allowed: false, reason: 'Agent not in your unit' }
      }
      if (scope.type === 'Area') {
        return scope.entityId === agent.areaId
          ? { allowed: true }
          : { allowed: false, reason: 'Agent not in your area' }
      }
      if (scope.type === 'Forum') {
        return scope.entityId === agent.forumId
          ? { allowed: true }
          : { allowed: false, reason: 'Agent not in your forum' }
      }
      break
    }

    case 'wallet': {
      const wallet = await prisma.wallet.findUnique({
        where: { walletId: resourceId },
        include: {
          member: {
            select: { memberId: true, agentId: true, unitId: true, areaId: true, forumId: true },
          },
        },
      })

      if (!wallet || !wallet.member) {
        return { allowed: false, reason: 'Resource not found' }
      }

      const member = wallet.member

      if (scope.type === 'Member') {
        return hierarchy.memberId === member.memberId
          ? { allowed: true }
          : { allowed: false, reason: 'You can only access your own wallet' }
      }
      if (scope.type === 'Agent') {
        return scope.entityId === member.agentId
          ? { allowed: true }
          : { allowed: false, reason: 'Wallet owner not in your scope' }
      }
      if (scope.type === 'Unit') {
        return scope.entityId === member.unitId
          ? { allowed: true }
          : { allowed: false, reason: 'Wallet owner not in your unit' }
      }
      if (scope.type === 'Area') {
        return scope.entityId === member.areaId
          ? { allowed: true }
          : { allowed: false, reason: 'Wallet owner not in your area' }
      }
      if (scope.type === 'Forum') {
        return scope.entityId === member.forumId
          ? { allowed: true }
          : { allowed: false, reason: 'Wallet owner not in your forum' }
      }
      break
    }

    default:
      return { allowed: false, reason: `Unknown resource type: ${resource}` }
  }

  return { allowed: false, reason: 'Access denied' }
}

export default { 
  requestPasswordResetController, 
  resetPasswordController, 
  loginController,
  meController,
  checkAccessController
}

/**
 * Calculate the expiration timestamp (in seconds) from an expiration duration string
 * Accepts formats like: '7d', '1d', '24h', '3600s', etc.
 * @param expiresIn - Duration string (e.g., '7d', '24h', '3600s')
 * @returns Expiration timestamp in seconds (Unix epoch)
 * @example
 *   calculateExpiresAt('7d') // returns timestamp 7 days from now (in seconds)
 *   calculateExpiresAt('24h') // returns timestamp 24 hours from now (in seconds)
 *   calculateExpiresAt('3600s') // returns timestamp 1 hour from now (in seconds)
 */
function calculateExpiresAt(expiresIn: string): number {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  
  // Parse the expiration duration string
  const match = expiresIn.match(/^(\d+)([a-z])$/i);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}. Expected format like '7d', '24h', or '3600s'`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  let seconds = 0;
  switch (unit) {
    case 's':
      seconds = value;
      break;
    case 'm':
      seconds = value * 60;
      break;
    case 'h':
      seconds = value * 3600;
      break;
    case 'd':
      seconds = value * 86400; // 24 * 60 * 60
      break;
    case 'w':
      seconds = value * 604800; // 7 * 24 * 60 * 60
      break;
    case 'y':
      seconds = value * 31536000; // 365 * 24 * 60 * 60
      break;
    default:
      throw new Error(`Unsupported time unit: ${unit}. Supported units are: s, m, h, d, w, y`);
  }

  return now + seconds;
}
