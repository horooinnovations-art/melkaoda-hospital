"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SmartImage from "@/components/shared/SmartImage";
import { optimizeImageUrl } from "@/lib/media";
import { cn, cleanPublicText, truncate } from "@/lib/utils";
import { iconForText } from "@/lib/healthIcons";
import Reveal from "@/components/motion/Reveal";

type FancyMediaCardProps = {
  href: string;
  title: string;
  description?: string;
  image?: string | null;
  index?: number;
  cta?: string;
  className?: string;
};

export default function FancyMediaCard({
  href,
  title,
  description,
  image,
  index,
  cta = "Learn more",
  className,
}: FancyMediaCardProps) {
  const cleanTitle = cleanPublicText(title) || title;
  const cleanDesc = description
    ? truncate(cleanPublicText(description), 130)
    : "";
  const Icon = iconForText(cleanTitle);
  const tone = typeof index === "number" ? (index % 4) + 1 : 1;

  return (
    <Reveal
      delay={typeof index === "number" ? Math.min(index * 0.04, 0.3) : 0}
      className="h-full"
    >
      <Link
        href={href}
        className={cn("g-tile group", `g-tile--tone-${tone}`, className)}
      >
        <span className="g-tile__rim" aria-hidden />
        <div className="g-tile__aura" aria-hidden />
        <div className="g-tile__media">
          {image ? (
            <SmartImage
              src={optimizeImageUrl(image, 800) ?? image}
              alt={cleanTitle}
              fill
              optimizeWidth={800}
              className="object-cover g-tile__photo"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="g-tile__fallback">
              <Icon className="h-8 w-8" />
            </div>
          )}
          <span className="g-tile__index" aria-hidden>
            {String((index ?? 0) + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="g-tile__body">
          <span className="g-tile__icon" aria-hidden>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h3 className="g-tile__title">{cleanTitle}</h3>
          {cleanDesc && <p className="g-tile__desc">{cleanDesc}</p>}
          <span className="g-tile__cta">
            {cta}
            <span className="g-tile__cta-ico">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
