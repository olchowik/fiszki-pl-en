import { Search, X } from "lucide-react";
import { memo, useCallback, useId, useState } from "react";

import type { FlashcardSortField, FlashcardSource, SortOrder } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface FlashcardFiltersProps {
  source: FlashcardSource | "all";
  search: string;
  sort: FlashcardSortField;
  order: SortOrder;
  onSourceChange: (source: FlashcardSource | "all") => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: FlashcardSortField) => void;
  onOrderChange: (order: SortOrder) => void;
  onReset: () => void;
  isLoading?: boolean;
}

/**
 * Filter controls for the flashcard list.
 * Includes search input, source filter, and sort options.
 */
export const FlashcardFilters = memo(function FlashcardFilters({
  source,
  search,
  sort,
  order,
  onSourceChange,
  onSearchChange,
  onSortChange,
  onOrderChange,
  onReset,
  isLoading,
}: FlashcardFiltersProps) {
  const searchId = useId();
  const sourceId = useId();
  const sortId = useId();
  const orderId = useId();

  const [searchInput, setSearchInput] = useState(search);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);

      // Debounce the actual search call
      const timeoutId = setTimeout(() => {
        onSearchChange(value);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [onSearchChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    onSearchChange("");
  }, [onSearchChange]);

  const handleReset = useCallback(() => {
    setSearchInput("");
    onReset();
  }, [onReset]);

  const hasActiveFilters = source !== "all" || search.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Search flashcards
        </label>
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={searchId}
          type="search"
          placeholder="Search in English or Polish..."
          value={searchInput}
          onChange={handleSearchChange}
          className="pl-10 pr-10"
          disabled={isLoading}
        />
        {searchInput && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Source filter */}
        <div className="flex items-center gap-2">
          <label htmlFor={sourceId} className="text-sm font-medium text-muted-foreground">
            Source:
          </label>
          <Select
            value={source}
            onValueChange={(value) => onSourceChange(value as FlashcardSource | "all")}
            disabled={isLoading}
          >
            <SelectTrigger id={sourceId} className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ai">AI Generated</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort field */}
        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-sm font-medium text-muted-foreground">
            Sort by:
          </label>
          <Select
            value={sort}
            onValueChange={(value) => onSortChange(value as FlashcardSortField)}
            disabled={isLoading}
          >
            <SelectTrigger id={sortId} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="updated_at">Updated Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort order */}
        <div className="flex items-center gap-2">
          <label htmlFor={orderId} className="text-sm font-medium text-muted-foreground">
            Order:
          </label>
          <Select
            value={order}
            onValueChange={(value) => onOrderChange(value as SortOrder)}
            disabled={isLoading}
          >
            <SelectTrigger id={orderId} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={isLoading}>
            <X className="h-4 w-4 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
});
