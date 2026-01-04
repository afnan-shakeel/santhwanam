import { ZodError } from 'zod';
import { UnprocessableEntityError } from '@/shared/utils/error-handling/httpErrors';
// Middleware factory to validate request bodies with Zod schemas centrally
export const validateBody = (schema) => async (req, _res, next) => {
    try {
        // parseAsync returns the parsed value; replace req.body with the parsed value
        const parsed = await schema.parseAsync(req.body);
        req.body = parsed;
        return next();
    }
    catch (err) {
        // instanceof may fail across module boundaries; also check err.name
        const isZod = err instanceof ZodError;
        if (isZod) {
            const details = err.issues;
            return next(new UnprocessableEntityError('Invalid request payload', details));
        }
        return next(err);
    }
};
export default validateBody;
// Validate query parameters (req.query)
export const validateQuery = (schema) => async (req, _res, next) => {
    try {
        // parseAsync will validate/coerce query shape; replace req.query
        const parsed = await schema.parseAsync(req.query);
        req.query = parsed;
        return next();
    }
    catch (err) {
        const isZod = err instanceof ZodError;
        if (isZod) {
            const details = err.issues;
            return next(new UnprocessableEntityError('Invalid query parameters', details));
        }
        return next(err);
    }
};
// Validate route params (req.params)
export const validateParams = (schema) => async (req, _res, next) => {
    try {
        const parsed = await schema.parseAsync(req.params);
        req.params = parsed;
        return next();
    }
    catch (err) {
        const isZod = err instanceof ZodError;
        if (isZod) {
            const details = err.issues;
            return next(new UnprocessableEntityError('Invalid route parameters', details));
        }
        return next(err);
    }
};
//# sourceMappingURL=validateZod.js.map