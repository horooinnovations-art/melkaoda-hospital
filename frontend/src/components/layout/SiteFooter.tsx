"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowUpRight,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Siren,
} from "lucide-react";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import { SITE_NAME, DEFAULT_TAGLINE } from "@/lib/api";
import { formatPublicAddress, stripHtml, truncate } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";
import SmartImage from "@/components/shared/SmartImage";
import {
  SOCIAL_GLYPHS,
  normalizeSocialUrl,
  type SocialKey,
} from "@/components/vitals/SocialIcons";
import WorkingHoursDisplay from "@/components/shared/WorkingHoursDisplay";

const COLUMNS = [
  {
    title: "Care",
    links: [
      { href: "/departments", label: "Departments" },
      { href: "/services", label: "Services" },
      { href: "/doctors", label: "Doctors" },
      { href: "/emergency", label: "Emergency" },
      { href: "/patient-guide", label: "Patient guide" },
    ],
  },
  {
    title: "Hospital",
    links: [
      { href: "/about", label: "About" },
      { href: "/partnerships", label: "Partnerships" },
      { href: "/leadership", label: "Leadership" },
      { href: "/gallery", label: "Gallery" },
      { href: "/faqs", label: "FAQs" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/news", label: "News" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
      { href: "/insurance", label: "Insurance" },
      { href: "/downloads", label: "Downloads" },
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

export default function SiteFooter() {
  const { data: settings } = useGetSettingsQuery();
  const name = (settings?.site_name as string) || SITE_NAME;
  const tagline = (settings?.tagline as string) || DEFAULT_TAGLINE;
  const about = (settings?.about as string) || tagline;
  const address = formatPublicAddress(settings?.address as string | undefined);
  const phone = settings?.phone as string | undefined;
  const emergency =
    (settings?.emergency_phone as string) || (settings?.phone as string);
  const email = settings?.email as string | undefined;

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
    <footer className="g-footer">
      <div className="g-footer__atmosphere" aria-hidden>
        <span className="g-footer__aura" />
        <span className="g-footer__mesh" />
        <span className="g-footer__orb g-footer__orb--a" />
        <span className="g-footer__orb g-footer__orb--b" />
        <span className="g-footer__rim" />
      </div>

      <div className="g-footer__inner mx-auto max-w-7xl px-5 lg:px-8">
        <div className="g-footer__crest" aria-hidden>
          <span />
          <i />
          <span />
        </div>

        <div className="g-footer__top">
          <div className="g-footer__brand-block">
            <div className="g-footer__brand-row">
              {logoUrl ? (
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 border border-white/15 p-1 shadow-md">
                  <SmartImage
                    src={logoUrl}
                    alt={name}
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
              ) : (
                <span className="g-footer__mark" aria-hidden>
                  <HeartPulse className="h-5 w-5" />
                </span>
              )}
              <div>
                <p className="g-footer__eyebrow">Trusted care</p>
                <p className="g-footer__brand">{name}</p>
              </div>
            </div>

            {tagline && <p className="g-footer__tag">{tagline}</p>}

            {about && (
              <p className="g-footer__lede">
                {truncate(stripHtml(about), 170)}
              </p>
            )}

            <ul className="g-footer__meta">
              {address && (
                <li>
                  <span className="g-footer__meta-ico" aria-hidden>
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span>{address}</span>
                </li>
              )}
              {phone && (
                <li>
                  <span className="g-footer__meta-ico" aria-hidden>
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                  <a href={`tel:${phone}`}>{phone}</a>
                </li>
              )}
              {email && (
                <li>
                  <span className="g-footer__meta-ico" aria-hidden>
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
            </ul>

            <div className="mt-5 pt-4 border-t border-white/10">
              <WorkingHoursDisplay variant="dark" />
            </div>

            {socials.length > 0 && (
              <div className="g-footer__socials">
                {socials.map(({ key, href, Glyph }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={key}
                    className="g-footer__social"
                  >
                    <Glyph className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="g-footer__nav">
            {COLUMNS.map((col) => (
              <div key={col.title} className="g-footer__col">
                <h3>
                  <span className="g-footer__col-dot" aria-hidden />
                  {col.title}
                </h3>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="g-footer__link">
                        <span className="g-footer__link-mark" aria-hidden />
                        <span>{link.label}</span>
                        <ArrowUpRight className="g-footer__link-go" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="g-footer__panel">
          <span className="g-footer__panel-rim" aria-hidden />
          <span className="g-footer__panel-shine" aria-hidden />
          <div className="g-footer__panel-body">
            <div className="g-footer__panel-copy">
              <p className="g-footer__panel-kicker">Always ready</p>
              <p className="g-footer__panel-title">
                Need directions, answers, or urgent care?
              </p>
              <p className="g-footer__panel-desc">
                Reach the main desk for appointments and records, or call the
                emergency line when every minute matters.
              </p>
            </div>
            <div className="g-footer__panel-actions">
              <Link href="/contact" className="g-footer__btn g-footer__btn--ghost">
                Contact desk
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              {emergency && (
                <a
                  href={`tel:${emergency}`}
                  className="g-footer__btn g-footer__btn--solid"
                >
                  <Siren className="h-4 w-4" />
                  {emergency}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="g-footer__base">
          <span className="g-footer__corner g-footer__corner--tl" aria-hidden />
          <span className="g-footer__corner g-footer__corner--br" aria-hidden />
          <p>
            © {year} {name}. All rights reserved.
          </p>
          <p className="g-footer__powered">
            Powered by{" "}
            <a
              href="https://horooinnovations.com"
              target="_blank"
              rel="noreferrer"
            >
              Horoo Innovations
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
