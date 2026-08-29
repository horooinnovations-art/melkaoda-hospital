"use client";

import { useState, useEffect } from "react";
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
