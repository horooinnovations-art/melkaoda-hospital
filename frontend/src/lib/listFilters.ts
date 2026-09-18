import { fetchResourceList } from "@/lib/api";
import type { PublicResource } from "@/lib/types";
import type { FilterOption } from "@/components/shared/ResourceSearchBar";

/**
 * Filter chips for a listing, built from the records themselves.
 *
 * Grouped by the relation the API now joins — a department's `category`, a
 * service's `department` — so every chip names something that exists and
 * carries a true count. Building them from the category table instead would
 * list Finance, IT and Human Resources as filters with nothing under them.
 *
 * One request for the whole table. List responses are excerpted, so this is
 * tens of kilobytes rather than the full articles.
 */
export async function buildFilterOptions(
  resource: PublicResource,
  relation: "category" | "department"
): Promise<{ options: FilterOption[]; total: number }> {
  try {
    const data = await fetchResourceList<Record<string, unknown>>(resource, {
      perPage: 100,
    });
    const rows = (data?.data ?? []) as Record<string, unknown>[];

    const groups = new Map<string, FilterOption>();
    for (const row of rows) {
      const related = row[relation] as { id?: unknown; name?: unknown } | null;
      if (!related || related.id == null || typeof related.name !== "string") continue;
      const value = String(related.id);
      const existing = groups.get(value);
      if (existing) existing.count += 1;
      else groups.set(value, { value, label: related.name.trim(), count: 1 });
    }

    const options = [...groups.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label)
    );
    return { options, total: data?.meta?.total ?? rows.length };
  } catch {
    // The bar still searches without chips; the listing reports its own error.
    return { options: [], total: 0 };
  }
}

/** A URL parameter reduced to a trimmed string, or undefined when empty. */
export function param(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}
