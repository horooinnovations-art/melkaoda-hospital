"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Building2,
  Flag,
  Globe2,
  HeartHandshake,
  Landmark,
  Medal,
  Quote,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Eye,
  Star,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGetSettingsQuery, useGetResourceListQuery } from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
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
    <div className="g-about-copy">
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
    <div className="g-detail-panel__label">
      <span className="g-detail-panel__icon" aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="g-detail-panel__kicker">{kicker}</p>
        <h3 className="g-detail-panel__title">{title}</h3>
      </div>
    </div>
  );
}

/* ─── Stat Card Icons ─── */
const STAT_ICONS: LucideIcon[] = [Shield, Users, Star, Award];

/* ─── Gradient Color Pairs ─── */
const VALUE_GRADIENTS = [
  { from: "rgba(56, 189, 248, 0.12)", to: "rgba(14, 165, 233, 0.04)", accent: "#0ea5e9" },
  { from: "rgba(52, 211, 153, 0.12)", to: "rgba(16, 185, 129, 0.04)", accent: "#10b981" },
  { from: "rgba(251, 191, 36, 0.12)", to: "rgba(245, 158, 11, 0.04)", accent: "#f59e0b" },
  { from: "rgba(167, 139, 250, 0.12)", to: "rgba(139, 92, 246, 0.04)", accent: "#8b5cf6" },
  { from: "rgba(244, 114, 182, 0.12)", to: "rgba(236, 72, 153, 0.04)", accent: "#ec4899" },
  { from: "rgba(251, 146, 60, 0.12)", to: "rgba(249, 115, 22, 0.04)", accent: "#f97316" },
];

/* ─── Main Component ─── */
export default function AboutPage() {
  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const { data: leadership, isLoading: leadersLoading } = useGetResourceListQuery({
    resource: "leadership",
    perPage: 3,
  });

  if (settingsLoading) {
    return (
      <div>
        <div className="h-[42vh] bg-teal-deep/10" />
        <div className="mx-auto max-w-4xl px-5 py-16">
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

  let foundingYear = 1974;
  if (parsedHistory.eras.length > 0) {
    const firstEra = parsedHistory.eras[0];
    if (firstEra.year) {
      const match = firstEra.year.match(/\d{4}/);
      if (match) foundingYear = parseInt(match[0], 10);
    }
  }
  const yearsOfService = new Date().getFullYear() - foundingYear;

  const stats = [
    { value: yearsOfService, suffix: "+", label: "Years of Service" },
    { value: leaders.length || 8, suffix: "", label: "Leaders" },
    { value: parsedValues.items.length || 6, suffix: "", label: "Core Values" },
    { value: parsedAwards.items.length || 5, suffix: "", label: "Awards" },
  ];

  return (
    <PageTransition>
      <PageHero
        title="About"
        eyebrow="Our hospital"
        subtitle={tagline || siteName}
        breadcrumbs={[{ label: "About" }]}
      />

      {/* ═══ Premium Floating Stats Bar ═══ */}
      <div className="mx-auto max-w-5xl px-5 lg:px-8 mt-12 relative z-10">
        <div className="g-about-hero-stats grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = STAT_ICONS[i % STAT_ICONS.length];
            return (
              <Reveal key={stat.label} delay={0.1 + i * 0.08}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="g-about-stat-card"
                >
                  <div className="g-about-stat-card__glow" aria-hidden />
                  <div className="g-about-stat-card__icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="g-about-stat-card__value">
                    <Counter value={stat.value} />{stat.suffix}
                  </span>
                  <span className="g-about-stat-card__label">{stat.label}</span>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* ═══ Main Content Canvas ═══ */}
      <div className="g-pagebody g-pagebody--detail">
        <div className="g-pagebody__aura" aria-hidden />
        <div className="g-pagebody__mesh" aria-hidden />
        <div className="g-pagebody__rail g-pagebody__rail--l" aria-hidden />
        <div className="g-pagebody__rail g-pagebody__rail--r" aria-hidden />

        <div className="g-pagebody__inner g-detail-stack g-about relative z-[1] mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">

          {/* ═══ SECTION 01: Our Story ═══ */}
          {showStory && (
            <section className="g-about-section">
              <DetailSectionHeader
                eyebrow="01 · Our story"
                title={tagline || siteName}
                description="Who we are and the communities we serve."
              />
              <Reveal delay={0.06}>
                <div className="g-about-story-grid grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start mt-8">
                  <div className="g-about-story-pull">
                    {pullQuote && (
                      <blockquote className="g-about-quote g-about-quote--premium">
                        <div className="g-about-quote__mark" aria-hidden>
                          <Quote className="h-8 w-8" />
                        </div>
                        <p className="text-2xl md:text-3xl font-bold leading-tight text-slate-800">
                          &ldquo;{pullQuote.replace(/^[""]|[""]$/g, "")}&rdquo;
                        </p>
                        <div className="g-about-quote__line" aria-hidden />
                      </blockquote>
                    )}
                  </div>
                  <div className="g-about-story-body text-slate-600 space-y-4">
                    {(aboutIsHtml || aboutBodyPlain) && (
                      <RichBody value={aboutIsHtml ? about! : aboutBodyPlain} />
                    )}
                    {!aboutIsHtml && !aboutBodyPlain && !pullQuote && about && (
                      <RichBody value={about} />
                    )}
                  </div>
                </div>
              </Reveal>
            </section>
          )}

          {/* ═══ SECTION 02: Mission & Vision ═══ */}
          {(mission || vision) && (
            <>
              {showStory && <DetailDivider delay={0.02} />}
              <section className="g-about-section">
                <DetailSectionHeader
                  eyebrow="02 · Purpose"
                  title="Mission & vision"
                  description="What guides every decision, ward, and clinical pathway."
                />
                <div className="g-about-mv-grid grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {mission && (
                    <Reveal delay={0.06}>
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="g-about-mv-card g-about-mv-card--mission"
                      >
                        <div className="g-about-mv-card__accent" />
                        <div className="g-about-mv-card__header">
                          <div className="g-about-mv-card__icon-wrap g-about-mv-card__icon-wrap--sky">
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="g-about-mv-card__kicker">Our Purpose</p>
                            <h3 className="g-about-mv-card__title">Mission</h3>
                          </div>
                        </div>
                        <div className="g-about-mv-card__body">
                          <RichBody value={mission} />
                        </div>
                      </motion.div>
                    </Reveal>
                  )}
                  {vision && (
                    <Reveal delay={0.1}>
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="g-about-mv-card g-about-mv-card--vision"
                      >
                        <div className="g-about-mv-card__accent g-about-mv-card__accent--emerald" />
                        <div className="g-about-mv-card__header">
                          <div className="g-about-mv-card__icon-wrap g-about-mv-card__icon-wrap--emerald">
                            <Eye className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="g-about-mv-card__kicker">Our Aspiration</p>
                            <h3 className="g-about-mv-card__title">Vision</h3>
                          </div>
                        </div>
                        <div className="g-about-mv-card__body">
                          <RichBody value={vision} />
                        </div>
                      </motion.div>
                    </Reveal>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ═══ SECTION 03: Core Values ═══ */}
          {showValues && (
            <>
              <DetailDivider delay={0.02} />
              <section className="g-about-section">
                <DetailSectionHeader
                  eyebrow="03 · Core values"
                  title="What guides our care"
                  description={parsedValues.intro || undefined}
                />
                {parsedValues.items.length > 0 ? (
                  <div className="g-about-values-grid">
                    {parsedValues.items.map((item, index) => {
                      const Icon = iconForValue(item.title);
                      const gradient = VALUE_GRADIENTS[index % VALUE_GRADIENTS.length];
                      return (
                        <Reveal
                          key={`${item.title}-${index}`}
                          delay={Math.min(0.04 + index * 0.04, 0.28)}
                          fadeOut={false}
                        >
                          <motion.article
                            whileHover={{ y: -6, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="g-about-value-card"
                            style={{
                              "--value-gradient-from": gradient.from,
                              "--value-gradient-to": gradient.to,
                              "--value-accent": gradient.accent,
                            } as React.CSSProperties}
                          >
                            <div className="g-about-value-card__shine" aria-hidden />
                            <div className="g-about-value-card__top">
                              <span className="g-about-value-card__icon" aria-hidden>
                                <Icon className="h-5 w-5" />
                              </span>
                              <span className="g-about-value-card__index">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <h3 className="g-about-value-card__title">{item.title}</h3>
                            {item.description && (
                              <p className="g-about-value-card__desc">{item.description}</p>
                            )}
                          </motion.article>
                        </Reveal>
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

          {/* ═══ SECTION 04: History / Timeline ═══ */}
          {history && (
            <>
              <DetailDivider delay={0.02} />
              <section className="g-about-section">
                <DetailSectionHeader
                  eyebrow="04 · History"
                  title="Our journey"
                  description={parsedHistory.intro || undefined}
                />
                {parsedHistory.eras.length > 0 ? (
                  <ol className="g-about-timeline">
                    {parsedHistory.eras.map((era, index) => {
                      const Icon = iconForHistory(era.title);
                      const tone = ((index % 4) + 1) as 1 | 2 | 3 | 4;
                      return (
                        <li key={`${era.title}-${index}`} className="g-about-timeline__item">
                          <span className="g-about-timeline__node" aria-hidden />
                          <DetailPanel delay={Math.min(0.04 + index * 0.04, 0.24)} tone={tone}>
                            <div className="g-about-era__meta">
                              <span className="g-detail-panel__icon" aria-hidden>
                                <Icon className="h-5 w-5" />
                              </span>
                              {era.year && (
                                <span className="g-about-era__year">{era.year}</span>
                              )}
                              <span className="g-about-era__index">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <h3 className="g-about-era__title">{era.title}</h3>
                            <div className="g-about-copy">
                              {era.paragraphs.map((p, pi) => (
                                <p key={pi}>{p}</p>
                              ))}
                            </div>
                            {era.bullets.length > 0 && (
                              <ul className="g-detail-achievements g-about-era__bullets">
                                {era.bullets.map((b, bi) => (
                                  <li key={bi}>
                                    <span className="g-detail-achievements__dot" aria-hidden />
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
              <section className="g-about-section">
                <DetailSectionHeader
                  eyebrow="05 · Recognition"
                  title="Awards & excellence"
                  description={parsedAwards.intro || undefined}
                />
                {parsedAwards.items.length > 0 ? (
                  <div className="g-about-awards grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {parsedAwards.items.map((item, index) => {
                      const Icon = iconForAward(item.title);
                      const tone = (index % 2 === 0 ? 2 : 1) as 1 | 2;
                      const cleanDesc = item.description
                        ? item.description.replace(/:\s+([A-Z])/g, ". $1").replace(/:\s*$/, ".").trim()
                        : "";

                      return (
                        <DetailPanel
                          key={`${item.title}-${index}`}
                          delay={Math.min(0.05 + index * 0.05, 0.28)}
                          tone={tone}
                          className="h-full flex flex-col justify-between"
                        >
                          <div>
                            <PanelLabel
                              icon={Icon}
                              kicker={item.subtitle || "Recognition"}
                              title={item.title}
                            />
                            {cleanDesc && (
                              <p className="g-detail-lede mb-4 text-slate-600 leading-relaxed">{cleanDesc}</p>
                            )}
                          </div>
                          {item.highlights.length > 0 && (
                            <ul className="g-detail-achievements pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                              {item.highlights.map((h, hi) => (
                                <li key={hi}>
                                  <span className="g-detail-achievements__dot" aria-hidden />
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
                  <DetailPanel delay={0.06} tone={2}>
                    <RichBody value={awards} />
                  </DetailPanel>
                )}
              </section>
            </>
          )}

          {/* ═══ SECTION 06: Leadership ═══ */}
          <DetailDivider delay={0.02} />
          <section className="g-about-section">
            <div className="g-about-lead-head">
              <DetailSectionHeader
                eyebrow="06 · Leadership"
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
              <div className="g-board-stack">
                {leaders.map((leader, i) => {
                  const image = getImageFromItem(
                    leader as unknown as Record<string, unknown>
                  );
                  return (
                    <Reveal key={leader.id} delay={0.05 * i} fadeOut={false}>
                      <OfficerProfile
                        href={`/leadership/${leader.slug}`}
                        name={leader.name}
                        position={leader.position || undefined}
                        summary={leader.short_bio || leader.bio || undefined}
                        image={image}
                        index={i}
                      />
                    </Reveal>
                  );
                })}
              </div>
            )}

            <div className="g-about-cta">
              <Link href="/leadership" className="g-detail-link">
                <span>Explore full leadership</span>
                <span className="g-detail-link__ico">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
