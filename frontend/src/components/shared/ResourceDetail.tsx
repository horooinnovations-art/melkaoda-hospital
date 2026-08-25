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
  DetailMetaRow,
  DetailPanel,
  DetailSectionHeader,
  type DetailBadge,
} from "@/components/shared/DetailShell";
import { Calendar, Clock, FileText, MapPin, Tag } from "lucide-react";
import { formatDate } from "@/lib/utils";

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

  const metaItems = [
    date ? { icon: Calendar, label: formatDate(date) ?? "" } : null,
    location ? { icon: MapPin, label: location } : null,
    category ? { icon: Tag, label: category } : null,
    readTime ? { icon: Clock, label: readTime } : null,
  ].filter(Boolean) as { icon?: typeof Calendar; label: string }[];

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
      <DetailSectionHeader
        eyebrow="Overview"
        title="Full details"
        description="Everything you need to know about this care offering at Gambo General Hospital."
      />

      {(metaItems.length > 0 || shortDesc) && (
        <DetailPanel tone={1} className="g-detail-panel--overview">
          <DetailMetaRow items={metaItems} />
          {shortDesc && (
            <p className="g-detail-lede">{shortDesc}</p>
          )}
        </DetailPanel>
      )}

      <DetailDivider />

      {content ? (
        <DetailPanel tone={2}>
          <div className="g-detail-panel__label">
            <span className="g-detail-panel__icon" aria-hidden>
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="g-detail-panel__kicker">Narrative</p>
              <h3 className="g-detail-panel__title">About this page</h3>
            </div>
          </div>
          {content.includes("<") ? (
            <Prose html={content} />
          ) : (
            <p className="g-detail-plain">{content}</p>
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
          <div className="g-detail-footer">
            <DetailLinkChip href={backHref}>{backLabel}</DetailLinkChip>
          </div>
        </>
      )}
    </DetailShell>
  );
}
