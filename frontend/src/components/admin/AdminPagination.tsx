"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminPaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  isFetching?: boolean;
  className?: string;
}

function buildPages(current: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => pages.add(n));
  if (current >= last - 2) [last - 1, last - 2, last - 3].forEach((n) => pages.add(n));
  const sorted = [...pages].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

export default function AdminPagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  isFetching,
  className,
}: AdminPaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const pages = buildPages(safePage, lastPage);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-t border-[var(--ld-line)] bg-transparent px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ld-muted)]">
        <span>
          Showing{" "}
          <span className="font-semibold text-[var(--ld-ink)]">
            {from}–{to}
          </span>{" "}
          of <span className="font-semibold text-[var(--ld-ink)]">{total}</span>
        </span>
        {onPerPageChange && (
          <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
            <span className="text-[var(--ld-faint)]">Per page</span>
            <select
              value={perPage}
              disabled={isFetching}
              onChange={(e) => {
                onPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-9 rounded-md border border-[var(--ld-line-strong)] bg-white/5 px-2.5 text-sm font-medium text-[var(--ld-ink)] outline-none transition focus:ring-2 focus:ring-[var(--ld-accent)]"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n} className="bg-[#0d1424] text-[var(--ld-ink)]">
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="ld-btn h-9"
          disabled={safePage <= 1 || isFetching}
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((item, idx) =>
            item === "…" ? (
              <span key={`e-${idx}`} className="px-1 text-[var(--ld-faint)]">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                disabled={isFetching}
                onClick={() => onPageChange(item)}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium transition",
                  item === safePage
                    ? "bg-[var(--ld-accent)] font-bold text-[#080d18] shadow-sm"
                    : "text-[var(--ld-muted)] hover:bg-white/10 hover:text-[var(--ld-ink)]"
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="ld-btn h-9"
          disabled={safePage >= lastPage || isFetching}
          onClick={() => onPageChange(safePage + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
