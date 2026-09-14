"use client";

import { useGetResourceItemQuery } from "@/store/slices/apiSlice";
import type { PublicResource } from "@/lib/types";
import { getImageFromItem, resolveMediaUrl } from "@/lib/media";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import DetailShell, {
  DetailDivider,
  DetailLinkChip,
  DetailPanel,
  type DetailBadge,
} from "@/components/shared/DetailShell";
import { Calendar, Clock, FileText, MapPin, Tag } from "lucide-react";
import { formatDate } from "@/lib/utils";

/**
 * What kind of record this page is showing.
 *
 * The narrative panel said "About this page" on every detail page in the site,
 * so a visitor on the Pediatrics Ward page was told they were reading about a
 * page. Naming the record is both more useful and what the surrounding
 * breadcrumb already promises.
 */
const RESOURCE_NOUN: Partial<Record<PublicResource, string>> = {
  departments: "Department",
  doctors: "Doctor",
  services: "Service",
  leadership: "Leadership",
  "leadership-history": "Former officer",
  news: "Article",
  announcements: "Announcement",
  gallery: "Album",
  pages: "Page",
  events: "Event",
  careers: "Vacancy",
  testimonials: "Testimonial",
  faqs: "Question",
  insurance: "Insurance",
  "emergency-services": "Emergency service",
  "health-education": "Health education",
  partnerships: "Partnership",
  downloads: "Document",
};

interface ResourceDetailProps {
  resource: PublicResource;
  slug: string;
  titleField?: "name" | "title";
  contentField?: "content" | "description" | "bio";
  backHref?: string;
  backLabel?: string;
  /** Server-fetched values for an instant hero while the client query loads. */
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string | null;
  width?: "prose" | "wide" | "full";
}

function estimateReadTime(text: string) {
  const words = text.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export default function ResourceDetail({
  resource,
  slug,
  titleField = "name",
  contentField = "content",
  backHref,
  backLabel = "Back",
  heroTitle,
  heroSubtitle,
  heroImage,
  width = "full",
}: ResourceDetailProps) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource,
    idOrSlug: slug,
  });

  if (isLoading) {
    return (
      <DetailShell
        title={heroTitle || "Loading"}
        subtitle={heroSubtitle}
        image={heroImage}
        backHref={backHref}
        backLabel={backLabel}
        width={width}
      >
        <DetailPanel>
          <DetailSkeleton />
        </DetailPanel>
      </DetailShell>
    );
  }

  if (isError || !data) {
    return (
      <DetailShell
        title="Not found"
        subtitle="This page may have been moved or is no longer available."
        backHref={backHref}
        backLabel={backLabel}
        width={width}
      >
        <DetailPanel>
          <EmptyState
            title="Not found"
            description="This page may have been moved or is no longer available."
          />
          {backHref && (
            <div className="mt-6">
              <DetailLinkChip href={backHref}>{backLabel}</DetailLinkChip>
            </div>
          )}
        </DetailPanel>
      </DetailShell>
    );
  }

  const item = data as Record<string, unknown>;
  const title = String(item[titleField] ?? item.title ?? item.name ?? heroTitle ?? "");
  const content = String(
    item[contentField] ?? item.description ?? item.bio ?? item.excerpt ?? ""
  );
  const rawImage = getImageFromItem(item);
  const image =
    (rawImage ? resolveMediaUrl(rawImage) ?? rawImage : null) ?? heroImage ?? null;

  const date =
    (item.published_at as string) ||
    (item.event_date as string) ||
    (item.created_at as string) ||
    null;
  const location = (item.location as string) || null;
  const category =
    (item.category as string) ||
    (item.department as string) ||
    (item.employment_type as string) ||
    null;
  const shortDesc =
    (item.short_description as string) ||
    (item.excerpt as string) ||
    heroSubtitle ||
    null;

  const readTime = content ? estimateReadTime(content) : null;

  const badges: DetailBadge[] = [];
  if (date) badges.push({ icon: Calendar, label: formatDate(date) ?? "", tone: "teal" });
  if (location) badges.push({ icon: MapPin, label: location, tone: "coral" });
  if (category) badges.push({ icon: Tag, label: category, tone: "brass" });
  if (readTime) badges.push({ icon: Clock, label: readTime, tone: "glass" });

  return (
    <DetailShell
      title={title}
      subtitle={shortDesc ?? undefined}
      image={image}
      badges={badges}
      backHref={backHref}
      backLabel={backLabel}
      width={width}
    >
      {/* The overview panel that used to open this page has been removed. It
          rendered `metaItems` — the same four facts the masthead prints as
          badges — followed by `shortDesc`, which is the masthead's own lede.
          Above it sat a section header reading "Overview · Full details ·
          Everything you need to know about this care offering", introducing
          content the reader had just finished. Three blocks, nothing new in any
          of them, before the narrative the visitor came for. */}
      {content ? (
        <DetailPanel tone={2}>
          <div className="nv-dpanel__label">
            <span className="nv-dpanel__icon" aria-hidden>
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="nv-dpanel__kicker">
                {RESOURCE_NOUN[resource] ?? "Narrative"}
              </p>
              {/* "About Pediatrics Ward", not "About this page". Falls back to
                  the generic wording only when the record has no title yet. */}
              <h3 className="nv-dpanel__title">
                {title ? `About ${title}` : "About this page"}
              </h3>
            </div>
          </div>
          {content.includes("<") ? (
            <Prose html={content} />
          ) : (
            <p className="nv-dplain">{content}</p>
          )}
        </DetailPanel>
      ) : (
        <DetailPanel>
          <EmptyState
            title="Details coming soon"
            description="This information will appear here once published."
          />
        </DetailPanel>
      )}

      {backHref && (
        <>
          <DetailDivider delay={0.08} />
          <div className="nv-dfooter">
            <DetailLinkChip href={backHref}>{backLabel}</DetailLinkChip>
          </div>
        </>
      )}
    </DetailShell>
  );
}
