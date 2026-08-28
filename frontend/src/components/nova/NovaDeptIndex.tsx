"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { cleanPublicText, truncate } from "@/lib/utils";
import NovaReveal from "./NovaReveal";
import { useReducedMotion } from "./hooks";

export type IndexEntry = {
  key: string;
  href: string;
  title: string;
  description?: string;
  image?: string | null;
};

/**
 * Editorial index of clinical units. On pointer devices, hovering a row lifts a
 * preview card that trails the cursor; small screens fall back to the inline
 * thumbnail that is always rendered.
 */
export default function NovaDeptIndex({ entries }: { entries: IndexEntry[] }) {
  const reduced = useReducedMotion();
  const peekRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<IndexEntry | null>(null);

  const track = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    const node = peekRef.current;
    if (!node) return;
    // Offset so the card sits below-right of the cursor without covering the row.
    node.style.setProperty("--nv-x", `${event.clientX + 26}px`);
    node.style.setProperty("--nv-y", `${event.clientY - 96}px`);
  }, []);

  return (
    <>
      <div className="nv-index">
        {entries.map((entry, i) => {
          const title = cleanPublicText(entry.title) || entry.title;
          const blurb = entry.description
            ? truncate(cleanPublicText(entry.description), 150)
            : "";

          return (
            <NovaReveal key={entry.key} from="left" delay={Math.min(i, 6) * 0.06}>
              <Link
                href={entry.href}
                className="nv-index__row"
                onPointerMove={reduced ? undefined : track}
                onPointerEnter={reduced ? undefined : () => setHovered(entry)}
                onPointerLeave={reduced ? undefined : () => setHovered(null)}
              >
                <span className="nv-index__num" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="nv-index__copy">
                  <span className="nv-index__name block">{title}</span>
                  {blurb ? (
                    <span className="nv-index__desc block">{blurb}</span>
                  ) : null}
                </span>

                <span className="nv-index__tail">
                  <span className="nv-index__thumb" aria-hidden>
                    {entry.image ? (
                      <SmartImage
                        src={entry.image}
                        alt=""
                        fill
                        optimizeWidth={200}
                        sizes="68px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="nv-index__go" aria-hidden>
                    <ArrowUpRight />
                  </span>
                </span>
              </Link>
            </NovaReveal>
          );
        })}
      </div>

      {!reduced && (
        <div
          ref={peekRef}
          className="nv-peek"
          data-on={hovered ? "true" : "false"}
          aria-hidden
        >
          <div className="nv-peek__inner">
            {hovered?.image ? (
              <SmartImage
                key={hovered.key}
                src={hovered.image}
                alt=""
                fill
                optimizeWidth={640}
                sizes="278px"
                className="object-cover"
              />
            ) : null}
            <span className="nv-peek__glow" />
            <span className="nv-peek__tag">
              {hovered ? cleanPublicText(hovered.title) : ""}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

