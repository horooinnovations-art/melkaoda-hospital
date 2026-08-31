"use client";

import { Briefcase, UserRound, ShieldCheck, Sparkles, Building2, History } from "lucide-react";
import Link from "next/link";
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
import { cleanPublicText } from "@/lib/utils";

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
  const rawName = leader.name || heroTitle || "Leader";
  const name = cleanPublicText(rawName) || rawName;
  const office = leader.position ? cleanPublicText(String(leader.position)) : heroSubtitle || "Hospital Leadership";
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
      width="full"
    >
      <div className="nv-dsplit items-start gap-8">
        {/* Prominent Uncropped Leader Portrait Card */}
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
                {initials}
              </div>
            )}

            {/* Position Pill */}
            <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-900/20 bg-amber-900/90 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-md shadow-md">
              <Building2 className="h-3 w-3 text-amber-300" />
              Executive
            </span>

            {/* Sparkle Badge */}
            <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-900/20 bg-amber-900/90 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-md shadow-md">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Governance
            </span>
          </div>

          <div className="p-6 border-t border-amber-900/10 bg-amber-50/40">
            <h3 className="font-display text-xl font-bold text-slate-900 leading-tight">{name}</h3>
            <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-amber-800">
              {office}
            </p>
            <p className="mt-3 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              Executive Council · Melka Oda General Hospital
            </p>
          </div>
        </DetailPanel>

        {/* Spacious, Wide Description & Biography Card */}
        <div className="nv-dstack flex-1 space-y-6">
          <DetailPanel delay={0.08} className="p-6 sm:p-8 lg:p-10 border border-amber-900/20 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 rounded-2xl shadow-xl">
            <div className="nv-dpanel__label mb-6 pb-4 border-b border-amber-900/10">
              <span className="nv-dpanel__icon flex h-10 w-10 items-center justify-center rounded-xl bg-amber-900 text-amber-100 shadow-md" aria-hidden>
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <p className="nv-dpanel__kicker text-amber-800 font-mono text-xs font-semibold uppercase tracking-widest">Executive Profile</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">{name}</h2>
                <p className="font-mono text-xs font-medium text-amber-900/80 uppercase tracking-wider mt-0.5">{office}</p>
              </div>
            </div>

            {leader.bio ? (
              leader.bio.includes("<") ? (
                <Prose html={leader.bio} />
              ) : (
                <div className="space-y-4 text-base sm:text-lg leading-relaxed text-slate-700 font-sans">
                  <p>{leader.bio}</p>
                </div>
              )
            ) : (
              <p className="text-slate-500 italic text-base">
                A full executive biography and organizational profile for {name} will be updated shortly.
              </p>
            )}

            {/* Executive Summary Pills */}
            <div className="mt-8 pt-6 border-t border-amber-900/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-900/10 bg-white/80 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0" />
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Institutional Governance</p>
                  <p className="text-xs font-semibold text-slate-800">Executive Leadership</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-900/10 bg-white/80 shadow-sm">
                <Building2 className="h-5 w-5 text-amber-700 shrink-0" />
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Organization</p>
                  <p className="text-xs font-semibold text-slate-800">Melka Oda General Hospital</p>
                </div>
              </div>
            </div>
          </DetailPanel>
        </div>
      </div>

      <DetailDivider delay={0.12} />
      <div className="nv-dfooter flex flex-wrap gap-3">
        <DetailLinkChip href="/leadership">Back to leadership</DetailLinkChip>
        <DetailLinkChip href="/leadership/history">
          Leadership history
        </DetailLinkChip>
      </div>
    </DetailShell>
  );
}
