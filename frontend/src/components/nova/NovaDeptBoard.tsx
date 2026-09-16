"use client";

import { Fragment } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { iconForText } from "@/lib/healthIcons";
import { cleanPublicText, toRoman, truncate } from "@/lib/utils";
import { useInView, useSpotlight } from "./hooks";
import SmartImage from "@/components/shared/SmartImage";

export type BoardUnit = {
  key: string;
  href: string;
  title: string;
  description?: string;
  /** The unit's own photograph. The glyph is used when there is none. */
  image?: string | null;
};

/**
 * The clinical units, set as a wayfinding board rather than a photo directory.
 *
 * The shape of this section is decided by what the department records actually
 * hold, and the honest answer is: not photographs. Of the six units published
 * today, three point at one identical stock operating theatre — so Obstetrics
 * and Laboratory both illustrated themselves with somebody else's surgical
 * suite — one points at a clip-art ambulance with a transparent background, one
 * has a genuine picture of the outpatient waiting room, and one has nothing.
 * The previous version put a 92x62 thumbnail on every row and lifted a large
 * preview card under the cursor, which is the arrangement that shows that off
 * most clearly: hovering three different units produced the same theatre.
 *
 * So imagery is out of this block, and the glyph is in. Every unit resolves to
 * one through `iconForText`, they are distinct across the six, and they cannot
 * 404. The departments' own pages still use the photographs, where a single
 * image sits in its own context rather than in a row of six.
 *
 * What differentiates this from the service ledger above it — same system, same
 * metal, deliberately not the same object — is that this one is a BOARD: a rail
 * down the left margin with a station node per unit, squared signage seals
 * rather than the ledger's round ones, and names that drop into place a word at
 * a time like mechanical type. The rail grows downward as the board arrives,
 * one segment per row, because each row draws its own segment on its own beat.
 */
export default function NovaDeptBoard({ units }: { units: BoardUnit[] }) {
  // One handler for the whole board: `.nv-spot` reads the pointer off
  // event.currentTarget, so the wash is painted by whichever row it is inside.
  const { onPointerMove } = useSpotlight<HTMLAnchorElement>();
  const { ref, shown } = useInView<HTMLDivElement>({ threshold: 0.08 });

  if (!units.length) return null;

  return (
    <div ref={ref} className="nv-dbd" data-lit={shown ? "true" : "false"}>
      <span className="nv-dbd__tick nv-dbd__tick--tl" aria-hidden />
      <span className="nv-dbd__tick nv-dbd__tick--br" aria-hidden />

      <div className="nv-dbd__head">
        <p className="nv-dbd__label">
          Directory
          <span className="nv-dbd__count">
            {String(units.length).padStart(2, "0")} units
          </span>
        </p>
        <p className="nv-dbd__legend" aria-hidden>
          <i />
          <i />
          <i />
          One campus
        </p>
      </div>

      <ol className="nv-dbd__list">
        {units.map((unit, i) => {
          const Glyph = iconForText(unit.title);
          const name = cleanPublicText(unit.title) || unit.title;
          const words = name.split(/\s+/).filter(Boolean);
          const blurb = unit.description
            ? truncate(cleanPublicText(unit.description), 170)
            : "";

          return (
            <li
              key={unit.key}
              className="nv-dbd__item"
              style={{ "--nv-i": i } as CSSProperties}
            >
              <Link
                href={unit.href}
                className="nv-dbd__unit nv-spot"
                onPointerMove={onPointerMove}
              >
                {/* The rail segment for this row, plus its station node. Drawn
                    per row rather than once for the list, so the rail grows
                    down the board on the same stagger as the rows themselves. */}
                <span className="nv-dbd__rail" aria-hidden />
                <span className="nv-dbd__node" aria-hidden />

                {/* The unit's photograph, falling back to the glyph. The
                    seal keeps its size either way, so a feed mixing records
                    with and without a picture still rules straight. */}
                <span className="nv-dbd__seal" aria-hidden>
                  {unit.image ? (
                    <SmartImage
                      src={unit.image}
                      alt=""
                      width={96}
                      height={96}
                      className="nv-dbd__thumb"
                    />
                  ) : (
                    <Glyph />
                  )}
                </span>

                <span className="nv-dbd__ord" aria-hidden>
                  {toRoman(i + 1)}
                </span>

                <span className="nv-dbd__copy">
                  {/* One flap per word: the inner element is what falls, the
                      outer one is what clips it. Real spaces between them, so
                      the name still wraps and still copies as a sentence. */}
                  <span className="nv-dbd__name">
                    {words.map((word, w) => (
                      <Fragment key={`${word}-${w}`}>
                        <span
                          className="nv-dbd__flap"
                          style={{ "--nv-w": w } as CSSProperties}
                        >
                          <i>{word}</i>
                        </span>
                        {w < words.length - 1 ? " " : null}
                      </Fragment>
                    ))}
                  </span>

                  {blurb ? (
                    <span className="nv-dbd__desc">{blurb}</span>
                  ) : null}
                </span>

                {/* The leader. A directory sets a dotted rule from the entry to
                    the thing it points at, and this row is 1200px wide with a
                    call to action pinned to the far end of it — so the gap
                    between them is spanned rather than left empty. */}
                <span className="nv-dbd__leader" aria-hidden />

                <span className="nv-dbd__go">
                  <span className="nv-dbd__go-text">Enter unit</span>
                  <ArrowUpRight />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
