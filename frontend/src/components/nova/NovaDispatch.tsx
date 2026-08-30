"use client";

import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import { ArrowUpRight, Inbox } from "lucide-react";
import { toRoman } from "@/lib/utils";
import { useInView, useSpotlight } from "./hooks";

export type DispatchEntry = {
  id: string;
  href: string;
  /** Raw timestamp from the API; parsed for the rail, ignored if unreadable. */
  date?: string;
  title: string;
  excerpt?: string;
};

export type DispatchNote = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  /** Renders the note as a link — a phone number worth tapping, say. */
  href?: string;
  /** Draws the pulse on the seal. One note at most, or it means nothing. */
  live?: boolean;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Read off the front of the ISO string rather than through `new Date`. The sheet
 * renders on the server and again in the browser, and those two run in different
 * timezones often enough — a notice posted late in the evening would be dated a
 * day apart in the two passes, which React reports as a hydration mismatch. The
 * date on a hospital notice is the calendar date it carries, not an instant, so
 * reading the digits is both simpler and the correct answer.
 */
function dateParts(raw?: string) {
  const match = raw ? /^(\d{4})-(\d{2})-(\d{2})/.exec(raw) : null;
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return { year: match[1], month, day: match[3] };
}

/**
 * Hospital notices, set as a dated dispatch sheet.
 *
 * What it replaces was a column of five hairline-ruled rows with a small
 * zero-padded ordinal and a date in grey, beside two fact cards in a narrow
 * aside — the same shape as the testimonial section above it, which meant the
 * bottom half of the home page read as one long repeated pattern.
 *
 * The change is that the date does the work here. These are notices: what a
 * reader wants first is when, so the day is set large in the rail with the month
 * and year beneath it, and a bronze node marks each one on a timeline that draws
 * itself down the sheet as it comes into view. The ordinals are roman and set as
 * a folio number at the outer edge, which is where a printed record puts them
 * and is also out of the way of the title.
 *
 * The two standing notes — the emergency line and the campus — are ruled into the
 * foot of the same sheet, matching the assurance strip on the voices folio. Both
 * take an optional href, so the phone number is a number you can dial rather
 * than one you have to copy out.
 */
export default function NovaDispatch({
  entries,
  notes = [],
}: {
  entries: DispatchEntry[];
  notes?: DispatchNote[];
}) {
  // Stateless and keyed off event.currentTarget, so one handler serves every
  // entry — the wash is drawn by whichever row the pointer is actually inside.
  const { onPointerMove } = useSpotlight<HTMLAnchorElement>();
  const { ref, shown } = useInView<HTMLDivElement>({ threshold: 0.08 });

  return (
    <div ref={ref} className="nv-disp" data-lit={shown ? "true" : "false"}>
      <span className="nv-disp__weave" aria-hidden />
      <span className="nv-disp__glow" aria-hidden />
      <span className="nv-disp__tick nv-disp__tick--tl" aria-hidden />
      <span className="nv-disp__tick nv-disp__tick--br" aria-hidden />

      {entries.length ? (
        <ol className="nv-disp__list">
          {entries.map((entry, i) => {
            const parts = dateParts(entry.date);
            return (
              <li
                key={entry.id}
                className="nv-disp__item"
                style={{ "--nv-i": i } as CSSProperties}
              >
                <Link
                  href={entry.href}
                  className="nv-disp__entry nv-spot"
                  onPointerMove={onPointerMove}
                >
                  <span className="nv-disp__edge" aria-hidden />

                  <span className="nv-disp__rail">
                    <span className="nv-disp__node" aria-hidden />
                    {parts ? (
                      <>
                        <span className="nv-disp__day">{parts.day}</span>
                        <span className="nv-disp__mon">{parts.month}</span>
                        <span className="nv-disp__year">{parts.year}</span>
                      </>
                    ) : (
                      <span className="nv-disp__mon">Notice</span>
                    )}
                  </span>

                  {/* A div rather than a span: it holds a heading and a
                      paragraph, which are flow content. `<a>` is transparent, so
                      wrapping them in the link is valid — nesting them inside a
                      span would not be. */}
                  <div className="nv-disp__body">
                    <span className="nv-disp__ord" aria-hidden>
                      {toRoman(i + 1)}
                    </span>
                    <h3 className="nv-disp__title">{entry.title}</h3>
                    {entry.excerpt ? (
                      <p className="nv-disp__excerpt">{entry.excerpt}</p>
                    ) : null}
                    <span className="nv-disp__go">
                      Read notice
                      <ArrowUpRight />
                    </span>
                  </div>

                </Link>
              </li>
            );
          })}

        </ol>
      ) : (
        <div className="nv-disp__void">
          <span className="nv-disp__void-ico" aria-hidden>
            <Inbox />
          </span>
          <p className="nv-disp__void-title">No updates yet</p>
          <p className="nv-disp__void-desc">
            Hospital notices and announcements will appear here.
          </p>
        </div>
      )}

      {notes.length ? (
        <ul className="nv-disp__notes">
          {notes.map((note, i) => {
            const Glyph = note.icon;
            const inner = (
              <>
                <span className="nv-disp__note-edge" aria-hidden />
                <span
                  className="nv-disp__seal"
                  data-live={note.live ? "true" : "false"}
                  aria-hidden
                >
                  <Glyph />
                </span>
                <span className="nv-disp__note-title">{note.title}</span>
                <span className="nv-disp__note-desc">{note.desc}</span>
              </>
            );

            return (
              <li
                key={note.title}
                className="nv-disp__note"
                style={{ "--nv-i": i } as CSSProperties}
              >
                {note.href ? (
                  <a href={note.href} className="nv-disp__note-inner">
                    {inner}
                  </a>
                ) : (
                  <span className="nv-disp__note-inner">{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

    </div>
  );
}

