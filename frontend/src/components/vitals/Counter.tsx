"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Counts up to `value` the first time it scrolls into view. */
export default function Counter({
  value,
  suffix = "",
  duration = 1600,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
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
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // easeOutExpo keeps the last digits from crawling
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setDisplay(Math.round(value * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(display)}
      {suffix}
    </span>
  );
}

/** Large tallies read better compacted (1.5M) than spelled out. */
function format(value: number) {
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
