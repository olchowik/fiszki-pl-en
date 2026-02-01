import { z } from "zod";

/**
 * Zod schema for validating flashcard query parameters.
 * Used to validate query string parameters for GET /api/flashcards endpoint.
 */
export const flashcardQuerySchema = z.object({
  /**
   * Filter by flashcard source type.
   * Valid values: 'ai' or 'manual'
   */
  source: z.enum(["ai", "manual"]).optional(),

  /**
   * Search term to match against sentence_en or translation_pl fields.
   * Maximum length: 200 characters (matching flashcard field limits)
   */
  search: z.string().max(200, "Search term cannot exceed 200 characters").optional(),

  /**
   * Maximum number of results to return.
   * Default: 100, Min: 1, Max: 500
   */
  limit: z
    .string()
    .refine((val) => /^\d+$/.test(val), "Limit must be a valid integer")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, "Limit must be at least 1").max(500, "Limit cannot exceed 500"))
    .optional()
    .default("100"),

  /**
   * Number of records to skip for pagination.
   * Default: 0, Min: 0
   */
  offset: z
    .string()
    .refine((val) => /^\d+$/.test(val), "Offset must be a valid integer")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0, "Offset cannot be negative"))
    .optional()
    .default("0"),

  /**
   * Field to sort by.
   * Valid values: 'created_at' or 'updated_at'
   * Default: 'created_at'
   */
  sort: z.enum(["created_at", "updated_at"]).optional().default("created_at"),

  /**
   * Sort order direction.
   * Valid values: 'asc' or 'desc'
   * Default: 'desc'
   */
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Type inferred from the flashcard query schema.
 * This represents the validated and transformed query parameters.
 */
export type FlashcardQuerySchemaOutput = z.output<typeof flashcardQuerySchema>;

/**
 * Parse and validate query parameters from URLSearchParams.
 * Returns validated FlashcardQueryParams or throws ZodError.
 *
 * @param searchParams - URLSearchParams from the request URL
 * @returns Validated query parameters with defaults applied
 * @throws ZodError if validation fails
 */
export function parseFlashcardQueryParams(searchParams: URLSearchParams): FlashcardQuerySchemaOutput {
  // Helper to convert empty strings to undefined
  const getParam = (key: string): string | undefined => {
    const value = searchParams.get(key);
    return value === "" ? undefined : value ?? undefined;
  };

  const rawParams = {
    source: getParam("source"),
    search: getParam("search"),
    limit: getParam("limit"),
    offset: getParam("offset"),
    sort: getParam("sort"),
    order: getParam("order"),
  };

  return flashcardQuerySchema.parse(rawParams);
}
