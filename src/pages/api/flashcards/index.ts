import type { APIContext } from "astro";
import { ZodError } from "zod";

import {
  badRequestResponse,
  createSuccessResponse,
  internalServerErrorResponse,
  logError,
  unauthorizedResponse,
} from "../../../lib/errors";
import { getFlashcards } from "../../../lib/services/flashcard.service";
import { parseFlashcardQueryParams } from "../../../lib/validations/flashcard-query.schema";

/**
 * Disable prerendering for API routes.
 * This ensures the endpoint is server-rendered on each request.
 */
export const prerender = false;

/**
 * GET /api/flashcards
 *
 * Retrieves a paginated list of flashcards for the authenticated user.
 * Supports optional filtering by source, full-text search, sorting, and pagination.
 *
 * Query Parameters:
 * - source (optional): Filter by 'ai' or 'manual'
 * - search (optional): Search term for sentence_en or translation_pl
 * - limit (optional): Max results (default: 100, max: 500)
 * - offset (optional): Pagination offset (default: 0)
 * - sort (optional): Sort field ('created_at' or 'updated_at', default: 'created_at')
 * - order (optional): Sort order ('asc' or 'desc', default: 'desc')
 *
 * Returns:
 * - 200: FlashcardListResponseDTO with data array and pagination meta
 * - 400: Validation error for invalid query parameters
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export async function GET(context: APIContext): Promise<Response> {
  const { locals, url } = context;
  const supabase = locals.supabase;

  // 1. Authentication check - get current user from Supabase session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse();
  }

  // 2. Parse and validate query parameters
  let validatedParams;
  try {
    validatedParams = parseFlashcardQueryParams(url.searchParams);
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.errors[0];
      const errorMessage = `Invalid query parameter '${firstError.path.join(".")}': ${firstError.message}`;
      return badRequestResponse(errorMessage);
    }

    // Log and return 500 for unexpected validation errors
    logError("Unexpected validation error", {
      userId: user.id,
      endpoint: "/api/flashcards",
      method: "GET",
      error,
    });
    return internalServerErrorResponse();
  }

  // 3. Fetch flashcards using service
  try {
    const result = await getFlashcards(supabase, user.id, validatedParams);
    return createSuccessResponse(result);
  } catch (error) {
    logError("Failed to fetch flashcards", {
      userId: user.id,
      endpoint: "/api/flashcards",
      method: "GET",
      params: validatedParams,
      error,
    });

    return internalServerErrorResponse();
  }
}
