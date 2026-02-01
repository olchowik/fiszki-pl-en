import { useCallback, useEffect, useState, useTransition } from "react";

import type {
  FlashcardListResponseDTO,
  FlashcardQueryParams,
  FlashcardResponseDTO,
  FlashcardSortField,
  FlashcardSource,
  SortOrder,
} from "../../types";

/**
 * State interface for the useFlashcards hook
 */
interface FlashcardsState {
  flashcards: FlashcardResponseDTO[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Filter state for flashcard queries
 */
export interface FlashcardFilters {
  source: FlashcardSource | "all";
  search: string;
  sort: FlashcardSortField;
  order: SortOrder;
  limit: number;
  offset: number;
}

/**
 * Default filter values
 */
const DEFAULT_FILTERS: FlashcardFilters = {
  source: "all",
  search: "",
  sort: "created_at",
  order: "desc",
  limit: 12,
  offset: 0,
};

/**
 * Builds query string from filter parameters
 */
function buildQueryString(filters: FlashcardFilters): string {
  const params = new URLSearchParams();

  if (filters.source !== "all") {
    params.set("source", filters.source);
  }
  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  params.set("limit", String(filters.limit));
  params.set("offset", String(filters.offset));
  params.set("sort", filters.sort);
  params.set("order", filters.order);

  return params.toString();
}

/**
 * Custom hook for managing flashcard data fetching and state.
 * Handles API integration, filtering, search, pagination, and sorting.
 *
 * @returns Object containing flashcard data, loading state, error state, and control functions
 */
export function useFlashcards() {
  const [state, setState] = useState<FlashcardsState>({
    flashcards: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FILTERS);
  const [isPending, startTransition] = useTransition();

  /**
   * Fetches flashcards from the API with current filters
   */
  const fetchFlashcards = useCallback(async (currentFilters: FlashcardFilters) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const queryString = buildQueryString(currentFilters);
      const response = await fetch(`/api/flashcards?${queryString}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to view your flashcards");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch flashcards");
      }

      const data: FlashcardListResponseDTO = await response.json();

      setState({
        flashcards: data.data,
        total: data.meta.total,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }));
    }
  }, []);

  // Fetch flashcards when filters change
  useEffect(() => {
    fetchFlashcards(filters);
  }, [filters, fetchFlashcards]);

  /**
   * Updates the source filter
   */
  const setSource = useCallback((source: FlashcardSource | "all") => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, source, offset: 0 }));
    });
  }, []);

  /**
   * Updates the search filter
   */
  const setSearch = useCallback((search: string) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, search, offset: 0 }));
    });
  }, []);

  /**
   * Updates the sort field
   */
  const setSort = useCallback((sort: FlashcardSortField) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, sort, offset: 0 }));
    });
  }, []);

  /**
   * Updates the sort order
   */
  const setOrder = useCallback((order: SortOrder) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, order, offset: 0 }));
    });
  }, []);

  /**
   * Navigates to a specific page
   */
  const goToPage = useCallback((page: number) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        offset: (page - 1) * prev.limit,
      }));
    });
  }, []);

  /**
   * Resets all filters to defaults
   */
  const resetFilters = useCallback(() => {
    startTransition(() => {
      setFilters(DEFAULT_FILTERS);
    });
  }, []);

  /**
   * Manually refetch flashcards
   */
  const refetch = useCallback(() => {
    fetchFlashcards(filters);
  }, [fetchFlashcards, filters]);

  // Calculate pagination info
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(state.total / filters.limit);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    // Data
    flashcards: state.flashcards,
    total: state.total,

    // Loading states
    isLoading: state.isLoading || isPending,
    error: state.error,

    // Filters
    filters,
    setSource,
    setSearch,
    setSort,
    setOrder,
    resetFilters,

    // Pagination
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,

    // Actions
    refetch,
  };
}
