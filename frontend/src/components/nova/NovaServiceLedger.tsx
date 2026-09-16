"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { iconForText } from "@/lib/healthIcons";
import { toRoman } from "@/lib/utils";
import { useInView, useSpotlight } from "./hooks";
import SmartImage from "@/components/shared/SmartImage";

export type ServiceEntry = {
  id: string;
  href: string;
  title: string;
  description?: string;
  /** The service's own photograph. The glyph is used when there is none. */
  image?: string | null;
};

/**
 * The service catalogue, set as one ruled sheet instead of six floating cards.
 *
 * Two decisions carry this section, and both come from what the content actually
 * is rather than from a preference about cards.
 *
 * It is typographic. The service records carry printed posters, not photographs
 * — a flyer with its own headline and phone number baked into the artwork. Give
 * one of those a 16:10 hero crop and it reads as clip art, and the four records
 * with no artwork at all get a grey rectangle with a small glyph in the middle,
 * which is what the six-card grid did. A catalogue of what a hospital offers
 * reads better as a catalogue: an ordinal, a seal, a name, and a sentence. The
 * page has photographs where they earn their place — the hero, the campus
 * stack, the staff portraits — and this section gives that run of imagery a rest.
 *
 * It is one sheet. Six cards means six borders and six shadows competing at the
 * same weight; ruling the cells apart with hairlines makes the set read as one
 * object, and lets the glyph rather than the frame do the work of telling the
 * six units apart. The ordinals are roman here for the same reason as on the
 * staff board below: they are doing classical work, not arithmetic.
 */
export default function NovaServiceLedger({
  items,
}: {
  items: ServiceEntry[];
}) {
  // Stateless and keyed off event.currentTarget, so one handler serves every
  // cell — the wash is drawn by whichever unit the pointer is actually inside.
  const { onPointerMove } = useSpotlight<HTMLAnchorElement>();
  const { ref, shown } = useInView<HTMLDivElement>({ threshold: 0.1 });

  if (!items.length) return null;

  return (
    <div ref={ref} className="nv-svl" data-lit={shown ? "true" : "false"}>
      <span className="nv-svl__tick nv-svl__tick--tl" aria-hidden />
      <span className="nv-svl__tick nv-svl__tick--br" aria-hidden />

      <ol className="nv-svl__grid">
        {items.map((item, i) => {
          const Glyph = iconForText(item.title);
          return (
            <li
              key={item.id}
              className="nv-svl__cell"
              style={{ "--nv-i": i } as CSSProperties}
            >
              <Link
                href={item.href}
                className="nv-svl__unit nv-spot"
                onPointerMove={onPointerMove}
              >
                {/* Bronze rule drawn along the top of the cell on approach. It is
                    its own element rather than the cell border, because the top
                    row of the sheet has no border to recolour. */}
                <span className="nv-svl__edge" aria-hidden />

                {/* The glyph again, large and nearly out of ink. It is what the
                    photograph used to occupy, and unlike the photograph it is
                    the same weight in every cell. Dropped under 700px, where
                    there is no column free of type for it to sit behind. */}
                <span className="nv-svl__wm" aria-hidden>
                  <Glyph />
                </span>

                {item.image ? (
                  <span className="nv-svl__media" aria-hidden>
                    <SmartImage
                      src={item.image}
                      alt=""
                      width={640}
                      height={360}
                      className="nv-svl__img"
                    />
                  </span>
                ) : null}

                <span className="nv-svl__head">
                  <span className="nv-svl__seal" aria-hidden>
                    <Glyph />
                  </span>
                  <span className="nv-svl__ord" aria-hidden>
                    {toRoman(i + 1)}
                  </span>
                </span>

                <span className="nv-svl__mark" aria-hidden />

                <h3 className="nv-svl__title">{item.title}</h3>

                {item.description ? (
                  <p className="nv-svl__desc">{item.description}</p>
                ) : null}

                <span className="nv-svl__go">
                  Explore unit
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
