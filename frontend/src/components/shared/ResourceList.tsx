import { unstable_noStore } from "next/cache";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { fetchResourceList } from "@/lib/api";
import type { PublicResource } from "@/lib/types";
import { getImageFromItem, optimizeImageUrl } from "@/lib/media";
import { cleanPublicText, cn, isPublicItemActive, stripHtml, truncate } from "@/lib/utils";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import { NovaContentCard } from "@/components/nova/NovaCards";
import SmartImage from "@/components/shared/SmartImage";
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
}: ResourceListProps) {
  unstable_noStore();
  let items: Record<string, unknown>[] = [];
  let totalItems = 0;
  let failed = false;
  let errorMessage = "";

  try {
    const data = await fetchResourceList<Record<string, unknown>>(resource, {
      page,
      perPage,
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

  return (
    <div className="w-full">
      {layout === "editorial" && (
        <div className="nv-plist">
          {items.map((item, i) => {
            const title = cleanPublicText(
              String(item[titleField] ?? item.title ?? item.name ?? "")
            );
            const desc = cleanPublicText(
              String(item[descField] ?? item.excerpt ?? item.description ?? "")
            );
            const image = getImageFromItem(item);
            const slug = String(item.slug);
            const rawDate =
              (item.published_at as string) ||
              (item.event_date as string) ||
              (item.created_at as string) ||
              "";
            const date = rawDate ? formatDate(rawDate) : "";
            // "Featured" means top of the feed. Item 13 on page 2 is not the top
            // of anything, so the treatment is scoped to the first page.
            const featured = i === 0 && page === 1;

            return (
              <NovaReveal key={String(item.id)} from="up" delay={Math.min(i, 6) * 0.07}>
                <Link
                  href={`${basePath}/${slug}`}
                  className={cn("nv-post", featured && "nv-post--featured")}
                >
                  <span className="nv-post__media">
                    {image ? (
                      <SmartImage
                        src={optimizeImageUrl(image, 900) ?? image}
                        // Decorative: .nv-post__title carries this item's name in
                        // text directly beside the frame.
                        alt=""
                        fill
                        optimizeWidth={900}
                        className="nv-post__photo"
                        sizes="(max-width: 768px) 100vw, 45vw"
                      />
                    ) : (
                      <span className="nv-post__initial" aria-hidden>
                        {title.charAt(0)}
                      </span>
                    )}
                  </span>

                  <span className="nv-post__copy">
                    {date && <span className="nv-post__date">{date}</span>}
                    <span className="nv-post__title block">{title}</span>
                    {desc && (
                      <span className="nv-post__excerpt block">
                        {truncate(stripHtml(desc), featured ? 260 : 200)}
                      </span>
                    )}
                    <span className="nv-post__more">
                      <span className="nv-post__more-rule" aria-hidden />
                      Read more
                      <ArrowUpRight aria-hidden />
                    </span>
                  </span>
                </Link>
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
            // Generous budget: `.nv-card__desc` clamps to three rendered lines, so
            // the cut lands at a line end rather than at a character count.
            const desc = rawDesc ? truncate(stripHtml(rawDesc), 220) : undefined;
            const kicker =
              layout === "departments"
                ? "Clinical unit"
                : resource === "emergency-services"
                  ? "Emergency care"
                  : layout === "services"
                    ? "Clinical service"
                    : "Featured";

            return (
              <NovaReveal
                key={String(item.id)}
                from="up"
                delay={Math.min(Math.floor(i / 3), 5) * 0.12}
              >
                <NovaContentCard
                  href={`${basePath}/${String(item.slug)}`}
                  title={title}
                  description={desc}
                  image={getImageFromItem(item)}
                  kicker={kicker}
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
      />
    </div>
  );
}
