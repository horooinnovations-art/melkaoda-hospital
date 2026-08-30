"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { iconForText } from "@/lib/healthIcons";
import { cleanPublicText, cn, truncate } from "@/lib/utils";
import { useSpotlight } from "./hooks";

/* ── Atelier card — every interior grid ────────────────────────────────────
   Services, departments, emergency services: anything `ResourceList` renders
   as a grid. `.nv-card` on the homepage mounts its photograph inset inside a
   symmetrical plate; this one runs the photograph to the edge, squares one
   corner and strikes a bracket in it, and sets the glyph seal straddling the
   join between image and copy.

   The seal is the load-bearing part. Six cards in a row all carry the same
   kicker — "Clinical service", six times — so the kicker tells a scanning
   visitor nothing. `iconForText()` reads the item's own name and picks the
   glyph, which means the mark on the join is the first thing that says which
   card this is, before a word of it is read.
   ---------------------------------------------------------------------- */

export function NovaAtelierCard({
  href,
  title,
  description,
  image,
  kicker = "Featured care",
  cta = "Explore",
  index,
  compact = false,
  className,
}: {
  href: string;
  title: string;
  description?: string;
  image?: string | null;
  kicker?: string;
  /** Names the thing being opened. "Read more" tells a visitor nothing. */
  cta?: string;
  /** Zero-based position in the grid; prints as the chip on the photograph. */
  index?: number;
  compact?: boolean;
  className?: string;
}) {
  const { onPointerMove } = useSpotlight<HTMLAnchorElement>();
  const name = cleanPublicText(title) || title;
  // Generous budget on purpose: `.nv-xc__desc` clamps to three rendered lines,
  // so the cut lands at the end of a line rather than at a character count.
  // This only guards against a description long enough to be absurd.
  const blurb = description
    ? truncate(cleanPublicText(description), compact ? 190 : 260)
    : "";
  const Icon = iconForText(name, kicker);

  return (
    <Link
      href={href}
      onPointerMove={onPointerMove}
      className={cn("nv-xc nv-beam nv-spot", compact && "nv-xc--compact", className)}
    >
      <div className="nv-xc__frame">
        {image ? (
          <SmartImage
            src={image}
            // Decorative: the title is set directly below it. A non-empty alt
            // here is what a broken image renders as body text, which is how
            // the same service name came to appear twice on cards whose
            // photograph 404s.
            alt=""
            fill
            optimizeWidth={compact ? 640 : 900}
            className="nv-xc__photo"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
            fallback={
              <span className="nv-xc__void">
                <Icon />
              </span>
            }
          />
        ) : (
          <span className="nv-xc__void">
            <Icon />
          </span>
        )}

        <span className="nv-xc__veil" aria-hidden />

        {typeof index === "number" ? (
          <span className="nv-xc__ord" aria-hidden>
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      <div className="nv-xc__body">
        <span className="nv-xc__seal" aria-hidden>
          <Icon />
        </span>

        <p className="nv-xc__kicker">{kicker}</p>
        <h3 className="nv-xc__title">{name}</h3>
        {blurb ? <p className="nv-xc__desc">{blurb}</p> : null}

        <div className="nv-xc__foot">
          <span className="nv-xc__go">{cta}</span>
          <span className="nv-xc__disc" aria-hidden>
            <ArrowUpRight />
          </span>
        </div>
      </div>

      <span className="nv-xc__mark" aria-hidden />
    </Link>
  );
}

/* ── Ledger row — every interior feed ──────────────────────────────────────
   News, announcements, events, careers, health education. Same family as the
   card above — the square corner with a bracket in it, the bronze join, the
   index — but a row is read left to right, so the join becomes a vertical rule
   and the index is set large and faint behind the copy.

   `lead` is the first item on page 1 and nothing else. "Featured" means top of
   the feed, and item 13 on page 2 is not the top of anything.
   ---------------------------------------------------------------------- */

export function NovaLedgerRow({
  href,
  title,
  excerpt,
  image,
  date,
  index,
  lead = false,
  flag = "Latest",
  cta = "Read more",
}: {
  href: string;
  title: string;
  excerpt?: string;
  image?: string | null;
  date?: string;
  /** Zero-based position in the feed; prints as the watermark numeral. */
  index: number;
  lead?: boolean;
  flag?: string;
  cta?: string;
}) {
  const name = cleanPublicText(title) || title;

  return (
    <Link href={href} className={cn("nv-led", lead && "nv-led--lead")}>
      <span className="nv-led__frame">
        {image ? (
          <SmartImage
            src={image}
            // Decorative: `.nv-led__title` carries this item's name in text
            // directly beside the frame.
            alt=""
            fill
            optimizeWidth={lead ? 1200 : 900}
            className="nv-led__photo"
            sizes="(max-width: 768px) 100vw, 46vw"
            fallback={
              <span className="nv-led__initial" aria-hidden>
                {name.charAt(0)}
              </span>
            }
          />
        ) : (
          <span className="nv-led__initial" aria-hidden>
            {name.charAt(0)}
          </span>
        )}

        <span className="nv-led__veil" aria-hidden />
        {lead ? <span className="nv-led__flag">{flag}</span> : null}
      </span>

      <span className="nv-led__copy">
        <span className="nv-led__ord" aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>

        {date ? <span className="nv-led__date">{date}</span> : null}
        <span className="nv-led__title block">{name}</span>
        {excerpt ? <span className="nv-led__excerpt block">{excerpt}</span> : null}

        <span className="nv-led__more">
          <span className="nv-led__more-rule" aria-hidden />
          {cta}
          <ArrowUpRight aria-hidden />
        </span>
      </span>

      <span className="nv-led__mark" aria-hidden />
    </Link>
  );
}
