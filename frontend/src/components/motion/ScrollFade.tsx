"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR =
  "main section, main article, main .v-frame, main [data-scroll-fade]";

/**
 * Site-wide scroll fade-up for major blocks that are not already wrapped in Reveal.
 */
export default function ScrollFade() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter(
      (el) =>
        !el.hasAttribute("data-reveal") &&
        !el.closest("[data-reveal]") &&
        !el.querySelector("[data-reveal]")
    );

    nodes.forEach((el) => {
      el.classList.add("v-scroll-fade");
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    nodes.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      nodes.forEach((el) => {
        el.classList.remove("v-scroll-fade", "is-in");
      });
    };
  }, [pathname]);

  return null;
}
