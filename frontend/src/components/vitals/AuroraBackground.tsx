"use client";

import { useEffect, useRef } from "react";

/**
 * Poisely-style ambient background with aurora orbs, grain texture,
 * and a cursor-following radial glow. Pure CSS animations — no canvas.
 */
export default function AuroraBackground() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    function handleMove(e: MouseEvent) {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX}px`;
        glowRef.current.style.top = `${e.clientY}px`;
        glowRef.current.style.opacity = "1";
      }
    }

    function handleLeave() {
      if (glowRef.current) {
        glowRef.current.style.opacity = "0";
      }
    }

    document.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <>
      {/* Aurora floating orbs */}
      <div className="poisely-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>

      {/* Film grain overlay */}
      <div className="poisely-grain" aria-hidden="true" />

      {/* Cursor-following glow */}
      <div className="poisely-cursor-glow" ref={glowRef} aria-hidden="true" />
    </>
  );
}
