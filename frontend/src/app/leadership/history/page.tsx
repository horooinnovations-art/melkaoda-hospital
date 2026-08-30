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
} from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import type { Leader, LeadershipHistory } from "@/lib/types";
import { formatYear, stripHtml } from "@/lib/utils";
import { SITE_NAME } from "@/lib/api";

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
        section="/leadership/history"
        title="A Line of"
        accent="Directors"
        eyebrow="How we got here"
        subtitle={`Every director who has led ${SITE_NAME}, in order of service — from the founding of the hospital to the office holder in post today.`}
        breadcrumbs={[
          { label: "Leadership", href: "/leadership" },
          { label: "History" },
        ]}
      />

      <PageBody>
          <div className="nv-toolbar">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/leadership" className="nv-toolbar__link">
                <ChevronLeft aria-hidden />
                Current board
              </Link>
              <span className="nv-pill">
                <Building2 aria-hidden />
                {rawLeaders.length} recorded officer
                {rawLeaders.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="nv-search">
              <Search className="nv-search__ico" aria-hidden />
              <input
                type="text"
                placeholder="Search by name or position…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search leadership history"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="nv-search__clear"
                  aria-label="Clear search"
                >
                  <X aria-hidden />
                </button>
              )}
            </div>
          </div>

          <p className="nv-pill nv-pill--plain mb-7">
            <Calendar aria-hidden />
            Listed from earliest to most recent tenure
          </p>

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
            <div className="nv-tl">
              {filteredLeaders.map((leader, i) => {
                const image = getImageFromItem(
                  leader as unknown as Record<string, unknown>
                );
                const startYear = formatYear(leader.tenure_start) || "—";
                const endYear = leader.tenure_end
                  ? formatYear(leader.tenure_end)
                  : "Present";
                const shortBio = leader.bio ? stripHtml(leader.bio) : "";
                const linkHref = `/leadership/history/${
                  leader.slug || leader.id
                }`;
                const isPresent = !leader.tenure_end;

                return (
                  <NovaReveal
                    key={leader.id}
                    from="up"
                    delay={Math.min(i, 8) * 0.07}
                  >
                    <div className="nv-tl__row">
                      <span
                        className={
                          isPresent
                            ? "nv-tl__node nv-tl__node--now"
                            : "nv-tl__node"
                        }
                        aria-hidden
                      >
                        {startYear !== "—" ? startYear.slice(-2) : "#"}
                      </span>

                      <div
                        className={
                          isPresent
                            ? "nv-tl-card nv-tl-card--now group"
                            : "nv-tl-card group"
                        }
                      >
                        <span className="nv-tl-card__edge" aria-hidden />

                        <Link href={linkHref} className="nv-tl-card__media">
                          {image ? (
                            <SmartImage
                              src={image}
                              // Decorative: .nv-tl-card__name prints this
                              // person's name beside the frame.
                              alt=""
                              fill
                              optimizeWidth={480}
                              className="nv-tl-card__img object-cover object-top"
                              sizes="(max-width: 1024px) 100vw, 186px"
                            />
                          ) : (
                            <span className="nv-tl-card__fallback" aria-hidden>
                              <User strokeWidth={1} />
                              {leader.name.charAt(0)}
                            </span>
                          )}
                        </Link>

                        <div className="nv-tl-card__body">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  isPresent ? "nv-pill nv-pill--warm" : "nv-pill"
                                }
                              >
                                <Clock aria-hidden />
                                {startYear} — {endYear}
                              </span>
                              {isPresent && (
                                <span className="nv-pill nv-pill--warm">
                                  <span className="nv-pill__dot" aria-hidden />
                                  Serving
                                </span>
                              )}
                              {leader.position && (
                                <span className="nv-pill nv-pill--plain">
                                  {leader.position}
                                </span>
                              )}
                            </div>

                            <h3 className="nv-tl-card__name mt-3">
                              <Link href={linkHref}>{leader.name}</Link>
                            </h3>

                            {shortBio && (
                              <p className="nv-tl-card__bio">{shortBio}</p>
                            )}
                          </div>

                          <div className="nv-tl-card__foot">
                            <Link href={linkHref} className="nv-dlink">
                              <span>Full profile</span>
                              <span className="nv-dlink__ico" aria-hidden>
                                <ArrowRight />
                              </span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setActiveLeader(leader)}
                              className="nv-pill"
                              style={{ cursor: "pointer" }}
                            >
                              <Eye aria-hidden />
                              Quick view
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </NovaReveal>
                );
              })}
            </div>
          )}
      </PageBody>

      {/* Quick-view dialog. The scrim and the panel animate with framer-motion,
          but every surface inside them is a Nova unit, so the dialog is the same
          material as the page behind it. */}
      <AnimatePresence>
        {activeLeader && (
          <div className="nv-modal" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveLeader(null)}
              className="nv-modal__scrim"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="nv-modal__panel"
            >
              <button
                type="button"
                onClick={() => setActiveLeader(null)}
                className="nv-modal__close"
                aria-label="Close preview"
              >
                <X aria-hidden />
              </button>

              <div className="nv-modal__grid">
                <div className="nv-modal__media">
                  {getImageFromItem(
                    activeLeader as unknown as Record<string, unknown>
                  ) ? (
                    <SmartImage
                      src={
                        getImageFromItem(
                          activeLeader as unknown as Record<string, unknown>
                        ) || ""
                      }
                      alt=""
                      fill
                      optimizeWidth={480}
                      className="object-cover object-top"
                      sizes="240px"
                    />
                  ) : (
                    <span className="nv-tl-card__fallback" aria-hidden>
                      <User strokeWidth={1} />
                      {activeLeader.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="nv-modal__copy">
                  <div>
                    <span className="nv-pill nv-pill--warm">
                      <Clock aria-hidden />
                      {formatYear(activeLeader.tenure_start) || "Historic"} —{" "}
                      {activeLeader.tenure_end
                        ? formatYear(activeLeader.tenure_end)
                        : "Present"}
                    </span>

                    <h3 className="nv-tl-card__name mt-4">
                      {activeLeader.name}
                    </h3>
                    <p className="nv-portrait__dept">
                      {activeLeader.position || "Executive officer"}
                    </p>

                    {activeLeader.bio && (
                      <div className="nv-modal__bio">
                        {stripHtml(activeLeader.bio)}
                      </div>
                    )}
                  </div>

                  <div className="nv-modal__foot">
                    <span className="nv-pill nv-pill--plain">
                      {SITE_NAME}
                    </span>
                    <Link
                      href={`/leadership/history/${
                        activeLeader.slug || activeLeader.id
                      }`}
                      onClick={() => setActiveLeader(null)}
                      className="nv-btn nv-btn--glass nv-btn--sm"
                    >
                      View profile
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
