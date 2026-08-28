"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Baby,
  Building2,
  FlaskConical,
  Phone,
  Scissors,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { HomeData } from "@/lib/types";
import { getImageFromItem, resolveMediaUrl } from "@/lib/media";
import { cleanPublicText } from "@/lib/utils";
import SmartImage from "@/components/shared/SmartImage";

const SLIDE_MS = 5800;
const MAX_SLIDES = 6;
const EASE = [0.22, 1, 0.36, 1] as const;

type Slide = { id: number; src: string; title?: string };

const OPEN_LINKS: Array<{
  label: string;
  href: string;
  kind: "route" | "tel";
  icon: LucideIcon;
  tone: "sky" | "teal" | "rose" | "amber" | "ink" | "signal";
}> = [
  {
    label: "Operation Room",
    href: "/departments",
    kind: "route",
    icon: Scissors,
    tone: "sky",
  },
  {
    label: "Outpatient Departments",
    href: "/departments",
    kind: "route",
    icon: Building2,
    tone: "sky",
  },
  {
    label: "Obstetrics & Gynecology",
    href: "/departments",
    kind: "route",
    icon: Baby,
    tone: "sky",
  },
  {
    label: "Emergency Medical Service",
    href: "/emergency",
    kind: "route",
    icon: Siren,
    tone: "signal",
  },
  {
    label: "Laboratory & Pathology",
    href: "/departments",
    kind: "route",
    icon: FlaskConical,
    tone: "sky",
  },
  {
    label: "Emergency line",
    href: "emergency",
    kind: "tel",
    icon: Phone,
    tone: "sky",
  },
];

export default function HomeHero({
  data,
  name,
  tagline,
  about,
  emergency,
}: {
  data?: HomeData;
  name: string;
  tagline: string;
  about: string;
  emergency?: string;
  hours?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dir, setDir] = useState(1);

  const brand = cleanPublicText(name) || "Gambo General Hospital";
  const brandParts = brand.trim().split(/\s+/).filter(Boolean);
  const headline =
    cleanPublicText(tagline) || "Care you can trust, close to home.";
  const support =
    cleanPublicText(about) ||
    "We are committed to providing safe, compassionate and high-quality health care services to the people of Siraro District and surrounding communities.";

  const slides: Slide[] = useMemo(() => {
    const custom = (
      data?.heroImages?.length
        ? data.heroImages.map((item, i) => ({
            id: i,
            src: resolveMediaUrl(item.url),
            title: item.title || item.alt,
          }))
        : data?.gallery?.map((item) => ({
            id: item.id,
            src: getImageFromItem(item as unknown as Record<string, unknown>),
            title: item.title ?? undefined,
          })) ?? []
    )
      .flatMap((s) => (s.src ? [{ id: s.id, src: s.src, title: s.title }] : []))
      .slice(0, MAX_SLIDES);

    if (custom.length > 0) return custom;

    return [
      {
        id: 9001,
        src: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop",
        title: `${brand} Campus`,
      },
      {
        id: 9002,
        src: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=1200&auto=format&fit=crop",
        title: "Medical & Healthcare Facility",
      },
      {
        id: 9003,
        src: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1200&auto=format&fit=crop",
        title: "Clinical Excellence",
      },
    ];
  }, [data, brand]);

  const multi = slides.length > 1;
  const active = slides[index];
  const hasSlides = slides.length > 0;

  const go = useCallback(
    (next: number, direction?: number) => {
      setDir(direction ?? (next > index ? 1 : -1));
      setIndex(next);
    },
    [index]
  );

  const step = useCallback(
    (direction: number) => {
      if (!slides.length) return;
      setDir(direction);
      setIndex((i) => (i + direction + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (!multi || reduceMotion || paused) return;
    const id = setInterval(() => step(1), SLIDE_MS);
    return () => clearInterval(id);
  }, [multi, reduceMotion, paused, step]);

  const variants = {
    enter: (d: number) =>
      reduceMotion ? { opacity: 0 } : { opacity: 0, x: d > 0 ? "12%" : "-12%" },
    center: { opacity: 1, x: "0%" },
    exit: (d: number) =>
      reduceMotion ? { opacity: 0 } : { opacity: 0, x: d > 0 ? "-8%" : "8%" },
  };

  return (
    <section
      className="sgate -mx-[calc((100vw-100%)/2)] w-screen"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Old atmosphere removed — replaced by TronGrid component */}

      <div className="sgate__shell">
        {/* Text plane */}
        <div className="sgate__copy">


          <motion.p
            className="sgate__place"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Siraro District · Ethiopia
          </motion.p>

          <h1 className="sgate__brand" aria-label={brand}>
            <span className="sr-only">{brand}</span>
            <span aria-hidden className="sgate__brand-stack">
              {brandParts.map((word, i) => {
                const isLast = i === brandParts.length - 1;
                const isFirst = i === 0;
                return (
                  <motion.span
                    key={`${word}-${i}`}
                    className={[
                      "sgate__brand-word",
                      isFirst ? "sgate__brand-word--lead" : "",
                      isLast ? "sgate__brand-word--accent" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.7,
                      delay: 0.06 + i * 0.08,
                      ease: EASE,
                    }}
                  >
                    {word}
                  </motion.span>
                );
              })}
            </span>
          </h1>

          <motion.div
            className="sgate__prose"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.32, ease: EASE }}
          >
            <p className="sgate__headline">{headline}</p>
            <p className="sgate__lede">
              {(() => {
                const parts = support
                  .split(/(?<=[.!?])\s+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (parts.length < 2) return support;
                return (
                  <>
                    <span className="sgate__lede-lead">{parts[0]}</span>{" "}
                    <span className="sgate__lede-rest">
                      {parts.slice(1).join(" ")}
                    </span>
                  </>
                );
              })()}
            </p>
          </motion.div>

          <motion.div
            className="sgate__actions"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.52, ease: EASE }}
          >
            <Link href="/departments" className="sgate__cta">
              Explore care
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
            </Link>
            <Link href="/doctors" className="sgate__link">
              Meet our doctors
            </Link>
          </motion.div>
        </div>

        {/* Compact gallery + open-services box */}
        <motion.div
          className="sgate__media"
          initial={reduceMotion ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, delay: 0.18, ease: EASE }}
        >
          <div className="sgate__media-split">
            <div className="sgate__stage">
              <div className="sgate__viewport">
                {hasSlides ? (
                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                      key={active?.id ?? index}
                      className="sgate__slide"
                      custom={dir}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.65, ease: EASE }}
                    >
                      <SmartImage
                        src={active!.src}
                        alt={active?.title || `${brand} gallery`}
                        fill
                        priority={index === 0}
                        optimizeWidth={1200}
                        className="object-cover sgate__photo"
                        sizes="(max-width: 900px) 100vw, 34vw"
                      />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="sgate__fallback" aria-hidden />
                )}

                <div className="sgate__shade" aria-hidden />

                <div className="sgate__dock">
                  <div className="sgate__caption">
                    <span className="sgate__caption-label">Gallery</span>
                    <span className="sgate__caption-title">
                      {active?.title || "Inside the hospital"}
                    </span>
                  </div>

                  {multi && (
                    <div className="sgate__controls">
                      <button
                        type="button"
                        className="sgate__nav"
                        aria-label="Previous image"
                        onClick={() => step(-1)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <span className="sgate__pager">
                        {index + 1}
                        <em> / {slides.length}</em>
                      </span>
                      <button
                        type="button"
                        className="sgate__nav"
                        aria-label="Next image"
                        onClick={() => step(1)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {multi && !reduceMotion && !paused && (
                  <span
                    key={`bar-${index}`}
                    className="sgate__bar"
                    style={{ animationDuration: `${SLIDE_MS}ms` }}
                    aria-hidden
                  />
                )}
              </div>

              {multi && (
                <div
                  className="sgate__thumbs"
                  role="tablist"
                  aria-label="Hero images"
                >
                  {slides.map((slide, i) => (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={slide.title || `Image ${i + 1}`}
                      className={
                        i === index
                          ? "sgate__thumb sgate__thumb--on"
                          : "sgate__thumb"
                      }
                      onClick={() => go(i)}
                    >
                      <SmartImage
                        src={slide.src}
                        alt=""
                        fill
                        optimizeWidth={200}
                        className="object-cover"
                        sizes="88px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <motion.aside
              className="sgate__openbox"
              aria-label="Open services"
              initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.28, ease: EASE }}
            >
              <div className="sgate__openbox-aura" aria-hidden />
              <div className="sgate__openbox-sheen" aria-hidden />
              <div className="sgate__openbox-sparkles" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </div>

              <div className="sgate__openbox-head">
                <span className="sgate__openbox-live" aria-hidden>
                  <span className="sgate__openbox-live-dot" />
                </span>
                <div>
                  <p className="sgate__openbox-kicker">Care desks</p>
                  <h2 className="sgate__openbox-title">Open now</h2>
                </div>
              </div>

              <ul className="sgate__openbox-list">
                {OPEN_LINKS.map((item, i) => {
                  const Icon = item.icon;
                  const href =
                    item.kind === "tel"
                      ? emergency
                        ? `tel:${emergency}`
                        : "/emergency"
                      : item.href;
                  const isTel = item.kind === "tel" && !!emergency;
                  const Tag = isTel ? "a" : Link;
                  return (
                    <motion.li
                      key={item.label}
                      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: 0.34 + i * 0.05,
                        ease: EASE,
                      }}
                    >
                      <Tag
                        href={href}
                        className={`sgate__openbox-link sgate__openbox-link--${item.tone}`}
                      >
                        <span className="sgate__openbox-icon" aria-hidden>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="sgate__openbox-label">{item.label}</span>
                        <span className="sgate__openbox-status">
                          <em>Open</em>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </Tag>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.aside>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
