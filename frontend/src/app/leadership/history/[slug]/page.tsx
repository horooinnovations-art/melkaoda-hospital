"use client";

import { use } from "react";
import { Award, UserRound } from "lucide-react";
import { useGetResourceItemQuery } from "@/store/slices/apiSlice";
import SmartImage from "@/components/shared/SmartImage";
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
import { formatYear } from "@/lib/utils";

function parseAchievements(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default function LeadershipHistoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: historyData, isLoading: historyLoading, isError: historyError } =
    useGetResourceItemQuery({
      resource: "leadership-history",
      idOrSlug: slug,
    });

  const { data: currentData, isLoading: currentLoading } = useGetResourceItemQuery(
    {
      resource: "leadership",
      idOrSlug: slug,
    },
    { skip: historyLoading || !historyError }
  );

  const isLoading = historyLoading || currentLoading;
  const isError = historyError && !currentData && !currentLoading;
  const leader = (historyData || currentData) as Record<string, unknown> | undefined;

  if (isLoading) {
    return (
      <DetailShell
        title="Loading profile"
        backHref="/leadership/history"
        backLabel="Back to History"
        width="wide"
      >
        <DetailPanel>
          <DetailSkeleton />
        </DetailPanel>
      </DetailShell>
    );
  }

  if (isError || !leader) {
    return (
      <DetailShell
        title="Leader not found"
        subtitle="The requested profile could not be found."
        backHref="/leadership/history"
        backLabel="Back to History"
        width="wide"
      >
        <DetailPanel>
          <EmptyState
            title="Leader not found"
            description="The requested profile could not be found."
          />
          <div className="mt-6">
            <DetailLinkChip href="/leadership/history">Back to History</DetailLinkChip>
          </div>
        </DetailPanel>
      </DetailShell>
    );
  }

  const name = leader.name as string;
  const position = leader.position as string | undefined;
  const image = getImageFromItem(leader);
  const achievements = parseAchievements(leader.achievements || leader.certifications);
  const bio = (leader.bio || leader.short_bio) as string | undefined;

  const tenure = `${formatYear(leader.tenure_start as string) || "—"} — ${
    leader.tenure_end ? formatYear(leader.tenure_end as string) : "Present"
  }`;
  const badges: DetailBadge[] = [{ icon: Award, label: tenure, tone: "brass" }];

  return (
    <DetailShell
      title={name}
      subtitle={position}
      image={null}
      imageMode="ambient"
      badges={badges}
      backHref="/leadership/history"
      backLabel="Back to History"
      width="wide"
    >
      <DetailSectionHeader
        eyebrow="Leadership history"
        title="Legacy profile"
        description="Tenure, biography, and lasting contributions."
      />

      <div className="nv-dsplit">
        <DetailPanel className="nv-portrait" delay={0.04}>
          <div className="nv-portrait__media">
            {image ? (
              <SmartImage
                src={image}
                // Decorative: .nv-portrait__name prints this person's name under
                // the frame, and the page <h1> carries it too.
                alt=""
                fill
                optimizeWidth={720}
                className="nv-portrait__img object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
            ) : (
              <div className="nv-portrait__fallback" aria-hidden>
                {name.charAt(0)}
              </div>
            )}
            <span className="nv-portrait__veil" aria-hidden />
            <span className="nv-portrait__badge">Leader</span>
          </div>
          <div className="nv-portrait__info">
            <p className="nv-portrait__name">{name}</p>
            {position && <p className="nv-portrait__role">{position}</p>}
            <p className="nv-portrait__dept">{tenure}</p>
          </div>
        </DetailPanel>

        <div className="nv-dstack">
          {bio ? (
            <DetailPanel delay={0.1}>
              <div className="nv-dpanel__label">
                <span className="nv-dpanel__icon" aria-hidden>
                  <UserRound />
                </span>
                <div>
                  <p className="nv-dpanel__kicker">Biography</p>
                  <h3 className="nv-dpanel__title">{name}</h3>
                </div>
              </div>
              {bio.includes("<") ? (
                <Prose html={bio} />
              ) : (
                <p className="nv-dplain">{bio}</p>
              )}
            </DetailPanel>
          ) : null}

          {achievements.length > 0 ? (
            <DetailPanel delay={0.16}>
              <div className="nv-dpanel__label">
                <span className="nv-dpanel__icon" aria-hidden>
                  <Award />
                </span>
                <div>
                  <p className="nv-dpanel__kicker">Highlights</p>
                  <h3 className="nv-dpanel__title">Key achievements</h3>
                </div>
              </div>
              <ul className="nv-achieve">
                {achievements.map((item, j) => (
                  <li key={j}>
                    <span className="nv-achieve__dot" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </DetailPanel>
          ) : null}

          {!bio && achievements.length === 0 ? (
            <DetailPanel>
              <EmptyState
                title="Profile details coming soon"
                description="A full biography will appear here once published."
              />
            </DetailPanel>
          ) : null}
        </div>
      </div>

      <DetailDivider delay={0.12} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/leadership/history">Back to History</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
