import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useCallback, useMemo } from "react";

import { Button } from "../ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Pagination controls with page numbers and navigation buttons.
 * Shows a smart range of page numbers around the current page.
 */
export const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  isLoading,
}: PaginationProps) {
  // Don't render if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  /**
   * Generate array of page numbers to display.
   * Shows first, last, and pages around current page with ellipsis.
   */
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      // Add ellipsis if there's a gap after first page
      if (start > 2) {
        pages.push("ellipsis");
      }

      // Add pages around current page
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if there's a gap before last page
      if (end < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (hasPrevPage) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, hasPrevPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (hasNextPage) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, hasNextPage, onPageChange]);

  return (
    <nav
      className="flex items-center justify-center gap-1"
      role="navigation"
      aria-label="Pagination"
    >
      {/* Previous button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevPage}
        disabled={!hasPrevPage || isLoading}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-muted-foreground"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isCurrentPage = page === currentPage;

          return (
            <Button
              key={page}
              variant={isCurrentPage ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(page)}
              disabled={isCurrentPage || isLoading}
              aria-label={`Go to page ${page}`}
              aria-current={isCurrentPage ? "page" : undefined}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Next button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextPage}
        disabled={!hasNextPage || isLoading}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
});
