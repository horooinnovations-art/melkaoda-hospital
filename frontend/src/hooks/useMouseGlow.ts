"use client";

import { useEffect, useRef } from "react";

/**
 * Poisely-style cursor-following radial glow on card elements.
 * Attaches to a container and sets --mx / --my CSS custom properties
 * on child elements matching the selector, enabling a CSS ::before
 * radial-gradient highlight that tracks the mouse.
 */
export function useMouseGlow(
  selector = ".g-glow-card"
) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current ?? document;

    function handleMove(e: MouseEvent) {
      const cards = container.querySelectorAll<HTMLElement>(selector);
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mx", `${x}px`);
        card.style.setProperty("--my", `${y}px`);
      });
    }

    document.addEventListener("mousemove", handleMove, { passive: true });
    return () => document.removeEventListener("mousemove", handleMove);
  }, [selector]);

  return containerRef;
}

export default useMouseGlow;
