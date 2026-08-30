"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Stethoscope } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { toRoman } from "@/lib/utils";
import { useInView, useSpotlight, useTilt } from "./hooks";

export type StaffMember = {
  id: string;
  href: string;
  name: string;
  role?: string;
  department?: string;
  photo?: string | null;
};

function monogram(name: string) {
  return (
    name
      .replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|sr\.?)\s+/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "DR"
  );
}

/**
 * The clinical staff board: one mounted portrait beside a ruled index of names.
 *
 * Hovering or focusing a name mounts that portrait; with nothing held, the board
 * advances itself. The dwell clock IS the bronze rule sweeping under the active
 * name — there is no setInterval anywhere in here. Advancing happens on the
 * animationend of that sweep, which buys three things for free:
 *
 *   · pausing is exact. `animation-play-state: paused` freezes the clock and the
 *     progress rule as one thing, so they cannot drift apart the way a JS timer
 *     and a CSS animation do.
 *   · a backgrounded tab, or a section scrolled away from, stops advancing,
 *     because the browser stops running the animation.
 *   · `prefers-reduced-motion` removes the animation, and with it the
 *     auto-advance — no second branch to keep in step with the first.
 */
export default function NovaStaffGallery({
  members,
}: {
  members: StaffMember[];
}) {
  const { ref, shown: live } = useInView<HTMLDivElement>({
    threshold: 0.14,
    once: false,
  });

  // `live` toggles both ways so the board can pause once it scrolls away. The
  // entrance must not replay on the way back, so it latches on first sight.
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (live) setLit(true);
  }, [live]);

  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  const total = members.length;

  // A shorter list after a re-fetch must not leave the board pointing past the
  // end of it.
  useEffect(() => {
    setActive((i) => (i < total ? i : 0));
  }, [total]);

  const spot = useSpotlight<HTMLSpanElement>();
  const tilt = useTilt<HTMLSpanElement>(3.2);
  const onNicheMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    spot.onPointerMove(event);
    tilt.onPointerMove(event);
  };

  if (!total) return null;

  const index = Math.min(active, total - 1);
  const paused = held || !live || total < 2;

  return (
    <div
      ref={ref}
      className="nv-sg"
      data-lit={lit ? "true" : "false"}
      data-held={paused ? "true" : "false"}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <span className="nv-sg__tick nv-sg__tick--tl" aria-hidden />
      <span className="nv-sg__tick nv-sg__tick--br" aria-hidden />

      {/* ── The mounted portrait ─────────────────────────────────────────── */}
      <div className="nv-sg__stage">
        {members.map((member, i) => {
          const on = i === index;
          return (
            <Link
              key={member.id}
              href={member.href}
              className="nv-sg__plate"
              data-active={on ? "true" : "false"}
              aria-hidden={!on}
              tabIndex={on ? undefined : -1}
            >
              <span className="nv-sg__ghost" aria-hidden>
                {toRoman(i + 1)}
              </span>

              <span
                className="nv-sg__niche"
                onPointerMove={onNicheMove}
                onPointerLeave={tilt.onPointerLeave}
              >
                <span className="nv-sg__apse" aria-hidden />

                {member.photo ? (
                  <SmartImage
                    src={member.photo}
                    alt=""
                    fill
                    optimizeWidth={720}
                    className="nv-sg__photo"
                    sizes="(max-width: 1023px) 78vw, 380px"
                    fallback={
                      <span className="nv-sg__mono">
                        {monogram(member.name)}
                      </span>
                    }
                  />
                ) : (
                  <span className="nv-sg__mono">{monogram(member.name)}</span>
                )}

                <span className="nv-sg__veil" aria-hidden />
                <span className="nv-sg__glaze" aria-hidden />
                <span className="nv-sg__archivolt" aria-hidden />
              </span>

              <span className="nv-sg__plinth" aria-hidden />

              <span className="nv-sg__cap">
                {member.department ? (
                  <span
                    className="nv-sg__line"
                    style={{ "--nv-i": 0 } as CSSProperties}
                  >
                    <span className="nv-sg__kick">
                      <Stethoscope />
                      {member.department}
                    </span>
                  </span>
                ) : null}

                <span
                  className="nv-sg__line"
                  style={{ "--nv-i": 1 } as CSSProperties}
                >
                  <span className="nv-sg__name">{member.name}</span>
                </span>

                {member.role ? (
                  <span
                    className="nv-sg__line"
                    style={{ "--nv-i": 2 } as CSSProperties}
                  >
                    <span className="nv-sg__role">{member.role}</span>
                  </span>
                ) : null}

                <span
                  className="nv-sg__line"
                  style={{ "--nv-i": 3 } as CSSProperties}
                >
                  <span className="nv-sg__go">
                    View profile
                    <ArrowUpRight />
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── The index ────────────────────────────────────────────────────── */}
      <div className="nv-sg__index">
        <p className="nv-sg__legend">
          <span>On the board</span>
          <span className="nv-sg__count">
            {String(index + 1).padStart(2, "0")}
            <i aria-hidden>/</i>
            {String(total).padStart(2, "0")}
          </span>
        </p>

        <ol className="nv-sg__roster">
          {members.map((member, i) => {
            const on = i === index;
            return (
              <li key={member.id} style={{ "--nv-i": i } as CSSProperties}>
                <Link
                  href={member.href}
                  className="nv-sg__row"
                  data-active={on ? "true" : "false"}
                  aria-current={on ? "true" : undefined}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  <span className="nv-sg__num">{toRoman(i + 1)}</span>

                  <span className="nv-sg__rowcopy">
                    <span className="nv-sg__rowname">{member.name}</span>
                    {member.department || member.role ? (
                      <span className="nv-sg__rowmeta">
                        {[member.department, member.role]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </span>

                  <span className="nv-sg__rowgo" aria-hidden>
                    <ArrowUpRight />
                  </span>

                  {/* Rendered on the active row only: becoming active mounts a
                      fresh element, so the sweep always restarts from zero —
                      including when a pointer picks a name out of order. */}
                  {on ? (
                    <span
                      className="nv-sg__sweep"
                      aria-hidden
                      onAnimationEnd={() =>
                        setActive((current) => (current + 1) % total)
                      }
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>

        {/* An affordance, not information: hidden on touch, where there is no
            hover to explain and a tap simply opens the profile. */}
        <p className="nv-sg__hint">Hover a name to see the portrait</p>
      </div>
    </div>
  );
}
