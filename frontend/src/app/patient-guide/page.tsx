"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Clock,
  Info,
  LifeBuoy,
  ListChecks,
  MapPin,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import {
  DetailPanel,
  DetailSectionHeader,
} from "@/components/shared/DetailShell";
import { formatPublicAddress, stripHtml } from "@/lib/utils";
import MapLink from "@/components/shared/MapLink";

const FALLBACK_INTRO =
  "Everything you need to plan your visit and make the most of your healthcare experience.";

/** Comparable form of a heading, so "Insurance &amp; Payment" matches its title. */
function headingKey(value: string) {
  return stripHtml(String(value || "").replace(/&amp;/gi, "&"))
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

/**
 * Drop a field's own title when the editor typed it into the field.
 *
 * Every one of these settings arrived with its section name as the first line —
 * "Documents to Bring" heads the Documents to Bring field. The page already
 * prints that title above the panel, so left alone it reads twice. Only a
 * *leading* heading that actually matches is removed; anything else is content.
 */
function stripLeadingHeading(html: string, title: string) {
  if (!html) return html;
  const lead = html.match(
    /^\s*(?:<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>|<p\b[^>]*>\s*<strong>[\s\S]*?<\/strong>\s*<\/p>)/i
  );
  if (!lead || headingKey(lead[0]) !== headingKey(title)) return html;
  return html.slice(lead[0].length);
}

/** The plain-text equivalent, for fields that are not rich text. */
function stripLeadingLine(value: string, title: string) {
  const lines = String(value || "").split(/\r?\n/);
  if (lines.length > 1 && headingKey(lines[0]) === headingKey(title)) {
    return lines.slice(1).join("\n").trim();
  }
  return String(value || "");
}

/**
 * Close up the gap `stripHtml` leaves behind.
 *
 * Stripping tags substitutes a space for each one, so "<strong>CBHI</strong>,"
 * comes out as "CBHI ,". Only punctuation that never takes a leading space is
 * pulled back, which leaves ordinary spacing alone.
 */
function tidy(text: string) {
  return text.replace(/\s+([,.;:!?%)\]])/g, "$1").replace(/([([])\s+/g, "$1").trim();
}

/**
 * Pull the items out of an editor's list.
 *
 * Every section of this page is one rich-text settings field, so what arrives is
 * whatever the TipTap editor produced. When that is a list, the items are worth
 * more as rows than as a wall of prose - so they are lifted out and set as tiles.
 * When it is not, `Prose` renders it untouched and nothing is lost.
 */
function htmlListItems(html?: string | null): string[] {
  if (!html) return [];
  const items = String(html).match(/<li\b[^>]*>([\s\S]*?)<\/li>/gi);
  if (!items) return [];
  return items
    .map((item) => tidy(stripHtml(item)))
    .filter((item) => item.length > 0);
}

/** True when the list the editor wrote was numbered rather than bulleted. */
function isOrderedList(html?: string | null) {
  return /<ol\b/i.test(String(html || ""));
}

/**
 * Split a field on its headings, so "Tips for Your Visit" can be three cards
 * instead of one panel. A field with no headings returns nothing and falls back
 * to `Prose`, which is why an editor is never forced to use them.
 *
 * A real <h*> is only one of the three shapes this accepts. Editors reach for the
 * bold button far more often than the heading menu, so a paragraph that is
 * nothing but bold text counts, and so does a bold run started mid-paragraph
 * after a <br> — which is how the live tips field is actually written.
 */
const PSEUDO_HEADING =
  /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>|<p\b[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>|<br\s*\/?>\s*<strong>([\s\S]*?)<\/strong>/gi;

function htmlHeadingSections(html?: string | null): { title: string; body: string }[] {
  if (!html) return [];
  const text = String(html);
  const pattern = new RegExp(PSEUDO_HEADING.source, "gi");
  const marks: { title: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    marks.push({
      title: stripHtml(match[1] ?? match[2] ?? match[3] ?? "").trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  if (!marks.length) return [];

  return marks
    .map((mark, i) => {
      const stop = i + 1 < marks.length ? marks[i + 1].start : text.length;
      return { title: mark.title, body: tidy(stripHtml(text.slice(mark.end, stop))) };
    })
    .filter((entry) => entry.title.length > 0);
}

/** A titled plate, matching the panels the detail pages already use. */
function GuidePanel({
  icon: Icon,
  kicker,
  title,
  delay = 0.05,
  children,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <DetailPanel delay={delay}>
      <div className="nv-dpanel__label">
        <span className="nv-dpanel__icon" aria-hidden>
          <Icon />
        </span>
        <div>
          <p className="nv-dpanel__kicker">{kicker}</p>
          <h2 className="nv-dpanel__title">{title}</h2>
        </div>
      </div>
      {children}
    </DetailPanel>
  );
}

/**
 * A settings field rendered as rows when it is a list, and as prose otherwise.
 * `glyph` is the mark for a bulleted list; a numbered list always counts.
 */
function ListBody({
  html,
  glyph: Glyph,
}: {
  html: string;
  glyph: LucideIcon;
}) {
  const items = htmlListItems(html);
  if (!items.length) return <Prose html={html} />;

  const ordered = isOrderedList(html);
  return (
    <ul className="nv-tiles">
      {items.map((item, i) => (
        <li key={`${i}-${item.slice(0, 24)}`} className="nv-tile">
          {ordered ? (
            <span className="nv-pgn" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
          ) : (
            <span className="nv-pgb" aria-hidden>
              <Glyph />
            </span>
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PatientGuidePage() {
  const { data: settings, isLoading, isError } = useGetSettingsQuery();

  // Each field is read through the leading-title strippers: the stored copy
  // repeats its own section name, and the panel above it prints that already.
  const rich = (key: string, title: string) =>
    stripLeadingHeading((settings?.[key] as string) || "", title).trim();

  const intro =
    stripLeadingLine((settings?.patient_guide_intro as string) || "", "Patient Guide").trim() ||
    FALLBACK_INTRO;
  const visitingHours = (settings?.visiting_hours as string) || "";
  const insurance = rich("patient_guide_insurance", "Insurance & Payment");
  const directions = rich("patient_guide_directions", "Location & Directions");
  const documents = rich("patient_guide_documents", "Documents to Bring");
  const admission = rich("patient_guide_admission", "Admission & Discharge");
  const additional = rich("patient_guide_additional", "Additional Information");
  const tipsHtml = rich("patient_guide_tips", "Tips for Your Visit");
  const help =
    stripLeadingLine((settings?.patient_guide_help as string) || "", "Need More Help?").trim();

  // Directions is optional: an empty field falls back to the address and map
  // link an admin already filled in on the Address tab, so the section is only
  // missing when the hospital has recorded no location at all.
  const address = formatPublicAddress(settings?.address as string | undefined);
  const mapUrl = (settings?.google_maps_url as string) || "";
  const hasPlace = Boolean(directions || address);

  const tips = htmlHeadingSections(tipsHtml);

  const hasBody = Boolean(
    visitingHours ||
      insurance ||
      hasPlace ||
      documents ||
      admission ||
      additional ||
      tipsHtml ||
      help
  );

  return (
    <PageTransition>
      <PageHero
        section="/patient-guide"
        title="Patient"
        accent="Guide"
        eyebrow="Your visit"
        subtitle={intro}
        breadcrumbs={[{ label: "Patient Guide" }]}
      />

      <PageBody narrow>
        {isLoading ? (
          <GridSkeleton count={4} />
        ) : isError ? (
          <EmptyState
            title="Unable to load the patient guide"
            description="Please try again in a moment."
          />
        ) : !hasBody ? (
          <EmptyState
            title="The patient guide is being prepared"
            description="Visiting hours, what to bring, and payment details will appear here shortly."
          />
        ) : (
          <div className="nv-dstack">
            {visitingHours && (
              <NovaReveal from="up" delay={0.04}>
                <div className="nv-pgh">
                  <span className="nv-pgh__label">
                    <Clock aria-hidden />
                    Visiting hours
                  </span>
                  <p className="nv-pgh__value">{stripHtml(visitingHours)}</p>
                </div>
              </NovaReveal>
            )}

            {insurance && (
              <GuidePanel
                icon={Wallet}
                kicker="Cover and billing"
                title="Insurance & Payment"
                delay={0.06}
              >
                <ListBody html={insurance} glyph={BadgeCheck} />
              </GuidePanel>
            )}

            {hasPlace && (
              <GuidePanel
                icon={MapPin}
                kicker="Finding us"
                title="Location & Directions"
                delay={0.07}
              >
                {directions ? (
                  <ListBody html={directions} glyph={MapPin} />
                ) : (
                  <p className="nv-dplain">
                    <MapLink>{address}</MapLink>
                  </p>
                )}
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="nv-dlink mt-4"
                  >
                    <span>Open in Maps</span>
                    <span className="nv-dlink__ico" aria-hidden>
                      <ArrowUpRight />
                    </span>
                  </a>
                )}
              </GuidePanel>
            )}

            {documents && (
              <GuidePanel
                icon={ListChecks}
                kicker="Before you leave home"
                title="Documents to Bring"
                delay={0.08}
              >
                <ListBody html={documents} glyph={BadgeCheck} />
              </GuidePanel>
            )}

            {admission && (
              <GuidePanel
                icon={BadgeCheck}
                kicker="On the day"
                title="Admission & Discharge"
                delay={0.09}
              >
                <ListBody html={admission} glyph={BadgeCheck} />
              </GuidePanel>
            )}

            {additional && (
              <GuidePanel
                icon={Info}
                kicker="Ward etiquette"
                title="Additional Information"
                delay={0.1}
              >
                <ListBody html={additional} glyph={Info} />
              </GuidePanel>
            )}

            {tipsHtml && (
              <section className="nv-asec">
                <DetailSectionHeader
                  eyebrow="Make the visit easier"
                  title="Tips for Your Visit"
                  description="Small things that shorten the wait and make the consultation count."
                />
                {tips.length ? (
                  <div className="nv-vgrid">
                    {tips.map((tip, i) => (
                      <NovaReveal
                        key={tip.title}
                        from="up"
                        delay={0.06 + i * 0.09}
                      >
                        <article className="nv-vcard">
                          <div className="nv-vcard__top">
                            <span className="nv-vcard__icon" aria-hidden>
                              <Sparkles />
                            </span>
                            <span className="nv-vcard__index" aria-hidden>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <h3 className="nv-vcard__title">{tip.title}</h3>
                          {tip.body && (
                            <p className="nv-vcard__desc">{tip.body}</p>
                          )}
                        </article>
                      </NovaReveal>
                    ))}
                  </div>
                ) : (
                  <DetailPanel delay={0.06}>
                    <Prose html={tipsHtml} />
                  </DetailPanel>
                )}
              </section>
            )}

            <GuidePanel
              icon={LifeBuoy}
              kicker="Still unsure"
              title="Need More Help?"
              delay={0.11}
            >
              <p className="nv-dplain">
                {help
                  ? stripHtml(help)
                  : "Our patient services team is happy to answer any question before you arrive."}
              </p>
              <div className="nv-dmeta mt-5">
                <Link href="/contact" className="nv-dlink">
                  <span>Contact us</span>
                  <span className="nv-dlink__ico" aria-hidden>
                    <ArrowUpRight />
                  </span>
                </Link>
                <Link href="/downloads" className="nv-dlink">
                  <span>Forms and downloads</span>
                  <span className="nv-dlink__ico" aria-hidden>
                    <ArrowUpRight />
                  </span>
                </Link>
              </div>
            </GuidePanel>
          </div>
        )}
      </PageBody>
    </PageTransition>
  );
}
