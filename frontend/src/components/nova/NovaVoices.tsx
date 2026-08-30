"use client";

import {
  Fragment,
  useEffect,
  useId,
  useState,
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Star } from "lucide-react";
import { cleanPublicText, toRoman, truncate } from "@/lib/utils";
import type { Testimonial } from "@/lib/types";
import { useInView, useReducedMotion } from "./hooks";

export type VoiceAssurance = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
};

const ROTATE_MS = 7600;

/** Words past this index share the last delay step, so the tail of a long quote
    is not still arriving a beat after the reader has got there. */
const STAGGER_CAP = 24;

function initialsOf(name: string) {
  return (
    name
      .replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "·"
  );
}

/**
 * Patient voices, set as one bound folio.
 *
 * What it replaces was a rotating quote plate with three small fact cards
 * stacked in a column beside it — four separate objects at four separate
 * weights, and only one of the five stories visible at a time, the other four
 * reachable through three two-pixel dots. So this is a single object with three
 * bands, and each band's form comes from what the content actually is.
 *
 *   · The stage. A testimonial is a piece of writing, so it is set like one: the
 *     serif at display size, arriving word by word, under an opening mark cut in
 *     bronze. Every quote stays mounted and stacked in one grid cell, which is
 *     what keeps the folio from changing height between a one-line story and a
 *     five-line one.
 *   · The spine. All of the voices are listed down the right edge by name, with
 *     the first words of what each one said. It is a real tab list — arrow keys,
 *     Home and End move through it — so the stories are a set the reader chooses
 *     from rather than a slideshow they wait out. The rule under the selected
 *     name is the rotation clock: it fills over exactly one interval, and it
 *     stops while a pointer or the keyboard is inside the folio, because a
 *     carousel that keeps moving while you are reading it is the reason people
 *     distrust carousels.
 *   · The strip. The hospital's standing assurances, ruled into the foot of the
 *     same sheet. They are what the quotes above them are evidence for, and
 *     setting them inside the folio says so; as three floating cards they only
 *     said "here are three more cards".
 */
export default function NovaVoices({
  items,
  assurances = [],
}: {
  items: Testimonial[];
  assurances?: VoiceAssurance[];
}) {
  const uid = useId();
  const reduced = useReducedMotion();
  const { ref, shown } = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  /* Bumped whenever the folio is released or a voice is picked. It re-keys the
     meter so the rule that draws the countdown restarts from zero at the same
     moment the timer below does — without it a pointer could leave and the rule
     would resume from where it froze while the timer began again from nothing. */
  const [run, setRun] = useState(0);

  const total = items.length;
  const autoRotates = total > 1 && !reduced;
  /* With one story there is nothing to index and nothing to count, so the spine
     and the ordinal are not drawn and the stage takes the whole width. A tab list
     of one tab, and a counter reading "I / I", are both furniture. */
  const solo = total < 2;

  useEffect(() => {
    if (!autoRotates || held) return;
    const id = setTimeout(
      () => setIndex((current) => (current + 1) % total),
      ROTATE_MS
    );
    return () => clearTimeout(id);
  }, [index, run, total, autoRotates, held]);

  if (!total) return null;

  const select = (next: number) => {
    setIndex(next);
    setRun((value) => value + 1);
  };

  /* Mouse only. A tap fires pointerenter too, and on the touch devices that
     never send the matching pointerleave that would freeze the rotation for
     good after a single tap. */
  const hold = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") setHeld(true);
  };

  const release = () => {
    setHeld(false);
    setRun((value) => value + 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;

    let next = -1;
    if (step) next = (index + step + total) % total;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = total - 1;
    else return;

    event.preventDefault();
    select(next);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[data-voice="${next}"]`)
      ?.focus();
  };

  return (
    <div
      ref={ref}
      className="nv-vox"
      data-lit={shown ? "true" : "false"}
      data-auto={autoRotates ? "true" : "false"}
      data-held={held ? "true" : "false"}
      data-solo={solo ? "true" : "false"}
      style={{ "--nv-vox-ms": `${ROTATE_MS}ms` } as CSSProperties}
      onPointerEnter={hold}
      onPointerLeave={release}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={release}
    >
      {/* Two ambient layers under the type at z-index 0: the ruled paper, and a
          warm pool that breathes. */}
      <span className="nv-vox__weave" aria-hidden />
      <span className="nv-vox__glow" aria-hidden />
      <span className="nv-vox__tick nv-vox__tick--tl" aria-hidden />
      <span className="nv-vox__tick nv-vox__tick--br" aria-hidden />

      <div className="nv-vox__stage">
        <div className="nv-vox__main">
          {/* The closing mark, as a watermark. It lives inside the stage column
              and is clipped by it, so it cannot bleed under the index beside it
              or the assurance strip below. */}
          <span className="nv-vox__wm" aria-hidden>
            &rdquo;
          </span>

          <div className="nv-vox__meta">
            <span className="nv-vox__mark" aria-hidden>
              &ldquo;
            </span>
            {solo ? null : (
              <span className="nv-vox__ord" aria-hidden>
                {toRoman(index + 1)}
                <i>/</i>
                {toRoman(total)}
              </span>
            )}
          </div>

          <div className="nv-vox__panes">
            {items.map((item, i) => {
              const on = i === index;
              const words = truncate(cleanPublicText(item.content), 300)
                .split(/\s+/)
                .filter(Boolean);
              const stars = Math.max(
                1,
                Math.min(5, Math.round(item.rating ?? 5))
              );

              return (
                <figure
                  key={item.id}
                  id={`${uid}-pane-${i}`}
                  role="tabpanel"
                  aria-labelledby={`${uid}-voice-${i}`}
                  className="nv-vox__pane"
                  data-on={on ? "true" : "false"}
                  tabIndex={on ? 0 : -1}
                >
                  <blockquote className="nv-vox__quote">
                    {words.map((word, w) => (
                      <Fragment key={`${w}-${word}`}>
                        {w > 0 ? " " : null}
                        <span
                          className="nv-vox__w"
                          style={
                            { "--nv-w": Math.min(w, STAGGER_CAP) } as CSSProperties
                          }
                        >
                          {word}
                        </span>
                      </Fragment>
                    ))}
                  </blockquote>

                  <figcaption className="nv-vox__by">
                    <span className="nv-vox__av" aria-hidden>
                      {initialsOf(item.patient_name)}
                    </span>
                    <span>
                      <span className="nv-vox__name">{item.patient_name}</span>
                      <span
                        className="nv-vox__stars"
                        aria-label={`${stars} out of 5`}
                      >
                        {Array.from({ length: stars }, (_, s) => (
                          <span
                            key={s}
                            className="nv-vox__star"
                            style={{ "--nv-s": s } as CSSProperties}
                          >
                            <Star fill="currentColor" />
                          </span>
                        ))}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              );
            })}

          </div>
        </div>

        {solo ? null : (
          <div
            className="nv-vox__spine"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Patient stories"
            onKeyDown={onKeyDown}
          >
          <p className="nv-vox__spine-label">Voices</p>

          {items.map((item, i) => {
            const on = i === index;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                data-voice={i}
                id={`${uid}-voice-${i}`}
                aria-controls={`${uid}-pane-${i}`}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                data-on={on ? "true" : "false"}
                className="nv-vox__voice"
                style={{ "--nv-i": i } as CSSProperties}
                onClick={() => select(i)}
              >
                <span className="nv-vox__av nv-vox__av--sm" aria-hidden>
                  {initialsOf(item.patient_name)}
                </span>

                <span className="nv-vox__voice-copy">
                  <span className="nv-vox__voice-name">
                    {item.patient_name}
                  </span>
                  <span className="nv-vox__voice-hint">
                    {truncate(cleanPublicText(item.content), 46)}
                  </span>
                </span>

                {/* Re-keyed on every selection and every release so the fill
                    restarts in step with the timer rather than resuming. */}
                {on ? (
                  <span
                    key={`${index}-${run}`}
                    className="nv-vox__meter"
                    aria-hidden
                  >
                    <span className="nv-vox__meter-fill" />
                  </span>
                ) : null}
              </button>
            );
          })}
          </div>
        )}
      </div>

      {assurances.length ? (
        <ul className="nv-vox__strip">
          {assurances.map((item, i) => {
            const Glyph = item.icon;
            return (
              <li
                key={item.title}
                className="nv-vox__cell"
                style={{ "--nv-i": i } as CSSProperties}
              >
                <span className="nv-vox__cell-edge" aria-hidden />
                <span className="nv-vox__seal" aria-hidden>
                  <Glyph />
                </span>
                <p className="nv-vox__cell-title">{item.title}</p>
                <p className="nv-vox__cell-desc">{item.desc}</p>
              </li>
            );
          })}
        </ul>
      ) : null}

    </div>
  );


}

