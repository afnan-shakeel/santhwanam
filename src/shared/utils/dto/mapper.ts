import { ZodType, ZodError, z } from 'zod';

/**
 * Map arbitrary data to a Zod DTO schema and return the typed DTO.
 */
export function mapToDto<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Small Mapper utility class for mapping domain models to DTOs
 */
export class Mapper {
  static map<T>(schema: ZodType<T>, data: unknown): T {
    return mapToDto(schema, data);
  }

  /** Map an array of items to a DTO schema (convenience) */
  static mapArray<T>(schema: ZodType<T>, data: unknown): T[] {
    // Use z.array(schema).parse to validate the entire array at once
    const arrSchema = z.array(schema as any);
    return arrSchema.parse(data) as T[];
  }

  /**
   * Safe map that returns a result object instead of throwing.
   * Useful when you want to convert Zod validation errors into application errors.
   */
  static safeMap<T>(schema: ZodType<T>, data: unknown): { success: true; data: T } | { success: false; issues: any } {
    try {
      const parsed = schema.parse(data);
      return { success: true, data: parsed };
    } catch (err: any) {
      if (err instanceof ZodError) {
        return { success: false, issues: err.issues };
      }
      // For non-Zod errors, rethrow
      throw err;
    }
  }
}

export default Mapper;
