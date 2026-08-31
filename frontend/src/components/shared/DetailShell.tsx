"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NovaReveal from "@/components/nova/NovaReveal";
import Masthead from "@/components/layout/Masthead";
import { cn } from "@/lib/utils";

export type DetailBadgeTone = "mint" | "coral" | "glass" | "brass" | "teal";

export interface DetailBadge {
  icon?: LucideIcon;
  label: string;
  tone?: DetailBadgeTone;
}

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
 * Renders the same `Masthead` a list page opens with, so a visitor moving from
 * /news into /news/some-story stays inside one composition instead of meeting a
 * second design. `tight` is the only difference: a detail page has a document
 * under it, so the opening closes nearer its body and lets the seam do the join.
 *
 * `section` is the route the caller came from rather than the story's own URL,
 * which is what puts a news story under "14 · Newsroom" instead of leaving the
 * ordinal blank -- `sectionMeta()` resolves a detail path to its parent section,
 * and `backHref` is that path on every caller.
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
  const visibleBadges = (badges ?? []).filter((b) => b && b.label);
  const showcase = Boolean(image) && imageMode === "showcase";

  return (
    <div>
      <Masthead
        tight
        title={title}
        eyebrow={eyebrow}
        lede={subtitle}
        section={backHref}
        crumbs={[{ label: title }]}
        backHref={backHref}
        backLabel={backLabel}
        image={showcase ? image : null}
        badges={visibleBadges.map((badge) => ({
          label: badge.label,
          icon: badge.icon,
        }))}
      />

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
    <NovaReveal from="up" delay={delay} className="h-full w-full">
      <div className={cn("nv-dpanel h-full flex flex-col justify-between", className)}>
        {children}
      </div>
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
