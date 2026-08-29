"use client";

import { FileText } from "lucide-react";
import { useGetResourceItemQuery } from "@/store/slices/apiSlice";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import DetailShell, {
  DetailDivider,
  DetailLinkChip,
  DetailPanel,
  DetailSectionHeader,
} from "@/components/shared/DetailShell";
import { getImageFromItem } from "@/lib/media";
import { stripHtml } from "@/lib/utils";
import type { Page } from "@/lib/types";

export default function CmsPage({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource: "pages",
    idOrSlug: slug,
  });

  if (isLoading) {
    return (
      <DetailShell title="Loading page" width="prose">
        <DetailPanel>
          <DetailSkeleton />
        </DetailPanel>
      </DetailShell>
    );
  }

  if (isError || !data) {
    return (
      <DetailShell
        title="Page not found"
        subtitle="This page doesn't exist or has been removed."
        width="prose"
      >
        <DetailPanel>
          <EmptyState
            title="Page not found"
            description="This page doesn't exist or has been removed."
          />
          <div className="mt-6">
            <DetailLinkChip href="/">Back to home</DetailLinkChip>
          </div>
        </DetailPanel>
      </DetailShell>
    );
  }

  const page = data as Page;
  const image = getImageFromItem(page as unknown as Record<string, unknown>);
  const subtitle = page.excerpt ? stripHtml(String(page.excerpt)) : undefined;

  return (
    <DetailShell title={page.title} subtitle={subtitle} image={image} width="prose">
      <DetailSectionHeader
        eyebrow="Hospital page"
        title="Content"
        description="Official information from Gambo General Hospital."
      />

      {page.content ? (
        <DetailPanel>
          <div className="nv-dpanel__label">
            <span className="nv-dpanel__icon" aria-hidden>
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="nv-dpanel__kicker">Document</p>
              <h3 className="nv-dpanel__title">Full page</h3>
            </div>
          </div>
          {page.content.includes("<") ? (
            <Prose html={page.content} />
          ) : (
            <p className="nv-dplain whitespace-pre-line">{page.content}</p>
          )}
        </DetailPanel>
      ) : (
        <DetailPanel>
          <EmptyState
            title="Content coming soon"
            description="This page will appear here once published."
          />
        </DetailPanel>
      )}

      <DetailDivider delay={0.08} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/">Back to home</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
