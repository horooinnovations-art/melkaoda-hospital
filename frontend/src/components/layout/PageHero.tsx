import { Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Masthead from "@/components/layout/Masthead";
import type { MastCrumb, MastStat } from "@/components/layout/Masthead";

const BADGE_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  zap: Zap,
};

interface PageHeroProps {
  title: string;
  /** Closing phrase of the title, set in the serif italic. */
  accent?: string;
  subtitle?: string;
  eyebrow?: string;
  /** Route this page occupies, e.g. "/services". Resolves ordinal and group. */
  section?: string;
  breadcrumbs?: MastCrumb[];
  className?: string;
  /** Buttons and links under the opening. */
  children?: React.ReactNode;
  stats?: MastStat[];
  badges?: { label: string; icon?: "sparkles" | "zap" }[];
  /** Overrides the glyph inferred from the title; `null` suppresses it. */
  glyph?: LucideIcon | null;
  aside?: React.ReactNode;
  image?: string;
  /** Retained for source compatibility; the interior opening has one treatment. */
  variant?: "default" | "gradient" | "premium" | "dark" | "minimal";
  showDecoration?: boolean;
}

/**
 * The opening of a list or landing page.
 *
 * Everything visual lives in `Masthead`, which `DetailShell` renders too — this
 * is the thin adapter that keeps the older call signature working: `subtitle`
 * rather than `lede`, `breadcrumbs` rather than `crumbs`, badge icons named as
 * strings, and actions passed as children.
 */
export default function PageHero({
  title,
  accent,
  subtitle,
  eyebrow,
  section,
  breadcrumbs,
  className,
  children,
  stats,
  badges,
  glyph,
  aside,
  image,
}: PageHeroProps) {
  return (
    <Masthead
      title={title}
      accent={accent}
      eyebrow={eyebrow}
      lede={subtitle}
      section={section}
      crumbs={breadcrumbs ?? [{ label: [title, accent].filter(Boolean).join(" ") }]}
      stats={stats}
      badges={badges?.map((badge) => ({
        label: badge.label,
        icon: badge.icon ? BADGE_ICONS[badge.icon] : undefined,
      }))}
      actions={children}
      image={image}
      aside={aside}
      glyph={glyph}
      className={className}
    />
  );
}
