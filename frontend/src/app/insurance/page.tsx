"use client";

import { Mail, Phone, Globe } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import { isPublicItemActive, stripHtml } from "@/lib/utils";
import type { Insurance } from "@/lib/types";

export default function InsurancePage() {
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "insurance",
    perPage: 48,
  });

  const rawItems = (data?.data ?? []) as Insurance[];
  const items = rawItems.filter((item) =>
    isPublicItemActive(item as unknown as Record<string, unknown>)
  );

  return (
    <PageTransition>
      <PageHero
        title="Insurance Partners"
        eyebrow="Coverage & access"
        subtitle="We work with a wide network of insurance providers to ensure accessible, affordable healthcare for every patient."
        breadcrumbs={[{ label: "Insurance" }]}
      />

      <PageBody>
          {isLoading ? (
            <GridSkeleton count={6} />
          ) : isError ? (
            <EmptyState title="Unable to load insurance partners" />
          ) : items.length === 0 ? (
            <EmptyState title="Insurance information coming soon" />
          ) : (
            <div className="nv-grid-3">
              {items.map((item, i) => {
                const logo = getImageFromItem(item as unknown as Record<string, unknown>);
                const phone = (item as { contact_phone?: string }).contact_phone || item.phone;
                const email = (item as { contact_email?: string }).contact_email;
                const website = item.website;
                const desc = item.description ? stripHtml(item.description) : "";
                return (
                  <NovaReveal
                    key={item.id}
                    from="up"
                    delay={Math.min(Math.floor(i / 3), 5) * 0.12}
                  >
                    <article className="nv-logo-card">
                      <span className="nv-logo-card__frame">
                        {logo ? (
                          <SmartImage
                            src={logo}
                            // Decorative: .nv-logo-card__name prints the provider's
                            // name directly under this frame.
                            alt=""
                            fill
                            optimizeWidth={192}
                            sizes="92px"
                          />
                        ) : (
                          <span className="nv-logo-card__initial" aria-hidden>
                            {item.name.charAt(0)}
                          </span>
                        )}
                      </span>

                      <h3 className="nv-logo-card__name">{item.name}</h3>

                      {desc && <p className="nv-logo-card__desc">{desc}</p>}

                      {(phone || email || website) && (
                        <div className="nv-logo-card__links">
                          {phone && (
                            <a href={`tel:${phone}`} className="nv-logo-card__link">
                              <Phone aria-hidden />
                              {phone}
                            </a>
                          )}
                          {email && (
                            <a href={`mailto:${email}`} className="nv-logo-card__link">
                              <Mail aria-hidden />
                              Email
                            </a>
                          )}
                          {website && (
                            <a
                              href={website}
                              target="_blank"
                              rel="noreferrer"
                              className="nv-logo-card__link"
                            >
                              <Globe aria-hidden />
                              Website
                            </a>
                          )}
                        </div>
                      )}
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
