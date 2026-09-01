"use client";

import Link from "next/link";
import {
  Globe2,
  HeartPulse,
  ArrowRight,
} from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import type { Partner } from "@/lib/types";

import { isPublicItemActive } from "@/lib/utils";

export default function PartnershipsPage() {
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "partnerships",
    perPage: 100,
  });

  // Partners come from the API and nowhere else. This page previously fell back
  // to a hardcoded SAMPLE_PARTNERS array — which named a real university and its
  // contact address as an affiliate — whenever the request returned nothing, and
  // it always returned nothing because the endpoint did not exist. A hospital
  // must not publish affiliation claims that no one entered (MEL-CONTENT-001).
  const partners: Partner[] = (data?.data ?? []) as Partner[];

  const showSkeleton = isLoading;

  return (
    <PageTransition>
      <PageHero
        section="/partnerships"
        title="Partners &"
        accent="Collaborators"
        eyebrow="Who we work with"
        subtitle="Government authorities, international foundations, teaching hospitals and community organisations — and what each partnership brings to the care given here."
        stats={
          partners.length
            ? [{ value: String(partners.length), label: "Active partners" }]
            : undefined
        }
        breadcrumbs={[{ label: "Partnerships" }]}
      />

      <PageBody>
          {showSkeleton ? (
            <GridSkeleton count={6} />
          ) : (
            <div className="nv-grid-3">
              {partners
                .filter((p) => isPublicItemActive(p as unknown as Record<string, unknown>))
                .map((partner, i) => {
                  const logo = getImageFromItem(
                    partner as unknown as Record<string, unknown>
                  );
                  const linkHref = `/partnerships/${partner.slug || partner.id}`;
                  const blurb =
                    partner.short_description ||
                    partner.description ||
                    "Institutional partner supporting quality healthcare delivery.";

                  return (
                    <NovaReveal
                      key={partner.id || partner.slug || i}
                      from="up"
                      delay={Math.min(Math.floor(i / 3), 5) * 0.12}
                    >
                      {/* Same unit as the insurance directory: two pages listing
                          institutional partners should not carry two cards. */}
                      <article className="nv-logo-card">
                        <span className="nv-logo-card__frame">
                          {logo ? (
                            <SmartImage
                              src={logo}
                              // Decorative: .nv-logo-card__name prints the partner's
                              // name directly under this frame.
                              alt=""
                              fill
                              optimizeWidth={192}
                              sizes="92px"
                            />
                          ) : (
                            <span className="nv-logo-card__initial" aria-hidden>
                              <HeartPulse />
                            </span>
                          )}
                        </span>

                        <h3 className="nv-logo-card__name">
                          <Link href={linkHref}>{partner.name}</Link>
                        </h3>

                        <p className="nv-logo-card__desc">{blurb}</p>

                        <div className="nv-logo-card__links">
                          {partner.website && (
                            <a
                              href={partner.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="nv-logo-card__link"
                            >
                              <Globe2 aria-hidden />
                              Website
                            </a>
                          )}

                          <Link href={linkHref} className="nv-logo-card__link">
                            Details
                            <ArrowRight aria-hidden />
                          </Link>
                        </div>
                      </article>
                    </NovaReveal>
                  );
                })}
            </div>
          )}
      </PageBody>

    </PageTransition>
  );
}
