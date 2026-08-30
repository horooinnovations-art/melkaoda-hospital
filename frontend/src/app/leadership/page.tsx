"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import { SITE_NAME } from "@/lib/api";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import { OfficerProfile } from "@/components/shared/PeopleProfiles";
import { getImageFromItem } from "@/lib/media";
import type { Leader } from "@/lib/types";

import { isPublicItemActive } from "@/lib/utils";

export default function LeadershipPage() {
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "leadership",
    perPage: 50,
  });

  const rawLeaders = (data?.data ?? []) as Leader[];
  const leaders = rawLeaders.filter((l) =>
    isPublicItemActive(l as unknown as Record<string, unknown>)
  );

  return (
    <PageTransition>
      <PageHero
        section="/leadership"
        title="Hospital"
        accent="Leadership"
        eyebrow="Who is accountable"
        subtitle="The office holders responsible for clinical quality, strategy and the day-to-day direction of the hospital — and what each of them holds."
        stats={
          leaders.length
            ? [{ value: String(leaders.length), label: "Office holders" }]
            : undefined
        }
        breadcrumbs={[{ label: "Leadership" }]}
      />

      <PageBody narrow>
          <div className="nv-toolbar">
            <div>
              <p className="nv-toolbar__kicker">Current board</p>
              <p className="nv-toolbar__note">
                Office holders currently in post at {SITE_NAME}.
              </p>
            </div>
            <Link href="/leadership/history" className="nv-toolbar__link">
              Leadership history
              <ArrowRight aria-hidden />
            </Link>
          </div>

          {isLoading ? (
            <GridSkeleton count={4} />
          ) : isError ? (
            <EmptyState title="Unable to load leadership" />
          ) : leaders.length === 0 ? (
            <EmptyState title="Leadership profiles coming soon" />
          ) : (
            <div className="nv-board-stack">
              {leaders.map((leader, i) => {
                const image = getImageFromItem(
                  leader as unknown as Record<string, unknown>
                );
                return (
                  <NovaReveal key={leader.id} from="up" delay={Math.min(i, 6) * 0.08}>
                    <OfficerProfile
                      href={`/leadership/${leader.slug}`}
                      name={leader.name}
                      position={leader.position || undefined}
                      summary={leader.short_bio || leader.bio || undefined}
                      image={image}
                      index={i}
                    />
                  </NovaReveal>
                );
              })}
            </div>
          )}
      </PageBody>
    </PageTransition>
  );
}
