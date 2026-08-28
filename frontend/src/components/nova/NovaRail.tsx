"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import NovaReveal from "./NovaReveal";

/**
 * Horizontal snap rail with arrow controls. The buttons disable themselves at
 * either end so the controls always reflect what is actually scrollable.
 */
export default function NovaRail({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setEdges({
      start: node.scrollLeft <= 2,
      end: max <= 2 || node.scrollLeft >= max - 2,
    });
  }, []);

  useEffect(() => {
    measure();
    const node = scrollerRef.current;
    if (!node) return;
    node.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      node.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const nudge = (direction: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.min(node.clientWidth * 0.8, 560) });
  };

  return (
    <div className="nv-rail-wrap">
      <NovaReveal from="up">
        <div
          className="nv-rail-scroll"
          ref={scrollerRef}
          role="group"
          aria-label={label}
        >
          {children}
        </div>
      </NovaReveal>

      <div className="nv-rail-ctrl mt-6">
        <button
          type="button"
          className="nv-rail-btn"
          aria-label="Scroll left"
          disabled={edges.start}
          onClick={() => nudge(-1)}
        >
          <ArrowLeft />
        </button>
        <button
          type="button"
          className="nv-rail-btn"
          aria-label="Scroll right"
          disabled={edges.end}
          onClick={() => nudge(1)}
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

