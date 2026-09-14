"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
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
import { SITE_NAME } from "@/lib/api";
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
      {/* Ledger mark: a champagne hairline that grows down the card's leading
          edge on hover. It is the same "attention" gesture the figures use, so
          a card that is only being read is distinguishable from one being
          followed without the plate itself having to change. */}
      <span className="nv-reel__edge" aria-hidden />
    </Link>
  );
}

/**
 * The hero's pointer-tracked light. It writes the cursor position, in pixels
 * relative to the hero box, into two custom properties that `.nv-hero__torch`
 * reads as a transform — so the layer is moved by the compositor and nothing
 * repaints as the pointer travels.
 *
 * Three deliberate refusals:
 *   · nothing runs under `prefers-reduced-motion`
 *   · nothing runs on touch, where there is no cursor to follow and the layer
 *     would only ever be stuck wherever the last tap landed
 *   · the position is read once per frame inside the rAF callback, not on every
 *     `pointermove`, so a fast pointer cannot force a layout per event
 */
function useHeroTorch<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let cx = 0;
    let cy = 0;
    let raf = 0;

    const paint = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      el.style.setProperty("--nv-mx", `${cx - box.left}px`);
      el.style.setProperty("--nv-my", `${cy - box.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      cx = event.clientX;
      cy = event.clientY;
      if (!raf) raf = window.requestAnimationFrame(paint);
    };

    const onEnter = () => el.setAttribute("data-torch", "on");
    const onLeave = () => el.removeAttribute("data-torch");

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return ref;
}

/**
 * The trace ruled across the foot of the hero. One cardiac complex on an
 * otherwise flat baseline — the hairline that closes the section and the
 * monitor line are the same line, which is the whole point of it.
 *
 * `pathLength` is normalised to 1000 so the travelling dash below can be
 * expressed in thousandths of the path and stays correct at any width.
 */
const VITALS_PATH =
  "M0 15 H392 Q404 7 416 15 Q428 22 440 15 H470 L481 19 L494 2 L507 27 L517 15 " +
  "H548 Q574 5 600 15 H1200";

export default function NovaHero({
  data,
  name,
  tagline,
  about,
  emergency,
  images,
  place,
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
  const heroRef = useHeroTorch<HTMLElement>();

  /**
   * The location line. An explicit `location_label` wins; otherwise it is
   * composed from the City / State fields an editor has already filled in on
   * the Address tab, so the hero and the footer cannot disagree. Empty when
   * neither exists — the site should not assert a location nobody entered.
   */
  const settings = data?.settings;
  const placeLabel =
    cleanPublicText(place) ||
    cleanPublicText((settings?.location_label as string) || "") ||
    [settings?.city, settings?.state]
      .map((part) => cleanPublicText(String(part ?? "")))
      .filter(Boolean)
      .join(" · ");

  const brand = cleanPublicText(name) || SITE_NAME;
  const brandWords = brand.trim().split(/\s+/).filter(Boolean);
  const headline = cleanPublicText(tagline) || "Care you can trust, close to home.";
  /**
   * The fallback names no district. The previous one said "the people of Siraro
   * District", which is a factual claim about catchment that only an editor can
   * make — and it contradicted the district the header was showing.
   */
  const support =
    cleanPublicText(about) ||
    "Safe, compassionate and high-quality health care for our community.";

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
    <section className="nv-hero" ref={heroRef}>
      {/* Behind the copy, not around it: full-bleed, scrimmed, non-interactive. */}
      {images && images.length > 0 ? (
        <NovaHeroBackdrop images={images} />
      ) : null}

      {/* Light over the photographs: drifting rails, a warm pool that breathes,
          a slow halo turning behind the headline and one specular sweep. All
          CSS, all additive, none of it interactive — and all of it present even
          with no photographs, which is what keeps an image-less hero from going
          flat. */}
      <div className="nv-hero__aura" aria-hidden>
        <span className="nv-hero__rails" />
        <span className="nv-hero__pool" />
        <span className="nv-hero__halo" />
        <span className="nv-hero__sweep" />
      </div>

      {/* The pointer's own light, on its own layer above the aura so it can be
          moved by transform alone. Hidden entirely on touch — see useHeroTorch. */}
      <div className="nv-hero__torch" aria-hidden />

      {/* Two corner brackets ruled into the top of the hero. Architectural
          rather than decorative: they give the full-bleed photograph an edge to
          be framed by, and they are the reason the band reads as a plate and
          not as a background image. */}
      <div className="nv-hero__frame" aria-hidden />

      <div className="nv-shell nv-shell--wide">
        <div className="nv-hero__grid">
          <div className="nv-hero__copy">
            {/* Where the hospital is, from Admin → Settings. This used to
                default to the literal "Siraro District · Ethiopia" and was
                never passed a value, so the site stated a location no editor
                could change — and one the header contradicted. It renders only
                when the setting is filled in. */}
            {placeLabel ? (
              <p className="nv-hero__place">
                <i aria-hidden />
                {/* The label needs an element of its own. As a bare text node it
                    became an anonymous flex item, which cannot be given
                    min-width, so on a phone it stayed on one 447px line inside
                    a 196px pill and was cut off mid-word. */}
                <span className="nv-hero__place-text">{placeLabel}</span>
              </p>
            ) : null}

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
                className="nv-btn nv-btn--primary nv-btn--lg nv-hero__go"
              >
                Explore our care
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              {emergency ? (
                <a
                  href={`tel:${emergency}`}
                  className="nv-btn nv-btn--glass nv-btn--lg nv-hero__dial"
                >
                  <Phone className="h-4 w-4" />
                  {emergency}
                </a>
              ) : (
                <Link
                  href="/emergency"
                  className="nv-btn nv-btn--glass nv-btn--lg nv-hero__dial"
                >
                  <Siren className="h-4 w-4" />
                  Emergency
                </Link>
              )}

              <Link href="/doctors" className="nv-btn nv-btn--ghost nv-hero__aside">
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

          {/* Service reel: the list is rendered twice so the -50% loop is
              seamless. Below the two-column breakpoint the same markup becomes a
              swipeable horizontal rail — see nova-hero.css — because eleven
              stacked cards is not a hero on a phone, it is a page. */}
          <div className="nv-reel">
            <div className="nv-reel__lead" aria-hidden>
              <span className="nv-reel__lead-k">Departments &amp; services</span>
              <span className="nv-reel__lead-hint">
                Swipe
                <i />
              </span>
            </div>

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
            to announce or to click. The closing hairline is drawn as a cardiac
            trace, with one bright segment travelling along it — the rule that
            ends the section and the monitor line are the same line. */}
        <div className="nv-hero__cue" aria-hidden>
          <svg
            className="nv-hero__vitals"
            viewBox="0 0 1200 30"
            preserveAspectRatio="none"
            focusable="false"
          >
            <path
              className="nv-hero__vitals-base"
              d={VITALS_PATH}
              pathLength={1000}
            />
            <path
              className="nv-hero__vitals-run"
              d={VITALS_PATH}
              pathLength={1000}
            />
          </svg>

          <div className="nv-hero__cue-row">
            <span>Scroll</span>
            <span className="nv-hero__cue-rail">
              <i />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
