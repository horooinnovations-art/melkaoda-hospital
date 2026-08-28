"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "./hooks";

type Direction = "up" | "down" | "left" | "right" | "scale" | "none";

const OFFSETS: Record<Direction, { x: string; y: string; s: string }> = {
  up: { x: "0px", y: "44px", s: "1" },
  down: { x: "0px", y: "-44px", s: "1" },
  left: { x: "44px", y: "0px", s: "1" },
  right: { x: "-44px", y: "0px", s: "1" },
  scale: { x: "0px", y: "22px", s: "0.965" },
  none: { x: "0px", y: "0px", s: "1" },
};

/**
 * Scroll-triggered entrance. The transform origin is expressed through CSS
 * variables so the animation itself stays in the stylesheet.
 */
export default function NovaReveal({
  children,
  as: Tag = "div",
  from = "up",
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  from?: Direction;
  /** Seconds. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, shown } = useInView<HTMLDivElement>();
  const offset = OFFSETS[from];

  return (
    <Tag
      ref={ref}
      data-nv-reveal=""
      data-shown={shown ? "true" : "false"}
      className={className}
      style={
        {
          "--nv-rx": offset.x,
          "--nv-ry": offset.y,
          "--nv-rs": offset.s,
          "--nv-rd": `${Math.min(delay, 1.1)}s`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
