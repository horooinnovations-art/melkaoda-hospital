"use client";

import { Calendar, Newspaper } from "lucide-react";
import { useGetResourceItemQuery } from "@/store/slices/apiSlice";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import DetailShell, {
  DetailDivider,
  DetailLinkChip,
  DetailPanel,
  type DetailBadge,
} from "@/components/shared/DetailShell";
import { getImageFromItem } from "@/lib/media";
import { formatDate, stripHtml } from "@/lib/utils";
import type { NewsItem } from "@/lib/types";
import SmartImage from "@/components/shared/SmartImage";

export default function NewsDetail({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource: "news",
    idOrSlug: slug,
  });

  if (isLoading) {
    return (
      <DetailShell title="Loading article" backHref="/news" backLabel="All News" width="prose">
        <DetailPanel>
          <DetailSkeleton />
        </DetailPanel>
      </DetailShell>
    );
  }

  if (isError || !data) {
    return (
      <DetailShell title="Article not found" backHref="/news" backLabel="All News" width="prose">
        <DetailPanel>
          <EmptyState title="Article not found" />
          <div className="mt-6">
            <DetailLinkChip href="/news">All News</DetailLinkChip>
          </div>
        </DetailPanel>
      </DetailShell>
    );
  }

  const item = data as NewsItem;
  const image = getImageFromItem(item as unknown as Record<string, unknown>);
  const subtitle = item.excerpt ? stripHtml(String(item.excerpt)) : undefined;

  const badges: DetailBadge[] = [];
  if (item.published_at) {
    badges.push({ icon: Calendar, label: formatDate(item.published_at), tone: "teal" });
  }

  return (
    <DetailShell
      title={item.title}
      subtitle={subtitle}
      image={image}
      badges={badges}
      backHref="/news"
      backLabel="All News"
      width="prose"
    >
      {/* No section header above the content. The three that used to open these
          pages — "Hospital news · Article", "Hospital page · Content", "Gallery ·
          Featured image" — restated the masthead directly above them and told a
          reader nothing they had not just read. */}
      {item.content || image ? (
        <DetailPanel>
          <div className="nv-dpanel__label">
            <span className="nv-dpanel__icon" aria-hidden>
              <Newspaper className="h-4 w-4" />
            </span>
            <div>
              <p className="nv-dpanel__kicker">Story</p>
              <h3 className="nv-dpanel__title">Full article</h3>
            </div>
          </div>



          {item.content ? (
            item.content.includes("<") ? (
              <Prose html={item.content} />
            ) : (
              <p className="nv-dplain">{item.content}</p>
            )
          ) : (
            <p className="text-sm text-slate-500">No additional text content available.</p>
          )}
        </DetailPanel>
      ) : (
        <DetailPanel>
          <EmptyState title="Article content coming soon" />
        </DetailPanel>
      )}

      <DetailDivider delay={0.08} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/news">More news</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
