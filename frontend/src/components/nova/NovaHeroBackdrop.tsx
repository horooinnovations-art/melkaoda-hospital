"use client";

import { useEffect, useState } from "react";
import SmartImage from "@/components/shared/SmartImage";
import { useReducedMotion } from "./hooks";

/**
 * Photographic backdrop for the hero: the hospital's own images cross-fading
 * behind the headline, one at a time, on a long dwell.
 *
 * It is deliberately much slower than the gallery carousel below the fold. That
 * one is a thing you look at and navigate; this one is the room the hero stands
 * in, so a visitor who reads the headline and leaves should see a single
 * photograph and never a transition. Nothing here is interactive and nothing is
 * announced — the same images are reachable, with captions and links, in the
 * carousel.
 *
 * Every layer stays mounted and depth is carried by opacity alone, because the
 * images are stacked in the same box: unmounting the outgoing one would tear a
 * hole in the middle of the fade.
 *
 * Readability is not this component's job — the scrim in `.nv-hero__veil` is
 * what keeps the copy legible, and it is tuned in nova-hero.css against the
 * hero's own two-column grid.
 */

export default function NovaHeroBackdrop({
  images,
  interval = 5200,
}: {
  images: string[];
  /** Dwell time on each photograph, in milliseconds. */
  interval?: number;
}) {
  // Six is already more than a visitor will ever see; beyond that it is only
  // bytes. The first is `priority`, so keeping the list short also keeps the
  // hero's image budget honest.
  const shots = images.filter(Boolean).slice(0, 6);
  const count = shots.length;

  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);
  const reduced = useReducedMotion();

  // A backgrounded tab should not queue up advances and then jump on return.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (reduced || hidden || count < 2) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % count),
      interval
    );
    return () => window.clearInterval(id);
  }, [reduced, hidden, count, interval]);

  if (!count) return null;

  return (
    <div className="nv-hero__back" aria-hidden>
      {shots.map((src, index) => (
        <span
          key={`${index}-${src}`}
          className="nv-hero__shot"
          data-on={index === active || undefined}
        >
          <SmartImage
            src={src}
            alt=""
            fill
            priority={index === 0}
            optimizeWidth={1920}
            sizes="100vw"
            className="nv-hero__shot-img"
            fallback={<span className="nv-hero__shot-fallback" />}
          />
        </span>
      ))}

      <span className="nv-hero__veil" />
    </div>
  );
}
