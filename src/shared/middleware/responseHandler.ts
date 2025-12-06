import { Request, Response, NextFunction } from 'express'
import AppError from '@/shared/utils/error-handling/AppError'
import { Mapper } from '@/shared/utils/dto/mapper'

/**
 * Global response handler (error-style middleware).
 * Controllers may call `next({ SomeDto, payload, status })` or the shorter
 * form `next({ SomeDto, p })` where one property is a Zod schema (has `.parse`).
 *
 * This middleware detects that shape, runs Zod validation/mapping via Mapper,
 * and sends the JSON response. If validation fails it converts the issues
 * into an `AppError` and forwards to the normal error handler.
 */
export function responseHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (!err) return next()

  // If it's an AppError or looks like a real Error, forward to error handler
  if (err instanceof AppError || err instanceof Error || (err && typeof err.statusCode === 'number')) {
    return next(err)
  }
  // Expect the explicit shape: { dto: ZodSchema, data: any, status?: number }
  if (err && typeof err === 'object' && 'dto' in err) {
    const maybeSchema = (err as any).dto
    const data = (err as any).data
    const status = Number((err as any).status) || 200

    if (!maybeSchema || typeof maybeSchema !== 'object' || !('parse' in maybeSchema) || typeof (maybeSchema as any).parse !== 'function') {
      const appErr = new AppError('Invalid response DTO provided', 500, { provided: maybeSchema })
      return next(appErr)
    }

    try {
      const mapped = Mapper.safeMap(maybeSchema, data)
      if (!mapped.success) {
        const appErr = new AppError('Response validation failed', 500, mapped.issues)
        return next(appErr)
      }

      return res.status(status).json(mapped.data)
    } catch (e: any) {
      const appErr = new AppError('Response mapping error', 500, e?.message ?? e)
      return next(appErr)
    }
  }

  // Not a response instruction we understand — forward to normal error handling.
  return next(err)
}

export default responseHandler
