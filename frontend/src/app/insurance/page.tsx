"use client";

import { Mail, Phone, Globe } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
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

      <div className="v-home-light relative -mx-[calc((100vw-100%)/2)] w-screen">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          {isLoading ? (
            <GridSkeleton count={6} />
          ) : isError ? (
            <EmptyState title="Unable to load insurance partners" />
          ) : items.length === 0 ? (
            <EmptyState title="Insurance information coming soon" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => {
                const logo = getImageFromItem(item as unknown as Record<string, unknown>);
                const phone = (item as { contact_phone?: string }).contact_phone || item.phone;
                const email = (item as { contact_email?: string }).contact_email;
                const website = item.website;
                const desc = item.description ? stripHtml(item.description) : "";
                return (
                  <Reveal key={item.id} delay={Math.min(i, 8) * 0.05}>
                    <article className="v-home-card group relative flex h-full flex-col items-center overflow-hidden px-7 py-9 text-center">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-sky-700/70" />
                      <div className="relative mb-5 grid h-24 w-24 place-items-center overflow-hidden rounded-2xl bg-[#122033] ring-1 ring-sky-300/25">
                        {logo ? (
                          <SmartImage
                            src={logo}
                            alt={item.name}
                            fill
                            optimizeWidth={192}
                            className="object-contain p-3"
                            sizes="96px"
                          />
                        ) : (
                          <span className="font-display text-3xl text-sky-300">
                            {item.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-xl text-[#0c1b2a] transition-colors group-hover:text-teal-mid">
                        {item.name}
                      </h3>
                      {desc && (
                        <p className="mt-3 text-sm leading-relaxed text-[#5a6e6a]">{desc}</p>
                      )}
                      {(phone || email || website) && (
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#0c1b2a]/10 bg-[#e8f4f0]/80 px-3 py-1.5 text-[#0c1b2a] transition hover:border-teal-mid/40"
                            >
                              <Phone className="h-3.5 w-3.5 text-teal-mid" />
                              {phone}
                            </a>
                          )}
                          {email && (
                            <a
                              href={`mailto:${email}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#0c1b2a]/10 bg-[#e8f4f0]/80 px-3 py-1.5 text-[#0c1b2a] transition hover:border-teal-mid/40"
                            >
                              <Mail className="h-3.5 w-3.5 text-teal-mid" />
                              Email
                            </a>
                          )}
                          {website && (
                            <a
                              href={website}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#0c1b2a]/10 bg-[#e8f4f0]/80 px-3 py-1.5 text-[#0c1b2a] transition hover:border-teal-mid/40"
                            >
                              <Globe className="h-3.5 w-3.5 text-teal-mid" />
                              Website
                            </a>
                          )}
                        </div>
                      )}
                    </article>
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
