import { unstable_noStore } from "next/cache";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { fetchResourceList } from "@/lib/api";
import type { PublicResource } from "@/lib/types";
import { getImageFromItem, optimizeImageUrl } from "@/lib/media";
import { cleanPublicText, cn, isPublicItemActive, stripHtml, truncate } from "@/lib/utils";
import Reveal from "@/components/motion/Reveal";
import EmptyState from "@/components/shared/EmptyState";
import {
  DepartmentCard,
  ServiceCard,
} from "@/components/vitals/HomeShowcaseCards";
import FancyMediaCard from "@/components/shared/FancyMediaCard";
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
    // Determine friendly message: hide raw internal API/URL details from visitors
    const isNetworkError =
      errorMessage.includes("Invalid API response") ||
      errorMessage.includes("onrender.com") ||
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("ECONNREFUSED");
    const friendlyMessage = isNetworkError
      ? "Content is temporarily unavailable. Our team has been notified — please try refreshing the page in a moment."
      : errorMessage || "Something went wrong while fetching this section. Please try again shortly.";

    return (
      <EmptyState
        title="Unable to load content"
        description={friendlyMessage}
      />
    );
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

  return (
    <div className="w-full space-y-8">
      {layout === "editorial" && (
        <div className="space-y-5">
          {items.map((item, i) => {
            const title = cleanPublicText(
              String(item[titleField] ?? item.title ?? item.name ?? "")
            );
            const desc = cleanPublicText(
              String(item[descField] ?? item.excerpt ?? item.description ?? "")
            );
            const image = getImageFromItem(item);
            const slug = String(item.slug);
            const date =
              (item.published_at as string) ||
              (item.event_date as string) ||
              (item.created_at as string) ||
              "";
            const featured = i === 0 && page === 1;

            return (
              <Reveal key={String(item.id)} delay={Math.min(i, 6) * 0.05}>
                <Link
                  href={`${basePath}/${slug}`}
                  className={cn(
                    "v-home-news group",
                    featured && "v-home-news--featured"
                  )}
                >
                  <div
                    className={cn(
                      "v-home-news__media relative overflow-hidden bg-[#122033]",
                      featured
                        ? "min-h-[16rem] md:min-h-[20rem]"
                        : "aspect-[16/11] md:aspect-auto md:min-h-[14rem]"
                    )}
                  >
                    {image ? (
                      <SmartImage
                        src={optimizeImageUrl(image, 900) ?? image}
                        alt={title}
                        fill
                        optimizeWidth={900}
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 45vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0c1b2a] to-[#122033] font-display text-6xl text-sky-300/40">
                        {title.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center px-6 py-7 md:px-9 md:py-8">
                    {date && (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-mid">
                        {new Date(date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    <h3 className="mt-3 font-display text-2xl leading-tight text-[#0c1b2a] md:text-[1.85rem]">
                      {title}
                    </h3>
                    {desc && (
                      <p className="mt-3 text-sm leading-relaxed text-[#5a6e6a] md:text-[0.975rem]">
                        {truncate(desc, featured ? 220 : 160)}
                      </p>
                    )}
                    <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-mid">
                      <span className="h-px w-8 bg-current opacity-40 transition-all duration-500 group-hover:w-12" />
                      Read more
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}

      {layout === "services" && (
        <div className="g-compact-grid">
          {items.map((item, i) => {
            const title = String(item[titleField] ?? item.name ?? item.title ?? "");
            const rawDesc = String(
              item[descField] ?? item.short_description ?? item.description ?? ""
            );
            const desc = rawDesc
              ? truncate(stripHtml(rawDesc), 90)
              : undefined;
            const kicker =
              resource === "emergency-services" ? "Emergency care" : "Clinical service";
            const rowIndex = Math.floor(i / 2);
            const rowDelay = Math.min(rowIndex, 8) * 0.12;
            return (
              <Reveal
                key={String(item.id)}
                delay={rowDelay}
                className="h-full"
              >
                <ServiceCard
                  href={`${basePath}/${String(item.slug)}`}
                  title={title}
                  description={desc}
                  image={getImageFromItem(item)}
                  index={i}
                  kicker={kicker}
                  compact
                />
              </Reveal>
            );
          })}
        </div>
      )}

      {layout === "departments" && (
        <div className="g-compact-grid">
          {items.map((item, i) => {
            const title = String(item[titleField] ?? item.name ?? "");
            const rawDesc = String(
              item[descField] ?? item.short_description ?? item.description ?? ""
            );
            const desc = rawDesc
              ? truncate(stripHtml(rawDesc), 90)
              : undefined;
            const rowIndex = Math.floor(i / 2);
            const rowDelay = Math.min(rowIndex, 8) * 0.12;
            return (
              <Reveal
                key={String(item.id)}
                delay={rowDelay}
                className="h-full"
              >
                <DepartmentCard
                  href={`${basePath}/${String(item.slug)}`}
                  title={title}
                  description={desc}
                  image={getImageFromItem(item)}
                  index={i}
                  compact
                />
              </Reveal>
            );
          })}
        </div>
      )}

      {(layout === "grid" || layout === "ribbon") && (
        <div
          className={cn(
            "grid items-stretch gap-5",
            layout === "ribbon"
              ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {items.map((item, i) => {
            const title = String(item[titleField] ?? item.title ?? item.name ?? "");
            const desc = String(
              item[descField] ?? item.short_description ?? item.description ?? ""
            );
            const image = getImageFromItem(item);
            const slug = String(item.slug);
            const cta = layout === "ribbon" ? "Explore" : "Learn more";

            return (
              <FancyMediaCard
                key={String(item.id)}
                href={`${basePath}/${slug}`}
                title={title}
                description={desc ? truncate(stripHtml(desc), 140) : undefined}
                image={image}
                index={i + 1}
                cta={cta}
              />
            );
          })}
        </div>
      )}

      {/* Pagination Controls Bar */}
      <PublicPagination
        currentPage={page}
        totalItems={totalItems}
        perPage={perPage}
        basePath={basePath}
      />
    </div>
  );
}
