import AppError from '@/shared/utils/error-handling/AppError';
/**
 * Global response handler (error-style middleware).
 * Controllers call `next({ responseSchema, data, status })` where responseSchema
 * is a Zod schema used to parse and shape the response data.
 *
 * This middleware detects that shape, parses/shapes data using the schema,
 * and sends the JSON response.
 */
export function responseHandler(err, req, res, next) {
    if (!err)
        return next();
    // If it's an AppError or looks like a real Error, forward to error handler
    if (err instanceof AppError || err instanceof Error || (err && typeof err.statusCode === 'number')) {
        return next(err);
    }
    // Expect the explicit shape: { responseSchema: ZodSchema, data: any, status?: number }
    const isZodResponse = err && typeof err === 'object' && 'responseSchema' in err;
    if (isZodResponse) {
        const maybeSchema = err.responseSchema;
        const data = err.data;
        const status = Number(err.status) || 200;
        if (!maybeSchema || typeof maybeSchema !== 'object' || !('parse' in maybeSchema) || typeof maybeSchema.parse !== 'function') {
            const appErr = new AppError('Invalid response schema provided', 500, { provided: maybeSchema });
            return next(appErr);
        }
        try {
            const shaped = maybeSchema.parse(data);
            return res.status(status).json(shaped);
        }
        catch (e) {
            const appErr = new AppError('Response parsing error', 500, e?.message ?? e);
            return next(appErr);
        }
    }
    // finally if data and status are present, send response
    if (err.data && err.status) {
        return res.status(err.status).json(err.data);
    }
    // Not a response instruction we understand — forward to normal express response
    return next(err);
}
export default responseHandler;
//# sourceMappingURL=responseHandler.js.map