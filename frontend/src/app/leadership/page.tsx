"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
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
        title="Our Leadership"
        eyebrow="Hospital leadership"
        subtitle="The people responsible for strategy, clinical quality, and day-to-day hospital direction."
        breadcrumbs={[{ label: "Leadership" }]}
      />

      <div className="g-board-page">
        <div className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-16">
          <div className="g-board-page__toolbar">
            <div>
              <p className="g-board-page__kicker">Current board</p>
              <p className="g-board-page__note">
                Office holders guiding Gambo General Hospital.
              </p>
            </div>
            <Link href="/leadership/history" className="g-board-page__history">
              Leadership history
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <GridSkeleton count={4} />
          ) : isError ? (
            <EmptyState title="Unable to load leadership" />
          ) : leaders.length === 0 ? (
            <EmptyState title="Leadership profiles coming soon" />
          ) : (
            <div className="g-board-stack">
              {leaders.map((leader, i) => {
                const image = getImageFromItem(
                  leader as unknown as Record<string, unknown>
                );
                return (
                  <Reveal key={leader.id} delay={Math.min(i, 6) * 0.04}>
                    <OfficerProfile
                      href={`/leadership/${leader.slug}`}
                      name={leader.name}
                      position={leader.position || undefined}
                      summary={leader.short_bio || leader.bio || undefined}
                      image={image}
                      index={i}
                    />
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
