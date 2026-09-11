"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Building2,
  Compass,
  Flag,
  Globe2,
  HandHeart,
  HeartHandshake,
  Landmark,
  Medal,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Eye,
  Star,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useGetSettingsQuery, useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import NovaReveal from "@/components/nova/NovaReveal";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import {
  DetailPanel,
  DetailSectionHeader,
  DetailDivider,
  DetailLinkChip,
} from "@/components/shared/DetailShell";
import { OfficerProfile } from "@/components/shared/PeopleProfiles";
import Counter from "@/components/vitals/Counter";
import { getImageFromItem } from "@/lib/media";
import { SITE_NAME } from "@/lib/api";
import { stripHtml } from "@/lib/utils";
import type { Leader } from "@/lib/types";

/* ─── Types ─── */
type ValueItem = {
  emoji?: string;
  title: string;
  description: string;
};

type HistoryEra = {
  title: string;
  year?: string;
  paragraphs: string[];
  bullets: string[];
};

type AwardItem = {
  emoji?: string;
  title: string;
  subtitle?: string;
  description: string;
  highlights: string[];
};

/* ─── Icon Maps ─── */
const VALUE_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /compassion|empathy|dignity/i, icon: HeartHandshake },
  { match: /integrity|honesty|ethic/i, icon: Scale },
  { match: /quality|excellence|safe|evidence/i, icon: Award },
  { match: /team|collaborat/i, icon: Users },
  { match: /equity|access|inclusi|fair/i, icon: Globe2 },
  { match: /professional|development|learning|innovatio|capacity/i, icon: BookOpen },
];

function iconForValue(title: string): LucideIcon {
  return VALUE_ICONS.find((v) => v.match.test(title))?.icon ?? Sparkles;
}

/* ─── Parsers (preserved from original) ─── */
function toPlainParagraphs(text: string): string[] {
  const plain = stripHtml(text).replace(/\r/g, "").trim();
  if (!plain) return [];
  const blocks = plain
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;
  const sentences =
    plain.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [plain];
  if (sentences.length <= 3) return [plain];
  const groups: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    groups.push(sentences.slice(i, i + 2).join(" "));
  }
  return groups;
}

function htmlToLines(raw: string): string[] {
  let text = raw;
  if (raw.includes("<")) {
    text = raw
      .replace(/<\/(p|div|h[1-6]|li|br)\s*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<(li|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  return text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const HISTORY_HEADING =
  /^(Foundation(?:\s*\([^)]+\))?|Growth\s*&\s*Expansion|Expanding Catchment(?:\s*&\s*Capacity)?|Comprehensive Health Services|National Recognition(?:\s*&\s*Innovation)?|Community-Based Health Insurance(?:\s*\(CBHI\))?|CBHI|Quality Improvement Leadership|Today)\b/i;

const HISTORY_SKIP =
  /^(our history|our journey of excellence|history)$/i;

function parseHistoryContent(raw: unknown): { intro: string; eras: HistoryEra[] } {
  if (typeof raw !== "string" || !raw.trim()) return { intro: "", eras: [] };
  const lines = htmlToLines(raw);
  const eras: HistoryEra[] = [];
  const introParts: string[] = [];
  let current: HistoryEra | null = null;

  const pushCurrent = () => {
    if (current && (current.paragraphs.length || current.bullets.length || current.title)) {
      eras.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    if (HISTORY_SKIP.test(line)) continue;

    const heading = line.match(HISTORY_HEADING);
    if (heading) {
      pushCurrent();
      const yearMatch = line.match(/\(([^)]+)\)/);
      current = {
        title: line.replace(/\s*\([^)]+\)\s*$/, "").trim(),
        year: yearMatch?.[1],
        paragraphs: [],
        bullets: [],
      };
      continue;
    }

    if (!current) {
      introParts.push(line);
      continue;
    }

    const bulletLike =
      /^[-•*]\s+/.test(line) ||
      (/^[A-ZÀ-ÖØ-Þ][\w''\&\-\s]{1,48}$/.test(line) && !/[.!?]$/.test(line)) ||
      (/^[a-z][\w''\&\-\s]{8,70}$/.test(line) &&
        !/[.!?]$/.test(line) &&
        current.paragraphs.some(
          (p) => /:\s*$/.test(p) || /including|offers|recognized as|continues to|highlights/i.test(p)
        ));

    if (bulletLike) {
      current.bullets.push(line.replace(/^[-•*]\s+/, "").trim());
    } else {
      current.paragraphs.push(line);
    }
  }
  pushCurrent();

  return {
    intro: introParts.join(" ").trim(),
    eras,
  };
}

const AWARD_SKIP =
  /^(awards?\s*&?\s*accreditations?|recognition of excellence|recognition)$/i;

function parseAwardsContent(raw: unknown): { intro: string; items: AwardItem[] } {
  if (typeof raw !== "string" || !raw.trim()) return { intro: "", items: [] };
  const lines = htmlToLines(raw);
  const items: AwardItem[] = [];
  const introParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (AWARD_SKIP.test(line)) {
      i += 1;
      continue;
    }

    const emojiMatch = line.match(
      /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.+)$/u
    );

    if (emojiMatch) {
      const emoji = emojiMatch[1];
      const title = emojiMatch[2].replace(/^[:\-\s]+/, "").trim();
      const item: AwardItem = {
        emoji,
        title,
        description: "",
        highlights: [],
      };
      i += 1;
      while (
        i < lines.length &&
        !/^\p{Extended_Pictographic}/u.test(lines[i]) &&
        !AWARD_SKIP.test(lines[i])
      ) {
        const next = lines[i];
        const isHighlight =
          /^[-•*]\s+/.test(next) ||
          (next.length < 70 && !/[.!?]$/.test(next) && item.description.length > 0);
        if (isHighlight) {
          item.highlights.push(next.replace(/^[-•*]\s+/, "").trim());
        } else if (!item.subtitle && next.length < 80 && !/[.!?]$/.test(next) && !item.description) {
          item.subtitle = next;
        } else if (!item.description) {
          item.description = next;
        } else if (next.length > 55 || /[.!?]$/.test(next)) {
          item.description = `${item.description} ${next}`.trim();
        } else {
          item.highlights.push(next);
        }
        i += 1;
      }
      items.push(item);
      continue;
    }

    if (items.length === 0) introParts.push(line);
    i += 1;
  }

  return { intro: introParts.join(" ").trim(), items };
}

function iconForHistory(title: string): LucideIcon {
  if (/foundation/i.test(title)) return Landmark;
  if (/growth|expansion|catchment|capacity/i.test(title)) return TrendingUp;
  if (/service/i.test(title)) return Building2;
  if (/recognition|quality|award/i.test(title)) return Medal;
  if (/insurance|cbhi/i.test(title)) return Flag;
  if (/today/i.test(title)) return Sparkles;
  return Building2;
}

function iconForAward(title: string): LucideIcon {
  if (/quality|ehaq|performance/i.test(title)) return Medal;
  if (/insurance|cbhi/i.test(title)) return Flag;
  if (/continuous|improvement/i.test(title)) return TrendingUp;
  if (/government|public/i.test(title)) return Landmark;
  if (/commitment|excellence/i.test(title)) return Award;
  return Award;
}

function parseValuesContent(raw: unknown): { intro: string; items: ValueItem[] } {
  if (Array.isArray(raw)) {
    const items = raw
      .map((entry) => {
        if (typeof entry === "string") {
          const cleaned = entry.replace(/^[-•*\d.)\s]+/, "").trim();
          const [title, ...rest] = cleaned.split(/[:–—-]/);
          if (rest.length) {
            return { title: title.trim(), description: rest.join(":").trim() };
          }
          return { title: cleaned, description: "" };
        }
        if (entry && typeof entry === "object") {
          const obj = entry as Record<string, unknown>;
          return {
            title: String(obj.title || obj.name || ""),
            description: String(obj.description || obj.body || obj.content || ""),
            emoji: obj.emoji ? String(obj.emoji) : undefined,
          };
        }
        return null;
      })
      .filter((v): v is ValueItem => !!v && !!v.title);
    return { intro: "", items };
  }

  if (typeof raw !== "string" || !raw.trim()) return { intro: "", items: [] };

  let text = raw;
  if (raw.includes("<")) {
    text = raw
      .replace(/<\/(p|div|h[1-6]|li|br)\s*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const skipTitle =
    /^(core values|the principles that guide us|our values|what guides)/i;
  const items: ValueItem[] = [];
  const introParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (skipTitle.test(line)) {
      i += 1;
      continue;
    }

    const emojiMatch = line.match(
      /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.+)$/u
    );

    if (emojiMatch) {
      const emoji = emojiMatch[1];
      const title = emojiMatch[2].replace(/^[:\-\s]+/, "").trim();
      let description = "";
      if (i + 1 < lines.length && !/^\p{Extended_Pictographic}/u.test(lines[i + 1])) {
        description = lines[i + 1];
        i += 2;
      } else {
        i += 1;
      }
      if (title) items.push({ emoji, title, description });
      continue;
    }

    if (
      line.length <= 48 &&
      !/[.!?]$/.test(line) &&
      i + 1 < lines.length &&
      lines[i + 1].length > 40 &&
      (items.length > 0 || introParts.length > 0)
    ) {
      items.push({ title: line, description: lines[i + 1] });
      i += 2;
      continue;
    }

    if (items.length === 0) {
      introParts.push(line);
    } else if (items[items.length - 1] && !items[items.length - 1].description) {
      items[items.length - 1].description = line;
    } else {
      introParts.push(line);
    }
    i += 1;
  }

  if (items.length === 0) {
    for (const line of lines) {
      if (skipTitle.test(line)) continue;
      const split = line.match(/^(.{2,60}?)\s*[:–—-]\s*(.+)$/);
      if (split) items.push({ title: split[1].trim(), description: split[2].trim() });
      else if (line.length < 60 && !/[.!?]$/.test(line)) {
        items.push({ title: line, description: "" });
      }
    }
  }

  const intro = introParts
    .filter((p) => !skipTitle.test(p))
    .join(" ")
    .trim();

  return { intro, items };
}

/* ─── Sub-components ─── */
function RichBody({ value }: { value: string }) {
  if (value.includes("<")) {
    return <Prose html={value} />;
  }

  const paragraphs = toPlainParagraphs(value);
  return (
    <div className="nv-copy">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function PanelLabel({
  icon: Icon,
  kicker,
  title,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
}) {
  return (
    <div className="nv-dpanel__label">
      <span className="nv-dpanel__icon" aria-hidden>
        <Icon />
      </span>
      <div>
        <p className="nv-dpanel__kicker">{kicker}</p>
        <h3 className="nv-dpanel__title">{title}</h3>
      </div>
    </div>
  );
}

/* ─── Stat Card Icons ─── */
const STAT_ICONS: LucideIcon[] = [Shield, Users, Star, Award];

/* ─── Main Component ─── */
export default function AboutPage() {
  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const { data: leadership, isLoading: leadersLoading } = useGetResourceListQuery({
    resource: "leadership",
    perPage: 3,
  });

  if (settingsLoading) {
    return (
      <div className="nv-pb">
        <div className="nv-skel h-[38vh] !rounded-none" />
        <div className="nv-pb__inner mx-auto max-w-4xl px-5 py-16">
          <GridSkeleton count={3} />
        </div>
      </div>
    );
  }

  const siteName =
    (settings?.site_name as string) || (settings?.name as string) || SITE_NAME;
  const tagline = (settings?.tagline as string) || "";
  const mission = settings?.mission as string | undefined;
  const vision = settings?.vision as string | undefined;
  /**
   * Two institutional statements that sit either side of the values.
   *
   * `purpose` opens the page's argument — why the hospital exists — before the
   * mission and vision say how it acts on that. `patient_care_promise` closes
   * it by turning the values into commitments a patient can actually hold the
   * hospital to. Both are edited in Admin → Settings → About, and each section
   * renders only when its field has content.
   */
  const purpose = settings?.purpose as string | undefined;
  const patientCarePromise = settings?.patient_care_promise as string | undefined;
  const values = settings?.values;
  const history = settings?.history as string | undefined;
  const about = settings?.about as string | undefined;
  const awards = settings?.awards as string | undefined;

  const parsedValues = parseValuesContent(values);
  const parsedHistory = parseHistoryContent(history);
  const parsedAwards = parseAwardsContent(awards);
  const leaders = (leadership?.data ?? []) as Leader[];
  const aboutIsHtml = !!about && about.includes("<");
  const aboutPlain = about ? stripHtml(about) : "";
  const aboutSentences =
    aboutPlain.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const pullQuote = !aboutIsHtml ? aboutSentences[0] || "" : "";
  const aboutBodyPlain =
    !aboutIsHtml && aboutSentences.length > 1 ? aboutSentences.slice(1).join(" ") : "";
  const showStory = !!about;
  const showValues = parsedValues.items.length > 0 || parsedValues.intro || !!values;

  /**
   * Founding year: the Settings field first, then the earliest year an editor
   * wrote into the history timeline. It used to default to a hard-coded 1974,
   * so a site with no history at all still announced "52+ years of service".
   */
  const settingsFoundingYear = Number(
    String((settings?.founded_year as string | number) ?? "").match(/\d{4}/)?.[0]
  );
  let foundingYear = Number.isFinite(settingsFoundingYear) ? settingsFoundingYear : NaN;
  if (!Number.isFinite(foundingYear) && parsedHistory.eras.length > 0) {
    const match = parsedHistory.eras[0].year?.match(/\d{4}/);
    if (match) foundingYear = parseInt(match[0], 10);
  }
  const currentYear = new Date().getFullYear();
  const yearsOfService =
    Number.isFinite(foundingYear) && foundingYear > 1800 && foundingYear <= currentYear
      ? currentYear - foundingYear
      : null;

  /**
   * Only figures the data actually supports.
   *
   * These previously fell back to `|| 8`, `|| 6` and `|| 5`, so a hospital that
   * had entered no leadership, no values and no awards still published "8
   * Leaders · 6 Core Values · 5 Awards" — invented numbers presented as fact on
   * a hospital's own About page. A card with nothing behind it is now omitted,
   * and if none of them have data the strip does not render at all.
   */
  const stats = [
    yearsOfService !== null
      ? { value: yearsOfService, suffix: "+", label: "Years of Service" }
      : null,
    leaders.length ? { value: leaders.length, suffix: "", label: "Leaders" } : null,
    parsedValues.items.length
      ? { value: parsedValues.items.length, suffix: "", label: "Core Values" }
      : null,
    parsedAwards.items.length
      ? { value: parsedAwards.items.length, suffix: "", label: "Awards" }
      : null,
  ].filter((stat): stat is { value: number; suffix: string; label: string } => stat !== null);

  return (
    <PageTransition>
      <PageHero
        section="/about"
        title="About the"
        accent="Hospital"
        eyebrow="Mandate and mission"
        subtitle={
          tagline ||
          `Who ${siteName} serves, what it was set up to do, and the people and partners who keep it running.`
        }
        breadcrumbs={[{ label: "About" }]}
      />

      {/* A band of figures that sits over the hero's base seam. `-mt` pulls it
          up into the seam so the opening and the document are joined by it
          rather than separated by a gap. */}
      <div className="nv-pb relative -mx-[calc((100vw-100%)/2)] w-screen">
        <span className="nv-pb__glow" aria-hidden />

        {/* Omitted entirely when nothing has real data behind it, rather than
            padding the page out with invented figures. */}
        {stats.length > 0 && (
        <div className="nv-pb__inner mx-auto max-w-5xl px-5 pt-12 lg:px-8">
          <div className="nv-statbar">
            {stats.map((stat, i) => {
              const Icon = STAT_ICONS[i % STAT_ICONS.length];
              return (
                <NovaReveal key={stat.label} from="up" delay={0.08 + i * 0.09}>
                  <div className="nv-statcard">
                    <span className="nv-statcard__icon" aria-hidden>
                      <Icon />
                    </span>
                    <span className="nv-statcard__value">
                      <Counter value={stat.value} />
                      {stat.suffix}
                    </span>
                    <span className="nv-statcard__label">{stat.label}</span>
                  </div>
                </NovaReveal>
              );
            })}
          </div>
        </div>
        )}

        <div className="nv-pb__inner nv-dstack mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">

          {/* ═══ SECTION 01: Our Story ═══ */}
          {showStory && (
            <section className="nv-asec">
              <DetailSectionHeader
                eyebrow="01 · Our story"
                title={tagline || siteName}
                description="Who we are and the communities we serve."
              />
              <NovaReveal from="up" delay={0.06}>
                <div className="nv-asec__grid">
                  <div>
                    {pullQuote && (
                      <blockquote className="nv-pull">
                        <span className="nv-pull__mark" aria-hidden>
                          &ldquo;
                        </span>
                        <p className="nv-pull__text">
                          {pullQuote.replace(/^[""]|[""]$/g, "")}
                        </p>
                      </blockquote>
                    )}
                  </div>
                  <div>
                    {(aboutIsHtml || aboutBodyPlain) && (
                      <RichBody value={aboutIsHtml ? about! : aboutBodyPlain} />
                    )}
                    {!aboutIsHtml && !aboutBodyPlain && !pullQuote && about && (
                      <RichBody value={about} />
                    )}
                  </div>
                </div>
              </NovaReveal>
            </section>
          )}

          {/* ═══ SECTION 02: Our Purpose ═══ */}
          {purpose && (
            <>
              {showStory && <DetailDivider delay={0.02} />}
              <section className="nv-asec">
                <DetailSectionHeader
                  eyebrow="02 · Our purpose"
                  title="Why this hospital exists"
                  description="The commitment the mission and vision below are built on."
                />
                <NovaReveal from="up" delay={0.06}>
                  <div className="nv-mv">
                    <div className="nv-mv__head">
                      <span className="nv-dpanel__icon" aria-hidden>
                        <Compass />
                      </span>
                      <div>
                        <p className="nv-dpanel__kicker">Our purpose</p>
                        <h3 className="nv-dpanel__title">{siteName}</h3>
                      </div>
                    </div>
                    <div className="nv-mv__body">
                      <RichBody value={purpose} />
                    </div>
                  </div>
                </NovaReveal>
              </section>
            </>
          )}

          {/* ═══ SECTION 03: Mission & Vision ═══ */}
          {(mission || vision) && (
            <>
              {(showStory || purpose) && <DetailDivider delay={0.02} />}
              <section className="nv-asec">
                <DetailSectionHeader
                  eyebrow="03 · Mission & vision"
                  title="Mission & vision"
                  description="What guides every decision, ward, and clinical pathway."
                />
                <div className="nv-asec__grid">
                  {mission && (
                    <NovaReveal from="up" delay={0.06} className="h-full w-full">
                      <div className="nv-mv h-full flex flex-col justify-between">
                        <div>
                          <div className="nv-mv__head">
                            <span className="nv-dpanel__icon" aria-hidden>
                              <Target />
                            </span>
                            <div>
                              <p className="nv-dpanel__kicker">Our purpose</p>
                              <h3 className="nv-dpanel__title">Mission</h3>
                            </div>
                          </div>
                          <div className="nv-mv__body">
                            <RichBody value={mission} />
                          </div>
                        </div>
                      </div>
                    </NovaReveal>
                  )}
                  {vision && (
                    <NovaReveal from="up" delay={0.14} className="h-full w-full">
                      <div className="nv-mv h-full flex flex-col justify-between">
                        <div>
                          <div className="nv-mv__head">
                            <span className="nv-dpanel__icon" aria-hidden>
                              <Eye />
                            </span>
                            <div>
                              <p className="nv-dpanel__kicker">Our aspiration</p>
                              <h3 className="nv-dpanel__title">Vision</h3>
                            </div>
                          </div>
                          <div className="nv-mv__body">
                            <RichBody value={vision} />
                          </div>
                        </div>
                      </div>
                    </NovaReveal>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ═══ SECTION 03: Core Values ═══ */}
          {showValues && (
            <>
              <DetailDivider delay={0.02} />
              <section className="nv-asec">
                <DetailSectionHeader
                  eyebrow="04 · Core values"
                  title="What guides our care"
                  description={parsedValues.intro || undefined}
                />
                {parsedValues.items.length > 0 ? (
                  <div className="nv-vgrid">
                    {parsedValues.items.map((item, index) => {
                      const Icon = iconForValue(item.title);
                      return (
                        <NovaReveal
                          key={`${item.title}-${index}`}
                          from="up"
                          delay={Math.min(0.05 + index * 0.06, 0.4)}
                        >
                          {/* The four rotating gradients are gone: the mono index
                              is what tells one value from the next, and it keeps a
                              grid of six reading as one list. */}
                          <article className="nv-vcard">
                            <div className="nv-vcard__top">
                              <span className="nv-vcard__icon" aria-hidden>
                                <Icon />
                              </span>
                              <span className="nv-vcard__index" aria-hidden>
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <h3 className="nv-vcard__title">{item.title}</h3>
                            {item.description && (
                              <p className="nv-vcard__desc">{item.description}</p>
                            )}
                          </article>
                        </NovaReveal>
                      );
                    })}
                  </div>
                ) : (
                  <DetailPanel delay={0.06}>
                    <RichBody value={String(values)} />
                  </DetailPanel>
                )}
              </section>
            </>
          )}

          {/* ═══ SECTION 05: Our Patient Care Promise ═══ */}
          {patientCarePromise && (
            <>
              <DetailDivider delay={0.02} />
              <section className="nv-asec">
                <DetailSectionHeader
                  eyebrow="05 · Our patient care promise"
                  title="What every patient can expect"
                  description="The values above, written as commitments you can hold us to."
                />
                <NovaReveal from="up" delay={0.06}>
                  <div className="nv-mv nv-promise">
                    <div className="nv-mv__head">
                      <span className="nv-dpanel__icon" aria-hidden>
                        <HandHeart />
                      </span>
                      <div>
                        <p className="nv-dpanel__kicker">Our promise to you</p>
                        <h3 className="nv-dpanel__title">Patient care promise</h3>
                      </div>
                    </div>
                    <div className="nv-mv__body">
                      <RichBody value={patientCarePromise} />
                    </div>
                  </div>
                </NovaReveal>
              </section>
            </>
          )}

          {/* ═══ SECTION 06: History / Timeline ═══ */}
          {history && (
            <>
              <DetailDivider delay={0.02} />
              <section className="nv-asec">
                <DetailSectionHeader
                  eyebrow="06 · History"
                  title="Our journey"
                  description={parsedHistory.intro || undefined}
                />
                {parsedHistory.eras.length > 0 ? (
                  <ol className="nv-etl">
                    {parsedHistory.eras.map((era, index) => {
                      const Icon = iconForHistory(era.title);
                      return (
                        <li key={`${era.title}-${index}`} className="nv-etl__item">
                          <span className="nv-etl__node" aria-hidden />
                          <DetailPanel delay={Math.min(0.05 + index * 0.05, 0.3)}>
                            <div className="nv-era__meta">
                              <span className="nv-dpanel__icon" aria-hidden>
                                <Icon />
                              </span>
                              {era.year && (
                                <span className="nv-era__year">{era.year}</span>
                              )}
                              <span className="nv-era__index" aria-hidden>
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <h3 className="nv-era__title">{era.title}</h3>
                            <div className="nv-copy nv-era__body">
                              {era.paragraphs.map((para, pi) => (
                                <p key={pi}>{para}</p>
                              ))}
                            </div>
                            {era.bullets.length > 0 && (
                              <ul className="nv-achieve nv-era__bullets">
                                {era.bullets.map((b, bi) => (
                                  <li key={bi}>
                                    <span className="nv-achieve__dot" aria-hidden />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </DetailPanel>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <DetailPanel delay={0.06}>
                    <RichBody value={history} />
                  </DetailPanel>
                )}
              </section>
            </>
          )}

          {/* ═══ SECTION 05: Awards & Excellence (Equal Cards) ═══ */}
          {awards && (
            <>
              <DetailDivider delay={0.02} />
              <section className="nv-asec">
                <DetailSectionHeader
                  eyebrow="07 · Recognition"
                  title="Awards & excellence"
                  description={parsedAwards.intro || undefined}
                />
                {parsedAwards.items.length > 0 ? (
                  <div className="nv-asec__grid">
                    {parsedAwards.items.map((item, index) => {
                      const Icon = iconForAward(item.title);
                      const cleanDesc = item.description
                        ? item.description.replace(/:\s+([A-Z])/g, ". $1").replace(/:\s*$/, ".").trim()
                        : "";

                      return (
                        <DetailPanel
                          key={`${item.title}-${index}`}
                          delay={Math.min(0.05 + index * 0.05, 0.28)}
                          className="flex h-full flex-col justify-between"
                        >
                          <div>
                            <PanelLabel
                              icon={Icon}
                              kicker={item.subtitle || "Recognition"}
                              title={item.title}
                            />
                            {cleanDesc && (
                              <p className="nv-dhead__desc mb-4">{cleanDesc}</p>
                            )}
                          </div>
                          {item.highlights.length > 0 && (
                            <ul className="nv-achieve nv-era__bullets">
                              {item.highlights.map((h, hi) => (
                                <li key={hi}>
                                  <span className="nv-achieve__dot" aria-hidden />
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </DetailPanel>
                      );
                    })}
                  </div>
                ) : (
                  <DetailPanel delay={0.06}>
                    <RichBody value={awards} />
                  </DetailPanel>
                )}
              </section>
            </>
          )}

          {/* ═══ SECTION 08: Leadership ═══ */}
          <DetailDivider delay={0.02} />
          <section className="nv-asec">
            <div className="nv-lead-head">
              <DetailSectionHeader
                eyebrow="08 · Leadership"
                title="Guided by experienced visionaries"
                description="Meet the people shaping clinical excellence and hospital strategy."
              />
              <DetailLinkChip href="/leadership">Meet the team</DetailLinkChip>
            </div>

            {leadersLoading ? (
              <GridSkeleton count={3} />
            ) : leaders.length === 0 ? (
              <EmptyState title="Leadership profiles coming soon" />
            ) : (
              <div className="nv-board-stack">
                {leaders.map((leader, i) => {
                  const image = getImageFromItem(
                    leader as unknown as Record<string, unknown>
                  );
                  return (
                    <NovaReveal key={leader.id} from="up" delay={Math.min(i, 6) * 0.08}>
                      <OfficerProfile
                        href={`/leadership/${leader.slug}`}
                        name={leader.name}
                        position={leader.position || undefined}
                        summary={leader.short_bio || leader.bio || undefined}
                        image={image}
                        index={i}
                      />
                    </NovaReveal>
                  );
                })}
              </div>
            )}

            <div className="nv-about-cta">
              <Link href="/leadership" className="nv-dlink">
                <span>Explore full leadership</span>
                <span className="nv-dlink__ico" aria-hidden>
                  <ArrowUpRight />
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
