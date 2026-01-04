import { ZodError, z } from 'zod';
/**
 * Map arbitrary data to a Zod DTO schema and return the typed DTO.
 */
export function mapToDto(schema, data) {
    return schema.parse(data);
}
/**
 * Small Mapper utility class for mapping domain models to DTOs
 */
export class Mapper {
    static map(schema, data) {
        return mapToDto(schema, data);
    }
    /** Map an array of items to a DTO schema (convenience) */
    static mapArray(schema, data) {
        // Use z.array(schema).parse to validate the entire array at once
        const arrSchema = z.array(schema);
        return arrSchema.parse(data);
    }
    /**
     * Safe map that returns a result object instead of throwing.
     * Useful when you want to convert Zod validation errors into application errors.
     */
    static safeMap(schema, data) {
        try {
            const parsed = schema.parse(data);
            return { success: true, data: parsed };
        }
        catch (err) {
            if (err instanceof ZodError) {
                return { success: false, issues: err.issues };
            }
            // For non-Zod errors, rethrow
            throw err;
        }
    }
}
export default Mapper;
//# sourceMappingURL=mapper.js.map