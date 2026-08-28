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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (options?.once !== false) observer.disconnect();
        } else if (options?.once === false) {
          setShown(false);
        }
      },
      {
        threshold: options?.threshold ?? 0.16,
        rootMargin: options?.rootMargin ?? "0px 0px -8% 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return { ref, shown };
}

