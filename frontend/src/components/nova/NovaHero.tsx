"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Baby,
  Bed,
  Building2,
  Droplets,
  FlaskConical,
  HeartPulse,
  Phone,
  Scan,
  Scissors,
  Siren,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";
import type { HomeData } from "@/lib/types";
import { cleanPublicText, truncate } from "@/lib/utils";
import NovaHeroBackdrop from "./NovaHeroBackdrop";
import NovaWords from "./NovaWords";

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  /** Warm-toned icon chip — alternated so the reel does not read as one block. */
  gold?: boolean;
};

/** The reel content. Order matters: it is what scrolls past the viewer. */
const FEATURES: Feature[] = [
  {
    icon: Siren,
    title: "Emergency, always open",
    desc: "Triage, resuscitation and ambulance dispatch every hour of every day.",
    href: "/emergency",
    gold: true,
  },
  {
    icon: Scissors,
    title: "Operation theatre",
    desc: "Elective and emergency surgery with a full anaesthesia team on call.",
    href: "/departments",
    gold: true,
  },
  {
    icon: Baby,
    title: "Maternity and newborn care",
    desc: "Antenatal follow-up, safe delivery and care for the baby that follows.",
    href: "/departments",
    gold: true,
  },
  {
    icon: Building2,
    title: "Outpatient departments",
    desc: "Walk-in consultation across internal medicine, paediatrics and more.",
    href: "/departments",
  },
  {
    icon: FlaskConical,
    title: "Laboratory and pathology",
    desc: "Blood work, cultures and histology read in-house, results the same day.",
    href: "/departments",
  },
  {
    icon: Scan,
    title: "Imaging and diagnostics",
    desc: "X-ray and ultrasound, reported by clinicians who see the patient too.",
    href: "/services",
  },
  {
    icon: Bed,
    title: "Inpatient wards",
    desc: "Adult, paediatric and isolation beds with nursing rounds through the night.",
    href: "/services",
  },
  {
    icon: Stethoscope,
    title: "Specialist clinics",
    desc: "Scheduled review with the consultant who knows your file already.",
    href: "/doctors",
  },
  {
    icon: Syringe,
    title: "Immunisation and screening",
    desc: "Routine childhood vaccines, antenatal screening and community outreach.",
    href: "/health-education",
    gold: true,
  },
  {
    icon: Droplets,
    title: "Blood bank",
    desc: "Screened, cross-matched units kept ready for theatre and maternity.",
    href: "/services",
  },
  {
    icon: HeartPulse,
    title: "Chronic care follow-up",
    desc: "Diabetes, hypertension and HIV care on one continuous record.",
    href: "/services",
  },
];

function ReelCard({ item, clone }: { item: Feature; clone?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={item.gold ? "nv-reel__card nv-reel__card--gold" : "nv-reel__card"}
      data-clone={clone ? "true" : undefined}
      aria-hidden={clone}
      tabIndex={clone ? -1 : undefined}
    >
      <span className="nv-reel__ic" aria-hidden>
        <Icon />
      </span>
      <span className="nv-reel__body">
        <span className="nv-reel__title">{item.title}</span>
        <p className="nv-reel__desc">{item.desc}</p>
      </span>
    </Link>
  );
}

export default function NovaHero({
  data,
  name,
  tagline,
  about,
  emergency,
  images,
  place = "Siraro District · Ethiopia",
}: {
  data?: HomeData;
  name: string;
  tagline: string;
  about: string;
  emergency?: string;
  /** Photographs to cross-fade behind the hero. Empty renders no backdrop. */
  images?: string[];
  place?: string;
}) {
  const brand = cleanPublicText(name) || "Gambo General Hospital";
  const brandWords = brand.trim().split(/\s+/).filter(Boolean);
  const headline = cleanPublicText(tagline) || "Care you can trust, close to home.";
  const support =
    cleanPublicText(about) ||
    "Safe, compassionate and high-quality health care for the people of Siraro District and the surrounding communities.";

  const stats = data?.stats;
  const trust = [
    stats?.total_departments != null
      ? { value: `${stats.total_departments}+`, label: "Departments" }
      : null,
    stats?.total_doctors != null
      ? { value: `${stats.total_doctors}+`, label: "Clinicians" }
      : null,
    { value: "24/7", label: "Emergency care" },
  ].filter(Boolean) as Array<{ value: string; label: string }>;

  return (
    <section className="nv-hero">
      {/* Behind the copy, not around it: full-bleed, scrimmed, non-interactive. */}
      {images && images.length > 0 ? (
        <NovaHeroBackdrop images={images} />
      ) : null}

      {/* Light over the photographs: drifting rails, a warm pool that breathes
          and one specular sweep. All CSS, all additive, none of it interactive —
          and all of it present even with no photographs, which is what keeps an
          image-less hero from going flat. */}
      <div className="nv-hero__aura" aria-hidden>
        <span className="nv-hero__rails" />
        <span className="nv-hero__pool" />
        <span className="nv-hero__sweep" />
      </div>

      <div className="nv-shell nv-shell--wide">
        <div className="nv-hero__grid">
          <div className="nv-hero__copy">
            <p className="nv-hero__place">
              <i aria-hidden />
              {place}
            </p>

            <h1 className="nv-hero__title">
              <NovaWords
                text={brand}
                accentFrom={Math.max(brandWords.length - 1, 0)}
                stagger={85}
              />
              <span className="nv-hero__title-sub">{headline}</span>
            </h1>

            <p className="nv-hero__lede">{truncate(support, 260)}</p>

            <div className="nv-hero__cta">
              <Link
                href="/departments"
                className="nv-btn nv-btn--primary nv-btn--lg"
              >
                Explore our care
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              {emergency ? (
                <a
                  href={`tel:${emergency}`}
                  className="nv-btn nv-btn--glass nv-btn--lg"
                >
                  <Phone className="h-4 w-4" />
                  {emergency}
                </a>
              ) : (
                <Link
                  href="/emergency"
                  className="nv-btn nv-btn--glass nv-btn--lg"
                >
                  <Siren className="h-4 w-4" />
                  Emergency
                </Link>
              )}

              <Link href="/doctors" className="nv-btn nv-btn--ghost">
                Meet the doctors
              </Link>
            </div>

            <div className="nv-hero__trust">
              {trust.map((item) => (
                <div className="nv-hero__trust-item" key={item.label}>
                  <span className="nv-hero__trust-value">{item.value}</span>
                  <span className="nv-hero__trust-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Service reel: the list is rendered twice so the -50% loop is seamless. */}
          <div className="nv-reel">
            <div className="nv-reel__viewport">
              <div className="nv-reel__track">
                {FEATURES.map((item) => (
                  <ReelCard key={item.title} item={item} />
                ))}
                {FEATURES.map((item) => (
                  <ReelCard key={`clone-${item.title}`} item={item} clone />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Closes the hero and points down. Decorative: the section below is
            the real target and it is one scroll away, so there is nothing here
            to announce or to click. */}
        <div className="nv-hero__cue" aria-hidden>
          <span>Scroll</span>
          <span className="nv-hero__cue-rail">
            <i />
          </span>
        </div>
      </div>
    </section>
  );
}
