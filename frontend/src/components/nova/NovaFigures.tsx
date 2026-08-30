"use client";

import type { ComponentType, CSSProperties } from "react";
import { Activity, Award, Building2, HeartPulse, UserCheck } from "lucide-react";
import Counter, { formatCount } from "@/components/vitals/Counter";
import NovaWords from "./NovaWords";
import { useInView } from "./hooks";

export type Figure = { value: number; label: string };

/**
 * Only the icon is inferred from the label. There used to be a `hint` string
 * beside each figure too, and every one of them paraphrased the label it sat
 * under — "Departments / Clinical units under one roof" was word for word the
 * heading of the section above it. A number, its label and a rule is the unit.
 */
function figureIcon(label: string): ComponentType<{ className?: string }> {
  const key = label.toLowerCase();
  if (/doctor|physician|staff|clinician/.test(key)) return UserCheck;
  if (/department|unit|center|centre|ward/.test(key)) return Building2;
  if (/patient|served|treated|catchment|population|community/.test(key)) {
    return HeartPulse;
  }
  if (/year|experience|service|heritage/.test(key)) return Award;
  return Activity;
}

/**
 * The hospital's numbers, set as an engraved plate.
 *
 * The figures were four grotesque numerals in a hairline-ruled row, which is a
 * perfectly respectable way to set statistics and also the way every product
 * page sets them. These are not product metrics: they are ten doctors, twenty
 * units, a hundred and six years. That is a record of an institution, and the
 * form for a record of an institution is a document — so this is one. Cross
 * hatched security paper, a rule inset from the edge, registration marks in all
 * four corners, and the numbers themselves cut in the serif at the size the
 * page gives its headlines.
 *
 * Three details are load-bearing rather than decorative:
 *
 *   · The "+" is a separate mark, set small and raised in the metal. It is a
 *     qualifier on the number, not a digit of it, and typesetting it as one is
 *     the difference between an engraving and a spreadsheet.
 *   · Each figure reserves its final width with a hidden twin of the finished
 *     string. The serif has no tabular figures, so without it every frame of
 *     the roll-up would reflow the label under it.
 *   · The count drives the column track directly, so one figure or four both
 *     fill the plate. The stems between them are suppressed per breakpoint at
 *     the start of each visual row, which is why the same rule is restated at
 *     each width — a narrower breakpoint's `:nth-child()` outranks a bare class.
 */
export default function NovaFigures({
  eyebrow,
  title,
  lede,
  figures,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  figures: Figure[];
}) {
  const { ref, shown } = useInView<HTMLDivElement>({ threshold: 0.12 });

  if (!figures.length) return null;

  return (
    <div ref={ref} className="nv-eng" data-lit={shown ? "true" : "false"}>
      {/* The engraving and the inset rule are separate layers: the texture has
          to sit under everything, and the rule has to sit over the texture
          without either of them being able to catch a pointer. */}
      <span className="nv-eng__weave" aria-hidden />
      <span className="nv-eng__frame" aria-hidden />
      <span className="nv-eng__tick nv-eng__tick--tl" aria-hidden />
      <span className="nv-eng__tick nv-eng__tick--tr" aria-hidden />
      <span className="nv-eng__tick nv-eng__tick--bl" aria-hidden />
      <span className="nv-eng__tick nv-eng__tick--br" aria-hidden />

      <div className="nv-eng__head">
        <p className="nv-eyebrow">{eyebrow}</p>
        <h2 className="nv-h2 nv-eng__title">
          <NovaWords text={title} accentFrom={1} />
        </h2>
        {lede ? <p className="nv-lede nv-eng__lede">{lede}</p> : null}
      </div>

      <div
        className="nv-eng__figs"
        data-n={figures.length}
        style={{ "--nv-n": figures.length } as CSSProperties}
      >
        {figures.map((figure, i) => {
          const Icon = figureIcon(figure.label);
          return (
            <div
              key={figure.label}
              className="nv-eng__fig"
              style={{ "--nv-i": i } as CSSProperties}
            >
              <span className="nv-eng__stem" aria-hidden />

              <span className="nv-eng__ico" aria-hidden>
                <Icon />
              </span>

              <p className="nv-eng__value">
                <span className="nv-eng__num">
                  {/* Two layers in one grid cell. The lower one is the finished
                      number in transparent ink: it reserves the width the
                      roll-up will end at — the serif has no tabular figures, so
                      without it the label under a rolling number would shuffle
                      sideways eighty times — and it is also the copy a screen
                      reader gets, which is the final figure rather than
                      whichever frame the animation happens to be on. */}
                  <span className="nv-eng__ghost">
                    {formatCount(figure.value)}
                  </span>
                  <span className="nv-eng__live" aria-hidden>
                    <Counter value={figure.value} delay={220 + i * 170} />
                  </span>
                </span>
                <span className="nv-eng__plus">+</span>
              </p>

              <p className="nv-eng__label">{figure.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
