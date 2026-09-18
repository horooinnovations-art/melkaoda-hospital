"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowUpRight, Expand, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NovaReveal from "@/components/nova/NovaReveal";
import Masthead from "@/components/layout/Masthead";
import SmartImage from "@/components/shared/SmartImage";
import { optimizeImageUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export type DetailBadgeTone = "mint" | "coral" | "glass" | "brass" | "teal";

export interface DetailBadge {
  icon?: LucideIcon;
  label: string;
  tone?: DetailBadgeTone;
}

const WIDTHS = {
  prose: "max-w-4xl",
  wide: "max-w-6xl",
  full: "max-w-[1360px]",
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
 * Featured Image Card component for Detail pages.
 * Displays 100% of the photograph fully visible (uncropped / un-cut) inside a luxury
 * glassmorphic gold card with interactive expand modal.
 */
export function DetailFeaturedImageCard({
  image,
  title,
}: {
  image: string;
  title: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const src = optimizeImageUrl(image, 1600) ?? image;

  useEffect(() => setMounted(true), []);

  /**
   * While the lightbox is open: close on Escape, and stop the page behind it
   * from scrolling. Without the scroll lock the document moves under a fixed
   * overlay, so the reader appears to be scrolling the photograph and instead
   * loses their place on the page.
   */
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const lightbox = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Featured image"}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={() => setFullscreen(false)}
    >
      <button
        type="button"
        onClick={() => setFullscreen(false)}
        className="absolute top-5 right-5 z-10 rounded-full border border-white/30 bg-black/60 p-3 text-white transition-colors hover:border-amber-400 hover:bg-black/90"
        aria-label="Close fullscreen"
      >
        <X className="h-6 w-6" />
      </button>
      <div
        className="relative flex max-h-[90vh] max-w-[92vw] items-center justify-center overflow-hidden rounded-2xl border border-amber-400/30 bg-black/80 p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <SmartImage
          src={src}
          alt={title || "Featured image"}
          width={1920}
          height={1440}
          className="h-auto max-h-[85vh] w-auto max-w-[88vw] object-contain"
        />
      </div>
    </div>
  );

  return (
    <>
      <NovaReveal from="up" delay={0.06} className="w-full mb-8">
        <div className="group relative overflow-hidden rounded-2xl border border-[rgba(255,225,155,0.35)] bg-[linear-gradient(135deg,rgba(22,17,8,0.96),rgba(38,30,15,0.98))] p-3 sm:p-5 lg:p-6 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-[rgba(255,215,0,0.65)] hover:shadow-2xl hover:shadow-[rgba(184,134,11,0.2)]">
          {/* Ambient blurred backdrop glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 transition-opacity duration-700 group-hover:opacity-35">
            <SmartImage
              src={src}
              alt=""
              fill
              sizes="96px"
              optimizeWidth={120}
              className="object-cover blur-3xl scale-125 select-none"
              aria-hidden
            />
          </div>

          {/**
           * The stage hugs the photograph instead of framing it.
           *
           * It used to be a full-width black slab of fixed height with the image
           * centred inside it, so any picture that was not exactly that shape
           * sat between two wide black bars — on a desktop window the bars were
           * bigger than the picture. Letting the image set its own width removes
           * them without cropping anything.
           */}
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="View this photograph full screen"
            className="relative mx-auto flex w-fit max-w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl"
          >
            <SmartImage
              src={src}
              alt={title || "Featured photograph"}
              width={1600}
              height={1200}
              priority
              className="h-auto max-h-[70vh] w-auto max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            />
          </button>

          {/* Luxury Card Control Bar */}
          <div className="mt-3 flex items-center justify-between px-1 text-xs font-medium">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#ffe8a3]">
              <span className="h-2 w-2 rounded-full bg-[#ffd700] shadow-[0_0_8px_#ffd700]" />
              Featured Photo
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(255,215,0,0.4)] bg-[rgba(30,22,10,0.7)] px-3 py-1.5 font-mono text-[11px] tracking-wider text-white hover:border-[#ffd700] hover:bg-[rgba(212,175,55,0.3)] transition-all"
            >
              <Expand className="h-3.5 w-3.5 text-[#ffd700]" />
              View full screen
            </button>
          </div>
        </div>
      </NovaReveal>

      {/**
       * The lightbox is portalled to <body>.
       *
       * `position: fixed` is only fixed to the viewport while no ancestor has a
       * transform, filter or containment — any one of those makes it the
       * containing block instead, and the page wrapper animates a transform on
       * entry. When that happens the overlay stops covering the viewport: it
       * covers the article, scrolls with it, and leaves the site header sitting
       * on top of a supposedly modal layer. Rendering at the document root puts
       * it out of reach of every ancestor, whatever is added above it later.
       */}
      {fullscreen && mounted ? createPortal(lightbox, document.body) : null}
    </>
  );
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
  width = "full",
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
        image={null}
        badges={visibleBadges.map((badge) => ({
          label: badge.label,
          icon: badge.icon,
        }))}
      />

      <div className="nv-pb relative -mx-[calc((100vw-100%)/2)] w-screen">
        <span className="nv-pb__glow" aria-hidden />
        <div
          className={cn(
            "nv-pb__inner nv-dstack mx-auto px-4 sm:px-6 py-10 lg:px-10 lg:py-14",
            WIDTHS[width],
            bodyClassName
          )}
        >
          {showcase && (
            <DetailFeaturedImageCard image={image!} title={title} />
          )}
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
  fullHeight = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article";
  /** Retained for source compatibility; every panel now shares one surface. */
  tone?: 1 | 2 | 3 | 4;
  fullHeight?: boolean;
}) {
  return (
    <NovaReveal from="up" delay={delay} className={cn("w-full", fullHeight && "h-full")}>
      <div className={cn("nv-dpanel", fullHeight && "h-full flex flex-col justify-between", className)}>
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
        {/* Split on blank lines: a section intro can be a subtitle followed by
            a lead paragraph, and one <p> ran them together as a single
            sentence with no full stop between them. */}
        {description &&
          description
            .split(/\n{2,}/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, index) => (
              <p key={index} className="nv-dhead__desc">
                {para}
              </p>
            ))}
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
