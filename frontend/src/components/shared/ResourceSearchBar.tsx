"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

export type FilterOption = {
  /** The id sent to the API. */
  value: string;
  label: string;
  /** How many records fall under it, across every page. */
  count: number;
};

/**
 * Search and filter bar for the Departments and Services listings, laid out
 * like the one on the Doctors page.
 *
 * It differs from the Doctors page in one respect, deliberately. That page
 * filters the twelve records already fetched for the current page, so a
 * specialist on page two cannot be found from page one. This one writes the
 * query into the URL, and the listing passes it to the API, which searches every
 * record. The URL also means a search survives a refresh and can be shared.
 */
export default function ResourceSearchBar({
  placeholder,
  filterLabel,
  filterParam,
  options,
  total,
}: {
  placeholder: string;
  /** Heading for the chip row, e.g. "Category" or "Department". */
  filterLabel: string;
  /** URL parameter the chips write, e.g. "category". */
  filterParam: string;
  options: FilterOption[];
  /** Records in the unfiltered list, for the "All" chip. */
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentQuery = searchParams?.get("q") ?? "";
  const currentFilter = searchParams?.get(filterParam) ?? "";
  const [text, setText] = useState(currentQuery);

  // Keep the box in step when the URL changes underneath it (back button).
  useEffect(() => {
    setText(currentQuery);
  }, [currentQuery]);

  /** Rewrite the URL, always dropping `page`: a new query starts at page one. */
  const navigate = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  // Debounced: one request after the visitor pauses, not one per keystroke.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const trimmed = text.trim();
    if (trimmed === currentQuery) return;
    const handle = window.setTimeout(() => navigate({ q: trimmed }), 350);
    return () => window.clearTimeout(handle);
    // navigate is rebuilt each render; the inputs that matter are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-mono font-medium transition-all ${
      active
        ? "bg-amber-900 text-amber-100 shadow-sm"
        : "bg-white border border-amber-900/15 text-slate-700 hover:border-amber-600 hover:bg-amber-50"
    }`;

  return (
    <div className="mb-8 space-y-5 rounded-2xl border border-[rgba(212,175,55,0.25)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(252,249,242,0.99))] p-4 shadow-lg shadow-[rgba(0,0,0,0.03)] sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/60" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-xl border border-amber-900/20 bg-white/90 py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          {text ? (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-amber-900/80">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {currentQuery ? `Results for “${currentQuery}”` : `${total} in total`}
        </span>
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-amber-900/10 pt-2">
          <span className="mr-2 font-mono text-xs uppercase tracking-wider text-slate-500">
            {filterLabel}:
          </span>
          <button
            type="button"
            onClick={() => navigate({ [filterParam]: "" })}
            className={chip(!currentFilter)}
            aria-pressed={!currentFilter}
          >
            All ({total})
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => navigate({ [filterParam]: option.value })}
              className={chip(currentFilter === option.value)}
              aria-pressed={currentFilter === option.value}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
