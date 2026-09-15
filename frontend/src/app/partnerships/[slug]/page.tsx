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
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import type { Partner } from "@/lib/types";
import { stripHtml } from "@/lib/utils";
import Prose from "@/components/shared/Prose";
import { SITE_NAME } from "@/lib/api";

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

  // Only the API is consulted. The localStorage/SAMPLE_PARTNERS fallback that
  // used to back this page published affiliations nobody entered
  // (MEL-CONTENT-001).
  const apiItem = itemData as Partner | undefined;
  const partner = apiItem?.name ? apiItem : undefined;
  const partnerName = partner?.name ?? "";
  /** The narrative, as the editor wrote it. May or may not carry markup. */
  const partnerBody = String(
    partner?.description || partner?.short_description || ""
  ).trim();

  const allPartners: Partner[] = (listData?.data as Partner[]) ?? [];

  if (isLoading && !partner) {
    return (
      <div className="nv-pb mx-auto max-w-5xl px-5 py-16">
        <DetailSkeleton />
      </div>
    );
  }

  if (isError && !partner) {
    return (
      <div className="nv-pb mx-auto max-w-4xl px-5 py-16 text-center">
        <EmptyState
          title="Partner Profile Not Found"
          description="The requested partner profile could not be retrieved."
        />
        <Link
          href="/partnerships"
          className="nv-btn nv-btn--glass mt-5"
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
  const relatedPartners = allPartners
    .filter((p: Partner) => p.id !== partner.id && p.category === partner.category)
    .slice(0, 3);

  return (
    <PageTransition>
      <PageHero
        section="/partnerships"
        title={partner.name}
        eyebrow={partner.category || "Institutional partner"}
        subtitle={
          partner.short_description ||
          `What this partnership covers, and how it supports care at ${SITE_NAME}.`
        }
        breadcrumbs={[
          { label: "Partnerships", href: "/partnerships" },
          { label: partner.name },
        ]}
      />


      <PageBody narrow>
          <div className="nv-toolbar">
            <Link href="/partnerships" className="nv-toolbar__link">
              <ChevronLeft aria-hidden />
              All partnerships
            </Link>

            {partner.website && (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="nv-toolbar__link"
              >
                <Globe2 aria-hidden />
                Official website
                <ExternalLink aria-hidden />
              </a>
            )}
          </div>

          <div className="nv-dlayout">
            <div className="nv-dcol">
              <NovaReveal from="up">
                {/* The partner's name and category are already the hero's <h1>
                    and eyebrow directly above, so this panel leads with the logo
                    and the overview rather than repeating both — which also
                    removes a second <h1> from the document. */}
                <div className="nv-dpanel">
                  <div className="nv-dpanel__label">
                    <span className="nv-logo-card__frame !h-14 !w-14 !rounded-xl">
                      {logo ? (
                        <SmartImage
                          src={logo}
                          alt=""
                          fill
                          optimizeWidth={160}
                          sizes="56px"
                        />
                      ) : (
                        <span className="nv-logo-card__initial !text-lg" aria-hidden>
                          <HeartPulse />
                        </span>
                      )}
                    </span>
                    <div>
                      <p className="nv-dpanel__kicker">
                        {partner.partnership_type || "Institutional partner"}
                      </p>
                      <h2 className="nv-dpanel__title">
                        {partnerName
                          ? `About ${partnerName}`
                          : "About the partnership"}
                      </h2>
                    </div>
                  </div>

                  {/* The editor writes paragraphs here. stripHtml collapsed the
                      whole document into one block of running text. */}
                  {partnerBody ? (
                    partnerBody.includes("<") ? (
                      <Prose html={partnerBody} />
                    ) : (
                      <p className="nv-dplain">{partnerBody}</p>
                    )
                  ) : null}
                </div>
              </NovaReveal>

              <NovaReveal from="up" delay={0.1}>
                <div className="nv-dpanel">
                  <div className="nv-dpanel__label">
                    <span className="nv-dpanel__icon" aria-hidden>
                      <Sparkles />
                    </span>
                    <div>
                      <p className="nv-dpanel__kicker">Joint initiatives</p>
                      <h2 className="nv-dpanel__title">Collaboration &amp; impact</h2>
                    </div>
                  </div>

                  <ul className="nv-tiles">
                    {highlights.map((h, i) => (
                      <li key={i} className="nv-tile">
                        <CheckCircle2 aria-hidden />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </NovaReveal>
            </div>

            <div className="nv-dcol">
              <NovaReveal from="up" delay={0.12}>
                <div className="nv-dpanel">
                  <div className="nv-dpanel__label">
                    <span className="nv-dpanel__icon" aria-hidden>
                      <ShieldCheck />
                    </span>
                    <div>
                      <p className="nv-dpanel__kicker">Reference</p>
                      <h3 className="nv-dpanel__title">Partner information</h3>
                    </div>
                  </div>

                  <dl className="nv-dl">
                    <div className="nv-dl__row">
                      <dt className="nv-dl__key">Category</dt>
                      <dd className="nv-dl__val">{partner.category || "—"}</dd>
                    </div>

                    {partner.partnership_type && (
                      <div className="nv-dl__row">
                        <dt className="nv-dl__key">Role</dt>
                        <dd className="nv-dl__val">{partner.partnership_type}</dd>
                      </div>
                    )}

                    {partner.website && (
                      <div className="nv-dl__row">
                        <dt className="nv-dl__key">Website</dt>
                        <dd className="nv-dl__val">
                          <a
                            href={partner.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Visit site
                            <ExternalLink aria-hidden />
                          </a>
                        </dd>
                      </div>
                    )}

                    {partner.contact_email && (
                      <div className="nv-dl__row">
                        <dt className="nv-dl__key">Email</dt>
                        <dd className="nv-dl__val">
                          <a href={"mailto:" + partner.contact_email}>
                            <Mail aria-hidden />
                            {partner.contact_email}
                          </a>
                        </dd>
                      </div>
                    )}

                    {partner.contact_phone && (
                      <div className="nv-dl__row">
                        <dt className="nv-dl__key">Phone</dt>
                        <dd className="nv-dl__val">
                          <a href={"tel:" + partner.contact_phone}>
                            <Phone aria-hidden />
                            {partner.contact_phone}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </NovaReveal>

              {relatedPartners.length > 0 && (
                <NovaReveal from="up" delay={0.15}>
                  <div className="nv-dpanel">
                    <div className="nv-dpanel__label">
                      <span className="nv-dpanel__icon" aria-hidden>
                        <Building2 />
                      </span>
                      <div>
                        <p className="nv-dpanel__kicker">
                          {partner.category || "Same category"}
                        </p>
                        <h3 className="nv-dpanel__title">Related partners</h3>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {relatedPartners.map((rel: Partner) => (
                        <Link
                          key={rel.id}
                          href={"/partnerships/" + (rel.slug || rel.id)}
                          className="nv-minirow"
                        >
                          <span>{rel.name}</span>
                          <ArrowRight aria-hidden />
                        </Link>
                      ))}
                    </div>
                  </div>
                </NovaReveal>
              )}
            </div>
          </div>
      </PageBody>
    </PageTransition>
  );
}
