"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "li";
  /** Fade out again when leaving the viewport (default true). */
  fadeOut?: boolean;
  /** Entrance direction. */
  from?: "up" | "down" | "left" | "right" | "none";
}

export default function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  fadeOut = true,
  from = "up",
}: RevealProps) {
  const Tag = as;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (!fadeOut) observer.disconnect();
        } else if (fadeOut) {
          setVisible(false);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fadeOut]);

  const hiddenTransform =
    from === "up"
      ? "motion-safe:translate-y-8"
      : from === "down"
        ? "motion-safe:-translate-y-8"
        : from === "left"
          ? "motion-safe:translate-x-8"
          : from === "right"
            ? "motion-safe:-translate-x-8"
            : "";

  return (
    <Tag
      ref={ref as never}
      data-reveal=""
      data-reveal-visible={visible ? "true" : "false"}
      className={cn(
        "motion-safe:transition-[opacity,transform,filter]",
        "motion-safe:duration-700",
        "motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible
          ? "translate-y-0 translate-x-0 opacity-100 blur-0"
          : cn(
              "motion-safe:opacity-0 motion-safe:blur-[2px]",
              hiddenTransform
            ),
        className
      )}
      style={{
        transitionDelay: visible ? `${Math.min(delay, 0.55)}s` : "0s",
        willChange: visible ? "auto" : "opacity, transform, filter",
      }}
    >
      {children}
    </Tag>
  );
}
