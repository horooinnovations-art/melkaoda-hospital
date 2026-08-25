"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Search,
  X,
  User,
  Clock,
  Building2,
  Eye,
  ArrowRight,
  Calendar,
  BookOpen,
} from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import type { Leader, LeadershipHistory } from "@/lib/types";
import { formatYear, stripHtml } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type TimelineLeader = {
  id: number;
  name: string;
  position?: string;
  bio?: string;
  achievements?: unknown;
  tenure_start?: string | null;
  tenure_end?: string | null;
  photo?: unknown;
  slug?: string;
};

function parseYear(val?: string | null): number {
  if (!val) return 0;
  const y = parseInt(formatYear(val) ?? "0", 10);
  return isNaN(y) ? 0 : y;
}

export default function LeadershipHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLeader, setActiveLeader] = useState<TimelineLeader | null>(null);

  const historyQuery = useGetResourceListQuery({
    resource: "leadership-history",
    perPage: 100,
  });
  const leadershipQuery = useGetResourceListQuery({
    resource: "leadership",
    perPage: 48,
  });

  const history = (historyQuery.data?.data ?? []) as LeadershipHistory[];
  const current = (leadershipQuery.data?.data ?? []) as Leader[];

  const rawLeaders: TimelineLeader[] =
    history.length > 0
      ? history
      : current.map((leader) => ({
          id: leader.id,
          name: leader.name,
          position: leader.position,
          bio: leader.bio || leader.short_bio,
          achievements: leader.certifications,
          tenure_start: null,
          tenure_end: null,
          photo: leader.photo,
          slug: leader.slug,
          ...(leader as unknown as Record<string, unknown>),
        }));

  // Sort chronologically: oldest tenure_start first; null dates go to the end
  const chronological = useMemo(() => {
    return [...rawLeaders].sort((a, b) => {
      const ay = parseYear(a.tenure_start);
      const by = parseYear(b.tenure_start);
      if (ay === 0 && by === 0) return 0;
      if (ay === 0) return 1;
      if (by === 0) return -1;
      return ay - by;
    });
  }, [rawLeaders]);

  const filteredLeaders = useMemo(() => {
    if (!searchQuery.trim()) return chronological;
    const q = searchQuery.toLowerCase();
    return chronological.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.position && l.position.toLowerCase().includes(q))
    );
  }, [chronological, searchQuery]);

  const isLoading =
    historyQuery.isLoading ||
    (history.length === 0 && leadershipQuery.isLoading);
  const isError = historyQuery.isError && leadershipQuery.isError;

  return (
    <PageTransition>
      <PageHero
        title="Leadership History"
        eyebrow="Our heritage"
        subtitle="A chronological chronicle of the directors and visionaries who have guided Gambo General Hospital — from our founding to today."
        breadcrumbs={[
          { label: "Leadership", href: "/leadership" },
          { label: "History" },
        ]}
      />

      {/* Standard site background — matches all other pages */}
      <div className="g-pagebody relative -mx-[calc((100vw-100%)/2)] w-screen">
        <div className="g-pagebody__aura" aria-hidden />
        <div className="g-pagebody__mesh" aria-hidden />

        <div className="relative z-[1] mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-16">

          {/* Top toolbar */}
          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/leadership"
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-sky-700 transition-all hover:border-sky-300 hover:bg-sky-100"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Current Board
              </Link>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
                <Building2 className="h-3.5 w-3.5 text-sky-600" />
                <span className="text-xs font-semibold text-slate-600">
                  {rawLeaders.length} recorded officer{rawLeaders.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name or position…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-slate-200 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:ring-sky-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Chronological note */}
          <p className="mb-8 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            Listed from earliest to most recent tenure
          </p>

          {/* Content */}
          {isLoading ? (
            <GridSkeleton count={6} />
          ) : isError || filteredLeaders.length === 0 ? (
            <EmptyState
              title={
                searchQuery
                  ? "No matching leaders found"
                  : "Leadership history being compiled"
              }
              description={
                searchQuery
                  ? "Try a different name or position."
                  : "Our historic archive is being prepared. Check back soon."
              }
            />
          ) : (
            <div className="relative">
              {/* Vertical timeline spine (desktop only) */}
              <div
                className="absolute left-[2.35rem] top-5 hidden h-[calc(100%-2.5rem)] w-px md:block"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, #0ea5e9 8%, #0ea5e9 92%, transparent)",
                  opacity: 0.25,
                }}
                aria-hidden
              />

              <div className="space-y-6">
                {filteredLeaders.map((leader, i) => {
                  const image = getImageFromItem(
                    leader as unknown as Record<string, unknown>
                  );
                  const startYear = formatYear(leader.tenure_start) || "—";
                  const endYear = leader.tenure_end
                    ? formatYear(leader.tenure_end)
                    : "Present";
                  const shortBio = leader.bio
                    ? stripHtml(leader.bio).slice(0, 200)
                    : "";
                  const linkHref = `/leadership/history/${
                    leader.slug || leader.id
                  }`;
                  const isPresent = !leader.tenure_end;

                  return (
                    <Reveal key={leader.id} delay={Math.min(i, 10) * 0.06}>
                      <div className="relative flex gap-5 md:gap-7">
                        {/* Timeline node */}
                        <div className="relative z-10 hidden flex-shrink-0 flex-col items-center md:flex">
                          <div
                            className={`mt-5 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm ${
                              isPresent
                                ? "border-sky-500 bg-sky-500 text-white shadow-sky-200"
                                : "border-sky-300 bg-white text-sky-600"
                            }`}
                          >
                            <span className="text-[10px] font-bold leading-none">
                              {startYear !== "—" ? startYear.slice(-2) : "#"}
                            </span>
                          </div>
                        </div>

                        {/* Card */}
                        <motion.div
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.25 }}
                          className="group relative flex flex-col lg:flex-row flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100"
                        >
                          {/* Top/Left accent bar */}
                          <div
                            className={`h-1 lg:h-auto lg:w-1 flex-shrink-0 rounded-t-2xl lg:rounded-l-2xl ${
                              isPresent
                                ? "bg-gradient-to-r lg:bg-gradient-to-b from-sky-500 to-teal-400"
                                : "bg-gradient-to-r lg:bg-gradient-to-b from-slate-300 to-slate-200"
                            }`}
                          />

                          {/* Portrait */}
                          <Link
                            href={linkHref}
                            className="relative flex-shrink-0 w-full lg:w-48"
                          >
                            <div className="relative w-full aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[12rem] overflow-hidden bg-slate-900/10">
                              {image ? (
                                <>
                                  <SmartImage
                                    src={image}
                                    alt=""
                                    fill
                                    optimizeWidth={120}
                                    className="object-cover blur-xl scale-110 opacity-50 brightness-95 select-none pointer-events-none"
                                    aria-hidden
                                  />
                                  <SmartImage
                                    src={image}
                                    alt={leader.name}
                                    fill
                                    optimizeWidth={480}
                                    className="object-contain object-center p-1.5 lg:object-cover lg:object-top lg:p-0 transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 1024px) 100vw, 192px"
                                  />
                                </>
                              ) : (
                                <div className="flex h-full w-full min-h-[10rem] flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                                  <User className="h-10 w-10 stroke-1" />
                                  <span className="mt-1 text-xl font-bold">
                                    {leader.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-transparent via-transparent to-black/10 pointer-events-none" />
                            </div>
                          </Link>

                          {/* Body */}
                          <div className="flex flex-1 flex-col justify-between p-5 lg:p-6">
                            <div className="flex flex-1 flex-col">
                              {/* Tenure badge */}
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                    isPresent
                                      ? "bg-sky-100 text-sky-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  {startYear} — {endYear}
                                </span>
                                {isPresent && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                )}
                                {leader.position && (
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    {leader.position}
                                  </span>
                                )}
                              </div>

                              <h3 className="font-display text-xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-sky-700 lg:text-2xl">
                                <Link href={linkHref}>{leader.name}</Link>
                              </h3>

                              {shortBio ? (
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
                                  {shortBio}
                                </p>
                              ) : (
                                <p className="mt-2 text-sm leading-relaxed text-transparent select-none aria-hidden">
                                  &nbsp;
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                              <Link
                                href={linkHref}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-sky-700 transition-all hover:border-sky-400 hover:bg-sky-100"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                Full Profile
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                              <button
                                onClick={() => setActiveLeader(leader)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Quick View
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Preview Modal */}
      <AnimatePresence>
        {activeLeader && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveLeader(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              <button
                onClick={() => setActiveLeader(null)}
                className="absolute right-4 top-4 z-20 rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:text-slate-700 shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="grid sm:grid-cols-12">
                {/* Modal Portrait */}
                <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 sm:col-span-5 sm:aspect-auto">
                  {getImageFromItem(
                    activeLeader as unknown as Record<string, unknown>
                  ) ? (
                    <SmartImage
                      src={
                        getImageFromItem(
                          activeLeader as unknown as Record<string, unknown>
                        ) || ""
                      }
                      alt={activeLeader.name}
                      fill
                      optimizeWidth={480}
                      className="object-cover object-top"
                      sizes="240px"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                      <User className="h-14 w-14 stroke-1" />
                      <span className="mt-2 text-3xl font-bold text-slate-300">
                        {activeLeader.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Modal Info */}
                <div className="flex flex-col justify-between p-6 sm:col-span-7">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold text-sky-700">
                      <Clock className="h-3.5 w-3.5" />
                      {formatYear(activeLeader.tenure_start) || "Historic"} —{" "}
                      {activeLeader.tenure_end
                        ? formatYear(activeLeader.tenure_end)
                        : "Present"}
                    </span>

                    <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                      {activeLeader.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-sky-600">
                      {activeLeader.position || "Executive Officer"}
                    </p>

                    {activeLeader.bio && (
                      <div className="mt-4 max-h-40 overflow-y-auto text-sm leading-relaxed text-slate-600">
                        {stripHtml(activeLeader.bio)}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[11px] text-slate-400">
                      Gambo General Hospital
                    </span>
                    <Link
                      href={`/leadership/history/${
                        activeLeader.slug || activeLeader.id
                      }`}
                      onClick={() => setActiveLeader(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sky-700"
                    >
                      View Profile
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
