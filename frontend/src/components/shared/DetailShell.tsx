"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import NovaReveal from "@/components/nova/NovaReveal";
import PageHeroAtmosphere from "@/components/layout/PageHeroAtmosphere";
import { optimizeImageUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export type DetailBadgeTone = "mint" | "coral" | "glass" | "brass" | "teal";

export interface DetailBadge {
  icon?: LucideIcon;
  label: string;
  tone?: DetailBadgeTone;
}

/**
 * The five old tones were four saturated fills plus a glass one. Nova draws the
 * same distinction with a hairline: warm for the tones that used to be brass or
 * mint, cool for the rest. The tone names are kept so no caller has to change.
 */
const BADGE_TONES: Record<DetailBadgeTone, string> = {
  mint: "nv-dbadge nv-dbadge--warm",
  teal: "nv-dbadge nv-dbadge--cool",
  coral: "nv-dbadge nv-dbadge--warm",
  glass: "nv-dbadge",
  brass: "nv-dbadge nv-dbadge--warm",
};

const WIDTHS = {
  prose: "max-w-3xl",
  wide: "max-w-4xl",
  full: "max-w-5xl",
} as const;

interface DetailShellProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  image?: string | null;
  badges?: DetailBadge[];
  backHref?: string;
  backLabel?: string;
  width?: keyof typeof WIDTHS;
  children: React.ReactNode;
  bodyClassName?: string;
  imageMode?: "showcase" | "ambient";
}

/**
 * The [slug] page shell.
 *
 * Shares `.nv-ph` with the list-page hero, so a visitor moving from /news into
 * /news/some-story stays in one opening rather than meeting a second design.
 * `--detail` only tightens the bottom padding and admits the back link and the
 * subject's portrait.
 */
export default function DetailShell({
  title,
  eyebrow,
  subtitle,
  image,
  badges,
  backHref,
  backLabel = "Back",
  width = "wide",
  children,
  bodyClassName,
  imageMode = "showcase",
}: DetailShellProps) {
  const heroSrc = image ? optimizeImageUrl(image, 1400) ?? image : undefined;
  const visibleBadges = (badges ?? []).filter((b) => b && b.label);
  const showcase = Boolean(heroSrc) && imageMode === "showcase";

  return (
    <div>
      <NovaReveal
        as="section"
        from="none"
        className="nv-ph nv-ph--detail -mx-[calc((100vw-100%)/2)] w-screen"
      >
        <PageHeroAtmosphere />

        <div className="nv-ph__inner mx-auto max-w-6xl px-5 lg:px-8">
          <div className={cn("nv-ph__split", showcase && "nv-ph__split--media")}>
            <div>
              {backHref && (
                <Link href={backHref} className="nv-ph__back">
                  <ArrowLeft aria-hidden />
                  {backLabel}
                </Link>
              )}

              <p className="nv-ph__brand">
                <span className="nv-ph__brand-mark" aria-hidden />
                Gambo General Hospital
              </p>

              {eyebrow && <p className="nv-eyebrow mt-5">{eyebrow}</p>}

              <h1 className="nv-ph__title">{title}</h1>

              <div className="nv-ph__flourish" aria-hidden />

              {subtitle && <p className="nv-ph__sub">{subtitle}</p>}

              {visibleBadges.length > 0 && (
                <div className="nv-ph__badges mt-7">
                  {visibleBadges.map((badge, i) => {
                    const Icon = badge.icon;
                    return (
                      <span
                        key={`${badge.label}-${i}`}
                        className={BADGE_TONES[badge.tone ?? "glass"]}
                      >
                        {Icon && <Icon aria-hidden />}
                        {badge.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {showcase && heroSrc && (
              <div className="nv-ph__media">
                <SmartImage
                  src={heroSrc}
                  // Decorative: the <h1> beside this frame is the subject's name.
                  // A non-empty alt here printed the title twice whenever the
                  // candidate URL 404'd and the img fell back to its alt text.
                  alt=""
                  fill
                  priority
                  optimizeWidth={1200}
                  sizes="(max-width: 900px) 100vw, 340px"
                />
              </div>
            )}
          </div>
        </div>
      </NovaReveal>

      <div className="nv-pb relative -mx-[calc((100vw-100%)/2)] w-screen">
        <span className="nv-pb__glow" aria-hidden />
        <div
          className={cn(
            "nv-pb__inner nv-dstack mx-auto px-5 py-12 lg:px-8 lg:py-16",
            WIDTHS[width],
            bodyClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function DetailPanel({
  children,
  delay = 0.05,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article";
  /** Retained for source compatibility; every panel now shares one surface. */
  tone?: 1 | 2 | 3 | 4;
}) {
  return (
    <NovaReveal from="up" delay={delay}>
      <div className={cn("nv-dpanel", className)}>{children}</div>
    </NovaReveal>
  );
}

export function DetailSectionHeader({
  eyebrow,
  title,
  description,
  delay = 0,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  delay?: number;
}) {
  return (
    <NovaReveal from="up" delay={delay}>
      <div className="nv-dhead">
        {eyebrow && <p className="nv-dhead__eyebrow">{eyebrow}</p>}
        <h2 className="nv-dhead__title">{title}</h2>
        <div className="nv-dhead__rule" aria-hidden />
        {description && <p className="nv-dhead__desc">{description}</p>}
      </div>
    </NovaReveal>
  );
}

export function DetailDivider({ delay = 0 }: { delay?: number }) {
  return (
    <NovaReveal from="none" delay={delay}>
      <div className="nv-ddiv" aria-hidden />
    </NovaReveal>
  );
}

export function DetailLinkChip({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="nv-dlink">
      <span>{children}</span>
      <span className="nv-dlink__ico" aria-hidden>
        <ArrowUpRight />
      </span>
    </Link>
  );
}

export function DetailMetaRow({
  items,
}: {
  items: { icon?: LucideIcon; label: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="nv-dmeta">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <span key={`${item.label}-${i}`} className="nv-dmeta__chip">
            {Icon && <Icon aria-hidden />}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
