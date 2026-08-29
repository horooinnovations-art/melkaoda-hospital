"use client";

import { Briefcase } from "lucide-react";
import { useGetResourceItemQuery } from "@/store/slices/apiSlice";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import SmartImage from "@/components/shared/SmartImage";
import DetailShell, {
  DetailDivider,
  DetailLinkChip,
  DetailPanel,
  type DetailBadge,
} from "@/components/shared/DetailShell";
import { getImageFromItem } from "@/lib/media";
import type { Leader } from "@/lib/types";

export default function LeaderDetail({
  slug,
  heroTitle,
  heroSubtitle,
}: {
  slug: string;
  heroTitle?: string;
  heroSubtitle?: string;
}) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource: "leadership",
    idOrSlug: slug,
  });

  if (isLoading) {
    return (
      <DetailShell
        title={heroTitle || "Loading leader"}
        subtitle={heroSubtitle}
        backHref="/leadership"
        backLabel="All Leadership"
        width="wide"
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
        title="Leader not found"
        backHref="/leadership"
        backLabel="All Leadership"
        width="wide"
      >
        <DetailPanel>
          <EmptyState title="Leader not found" />
          <div className="mt-6">
            <DetailLinkChip href="/leadership">All Leadership</DetailLinkChip>
          </div>
        </DetailPanel>
      </DetailShell>
    );
  }

  const leader = data as Leader;
  const image = getImageFromItem(leader as unknown as Record<string, unknown>);
  const name = leader.name || heroTitle || "Leader";
  const office = leader.position || heroSubtitle || "Leadership";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "LD";

  const badges: DetailBadge[] = [
    { icon: Briefcase, label: office, tone: "teal" },
  ];

  return (
    <DetailShell
      title={name}
      subtitle={office}
      badges={badges}
      backHref="/leadership"
      backLabel="All Leadership"
      width="wide"
    >
      <article className="g-office">
        <header className="g-office__head">
          <div className="g-office__copy">
            <p className="g-office__kicker">Hospital leadership</p>
            <p className="g-office__role">{office}</p>
            <h2 className="g-office__name">{name}</h2>
          </div>
          <div className="g-office__photo">
            {image ? (
              <SmartImage
                src={image}
                alt={name}
                fill
                optimizeWidth={640}
                className="object-cover object-[center_20%]"
                sizes="(max-width: 768px) 100vw, 320px"
                priority
              />
            ) : (
              <span className="g-office__fallback">{initials}</span>
            )}
          </div>
        </header>

        <section className="g-office__body">
          <h3 className="g-office__section">Profile</h3>
          {leader.bio ? (
            leader.bio.includes("<") ? (
              <Prose html={leader.bio} />
            ) : (
              <p className="g-office__plain">{leader.bio}</p>
            )
          ) : (
            <p className="g-office__plain">
              A full leadership profile will appear here once published.
            </p>
          )}
        </section>
      </article>

      <DetailDivider delay={0.08} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/leadership">Back to leadership</DetailLinkChip>
        <DetailLinkChip href="/leadership/history">
          Leadership history
        </DetailLinkChip>
      </div>
    </DetailShell>
  );
}
