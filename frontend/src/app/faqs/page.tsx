"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import Prose from "@/components/shared/Prose";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import type { FAQ } from "@/lib/types";
import { cleanPublicText, isPublicItemActive } from "@/lib/utils";

/**
 * One question.
 *
 * `data-open` on the wrapper is the single switch: nova-page.css keys the
 * warmed border, the rotated toggle and the panel's grid-rows transition off
 * that one attribute, so this component holds state and nothing else.
 */
function FaqItem({ faq, index }: { faq: FAQ; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <NovaReveal from="up" delay={Math.min(index, 8) * 0.06}>
      <div className="nv-faq" data-open={open ? "true" : "false"}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="nv-faq__q"
        >
          <span>{cleanPublicText(faq.question) || faq.question}</span>
          <span className="nv-faq__toggle" aria-hidden>
            <ChevronDown />
          </span>
        </button>

        <div className="nv-faq__panel">
          <div>
            <div className="nv-faq__a">
              <Prose html={faq.answer} />
            </div>
          </div>
        </div>
      </div>
    </NovaReveal>
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

      <PageBody narrow>
          {isLoading ? (
            <GridSkeleton count={5} />
          ) : isError ? (
            <EmptyState title="Unable to load FAQs" description="Please try again in a moment." />
          ) : faqs.length === 0 ? (
            <EmptyState title="FAQs coming soon" />
          ) : (
            <div>
              {grouped.map(([category, items]) => (
                <section key={category} className="nv-faq-group">
                  <p className="nv-faq-group__label">{category}</p>
                  <div className="nv-faq-list">
                    {items.map((faq, i) => (
                      <FaqItem key={faq.id} faq={faq} index={i} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
      </PageBody>

    </PageTransition>
  );
}
