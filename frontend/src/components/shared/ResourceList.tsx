import { unstable_noStore } from "next/cache";
import { fetchResourceList } from "@/lib/api";
import type { PublicResource } from "@/lib/types";
import { getImageFromItem } from "@/lib/media";
import {
  cleanPublicText,
  isPublicItemActive,
  recordCategoryLabel,
  stripHtml,
  truncate,
} from "@/lib/utils";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import {
  NovaAtelierCard,
  NovaLedgerRow,
} from "@/components/nova/NovaInteriorCards";
import PublicPagination from "@/components/shared/PublicPagination";

interface ResourceListProps {
  resource: PublicResource;
  basePath: string;
  titleField?: "name" | "title";
  descField?: "short_description" | "description" | "excerpt";
  page?: number;
  perPage?: number;
  layout?: "grid" | "editorial" | "ribbon" | "services" | "departments";
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * Passed straight to the API: `search`, `category_id`, `department_id`.
   * The search runs on the server across every record, not on the twelve
   * already on screen — which is how the Doctors page does it, and why a
   * match on its second page is never found.
   */
  filters?: Record<string, string | number | undefined>;
  /** URL parameters the pager must preserve, keyed as they appear in the URL. */
  query?: Record<string, string | undefined>;
}

/** Long-form dates, formatted once so every layout agrees. */
function formatDate(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * What each resource calls itself.
 *
 * Every list on the site used to render the same two strings: "Featured" as the
 * kicker and "Read more" as the call to action. On a careers page that is a job
 * described as featured and an application described as more, which is two
 * chances to say something specific thrown away. The flag is what the top item
 * in a feed is labelled.
 */
const VOICE: Partial<
  Record<PublicResource, { kicker: string; cta: string; flag: string }>
> = {
  departments: { kicker: "Clinical unit", cta: "View department", flag: "Featured" },
  services: { kicker: "Clinical service", cta: "View service", flag: "Featured" },
  "emergency-services": { kicker: "Emergency care", cta: "View response", flag: "Urgent" },
  news: { kicker: "Newsroom", cta: "Read the story", flag: "Latest" },
  announcements: { kicker: "Official notice", cta: "Read the notice", flag: "Current" },
  events: { kicker: "Programme", cta: "See the programme", flag: "Next up" },
  careers: { kicker: "Open role", cta: "View the role", flag: "Now hiring" },
  "health-education": { kicker: "Health guide", cta: "Read the guide", flag: "Start here" },
  insurance: { kicker: "Coverage", cta: "View cover", flag: "Accepted" },
  partnerships: { kicker: "Collaboration", cta: "View partner", flag: "Principal" },
  gallery: { kicker: "Collection", cta: "Open collection", flag: "Featured" },
  pages: { kicker: "Information", cta: "Read more", flag: "Featured" },
};

export default async function ResourceList({
  resource,
  basePath,
  titleField = "name",
  descField = "short_description",
  page = 1,
  perPage = 12,
  layout = "grid",
  emptyTitle,
  emptyDescription,
  filters,
  query,
}: ResourceListProps) {
  unstable_noStore();
  let items: Record<string, unknown>[] = [];
  let totalItems = 0;
  let failed = false;
  let errorMessage = "";

  try {
    const extra = Object.fromEntries(
      Object.entries(filters ?? {}).filter(
        (entry): entry is [string, string | number] =>
          entry[1] !== undefined && entry[1] !== ""
      )
    );
    const data = await fetchResourceList<Record<string, unknown>>(resource, {
      page,
      perPage,
      ...extra,
    });
    const rawItems = (data?.data ?? []) as Record<string, unknown>[];
    items = rawItems.filter((item) => isPublicItemActive(item));
    totalItems = data?.meta?.total ?? items.length;
  } catch (err) {
    failed = true;
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  if (failed) {
    // Never surface the upstream host or the raw fetch error to a visitor.
    const isNetworkError =
      errorMessage.includes("Invalid API response") ||
      errorMessage.includes("onrender.com") ||
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("ECONNREFUSED");
    const friendlyMessage = isNetworkError
      ? "Content is temporarily unavailable. Our team has been notified — please try refreshing the page in a moment."
      : errorMessage || "Something went wrong while fetching this section. Please try again shortly.";

    return <EmptyState title="Unable to load content" description={friendlyMessage} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? "No items yet"}
        description={
          emptyDescription ??
          "We're preparing content for this section. Please check back soon."
        }
      />
    );
  }

  const isCardLayout =
    layout === "grid" ||
    layout === "ribbon" ||
    layout === "services" ||
    layout === "departments";

  // The kicker and the call to action used to be one generic pair for every
  // resource — "Featured" over "Read more", forty times down a page. Naming the
  // thing the visitor is about to open is the cheapest specificity there is.
  const voice = VOICE[resource] ?? {
    kicker: layout === "departments" ? "Clinical unit" : "Featured",
    cta: "Read more",
    flag: "Latest",
  };

  return (
    <div className="w-full">
      {layout === "editorial" && (
        <div className="nv-ledger">
          {items.map((item, i) => {
            const title = cleanPublicText(
              String(item[titleField] ?? item.title ?? item.name ?? "")
            );
            const desc = cleanPublicText(
              String(item[descField] ?? item.excerpt ?? item.description ?? "")
            );
            const rawDate =
              (item.published_at as string) ||
              (item.event_date as string) ||
              (item.created_at as string) ||
              "";
            // "Featured" means top of the feed. Item 13 on page 2 is not the top
            // of anything, so the treatment is scoped to the first page.
            const lead = i === 0 && page === 1;

            return (
              <NovaReveal key={String(item.id)} from="up" delay={Math.min(i, 6) * 0.07}>
                <NovaLedgerRow
                  href={`${basePath}/${String(item.slug)}`}
                  title={title}
                  excerpt={
                    desc ? truncate(stripHtml(desc), lead ? 260 : 200) : undefined
                  }
                  image={getImageFromItem(item)}
                  date={rawDate ? formatDate(rawDate) : undefined}
                  index={(page - 1) * perPage + i}
                  lead={lead}
                  flag={voice.flag}
                  cta={voice.cta}
                />
              </NovaReveal>
            );
          })}
        </div>
      )}

      {isCardLayout && (
        <div className={layout === "ribbon" ? "nv-grid-4" : "nv-grid-3"}>
          {items.map((item, i) => {
            const title = String(item[titleField] ?? item.name ?? item.title ?? "");
            const rawDesc = String(
              item[descField] ?? item.short_description ?? item.description ?? ""
            );
            // Generous budget: `.nv-xc__desc` clamps to three rendered lines, so
            // the cut lands at a line end rather than at a character count.
            const desc = rawDesc ? truncate(stripHtml(rawDesc), 220) : undefined;

            return (
              <NovaReveal
                key={String(item.id)}
                from="up"
                delay={Math.min(Math.floor(i / 3), 5) * 0.12}
              >
                <NovaAtelierCard
                  href={`${basePath}/${String(item.slug)}`}
                  title={title}
                  description={desc}
                  image={getImageFromItem(item)}
                  kicker={recordCategoryLabel(item) || voice.kicker}
                  cta={voice.cta}
                  index={(page - 1) * perPage + i}
                  compact={layout === "ribbon"}
                />
              </NovaReveal>
            );
          })}
        </div>
      )}

      <PublicPagination
        currentPage={page}
        totalItems={totalItems}
        perPage={perPage}
        basePath={basePath}
        query={query}
      />
    </div>
  );
}
