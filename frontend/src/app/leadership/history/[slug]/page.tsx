"use client";

import { use } from "react";
import Link from "next/link";
import { Award, UserRound, Calendar, Sparkles, CheckCircle2, History, ArrowLeft } from "lucide-react";
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
import { formatYear, cleanPublicText } from "@/lib/utils";

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

  const rawName = leader.name as string;
  const name = cleanPublicText(rawName) || rawName;
  const position = leader.position ? cleanPublicText(String(leader.position)) : undefined;
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
      width="full"
    >
      <DetailSectionHeader
        eyebrow="Hospital Governance"
        title="Legacy Leader Profile"
        description="Tenure, executive biography, and lasting contributions to Melka Oda General Hospital."
      />

      <div className="nv-dsplit items-start gap-8">
        {/* Fancy Uncropped Leader Portrait Card */}
        <DetailPanel className="nv-portrait !h-auto self-start border border-[rgba(212,175,55,0.35)] bg-[linear-gradient(145deg,rgba(255,255,255,0.99),rgba(252,249,242,0.98))] shadow-2xl rounded-2xl transition-all duration-500 hover:border-[rgba(255,215,0,0.65)] hover:shadow-2xl overflow-hidden" delay={0.04}>
          <div className="relative h-[260px] sm:h-[300px] w-full overflow-hidden bg-gradient-to-b from-amber-50/60 via-white to-amber-50/30 p-2">
            {image ? (
              <SmartImage
                src={image}
                alt={name}
                fill
                optimizeWidth={720}
                className="object-contain object-bottom p-1 transition-transform duration-700 ease-out hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 360px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-5xl font-bold text-amber-900/30">
                {name.charAt(0)}
              </div>
            )}

            {/* Glowing Tenure Pill */}
            <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-900/20 bg-amber-900/90 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-md shadow-md">
              <Calendar className="h-3 w-3 text-amber-300" />
              {tenure}
            </span>

            {/* Legacy Badge */}
            <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-900/20 bg-amber-900/90 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-md shadow-md">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Legacy Leader
            </span>
          </div>

          <div className="p-6 border-t border-amber-900/10 bg-amber-50/40">
            <h3 className="font-display text-xl font-bold text-slate-900 leading-tight">{name}</h3>
            {position && (
              <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-amber-800">
                {position}
              </p>
            )}
            <p className="mt-3 text-xs font-mono text-slate-600 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              Tenure: {tenure}
            </p>
          </div>
        </DetailPanel>

        {/* Content Stack: Biography & Achievements */}
        <div className="nv-dstack flex-1 space-y-6">
          {bio ? (
            <DetailPanel delay={0.08} className="p-6 sm:p-8 lg:p-10 border border-amber-900/20 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 rounded-2xl shadow-xl">
              <div className="nv-dpanel__label mb-6 pb-4 border-b border-amber-900/10">
                <span className="nv-dpanel__icon flex h-10 w-10 items-center justify-center rounded-xl bg-amber-900 text-amber-100 shadow-md" aria-hidden>
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="nv-dpanel__kicker text-amber-800 font-mono text-xs font-semibold uppercase tracking-widest">Executive Biography</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">{name}</h2>
                  {position && <p className="font-mono text-xs font-medium text-amber-900/80 uppercase tracking-wider mt-0.5">{position}</p>}
                </div>
              </div>
              {bio.includes("<") ? (
                <Prose html={bio} />
              ) : (
                <div className="space-y-4 text-base sm:text-lg leading-relaxed text-slate-700 font-sans">
                  <p>{bio}</p>
                </div>
              )}
            </DetailPanel>
          ) : null}

          {achievements.length > 0 ? (
            <DetailPanel delay={0.14} className="p-6">
              <div className="nv-dpanel__label mb-4">
                <span className="nv-dpanel__icon" aria-hidden>
                  <Award className="h-4 w-4 text-amber-700" />
                </span>
                <div>
                  <p className="nv-dpanel__kicker">Key Highlights</p>
                  <h3 className="nv-dpanel__title">Major Contributions & Tenure Achievements</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {achievements.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 rounded-xl border border-amber-900/10 bg-amber-50/50 p-3.5 transition-all hover:bg-amber-50">
                    <CheckCircle2 className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-slate-800 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </DetailPanel>
          ) : null}

          {!bio && achievements.length === 0 ? (
            <DetailPanel className="p-6">
              <EmptyState
                title="Profile details coming soon"
                description="A full biography and achievements record will appear here once published."
              />
            </DetailPanel>
          ) : null}
        </div>
      </div>

      <DetailDivider delay={0.16} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/leadership/history">Back to History</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
