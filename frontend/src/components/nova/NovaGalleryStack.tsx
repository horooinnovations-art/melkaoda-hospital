"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { useReducedMotion } from "./hooks";

/**
 * Stacked card carousel ("coverflow"): one focused card in the centre with its
 * caption revealed, two neighbours turned and darkened behind it, and two more
 * beyond those at the edge of the light. Advances on its own and pauses on
 * hover, on focus, while the tab is hidden, and under reduced motion.
 *
 * The deck is transparent — it sits directly on the page's own atmosphere
 * backdrop rather than carrying a panel of its own.
 *
 * Every slide stays mounted so a card entering the stack animates in from the
 * outer ring instead of popping. Only the focused card is a link — the others
 * are buttons that pull themselves forward, which keeps the caption's call to
 * action unambiguous and avoids hiding focusable content from assistive tech.
 */

export type StackSlide = {
  key: string;
  href: string;
  title: string;
  description?: string;
  label?: string;
  image?: string;
};

/**
 * Depth rings by absolute distance from the focused card: 0 is the centre, 1
 * the overlapping neighbours, 2 the faded edges. `x` is a percentage of the
 * card's own width, so the spread scales with the card at every breakpoint.
 *
 * Depth is carried by scale, rotation and *light* — `dim` is a brightness
 * multiplier and `sat` a saturation one, so a receding card darkens the way a
 * photograph does when it turns away from a light source. Nothing is blurred
 * and nothing is made transparent: a blurred photograph reads as a bad
 * photograph, and a translucent one lets the page grid show through the image.
 * Opacity is spent only on cards leaving the deck entirely.
 */
const RING = [
  { x: 0, scale: 1, rotate: 0, dim: 1, sat: 1 },
  { x: 52, scale: 0.88, rotate: 11, dim: 0.5, sat: 0.72 },
  { x: 92, scale: 0.77, rotate: 17, dim: 0.3, sat: 0.55 },
];

const LAST_RING = RING.length - 1;

export default function NovaGalleryStack({
  slides,
  interval = 4200,
}: {
  slides: StackSlide[];
  /** Dwell time on each card, in milliseconds. */
  interval?: number;
}) {
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduced = useReducedMotion();

  const go = useCallback(
    (dir: number) => setActive((i) => (i + dir + count) % count),
    [count]
  );

  // A backgrounded tab should not queue up advances and then jump on return.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (reduced || paused || hidden || count < 2) return;
    const id = window.setInterval(() => go(1), interval);
    return () => window.clearInterval(id);
  }, [reduced, paused, hidden, count, interval, go]);

  /** Signed distance to the focused card, wrapped so the loop is bidirectional. */
  const offsetOf = (index: number) => {
    let d = index - active;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    return d;
  };

  if (!count) return null;

  const running = !reduced && !paused && !hidden && count > 1;

  return (
    <div
      className="nv-stack"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        }
      }}
    >
      <div
        className="nv-stack__stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Hospital gallery"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="nv-stack__deck">
          {slides.map((slide, index) => {
            const offset = offsetOf(index);
            const distance = Math.abs(offset);
            const beyond = distance > LAST_RING;
            const ring = RING[Math.min(distance, LAST_RING)];
            const sign = Math.sign(offset);
            const isActive = offset === 0;

            const body = (
              <>
                <span className="nv-stack__frame">
                  {slide.image ? (
                    <SmartImage
                      src={slide.image}
                      // Decorative: .nv-stack__title prints this exact string below the
                      // frame, so a non-empty alt would render the name twice whenever
                      // the candidate URL 404s and the img falls back to its alt text.
                      alt=""
                      fill
                      optimizeWidth={1100}
                      className="nv-stack__photo"
                      sizes="(max-width: 900px) 86vw, 620px"
                      fallback={<span className="nv-stack__fallback" />}
                    />
                  ) : (
                    <span className="nv-stack__fallback" />
                  )}
                  <span className="nv-stack__scrim" aria-hidden />
                </span>

                <span className="nv-stack__meta">
                  {slide.label ? (
                    <span className="nv-stack__label">{slide.label}</span>
                  ) : null}
                  <span className="nv-stack__title">{slide.title}</span>
                  {slide.description ? (
                    <span className="nv-stack__desc">{slide.description}</span>
                  ) : null}
                  <span className="nv-stack__more">
                    View
                    <ArrowUpRight aria-hidden />
                  </span>
                </span>
              </>
            );

            return (
              <div
                key={slide.key}
                className="nv-stack__slot"
                data-active={isActive || undefined}
                style={{
                  zIndex: 20 - distance,
                  opacity: beyond ? 0 : 1,
                  filter: `brightness(${beyond ? 0.2 : ring.dim}) saturate(${
                    beyond ? 0.4 : ring.sat
                  })`,
                  pointerEvents: beyond ? "none" : undefined,
                  transform:
                    `translate3d(${sign * (beyond ? 104 : ring.x)}%, 0, 0)` +
                    ` scale(${beyond ? 0.68 : ring.scale})` +
                    ` rotateY(${-sign * ring.rotate}deg)`,
                }}
              >
                {isActive ? (
                  <Link href={slide.href} className="nv-stack__card">
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="nv-stack__card"
                    tabIndex={beyond ? -1 : 0}
                    aria-label={`Show ${slide.title}`}
                    onClick={() => setActive(index)}
                  >
                    {body}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="nv-stack__nav">
          <p className="nv-stack__count" aria-hidden>
            {String(active + 1).padStart(2, "0")}
            <i>/</i>
            {String(count).padStart(2, "0")}
          </p>

          <div className="nv-stack__dots">
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                className="nv-stack__dot"
                data-on={index === active || undefined}
                aria-label={`Show image ${index + 1} of ${count}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
              >
                {index === active && !reduced ? (
                  // Remounts on every change of `active`, which restarts the fill.
                  <span
                    key={`fill-${active}`}
                    className="nv-stack__dot-fill"
                    aria-hidden
                    style={{
                      animationDuration: `${interval}ms`,
                      animationPlayState: running ? "running" : "paused",
                    }}
                  />
                ) : null}
              </button>
            ))}
          </div>

          <div className="nv-stack__arrows">
            <button
              type="button"
              className="nv-stack__arrow"
              aria-label="Previous image"
              onClick={() => go(-1)}
            >
              <ChevronLeft aria-hidden />
            </button>

            <button
              type="button"
              className="nv-stack__arrow"
              aria-label="Next image"
              onClick={() => go(1)}
            >
              <ChevronRight aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
