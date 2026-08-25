"use client";

import { Quote } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import { isPublicItemActive, stripHtml } from "@/lib/utils";
import type { Testimonial } from "@/lib/types";

export default function TestimonialsPage() {
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "testimonials",
    perPage: 24,
  });

  const rawItems = (data?.data ?? []) as Testimonial[];
  const items = rawItems.filter((item) =>
    isPublicItemActive(item as unknown as Record<string, unknown>)
  );

  return (
    <PageTransition>
      <PageHero
        title="Patient Stories"
        eyebrow="Patient voices"
        subtitle="Real experiences from the people we serve — honest accounts of care, recovery and the human side of our hospital."
        breadcrumbs={[{ label: "Testimonials" }]}
      />

      <div className="v-home-light relative -mx-[calc((100vw-100%)/2)] w-screen">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          {isLoading ? (
            <GridSkeleton count={6} />
          ) : isError ? (
            <EmptyState title="Unable to load testimonials" />
          ) : items.length === 0 ? (
            <EmptyState title="Testimonials coming soon" />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => {
                const photo = getImageFromItem(item as unknown as Record<string, unknown>);
                const content = stripHtml(item.content || "");
                return (
                  <Reveal key={item.id} delay={Math.min(i, 8) * 0.05}>
                    <blockquote className="v-home-card group relative flex h-full flex-col overflow-hidden p-7 transition duration-500">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-sky-700/70" />
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#0c1b2a] to-[#1d4ed8] text-sky-100">
                        <Quote className="h-5 w-5" />
                      </span>
                      <p className="mt-6 flex-1 font-display text-lg leading-relaxed text-[#0c1b2a]">
                        &ldquo;{content}&rdquo;
                      </p>
                      <footer className="mt-8 flex items-center gap-4 border-t border-[#0c1b2a]/8 pt-5">
                        {photo ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded-xl ring-2 ring-teal-mid/30 ring-offset-2 ring-offset-white">
                            <SmartImage
                              src={photo}
                              alt={item.patient_name}
                              fill
                              optimizeWidth={112}
                              className="object-cover object-[center_20%]"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#122033] font-display text-lg text-sky-300">
                            {item.patient_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <cite className="not-italic font-medium text-[#0c1b2a]">
                            {item.patient_name}
                          </cite>
                          {item.rating ? (
                            <p className="mt-0.5 text-xs tracking-wide text-brass">
                              {"★".repeat(item.rating)}
                              <span className="text-[#0c1b2a]/20">
                                {"★".repeat(Math.max(0, 5 - item.rating))}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </footer>
                    </blockquote>
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
