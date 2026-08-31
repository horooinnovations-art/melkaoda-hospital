"use client";

import { Star } from "lucide-react";
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
        section="/testimonials"
        title="In Their Own"
        accent="Words"
        eyebrow="Patient voices"
        subtitle="Accounts from patients and their families about being treated here — diagnosis, recovery, and the people they met along the way."
        stats={
          items.length
            ? [{ value: String(items.length), label: "Accounts published" }]
            : undefined
        }
        breadcrumbs={[{ label: "Patient Stories" }]}
      />

      <PageBody>
          {isLoading ? (
            <GridSkeleton count={6} />
          ) : isError ? (
            <EmptyState title="Unable to load testimonials" />
          ) : items.length === 0 ? (
            <EmptyState title="Testimonials coming soon" />
          ) : (
            <div className="nv-grid-3">
              {items.map((item, i) => {
                const photo = getImageFromItem(item as unknown as Record<string, unknown>);
                const content = stripHtml(item.content || "");
                const rating = item.rating ?? 0;
                return (
                  <NovaReveal
                    key={item.id}
                    from="up"
                    delay={Math.min(Math.floor(i / 3), 5) * 0.12}
                    className="h-full w-full"
                  >
                    <blockquote className="nv-tcard">
                      <span className="nv-tcard__glyph" aria-hidden>
                        &ldquo;
                      </span>

                      <p className="nv-tcard__body">&ldquo;{content}&rdquo;</p>

                      <footer className="nv-tcard__foot">
                        <span className="nv-tcard__photo">
                          {photo ? (
                            <SmartImage
                              src={photo}
                              // Decorative: the <cite> beside this frame names
                              // the same person.
                              alt=""
                              fill
                              optimizeWidth={112}
                              className="object-cover object-[center_20%]"
                              sizes="44px"
                            />
                          ) : (
                            <span className="nv-tcard__initial" aria-hidden>
                              {item.patient_name.charAt(0)}
                            </span>
                          )}
                        </span>

                        <div>
                          <cite className="nv-tcard__who">{item.patient_name}</cite>
                          {rating > 0 ? (
                            <div
                              className="nv-tcard__stars"
                              aria-label={`${rating} out of 5`}
                            >
                              {Array.from({ length: 5 }).map((_, star) => (
                                <Star
                                  key={star}
                                  aria-hidden
                                  className={
                                    star < rating
                                      ? "nv-tcard__star--on"
                                      : "nv-tcard__star--off"
                                  }
                                  fill="currentColor"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </footer>
                    </blockquote>
                  </NovaReveal>
                );
              })}
            </div>
          )}
      </PageBody>

    </PageTransition>
  );
}
