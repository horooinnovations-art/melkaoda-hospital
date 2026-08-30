"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Counts up to `value` the first time it scrolls into view. */
export default function Counter({
  value,
  suffix = "",
  duration = 1600,
  delay = 0,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  /**
   * Milliseconds to hold after the counter comes into view before it starts.
   * A row of figures that shares one plate comes into view all at once, and
   * four numbers rolling in unison read as one animation rather than four; the
   * delay is what lets them arrive in sequence.
   */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    let frame = 0;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const run = () => {
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // easeOutExpo keeps the last digits from crawling
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            setDisplay(Math.round(value * eased));
            if (t < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        };

        if (delay > 0) timer = window.setTimeout(run, delay);
        else run();
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [value, duration, delay]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatCount(display)}
      {suffix}
    </span>
  );
}

/**
 * Large tallies read better compacted (1.5M) than spelled out.
 *
 * Exported because a caller setting the figure in a display face needs the
 * final string to reserve width with: the number changes on every frame of the
 * roll-up, and a proportional font would otherwise reflow the whole line
 * eighty times on the way to 150K.
 */
export function formatCount(value: number) {
  if (value >= 1_000_000) {
    return `${trimZero(value / 1_000_000)}M`;
  }
  if (value >= 10_000) {
    return `${trimZero(value / 1_000)}K`;
  }
  return value.toLocaleString("en-US");
}

function trimZero(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
