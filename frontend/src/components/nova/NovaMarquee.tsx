"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Seamless horizontal marquee. The children are rendered twice so the track can
 * translate a full -100% and land exactly where it started.
 */
export default function NovaMarquee({
  children,
  speed = 34,
  gap = 44,
  reverse = false,
  className,
}: {
  children: ReactNode;
  /** Seconds for one full pass. */
  speed?: number;
  /** Pixel gap between items. */
  gap?: number;
  reverse?: boolean;
  className?: string;
}) {
  const style = {
    "--nv-speed": `${speed}s`,
    "--nv-gap": `${gap}px`,
  } as CSSProperties;

  return (
    <div
      className={[
        "nv-marquee",
        reverse ? "nv-marquee--reverse" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className="nv-marquee__track">{children}</div>
      <div className="nv-marquee__track" aria-hidden>
        {children}
      </div>
    </div>
  );
}
