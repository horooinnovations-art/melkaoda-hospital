"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
import EmptyState from "@/components/shared/EmptyState";
import Prose from "@/components/shared/Prose";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import type { FAQ } from "@/lib/types";
import { cn, cleanPublicText, isPublicItemActive } from "@/lib/utils";

function FaqItem({ faq, index }: { faq: FAQ; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Reveal delay={Math.min(index, 8) * 0.04}>
      <div
        className={cn(
          "v-home-card relative overflow-hidden transition duration-300",
          open && "shadow-[0_24px_50px_-28px_rgba(6,78,74,0.28)]"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-sky-700/70" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        >
          <span className="font-display text-lg leading-snug text-[#0c1b2a] md:text-xl">
            {faq.question}
          </span>
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition duration-300",
              open
                ? "rotate-180 bg-gradient-to-br from-[#0c1b2a] to-[#1d4ed8] text-white"
                : "bg-[#e8f4f0] text-teal-mid"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-[#0c1b2a]/8 px-6 pb-6 pt-4">
              <Prose html={faq.answer} className="text-sm md:text-base" />
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function FaqsPage() {
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "faqs",
    perPage: 50,
  });

  const faqs = useMemo(
    () =>
      ((data?.data ?? []) as FAQ[]).filter((faq) =>
        isPublicItemActive(faq as unknown as Record<string, unknown>)
      ),
    [data?.data]
  );
  const grouped = useMemo(() => {
    const map = new Map<string, FAQ[]>();
    for (const faq of faqs) {
      const key = faq.category?.trim() || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(faq);
    }
    return [...map.entries()];
  }, [faqs]);

  return (
    <PageTransition>
      <PageHero
        title="Frequently Asked Questions"
        eyebrow="Got questions?"
        subtitle="Clear answers to the questions patients and visitors ask most — from appointments and billing to services and visiting hours."
        breadcrumbs={[{ label: "FAQs" }]}
      />

      <div className="v-home-light relative -mx-[calc((100vw-100%)/2)] w-screen">
        <div className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
          {isLoading ? (
            <GridSkeleton count={5} />
          ) : isError ? (
            <EmptyState title="Unable to load FAQs" description="Please try again in a moment." />
          ) : faqs.length === 0 ? (
            <EmptyState title="FAQs coming soon" />
          ) : (
            <div className="space-y-12">
              {grouped.map(([category, items]) => (
                <section key={category}>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-mid">
                    {category}
                  </p>
                  <div className="space-y-3">
                    {items.map((faq, i) => (
                      <FaqItem key={faq.id} faq={faq} index={i} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
