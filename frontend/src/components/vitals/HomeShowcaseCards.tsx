"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  UserCheck,
  Building2,
  HeartPulse,
  Award,
  Activity,
  TrendingUp,
  ExternalLink,
  Globe,
} from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { cleanPublicText, truncate, cn } from "@/lib/utils";
import { iconForText } from "@/lib/healthIcons";
import Counter from "@/components/vitals/Counter";
import type { Partner } from "@/lib/types";

export function ServiceCard({
  href,
  title,
  description,
  image,
  index = 0,
  kicker = "Featured care",
  compact = false,
  className,
}: {
  href: string;
  title: string;
  description?: string;
  image?: string | null;
  index?: number;
  kicker?: string;
  compact?: boolean;
  className?: string;
}) {
  const name = cleanPublicText(title) || title;
  const blurb = description
    ? truncate(cleanPublicText(description), compact ? 90 : 150)
    : "";
  const Icon = iconForText(name);

  return (
    <Link
      href={href}
      className={cn(
        "g-band g-band--plain group",
        compact && "g-band--compact",
        className
      )}
    >
      <div className="g-band__media relative overflow-hidden bg-slate-900/10">
        {image ? (
          <>
            <SmartImage
              src={image}
              alt=""
              fill
              optimizeWidth={120}
              className="g-band__backdrop object-cover blur-xl scale-110 opacity-60 brightness-95 select-none pointer-events-none"
              aria-hidden
            />
            <SmartImage
              src={image}
              alt={name}
              fill
              optimizeWidth={compact ? 640 : 900}
              className="g-band__photo"
              sizes={
                compact
                  ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                  : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 420px"
              }
              fallback={
                <div className="g-band__fallback">
                  <Icon className={compact ? "h-6 w-6" : "h-8 w-8"} />
                </div>
              }
            />
          </>
        ) : (
          <div className="g-band__fallback">
            <Icon className={compact ? "h-6 w-6" : "h-8 w-8"} />
          </div>
        )}
        <span className="g-band__media-veil" aria-hidden />
        <span className="g-band__index">
          <em>{String(index + 1).padStart(2, "0")}</em>
        </span>
      </div>

      <div className="g-band__body">
        <div className="g-band__meta">
          <span className="g-band__icon" aria-hidden>
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </span>
          <span className="g-band__label">{kicker}</span>
        </div>

        <h3 className="g-band__title">
          <span className="g-band__title-text">{name}</span>
        </h3>
        {blurb && <p className="g-band__desc">{blurb}</p>}

        {/* Fancy "Explore unit" pill button */}
        <span className="g-band__go g-band__go--fancy">
          <span className="g-band__go-label">
            {compact ? "Explore" : "Explore unit"}
          </span>
          <span className="g-band__go-ico">
            <ArrowUpRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </span>
        </span>
      </div>
    </Link>
  );
}

export function DepartmentCard({
  href,
  title,
  description,
  image,
  index = 0,
  compact = false,
}: {
  href: string;
  title: string;
  description?: string;
  image?: string | null;
  index?: number;
  compact?: boolean;
}) {
  return (
    <ServiceCard
      href={href}
      title={title}
      description={description}
      image={image}
      index={index}
      kicker="Clinical unit"
      compact={compact}
    />
  );
}

/** @deprecated Use ClinicianRow from PeopleProfiles — kept as alias for older imports. */
export { ClinicianRow as DoctorCard } from "@/components/shared/PeopleProfiles";

/* ─── Partnership Card ──────────────────────────────────────────────────── */

export function PartnerCard({ partner }: { partner: Partner }) {
  const logoUrl =
    partner.logo_url ||
    (partner.logo as { url?: string } | undefined)?.url ||
    null;

  const initials = partner.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const detailHref = `/partnerships/${partner.slug || partner.id}`;
  const websiteHref = partner.website
    ? partner.website.startsWith("http")
      ? partner.website
      : `https://${partner.website}`
    : null;

  return (
    <div className="g-partner-card group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(23,27,39,0.6),rgba(11,13,19,0.6))] shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-teal-400/30 hover:shadow-xl hover:shadow-teal-500/10">
      {/* Coloured accent line top */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Main card clickable link to detail page */}
      <Link href={detailHref} className="block">
        {/* Logo / image area */}
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900/60 via-black/40 to-slate-800/60">
          {logoUrl ? (
            <>
              {/* Ambient blur backdrop */}
              <SmartImage
                src={logoUrl}
                alt=""
                fill
                optimizeWidth={80}
                className="object-cover blur-3xl scale-125 opacity-15 pointer-events-none select-none"
                aria-hidden
              />
              {/* Main logo — contained so it's never cropped */}
              <SmartImage
                src={logoUrl}
                alt={partner.name}
                fill
                optimizeWidth={480}
                className="object-contain p-8 transition-transform duration-500 group-hover:scale-[1.06]"
              />
            </>
          ) : (
            /* Fallback monogram */
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-900/40 to-cyan-900/40 text-teal-300 shadow-sm ring-1 ring-teal-500/30 transition-transform duration-300 group-hover:scale-110">
              {initials ? (
                <span className="font-display text-2xl font-bold tracking-tight">
                  {initials}
                </span>
              ) : (
                <Building2 className="h-9 w-9" />
              )}
            </div>
          )}

          {/* Category badge */}
          {partner.category && (
            <span className="absolute right-3 top-3 rounded-xl border border-white/[0.08] bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 shadow-sm backdrop-blur-sm">
              {partner.category}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-5 pb-3">
          <h3 className="font-semibold leading-snug text-slate-100 transition-colors duration-200 group-hover:text-teal-300 line-clamp-1">
            {partner.name}
          </h3>

          {(partner.short_description || partner.description) && (
            <p className="text-sm leading-relaxed text-slate-400 line-clamp-2">
              {partner.short_description ||
                String(partner.description ?? "")
                  .replace(/<[^>]+>/g, "")
                  .slice(0, 120)}
            </p>
          )}
        </div>
      </Link>

      {/* Bottom CTA Actions bar */}
      <div className="mt-auto flex items-center justify-between px-5 pb-4 pt-3 border-t border-white/[0.06]">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-300 transition-all duration-300 hover:bg-teal-500/20 hover:gap-2.5"
        >
          View details
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>

        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-teal-300 transition-colors"
            title="Visit official website"
          >
            <Globe className="h-3.5 w-3.5" />
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Metric Card ────────────────────────────────────────────────────────── */

function getMetricTheme(label: string) {
  const l = label.toLowerCase();
  if (l.includes("doctor") || l.includes("physician") || l.includes("staff")) {
    return {
      Icon: UserCheck,
      iconBg: "bg-teal-900/40 text-teal-300 border-teal-500/30",
      accentBar: "from-teal-400 via-cyan-400 to-sky-400",
      kicker: "Medical specialists",
      badgeText: "Verified Team",
      badgeColor: "bg-teal-500/15 text-teal-300",
    };
  }
  if (l.includes("department") || l.includes("unit") || l.includes("center")) {
    return {
      Icon: Building2,
      iconBg: "bg-cyan-900/40 text-cyan-300 border-cyan-500/30",
      accentBar: "from-cyan-400 via-teal-400 to-emerald-400",
      kicker: "Clinical care units",
      badgeText: "24/7 Units",
      badgeColor: "bg-cyan-500/15 text-cyan-300",
    };
  }
  if (l.includes("patient") || l.includes("served") || l.includes("treated") || l.includes("catchment") || l.includes("population")) {
    return {
      Icon: HeartPulse,
      iconBg: "bg-emerald-900/40 text-emerald-300 border-emerald-500/30",
      accentBar: "from-emerald-400 via-teal-400 to-cyan-400",
      kicker: "Healed & supported",
      badgeText: "Community Impact",
      badgeColor: "bg-emerald-500/15 text-emerald-300",
    };
  }
  if (l.includes("year") || l.includes("experience") || l.includes("service")) {
    return {
      Icon: Award,
      iconBg: "bg-amber-900/40 text-amber-300 border-amber-500/30",
      accentBar: "from-amber-400 via-orange-400 to-yellow-400",
      kicker: "Healthcare heritage",
      badgeText: "Established Heritage",
      badgeColor: "bg-amber-500/15 text-amber-300",
    };
  }
  return {
    Icon: Activity,
    iconBg: "bg-teal-900/40 text-teal-300 border-teal-500/30",
    accentBar: "from-teal-400 via-cyan-400 to-sky-400",
    kicker: "Hospital metric",
    badgeText: "Live Metric",
    badgeColor: "bg-teal-500/15 text-teal-300",
  };
}

export function MetricCard({
  value,
  label,
}: {
  value: number;
  label: string;
  icon?: unknown;
  index?: number;
}) {
  const theme = getMetricTheme(label);
  const Icon = theme.Icon;

  return (
    <div className="g-metric-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(23,27,39,0.7),rgba(11,13,19,0.8))] p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-400/30 hover:shadow-xl hover:shadow-teal-500/10 h-full">
      {/* Top gradient accent line */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80 transition-opacity duration-300 group-hover:opacity-100",
          theme.accentBar
        )}
      />

      {/* Background watermark icon */}
      <Icon
        className="absolute -bottom-3 -right-3 h-28 w-28 text-white/[0.04] transition-transform duration-500 group-hover:scale-110 pointer-events-none"
        aria-hidden
      />

      {/* Top row: Icon & Badge */}
      <div className="flex items-center justify-between gap-3 z-10">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-110",
            theme.iconBg
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
            theme.badgeColor
          )}
        >
          <TrendingUp className="h-3 w-3" />
          {theme.badgeText}
        </span>
      </div>

      {/* Middle: Big Metric Number */}
      <div className="mt-6 z-10">
        <div className="font-display text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
          <Counter value={value} suffix="+" />
        </div>

        {/* Label & Kicker */}
        <h3 className="mt-2 text-base font-bold text-slate-200 lg:text-lg">
          {label}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-slate-400">
          {theme.kicker}
        </p>
      </div>

      {/* Bottom accent indicator */}
      <div className="mt-5 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[11px] font-medium text-slate-500 z-10">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
        Verified hospital data
      </div>
    </div>
  );
}
