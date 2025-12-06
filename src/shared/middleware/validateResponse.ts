import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { InternalServerError } from '@/shared/utils/error-handling/httpErrors';

/**
 * Middleware to validate outgoing JSON responses with a Zod schema.
 * Use `schema.parse()` to ensure the response conforms to the DTO.
 */
export const validateResponse = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const oldJson = res.json;
  res.json = function (this: Response, data: any) {
    try {
      const validated = schema.parse(data);
      return oldJson.call(this, validated);
    } catch (err: any) {
        console.error('Response validation error:', err);
      const isZod = err instanceof ZodError;
      if (isZod) {
        // Response payload doesn't match declared DTO — treat as server error
        return next(new InternalServerError('Response validation failed', err.issues));
      }
      return next(err);
    }
  } as typeof res.json;

  return next();
};

export default validateResponse;
