"use client";

import { use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Building2,
  Globe2,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  HeartPulse,
} from "lucide-react";
import { useGetResourceItemQuery, useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import type { Partner } from "@/lib/types";
import { getStoredPartners } from "@/lib/partnersData";
import { stripHtml } from "@/lib/utils";

export default function PartnerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: itemData, isLoading, isError } = useGetResourceItemQuery({
    resource: "partnerships",
    idOrSlug: slug,
  });

  const { data: listData } = useGetResourceListQuery({
    resource: "partnerships",
    perPage: 24,
  });

  const storedPartners = getStoredPartners();
  const apiItem = itemData as Partner | undefined;
  const match = storedPartners.find(
    (p) => p.slug === slug || String(p.id) === slug
  );
  const partner = apiItem?.name ? apiItem : match;

  const allPartners = (listData?.data as Partner[])?.length
    ? (listData?.data as Partner[])
    : storedPartners;

  if (isLoading && !partner) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <DetailSkeleton />
      </div>
    );
  }

  if (isError && !partner) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-16 text-center">
        <EmptyState
          title="Partner Profile Not Found"
          description="The requested partner profile could not be retrieved."
        />
        <Link
          href="/partnerships"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-emerald-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Partnerships
        </Link>
      </div>
    );
  }

  if (!partner) return null;

  const logo = getImageFromItem(partner as unknown as Record<string, unknown>);
  const highlights =
    partner.collaboration_highlights || [
      "Coordinated health system strengthening initiatives",
      "Capacity building and specialized staff training",
      "Resource optimization and medical supply support",
      "Community healthcare access expansion",
    ];

  // Related partners in same category
  const relatedPartners = allPartners.filter(
    (p) => p.id !== partner.id && p.category === partner.category
  ).slice(0, 3);

  return (
    <PageTransition>
      <PageHero
        title={partner.name}
        eyebrow={partner.category || "Institutional Partner"}
        subtitle={partner.short_description || `Official partnership profile for ${partner.name}.`}
        breadcrumbs={[
          { label: "Partnerships", href: "/partnerships" },
          { label: partner.name },
        ]}
      />

      <div className="g-pagebody g-pagebody--detail">
        <div className="g-pagebody__aura" aria-hidden />
        <div className="g-pagebody__mesh" aria-hidden />

        <div className="relative z-[1] mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
          {/* Back Navigation Bar */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/partnerships"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              All Partnerships
            </Link>

            {partner.website && (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-800"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Official Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Main Content */}
            <div className="space-y-8 lg:col-span-8">
              {/* Main Partner Header Card */}
              <Reveal>
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    {/* Logo Box with refined hover movement strictly contained */}
                    <div className="group flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-md transition-all duration-500 hover:-translate-y-1 hover:border-emerald-500/80 hover:shadow-xl hover:shadow-emerald-500/20 cursor-pointer isolate">
                      {logo ? (
                        <SmartImage
                          src={logo}
                          alt={partner.name}
                          width={80}
                          height={80}
                          className="object-contain transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <HeartPulse className="h-10 w-10 text-emerald-400 transition-transform duration-500 group-hover:scale-[1.05]" />
                      )}
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                        {partner.category || "Verified Partner"}
                      </span>
                      <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                        {partner.name}
                      </h1>
                      {partner.partnership_type && (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {partner.partnership_type}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Overview Body */}
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      About the Partnership
                    </h2>
                    <div className="mt-3 text-base leading-relaxed text-slate-600">
                      {stripHtml(partner.description || partner.short_description || "")}
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Collaboration Highlights */}
              <Reveal delay={0.1}>
                <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-700" />
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      Key Joint Initiatives & Impact
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Strategic objectives and clinical milestones achieved in collaboration with {partner.name}.
                  </p>

                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {highlights.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        <span className="text-xs font-medium text-slate-700 leading-relaxed">
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6 lg:col-span-4">
              {/* Partner Quick Info Box */}
              <Reveal delay={0.12}>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Partner Information
                  </h3>

                  <dl className="mt-4 divide-y divide-slate-100 text-xs">
                    <div className="py-3 flex justify-between">
                      <dt className="text-slate-500 font-medium">Category</dt>
                      <dd className="font-semibold text-slate-800 text-right">{partner.category || "—"}</dd>
                    </div>

                    {partner.partnership_type && (
                      <div className="py-3 flex justify-between">
                        <dt className="text-slate-500 font-medium">Role</dt>
                        <dd className="font-semibold text-slate-800 text-right">{partner.partnership_type}</dd>
                      </div>
                    )}

                    {partner.website && (
                      <div className="py-3 flex justify-between">
                        <dt className="text-slate-500 font-medium">Website</dt>
                        <dd className="font-semibold text-emerald-700">
                          <a href={partner.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                            Visit Site <ExternalLink className="h-3 w-3" />
                          </a>
                        </dd>
                      </div>
                    )}

                    {partner.contact_email && (
                      <div className="py-3 flex justify-between">
                        <dt className="text-slate-500 font-medium">Email</dt>
                        <dd className="font-semibold text-slate-800">{partner.contact_email}</dd>
                      </div>
                    )}

                    {partner.contact_phone && (
                      <div className="py-3 flex justify-between">
                        <dt className="text-slate-500 font-medium">Phone</dt>
                        <dd className="font-semibold text-slate-800">{partner.contact_phone}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </Reveal>

              {/* Related Partners in Same Category */}
              {relatedPartners.length > 0 && (
                <Reveal delay={0.15}>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Related Partners
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Other institutions in {partner.category}.
                    </p>

                    <div className="mt-4 space-y-3">
                      {relatedPartners.map((rel) => (
                        <Link
                          key={rel.id}
                          href={`/partnerships/${rel.slug || rel.id}`}
                          className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
                        >
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800 truncate pr-2">
                            {rel.name}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-700" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
