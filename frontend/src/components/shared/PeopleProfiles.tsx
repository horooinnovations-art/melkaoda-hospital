"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { cleanPublicText, truncate, cn } from "@/lib/utils";

/** Clinical staff directory row — not a portrait card. */
export function ClinicianRow({
  href,
  name,
  role,
  designation,
  department,
  photo,
  image,
  index = 0,
  className,
}: {
  href: string;
  name: string;
  role?: string;
  designation?: string;
  department?: string;
  photo?: string | null;
  image?: string | null;
  initial?: string;
  index?: number;
  className?: string;
}) {
  const metaRole = cleanPublicText(role || designation || "") || null;
  const metaDept = cleanPublicText(department || "") || null;
  const portrait = photo || image;
  const cleanName = cleanPublicText(name) || name;
  const initials =
    cleanName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "DR";

  return (
    <Link href={href} className={cn("nv-clin group", className)}>
      <span className="nv-clin__index" aria-hidden>
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="nv-clin__photo" aria-hidden={!portrait}>
        {portrait ? (
          <SmartImage
            src={portrait}
            alt=""
            fill
            optimizeWidth={240}
            className="nv-clin__img object-cover object-top"
            sizes="72px"
          />
        ) : (
          <span className="nv-clin__fallback">{initials}</span>
        )}
      </span>

      <span className="nv-clin__copy">
        <span className="nv-clin__name">{cleanName}</span>
        {metaRole && <span className="nv-clin__role">{metaRole}</span>}
      </span>

      {metaDept && <span className="nv-clin__dept">{metaDept}</span>}

      <span className="nv-clin__go">
        Profile
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

/** Governance / leadership board entry — structurally different from clinicians. */
export function OfficerProfile({
  href,
  name,
  position,
  summary,
  photo,
  image,
  index = 0,
  className,
}: {
  href: string;
  name: string;
  position?: string;
  summary?: string;
  photo?: string | null;
  image?: string | null;
  index?: number;
  className?: string;
}) {
  const cleanName = cleanPublicText(name) || name;
  const office = cleanPublicText(position || "") || "Leadership";
  const blurb = summary ? truncate(cleanPublicText(summary), 160) : "";
  const portrait = photo || image;
  const initials =
    cleanName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "LD";
  const flip = index % 2 === 1;

  return (
    <Link
      href={href}
      className={cn("nv-board group", flip && "nv-board--flip", className)}
    >
      <div className="nv-board__main">
        <p className="nv-board__office">{office}</p>
        <h3 className="nv-board__name">{cleanName}</h3>
        {blurb ? <p className="nv-board__summary">{blurb}</p> : null}
        <span className="nv-board__cta">
          View leadership profile
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="nv-board__media" aria-hidden={!portrait}>
        {portrait ? (
          <SmartImage
            src={portrait}
            // Decorative: .nv-board__name prints this person's name beside the
            // frame, so a non-empty alt would render it twice whenever the
            // candidate URL 404s and the img falls back to its alt text.
            alt=""
            fill
            optimizeWidth={640}
            className="nv-board__img object-cover object-[center_20%]"
            sizes="(max-width: 768px) 100vw, 280px"
          />
        ) : (
          <span className="nv-board__fallback">{initials}</span>
        )}
      </div>
    </Link>
  );
}
