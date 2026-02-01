import { AlertCircle, BookOpen, RefreshCw } from "lucide-react";

import { useFlashcards } from "../hooks/useFlashcards";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

import { FlashcardCard } from "./FlashcardCard";
import { FlashcardFilters } from "./FlashcardFilters";
import { Pagination } from "./Pagination";

/**
 * Loading skeleton for flashcard grid
 */
function FlashcardSkeleton() {
  return (
    <Card className="h-52">
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state component when no flashcards exist
 */
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {hasFilters ? "No matching flashcards" : "No flashcards yet"}
      </h3>
      <p className="text-muted-foreground max-w-sm mb-4">
        {hasFilters
          ? "Try adjusting your filters or search term to find what you're looking for."
          : "Start by creating flashcards manually or generate them using AI."}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onReset}>
          Reset Filters
        </Button>
      )}
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
      <p className="text-muted-foreground max-w-sm mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

/**
 * Main flashcard list component.
 * Handles fetching, filtering, searching, and displaying flashcards.
 */
export function FlashcardList() {
  const {
    flashcards,
    total,
    isLoading,
    error,
    filters,
    setSource,
    setSearch,
    setSort,
    setOrder,
    resetFilters,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    refetch,
  } = useFlashcards();

  const hasActiveFilters = filters.source !== "all" || filters.search.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Header with title and count */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Flashcards</h1>
          <p className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <>
                {total} {total === 1 ? "flashcard" : "flashcards"} total
              </>
            )}
          </p>
        </div>

        {/* Refresh button */}
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <FlashcardFilters
        source={filters.source}
        search={filters.search}
        sort={filters.sort}
        order={filters.order}
        onSourceChange={setSource}
        onSearchChange={setSearch}
        onSortChange={setSort}
        onOrderChange={setOrder}
        onReset={resetFilters}
        isLoading={isLoading}
      />

      {/* Error state */}
      {error && !isLoading && <ErrorState message={error} onRetry={refetch} />}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <FlashcardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && flashcards.length === 0 && (
        <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
      )}

      {/* Flashcard grid */}
      {!isLoading && !error && flashcards.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {flashcards.map((flashcard) => (
              <FlashcardCard key={flashcard.id} flashcard={flashcard} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              onPageChange={goToPage}
              isLoading={isLoading}
            />

            {/* Page info */}
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * filters.limit + 1}–
              {Math.min(currentPage * filters.limit, total)} of {total}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
