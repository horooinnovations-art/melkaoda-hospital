"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HeartPulse, Mail, MapPin, Phone } from "lucide-react";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import { SITE_NAME, DEFAULT_TAGLINE } from "@/lib/api";
import { formatPublicAddress, stripHtml, truncate } from "@/lib/utils";
import MapLink from "@/components/shared/MapLink";
import { resolveMediaUrl } from "@/lib/media";
import SmartImage from "@/components/shared/SmartImage";
import {
  SOCIAL_GLYPHS,
  normalizeSocialUrl,
  type SocialKey,
} from "@/components/vitals/SocialIcons";

const COLUMNS = [
  {
    title: "Care",
    links: [
      { href: "/departments", label: "Departments" },
      { href: "/services", label: "Services" },
      { href: "/doctors", label: "Doctors" },
      { href: "/emergency", label: "Emergency" },
      { href: "/insurance", label: "Insurance" },
      { href: "/health-education", label: "Health education" },
      { href: "/patient-guide", label: "Patient guide" },
    ],
  },
  {
    title: "Hospital",
    links: [
      { href: "/about", label: "About" },
      { href: "/leadership", label: "Leadership" },
      { href: "/partnerships", label: "Partnerships" },
      { href: "/gallery", label: "Gallery" },
      { href: "/testimonials", label: "Testimonials" },
      { href: "/faqs", label: "FAQs" },
    ],
  },
  {
    title: "Updates & contact",
    links: [
      { href: "/news", label: "News" },
      { href: "/announcements", label: "Announcements" },
      { href: "/events", label: "Events" },
      { href: "/careers", label: "Careers" },
      { href: "/downloads", label: "Downloads" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

const SOCIAL_ORDER: SocialKey[] = [
  "facebook",
  "twitter",
  "instagram",
  "linkedin",
  "youtube",
  "telegram",
];

export default function NovaFooter() {
  const { data: settings } = useGetSettingsQuery();

  const name = (settings?.site_name as string) || SITE_NAME;
  const tagline = (settings?.tagline as string) || DEFAULT_TAGLINE;
  const about = (settings?.about as string) || tagline;
  const address = formatPublicAddress(settings?.address as string | undefined);
  const phone = settings?.phone as string | undefined;
  const email = settings?.email as string | undefined;
  const emergency =
    (settings?.emergency_phone as string) || (settings?.phone as string);

  const socials = useMemo(
    () =>
      SOCIAL_ORDER.flatMap((key) => {
        const href = normalizeSocialUrl(
          key,
          settings?.[key] as string | undefined
        );
        return href ? [{ key, href, Glyph: SOCIAL_GLYPHS[key] }] : [];
      }),
    [settings]
  );

  const logoUrl = resolveMediaUrl(settings?.logo_url as string);
  const year = new Date().getFullYear();

  return (
    <footer className="nv-footer">
      <div className="nv-footer__wrap">
        <div className="nv-footer__cols">
          <div className="nv-footer__col nv-footer__brand-col">
            <Link href="/" className="nv-footer__logo">
              <span className="nv-footer__mark" aria-hidden>
                {logoUrl ? (
                  <SmartImage
                    src={logoUrl}
                    alt=""
                    fill
                    unoptimized
                    optimizeWidth={96}
                    className="object-contain p-1"
                  />
                ) : (
                  <HeartPulse />
                )}
              </span>
              {name}
            </Link>

            <p className="nv-footer__blurb">{truncate(stripHtml(about), 150)}</p>

            {emergency && (
              <a href={`tel:${emergency}`} className="nv-footer__accent">
                <Phone />
                Emergency line {emergency}
              </a>
            )}

            {email && (
              <a href={`mailto:${email}`} className="nv-footer__accent">
                <Mail />
                {email}
              </a>
            )}

            {address && (
              <MapLink className="nv-footer__where">
                <MapPin aria-hidden />
                <span>{address}</span>
              </MapLink>
            )}

            {socials.length > 0 && (
              <div className="nv-footer__socials">
                {socials.map(({ key, href, Glyph }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={key}
                    className="nv-footer__social"
                  >
                    <Glyph className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {COLUMNS.map((column) => (
            <div className="nv-footer__col" key={column.title}>
              <h4>{column.title}</h4>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              {column.title === "Updates & contact" && phone && (
                <a href={`tel:${phone}`}>Reception {phone}</a>
              )}
            </div>
          ))}
        </div>

        <div className="nv-footer__bottom">
          <span>
            © {year} {name}. All rights reserved.
          </span>
          <span>
            Open 24 hours, 365 days · Built by{" "}
            <a
              href="https://horooinnovations.com"
              target="_blank"
              rel="noreferrer"
            >
              Horoo Innovations
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
