"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cleanPublicText, truncate } from "@/lib/utils";
import type { Testimonial } from "@/lib/types";
import { NovaStars } from "./NovaCards";
import { useReducedMotion } from "./hooks";

const ROTATE_MS = 7000;

/**
 * Auto-rotating quote stage. All slides stay mounted so the panel height never
 * jumps between quotes of different lengths.
 */
export default function NovaTestimonials({
  items,
}: {
  items: Testimonial[];
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const total = items.length;
  const autoRotates = total > 1 && !reduced;

  useEffect(() => {
    if (!autoRotates) return;
    const id = setInterval(
      () => setIndex((current) => (current + 1) % total),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [total, autoRotates]);

  if (!total) return null;

  return (
    <div
      className="nv-quote"
      /* The active dot fills over exactly one rotation. Both the duration and
         the "is it rotating at all" answer come from here rather than being
         restated in CSS, so there is one source of truth for the timing. */
      data-auto={autoRotates ? "true" : "false"}
      style={{ "--nv-quote-ms": `${ROTATE_MS}ms` } as CSSProperties}
    >
      <span className="nv-quote__glyph" aria-hidden>
        &ldquo;
      </span>

      <div className="nv-quote__body">
        {items.map((item, i) => {
          const initials = item.patient_name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0]?.toUpperCase() ?? "")
            .join("");

          return (
            <div
              key={item.id}
              className="nv-quote__slide"
              data-on={i === index ? "true" : "false"}
            >
              <p className="nv-quote__text">
                {truncate(cleanPublicText(item.content), 260)}
              </p>

              <div className="nv-quote__by">
                <span className="nv-quote__avatar" aria-hidden>
                  {initials}
                </span>
                <span>
                  <span className="nv-quote__name block">
                    {item.patient_name}
                  </span>
                  <NovaStars rating={item.rating ?? 5} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <div className="nv-quote__dots">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show quote ${i + 1}`}
              aria-current={i === index}
              className={
                i === index ? "nv-quote__dot nv-quote__dot--on" : "nv-quote__dot"
              }
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
