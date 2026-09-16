"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** True once the user has expressed a reduced-motion preference. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Writes the pointer position into `--mx` / `--my` on the element so CSS can
 * draw a radial spotlight that tracks the cursor. Percentages keep the gradient
 * stable across card sizes.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  const onPointerMove = useCallback((event: React.PointerEvent<T>) => {
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    node.style.setProperty(
      "--mx",
      `${((event.clientX - rect.left) / rect.width) * 100}%`
    );
    node.style.setProperty(
      "--my",
      `${((event.clientY - rect.top) / rect.height) * 100}%`
    );
  }, []);

  return { ref, onPointerMove };
}

/**
 * Subtle 3D tilt driven by the pointer's offset from the element centre.
 * `max` is the peak rotation in degrees; motion is dropped entirely when the
 * user prefers reduced motion.
 */
export function useTilt<T extends HTMLElement>(max = 7) {
  const reduced = useReducedMotion();

  const onPointerMove = useCallback(
    (event: React.PointerEvent<T>) => {
      if (reduced) return;
      const node = event.currentTarget;
      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      node.style.setProperty("--nv-ty", `${px * max * 2}deg`);
      node.style.setProperty("--nv-tx", `${-py * max * 2}deg`);
    },
    [max, reduced]
  );

  const onPointerLeave = useCallback((event: React.PointerEvent<T>) => {
    const node = event.currentTarget;
    node.style.setProperty("--nv-ty", "0deg");
    node.style.setProperty("--nv-tx", "0deg");
  }, []);

  return { onPointerMove, onPointerLeave };
}

/**
 * Flips `data-shown` on the element the first time it enters the viewport.
 * One observer per node keeps the reveal independent of React re-renders.
 */
export function useInView<T extends HTMLElement>(
  options?: { threshold?: number; rootMargin?: string; once?: boolean }
) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    /**
     * Failsafe for an observer that never reports at all.
     *
     * Everything using this starts at opacity 0 and is revealed by script, so
     * if the observer never runs the page is simply blank — an unacceptable
     * failure mode for a hospital's opening hours and emergency number.
     *
     * A working observer always invokes its callback once when it begins
     * observing, whether or not the element is on screen. So "the callback has
     * not run at all" is a reliable signal that it is broken, and is different
     * from "the element is below the fold", which must keep waiting. Only the
     * former reveals early.
     */
    let reported = false;
    const failsafe = window.setTimeout(() => {
      if (!reported) setShown(true);
    }, 2000);

    const observer = new IntersectionObserver(
      ([entry]) => {
        reported = true;
        if (entry.isIntersecting) {
          setShown(true);
          if (options?.once !== false) observer.disconnect();
        } else if (options?.once === false) {
          setShown(false);
        }
      },
      {
        /**
         * Zero, not a fraction.
         *
         * This asked for 16% of the element to be visible before revealing it.
         * `intersectionRatio` is the visible fraction of the ELEMENT, so it can
         * never exceed viewportHeight / elementHeight — an element taller than
         * about six viewports cannot reach 0.16 no matter where the reader
         * scrolls, and it stays at opacity 0 for ever.
         *
         * That is what hid long pages. A department or service article runs to
         * several thousand pixels, and on a phone, where the viewport is
         * shorter, the ceiling is lower still, so the more an editor wrote the
         * more certainly it vanished. The listings showed it too: the cards
         * were all in the DOM and nine of twelve were invisible.
         *
         * A threshold of 0 fires as soon as any part of the element crosses the
         * boundary, which is what a scroll-in animation wants and is the one
         * value that cannot be unreachable. The negative bottom margin still
         * holds the reveal until the element is properly on screen.
         */
        threshold: options?.threshold ?? 0,
        rootMargin: options?.rootMargin ?? "0px 0px -8% 0px",
      }
    );

    observer.observe(node);
    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return { ref, shown };
}

