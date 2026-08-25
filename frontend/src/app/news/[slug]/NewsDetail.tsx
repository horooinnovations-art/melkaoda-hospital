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
  DetailSectionHeader,
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
      <DetailSectionHeader
        eyebrow="Hospital news"
        title="Article"
        description="Updates and stories from Gambo General Hospital."
      />

      {item.content || image ? (
        <DetailPanel>
          <div className="g-detail-panel__label">
            <span className="g-detail-panel__icon" aria-hidden>
              <Newspaper className="h-4 w-4" />
            </span>
            <div>
              <p className="g-detail-panel__kicker">Story</p>
              <h3 className="g-detail-panel__title">Full article</h3>
            </div>
          </div>

          {/* Full uncropped featured image banner with refined hover movement */}
          {image && (
            <div className="group relative mb-8 aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900/10 shadow-lg transition-all duration-500 hover:-translate-y-1 hover:border-sky-300/80 hover:shadow-xl hover:shadow-sky-500/15 cursor-pointer isolate">
              {/* Backdrop blur */}
              <SmartImage
                src={image}
                alt=""
                fill
                optimizeWidth={120}
                className="object-cover blur-2xl scale-125 opacity-35 select-none pointer-events-none transition-opacity duration-700 group-hover:opacity-55"
                aria-hidden
              />
              {/* Full uncropped image strictly contained inside card boundaries with elegant zoom */}
              <SmartImage
                src={image}
                alt={item.title}
                fill
                priority
                optimizeWidth={1200}
                className="object-contain p-2 transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                sizes="(max-width: 768px) 100vw, 800px"
              />
              {/* Light sweep animation overlay strictly contained */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none z-10" />
            </div>
          )}

          {item.content ? (
            item.content.includes("<") ? (
              <Prose html={item.content} />
            ) : (
              <p className="g-detail-plain">{item.content}</p>
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
      <div className="g-detail-footer">
        <DetailLinkChip href="/news">More news</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
