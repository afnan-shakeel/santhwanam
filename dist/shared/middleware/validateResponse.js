import { ZodError } from 'zod';
import { InternalServerError } from '@/shared/utils/error-handling/httpErrors';
/**
 * Middleware to validate outgoing JSON responses with a Zod schema.
 * Use `schema.parse()` to ensure the response conforms to the DTO.
 */
export const validateResponse = (schema) => (req, res, next) => {
    const oldJson = res.json;
    res.json = function (data) {
        try {
            const validated = schema.parse(data);
            return oldJson.call(this, validated);
        }
        catch (err) {
            console.error('Response validation error:', err);
            const isZod = err instanceof ZodError;
            if (isZod) {
                // Response payload doesn't match declared DTO — treat as server error
                return next(new InternalServerError('Response validation failed', err.issues));
            }
            return next(err);
        }
    };
    return next();
};
export default validateResponse;
//# sourceMappingURL=validateResponse.js.map