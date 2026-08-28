"use client";

import type { ReactNode } from "react";
import NovaReveal from "./NovaReveal";
import NovaWords from "./NovaWords";

/**
 * Shared section header: eyebrow, headline with word-by-word reveal, optional
 * lede and a trailing action slot.
 */
export default function NovaSectionHead({
  eyebrow,
  title,
  accentFrom,
  lede,
  action,
  count,
}: {
  eyebrow: string;
  title: string;
  /** Word index where the gradient accent begins. */
  accentFrom?: number;
  lede?: string;
  action?: ReactNode;
  count?: string;
}) {
  return (
    <div className="nv-head">
      <NovaReveal className="nv-head__copy" from="up">
        <p className="nv-eyebrow">
          {eyebrow}
          {count ? <span className="nv-head__count">{count}</span> : null}
        </p>

        <h2 className="nv-h2 nv-head__title">
          <NovaWords text={title} accentFrom={accentFrom} />
        </h2>

        {lede ? <p className="nv-lede nv-head__lede">{lede}</p> : null}
      </NovaReveal>

      {action ? (
        <NovaReveal from="right" delay={0.12} className="shrink-0">
          {action}
        </NovaReveal>
      ) : null}
    </div>
  );
}
