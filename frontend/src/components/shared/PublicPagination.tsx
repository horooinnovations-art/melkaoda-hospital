import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicPaginationProps {
  currentPage: number;
  totalItems: number;
  perPage: number;
  basePath: string;
  className?: string;
}

export default function PublicPagination({
  currentPage,
  totalItems,
  perPage,
  basePath,
  className,
}: PublicPaginationProps) {
  const totalPages = Math.ceil(totalItems / perPage);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  // Generate page numbers array (with max 5 visible page numbers around current)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const createPageUrl = (page: number) => {
    if (page === 1) return basePath;
    return `${basePath}?page=${page}`;
  };

  return (
    <div
      className={cn(
        "mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 sm:flex-row",
        className
      )}
    >
      {/* Count summary */}
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Showing <span className="font-bold text-slate-900">{startItem}</span> to{" "}
        <span className="font-bold text-slate-900">{endItem}</span> of{" "}
        <span className="font-bold text-slate-900">{totalItems}</span> items
      </p>

      {/* Pagination controls */}
      <nav className="inline-flex items-center gap-1.5" aria-label="Pagination">
        {/* Previous page link */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-slate-50 hover:text-sky-600"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev</span>
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-300 pointer-events-none">
            <ChevronLeft className="h-4 w-4" />
            <span>Prev</span>
          </span>
        )}

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((num, i) => {
            if (num === "...") {
              return (
                <span
                  key={`ellipsis-${i}`}
                  className="flex h-10 w-8 items-center justify-center text-xs text-slate-400"
                >
                  ...
                </span>
              );
            }

            const pageNum = num as number;
            const isActive = pageNum === currentPage;

            return (
              <Link
                key={pageNum}
                href={createPageUrl(pageNum)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition",
                  isActive
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20 ring-1 ring-sky-400"
                    : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-300 hover:bg-slate-50 hover:text-sky-600"
                )}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {/* Next page link */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-slate-50 hover:text-sky-600"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-300 pointer-events-none">
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </nav>
    </div>
  );
}
