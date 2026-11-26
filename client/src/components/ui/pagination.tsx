import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** aria-label for the <nav> landmark. */
  label?: string;
  className?: string;
  /** When true, still render the "Showing … of …" summary on a single page. */
  showSummaryWhenSinglePage?: boolean;
}

type PageItem = number | "ellipsis";

function pageItems(page: number, totalPages: number): PageItem[] {
  const visible = new Set<number>(
    [1, totalPages, page - 1, page, page + 1].filter(
      (value) => value >= 1 && value <= totalPages,
    ),
  );
  const sorted = [...visible].sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous !== 0 && value - previous > 1) items.push("ellipsis");
    items.push(value);
    previous = value;
  }
  return items;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  label = "Pagination",
  className,
  showSummaryWhenSinglePage = false,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), safeTotalPages);
  const hasPager = safeTotalPages > 1;
  const showSummary = total > 0;

  if (!hasPager && !(showSummaryWhenSinglePage && showSummary)) return null;

  const safeLimit = Math.max(1, limit);
  const start = total === 0 ? 0 : (currentPage - 1) * safeLimit + 1;
  const end = Math.min(currentPage * safeLimit, total);
  const items = hasPager ? pageItems(currentPage, safeTotalPages) : [];

  return (
    <nav
      aria-label={label}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {showSummary ? (
        <p className="hidden text-sm text-body sm:block">
          Showing{" "}
          <span className="font-medium text-heading tabular">{start}</span>–
          <span className="font-medium text-heading tabular">{end}</span> of{" "}
          <span className="font-medium text-heading tabular">
            {total.toLocaleString("en-US")}
          </span>
        </p>
      ) : null}

      {hasPager ? (
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <span className="text-sm text-body tabular sm:hidden">
            Page {currentPage} of {safeTotalPages}
          </span>

          <div className="hidden items-center gap-1 sm:flex">
            {items.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  aria-hidden="true"
                  className="px-1 text-sm text-muted"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === currentPage ? "primary" : "ghost"}
                  size="sm"
                  className="h-9 min-w-9 px-2 tabular"
                  aria-current={item === currentPage ? "page" : undefined}
                  aria-label={`Go to page ${item}`}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              ),
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            aria-label="Next page"
            disabled={currentPage >= safeTotalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}