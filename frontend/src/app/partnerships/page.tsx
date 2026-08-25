"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe2,
  HeartPulse,
  ArrowRight,
} from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import type { Partner } from "@/lib/types";
import { getStoredPartners, SAMPLE_PARTNERS } from "@/lib/partnersData";

import { isPublicItemActive } from "@/lib/utils";

export default function PartnershipsPage() {
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "partnerships",
    perPage: 100,
  });

  // Use state so we correctly hydrate on the client
  const [localPartners, setLocalPartners] = useState<Partner[]>(SAMPLE_PARTNERS);

  useEffect(() => {
    // Once on client, try loading from localStorage (falls back to SAMPLE_PARTNERS)
    setLocalPartners(getStoredPartners());
  }, []);

  const apiPartners = (data?.data ?? []) as Partner[];

  // Use API data if available, otherwise fall back to local/sample data
  const partners: Partner[] =
    apiPartners.length > 0
      ? apiPartners
      : localPartners;

  // Only show loading skeleton during the initial API fetch — never show "coming soon"
  // if we have fallback data available
  const showSkeleton = isLoading && partners.length === 0;

  return (
    <PageTransition>
      <PageHero
        title="Partnerships & Collaborations"
        eyebrow="Our Alliances"
        subtitle="Working hand in hand with government authorities, international foundations, medical universities, and community organizations to deliver exceptional healthcare."
        breadcrumbs={[{ label: "Partnerships" }]}
      />

      {/* Standard site canvas background with subtle mint tint matching sample design */}
      <div className="g-pagebody relative -mx-[calc((100vw-100%)/2)] w-screen">
        <div className="g-pagebody__aura" aria-hidden />
        <div className="g-pagebody__mesh" aria-hidden />

        <div className="relative z-[1] mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          {showSkeleton ? (
            <GridSkeleton count={6} />
          ) : (
            /* Clean 3-Column Grid of Chamfered Bevel Cards */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {partners
                .filter((p) => isPublicItemActive(p as unknown as Record<string, unknown>))
                .map((partner, i) => {
                const logo = getImageFromItem(
                  partner as unknown as Record<string, unknown>
                );
                const linkHref = `/partnerships/${partner.slug || partner.id}`;
                const hasWebsite = Boolean(partner.website);

                return (
                  <Reveal key={partner.id || partner.slug || i} delay={i * 0.05}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex h-full flex-col overflow-hidden p-6 transition-all duration-300"
                      style={{
                        background:
                          "linear-gradient(155deg, rgba(238, 247, 245, 0.95), rgba(230, 242, 238, 0.85))",
                        border: "1px solid rgba(16, 185, 129, 0.18)",
                        boxShadow: "0 10px 25px -12px rgba(15, 23, 42, 0.06)",
                        borderRadius: "1.25rem 2.25rem 1.25rem 1.25rem",
                      }}
                    >
                      {/* Bevel Chamfer Top Accent */}
                      <div className="absolute top-0 right-0 h-8 w-8 rounded-bl-xl bg-emerald-500/10 border-b border-l border-emerald-500/20" />

                      {/* Central Black Logo Container Box */}
                      <div className="mx-auto mb-5 flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-md transition-transform duration-300 group-hover:scale-105">
                        {logo ? (
                          <SmartImage
                            src={logo}
                            alt={partner.name}
                            width={70}
                            height={70}
                            className="object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-emerald-400">
                            <HeartPulse className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Partner Content */}
                      <div className="flex flex-1 flex-col text-center">
                        <h3 className="font-display text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
                          <Link href={linkHref}>{partner.name}</Link>
                        </h3>

                        <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3">
                          {partner.short_description ||
                            partner.description ||
                            "Institutional partner supporting quality healthcare delivery."}
                        </p>

                        {/* Bottom Action Pill Buttons (Website / Details) */}
                        <div className="mt-auto pt-6 flex flex-wrap items-center justify-center gap-2">
                          {hasWebsite && (
                            <a
                              href={partner.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-700 hover:text-white"
                            >
                              <Globe2 className="h-3.5 w-3.5" />
                              Website
                            </a>
                          )}

                          <Link
                            href={linkHref}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white/60 px-3.5 py-1 text-xs font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-white hover:text-slate-900"
                          >
                            Details
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
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
