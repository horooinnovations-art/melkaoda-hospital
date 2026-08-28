"use client";

import type { CSSProperties } from "react";
import { useInView } from "./hooks";

/**
 * Splits a string into words that rise out of their own overflow mask, one
 * after the other. `accentFrom` marks the index where the gradient ink starts —
 * used to lift the hospital name out of the rest of the headline.
 *
 * The inter-word space sits outside the masked span; inside it the trailing
 * whitespace would collapse and the words would run together.
 */
export default function NovaWords({
  text,
  accentFrom,
  stagger = 70,
  delay = 0,
  className,
}: {
  text: string;
  /** Word index (inclusive) where the gradient accent begins. */
  accentFrom?: number;
  /** Milliseconds between words. */
  stagger?: number;
  /** Milliseconds before the first word moves. */
  delay?: number;
  className?: string;
}) {
  const { ref, shown } = useInView<HTMLSpanElement>({ threshold: 0.25 });
  const words = text.trim().split(/\s+/).filter(Boolean);

  return (
    <span
      ref={ref}
      className={["nv-words", className].filter(Boolean).join(" ")}
      data-shown={shown ? "true" : "false"}
    >
      {words.map((word, i) => {
        const accent = accentFrom !== undefined && i >= accentFrom;
        return (
          <span key={`${word}-${i}`}>
            <span className="nv-word">
              <span
                className={accent ? "nv-ink" : undefined}
                style={
                  { "--nv-d": `${delay + i * stagger}ms` } as CSSProperties
                }
              >
                {word}
              </span>
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </span>
  );
}
