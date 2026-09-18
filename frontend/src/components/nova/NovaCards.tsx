"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowUpRight,
  Building2,
  ExternalLink,
  Globe,
  Inbox,
  Stethoscope,
} from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { iconForText } from "@/lib/healthIcons";
import { cleanPublicText, cn, truncate } from "@/lib/utils";
import type { Partner } from "@/lib/types";
import { useSpotlight } from "./hooks";

/* ── Content card — services and departments ───────────────────────────── */

export function NovaContentCard({
  href,
  title,
  description,
  image,
  kicker = "Featured care",
  badge,
  compact = false,
  className,
}: {
  href: string;
  title: string;
  description?: string;
  image?: string | null;
  kicker?: string;
  badge?: string;
  compact?: boolean;
  className?: string;
}) {
  const { onPointerMove } = useSpotlight<HTMLAnchorElement>();
  const name = cleanPublicText(title) || title;
  // Generous budget on purpose: `.nv-card__desc` clamps to three rendered lines,
  // so the cut lands at the end of a line instead of at an arbitrary character
  // count. This only guards against a description long enough to be absurd.
  const blurb = description
    ? truncate(cleanPublicText(description), compact ? 190 : 260)
    : "";
  const Icon = iconForText(name);

  return (
    <Link
      href={href}
      onPointerMove={onPointerMove}
      className={cn(
        "nv-card nv-beam nv-spot",
        compact && "nv-card--compact",
        className
      )}
    >
      <div className="nv-card__media">
        {image ? (
          <SmartImage
            src={image}
            // Decorative: the title is set directly below it. An alt string here
            // is what a broken image renders as body text, which is how the same
            // service name came to appear twice on cards whose photo 404s.
            alt=""
            fill
            optimizeWidth={compact ? 640 : 900}
            className="nv-card__photo"
            sizes="(max-width: 660px) 100vw, (max-width: 1024px) 50vw, 400px"
            fallback={
              <span className="nv-card__fallback">
                <Icon />
              </span>
            }
          />
        ) : (
          <span className="nv-card__fallback">
            <Icon />
          </span>
        )}

        <span className="nv-card__scrim" aria-hidden />
        {badge ? <span className="nv-card__badge">{badge}</span> : null}
      </div>

      <div className="nv-card__body">
        {/* The seal is what makes six cards in a row read as six different
            things: the kicker is identical on all of them, the glyph is not. */}
        <div className="nv-card__top">
          <span className="nv-card__seal" aria-hidden>
            <Icon />
          </span>
          <p className="nv-card__kicker">{kicker}</p>
        </div>

        <h3 className="nv-card__title">{name}</h3>
        {blurb ? <p className="nv-card__desc">{blurb}</p> : null}

        <div className="nv-card__foot">
          <span className="nv-card__go">
            {compact ? "Explore" : "Explore unit"}
          </span>
          <span className="nv-card__arrow" aria-hidden>
            <ArrowUpRight />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Partner card ──────────────────────────────────────────────────────── */

export function NovaPartnerCard({ partner }: { partner: Partner }) {
  const logoUrl =
    partner.logo_url || (partner.logo as { url?: string } | undefined)?.url || null;

  const initials = partner.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  const detailHref = `/partnerships/${partner.slug || partner.id}`;
  const website = partner.website
    ? partner.website.startsWith("http")
      ? partner.website
      : `https://${partner.website}`
    : null;

  const blurb =
    partner.short_description ||
    (partner.description
      ? truncate(cleanPublicText(String(partner.description)), 120)
      : "");

  return (
    <div className="nv-partner nv-beam">
      <Link href={detailHref} className="block">
        <div className="nv-partner__stage">
          {logoUrl ? (
            <SmartImage
              src={logoUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 70vw, 260px"
              optimizeWidth={480}
              className="nv-partner__logo p-7"
              fallback={<span className="nv-partner__mono">{initials}</span>}
            />
          ) : (
            <span className="nv-partner__mono">
              {initials || <Building2 className="h-7 w-7" />}
            </span>
          )}

          {partner.category ? (
            <span className="nv-partner__cat">{partner.category}</span>
          ) : null}
        </div>

        <div className="nv-partner__body">
          <h3 className="nv-partner__name">{partner.name}</h3>
          {blurb ? <p className="nv-partner__desc">{blurb}</p> : null}
        </div>
      </Link>

      <div className="nv-partner__foot">
        <Link href={detailHref} className="nv-partner__link">
          View details
          <ArrowUpRight />
        </Link>

        {website ? (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="nv-partner__ext"
            title="Visit official website"
            aria-label={`${partner.name} website`}
          >
            <Globe />
            <ExternalLink className="sr-only" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

/* ── Clinician card ────────────────────────────────────────────────────── */

export function NovaDoctorCard({
  href,
  name,
  role,
  department,
  photo,
}: {
  href: string;
  name: string;
  role?: string;
  department?: string;
  photo?: string | null;
}) {
  const initials = name
    .replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Link href={href} className="nv-doc nv-beam">
      <div className="nv-doc__frame">
        {photo ? (
          <SmartImage
            src={photo}
            alt=""
            fill
            optimizeWidth={520}
            className="nv-doc__photo"
            sizes="262px"
            fallback={<span className="nv-doc__initials">{initials}</span>}
          />
        ) : (
          <span className="nv-doc__initials">{initials}</span>
        )}
      </div>

      <div className="nv-doc__cap">
        {department ? (
          <span className="nv-doc__dept">
            <Stethoscope className="h-3 w-3" />
            {department}
          </span>
        ) : null}
        <h3 className="nv-doc__name">{name}</h3>
        {role ? <p className="nv-doc__role">{role}</p> : null}
        <span className="nv-doc__reveal">
          View profile
          <ArrowUpRight />
        </span>
      </div>
    </Link>
  );
}

/* ── Gallery mosaic tile ───────────────────────────────────────────────── */

export function NovaGalleryTile({
  href,
  title,
  image,
  label = "Gallery",
}: {
  href: string;
  title: string;
  image?: string | null;
  label?: string;
}) {
  return (
    <Link href={href} className="nv-tile">
      {image ? (
        <SmartImage
          src={image}
          alt=""
          fill
          optimizeWidth={720}
          className="nv-tile__photo"
          sizes="(max-width: 700px) 50vw, 25vw"
          fallback={<span className="nv-card__fallback" />}
        />
      ) : (
        <span className="nv-card__fallback" />
      )}

      <span className="nv-tile__veil" aria-hidden />
      <div className="nv-tile__cap">
        <p className="nv-tile__label">{label}</p>
        <p className="nv-tile__title">{title}</p>
      </div>
    </Link>
  );
}

/* ── News row ──────────────────────────────────────────────────────────── */

export function NovaNewsRow({
  href,
  index,
  date,
  title,
  excerpt,
}: {
  href: string;
  index: number;
  date?: string;
  title: string;
  excerpt?: string;
}) {
  return (
    <Link href={href} className="nv-row">
      <span className="nv-row__num" aria-hidden>
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="nv-row__copy">
        {date ? <span className="nv-row__date">{date}</span> : null}
        <span className="nv-row__title block">{title}</span>
        {excerpt ? <span className="nv-row__excerpt block">{excerpt}</span> : null}
      </span>

      <span className="nv-row__go" aria-hidden>
        <ArrowUpRight />
      </span>
    </Link>
  );
}

/* ── Small fact card ───────────────────────────────────────────────────── */

export function NovaFact({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="nv-fact">
      <span className="nv-fact__ico" aria-hidden>
        <Icon />
      </span>
      <p className="nv-fact__title">{title}</p>
      <p className="nv-fact__desc">{description}</p>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function NovaEmpty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="nv-empty">
      <span className="nv-empty__ico" aria-hidden>
        <Inbox />
      </span>
      <p className="nv-empty__title">{title}</p>
      {description ? <p className="nv-empty__desc">{description}</p> : null}
    </div>
  );
}






