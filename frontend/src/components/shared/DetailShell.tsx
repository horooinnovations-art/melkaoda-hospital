"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import Reveal from "@/components/motion/Reveal";
import PageHeroAtmosphere from "@/components/layout/PageHeroAtmosphere";
import { optimizeImageUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export type DetailBadgeTone = "mint" | "coral" | "glass" | "brass" | "teal";

export interface DetailBadge {
  icon?: LucideIcon;
  label: string;
  tone?: DetailBadgeTone;
}

const BADGE_TONES: Record<DetailBadgeTone, string> = {
  mint: "g-detail-badge g-detail-badge--teal",
  teal: "g-detail-badge g-detail-badge--teal",
  coral: "g-detail-badge g-detail-badge--rose",
  glass: "g-detail-badge g-detail-badge--ink",
  brass: "g-detail-badge g-detail-badge--amber",
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
    <div className="g-detail">
      <section className="g-page-hero g-page-hero--detail -mx-[calc((100vw-100%)/2)] w-screen">
        <PageHeroAtmosphere />

        <div className="g-page-hero__inner mx-auto max-w-6xl px-5 lg:px-8">
          <div
            className={cn(
              "g-page-hero__split",
              showcase && "g-page-hero__split--media"
            )}
          >
            <div className="g-page-hero__copy">
              {backHref && (
                <Link href={backHref} className="g-page-hero__back">
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Link>
              )}
              <p className="g-page-hero__brand">
                <span className="g-page-hero__brand-mark" aria-hidden />
                Gambo General Hospital
              </p>
              {eyebrow && (
                <p className="g-page-hero__kicker">
                  <span className="g-page-hero__kicker-live" aria-hidden>
                    <span className="g-page-hero__kicker-dot" />
                  </span>
                  {eyebrow}
                </p>
              )}
              <h1 className="g-page-hero__title">
                <span className="g-page-hero__title-ink">{title}</span>
              </h1>
              <div className="g-page-hero__flourish" aria-hidden>
                <span />
                <i />
                <span />
              </div>
              {subtitle && <p className="g-page-hero__sub">{subtitle}</p>}
              {visibleBadges.length > 0 && (
                <div className="g-page-hero__badges">
                  {visibleBadges.map((badge, i) => {
                    const Icon = badge.icon;
                    return (
                      <span
                        key={`${badge.label}-${i}`}
                        className={BADGE_TONES[badge.tone ?? "glass"]}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        {badge.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {showcase && heroSrc && (
              <div className="g-page-hero__media group cursor-pointer">
                <span className="g-page-hero__media-rim transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
                <span className="g-page-hero__media-glow transition-all duration-700 group-hover:scale-110 group-hover:opacity-90" aria-hidden />
                <div className="g-page-hero__media-frame relative overflow-hidden rounded-[1.45rem] bg-slate-900/10 transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-2xl group-hover:shadow-teal-500/20 isolate">
                  {/* Ambient blur backdrop to fill container naturally */}
                  <SmartImage
                    src={heroSrc}
                    alt=""
                    fill
                    optimizeWidth={120}
                    className="object-cover blur-2xl scale-125 opacity-40 select-none pointer-events-none transition-opacity duration-700 group-hover:opacity-60"
                    aria-hidden
                  />
                  {/* Main image strictly contained inside card boundaries with elegant zoom */}
                  <SmartImage
                    src={heroSrc}
                    alt={title}
                    fill
                    priority
                    optimizeWidth={1200}
                    className="object-contain p-1.5 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                  {/* Light sweep animation overlay strictly contained */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none z-10" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="g-pagebody g-pagebody--detail">
        <div className="g-pagebody__aura" aria-hidden />
        <div className="g-pagebody__mesh" aria-hidden />
        <div className="g-pagebody__rail g-pagebody__rail--l" aria-hidden />
        <div className="g-pagebody__rail g-pagebody__rail--r" aria-hidden />
        <div
          className={cn(
            "g-pagebody__inner g-detail-stack relative z-[1] mx-auto px-5 py-12 lg:px-8 lg:py-16",
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
  tone = 1,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article";
  tone?: 1 | 2 | 3 | 4;
}) {
  return (
    <Reveal delay={delay} fadeOut={false}>
      <div
        className={cn(
          "g-detail-panel",
          `g-detail-panel--tone-${tone}`,
          className
        )}
      >
        <span className="g-detail-panel__rim" aria-hidden />
        <span className="g-detail-panel__accent" aria-hidden />
        <span className="g-detail-panel__shine" aria-hidden />
        <span className="g-detail-panel__corner g-detail-panel__corner--tl" aria-hidden />
        <span className="g-detail-panel__corner g-detail-panel__corner--br" aria-hidden />
        <div className="g-detail-panel__body">{children}</div>
      </div>
    </Reveal>
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
    <Reveal delay={delay} fadeOut={false}>
      <div className="g-detail-head">
        {eyebrow && (
          <p className="g-detail-head__eyebrow">
            <span className="g-detail-head__dot" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 className="g-detail-head__title">{title}</h2>
        <div className="g-detail-head__rule" aria-hidden>
          <span />
          <i />
          <span />
        </div>
        {description && (
          <p className="g-detail-head__desc">{description}</p>
        )}
      </div>
    </Reveal>
  );
}

export function DetailDivider({ delay = 0 }: { delay?: number }) {
  return (
    <Reveal delay={delay} fadeOut={false}>
      <div className="g-detail-divider" aria-hidden>
        <span />
        <i />
        <span />
      </div>
    </Reveal>
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
    <Link href={href} className="g-detail-link">
      <span>{children}</span>
      <span className="g-detail-link__ico">
        <ArrowUpRight className="h-3.5 w-3.5" />
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
    <div className="g-detail-meta">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <span key={`${item.label}-${i}`} className="g-detail-meta__chip">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
