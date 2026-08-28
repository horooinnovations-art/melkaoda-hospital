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

/**
 * List-page pager.
 *
 * Rebuilt in Nova terms: mono numerals in hairline cells, and the current page
 * marked by a warmed border plus a short champagne rule under the numeral. The
 * old active state was a sky-to-teal gradient pill, which on this canvas would
 * have been the only saturated object on the page.
 */
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

  // Up to five numbered cells around the current page; the rest collapse to an
  // ellipsis so the row never wraps on a phone.
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

  const createPageUrl = (page: number) =>
    page === 1 ? basePath : `${basePath}?page=${page}`;

  return (
    <div className={cn("nv-pager", className)}>
      <p className="nv-pager__count">
        Showing <b>{startItem}</b>–<b>{endItem}</b> of <b>{totalItems}</b>
      </p>

      <nav className="nv-pager__nav" aria-label="Pagination">
        {currentPage > 1 ? (
          <Link href={createPageUrl(currentPage - 1)} className="nv-pager__step">
            <ChevronLeft aria-hidden />
            Prev
          </Link>
        ) : (
          <span className="nv-pager__step nv-pager__step--off" aria-hidden>
            <ChevronLeft />
            Prev
          </span>
        )}

        {getPageNumbers().map((num, i) =>
          num === "..." ? (
            <span key={`gap-${i}`} className="nv-pager__gap" aria-hidden>
              …
            </span>
          ) : (
            <Link
              key={num}
              href={createPageUrl(num as number)}
              aria-current={num === currentPage ? "page" : undefined}
              className={cn(
                "nv-pager__page",
                num === currentPage && "nv-pager__page--on"
              )}
            >
              {num}
            </Link>
          )
        )}

        {currentPage < totalPages ? (
          <Link href={createPageUrl(currentPage + 1)} className="nv-pager__step">
            Next
            <ChevronRight aria-hidden />
          </Link>
        ) : (
          <span className="nv-pager__step nv-pager__step--off" aria-hidden>
            Next
            <ChevronRight />
          </span>
        )}
      </nav>
    </div>
  );
}
