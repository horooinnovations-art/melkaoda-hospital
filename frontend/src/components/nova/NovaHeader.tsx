"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Download,
  GraduationCap,
  Handshake,
  HeartPulse,
  History,
  Images,
  Mail,
  MapPin,
  Menu,
  MessageSquareHeart,
  Newspaper,
  Phone,
  Shield,
  Siren,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import SmartImage from "@/components/shared/SmartImage";

/**
 * Site header — a flush, full-width command bar.
 *
 * Deliberately not the header it replaces. That one floated as a rounded pill
 * under a contact strip, slid a highlight puck between rail items, and opened a
 * separate floating mega card per menu. This one is a single edge-to-edge bar
 * with a sliding underline marker and ONE full-bleed sheet shared by every
 * menu, so moving between top-level items swaps the sheet's contents in place.
 * Small screens get a right-hand slide-in panel instead of a top drawer.
 *
 * Motion is plain CSS (see nova-nav.css) — the header no longer depends on
 * framer-motion. The only JS-driven behaviour is open/close state, hover intent
 * so a diagonal trip from a menu button into the sheet does not dismiss it, and
 * the scrolled flag that turns the bar opaque.
 */

type Icon = ComponentType<{ className?: string }>;

type NavLink = {
  href: string;
  label: string;
  hint: string;
  icon: Icon;
};

type NavGroup = {
  label: string;
  /** Set for a plain destination; such items never open the sheet. */
  href?: string;
  /** Sheet intro copy, shown in the left column. */
  blurb?: string;
  allHref?: string;
  allLabel?: string;
  links?: NavLink[];
};

const NAV: NavGroup[] = [
  { label: "Home", href: "/" },
  {
    label: "Hospital",
    blurb:
      "Who we are, the people who lead the work, and the record behind it.",
    allHref: "/about",
    allLabel: "About the hospital",
    links: [
      { href: "/about", label: "About", hint: "Mission and mandate", icon: Building2 },
      { href: "/leadership", label: "Leadership", hint: "People guiding care", icon: Users },
      { href: "/leadership/history", label: "History", hint: "How we got here", icon: History },
      { href: "/partnerships", label: "Partnerships", hint: "Who we work with", icon: Handshake },
      { href: "/testimonials", label: "Patient stories", hint: "In their words", icon: MessageSquareHeart },
      { href: "/gallery", label: "Gallery", hint: "Moments on campus", icon: Images },
      { href: "/faqs", label: "FAQs", hint: "Quick answers", icon: CircleHelp },
    ],
  },
  {
    label: "Care",
    blurb:
      "Every clinical service, department and specialist, in one place.",
    allHref: "/services",
    allLabel: "All services",
    links: [
      { href: "/departments", label: "Departments", hint: "Clinical teams", icon: Activity },
      { href: "/services", label: "Services", hint: "What we treat", icon: ClipboardList },
      { href: "/doctors", label: "Doctors", hint: "Find a specialist", icon: Stethoscope },
      { href: "/emergency", label: "Emergency", hint: "Urgent help, 24/7", icon: Siren },
      { href: "/insurance", label: "Insurance", hint: "Coverage and billing", icon: Shield },
      { href: "/health-education", label: "Health education", hint: "Learn and prevent", icon: GraduationCap },
    ],
  },
  {
    label: "Updates",
    blurb: "News, notices and events from across the campus.",
    allHref: "/news",
    allLabel: "Latest news",
    links: [
      { href: "/news", label: "News", hint: "Recent stories", icon: Newspaper },
      { href: "/announcements", label: "Announcements", hint: "Hospital notices", icon: ClipboardList },
      { href: "/events", label: "Events", hint: "What is coming up", icon: CalendarDays },
      { href: "/careers", label: "Careers", hint: "Join the team", icon: Briefcase },
    ],
  },
  {
    label: "Visit",
    blurb:
      "Plan a visit — visiting hours, what to bring, and the forms you may need before you arrive.",
    allHref: "/patient-guide",
    allLabel: "Read the patient guide",
    links: [
      { href: "/patient-guide", label: "Patient guide", hint: "Plan your visit", icon: ClipboardCheck },
      { href: "/downloads", label: "Downloads", hint: "Forms and resources", icon: Download },
      { href: "/contact", label: "Contact", hint: "Reach the front desk", icon: Phone },
    ],
  },
  { label: "Contact", href: "/contact" },
];

/** Grace period before a menu closes, so diagonal pointer travel survives. */
const CLOSE_DELAY = 160;
/** Must outlast the panel's own transform transition in nova-nav.css. */
const PANEL_EXIT = 420;

/**
 * `initialLogo` / `initialName` come from the server, where layout.tsx has
 * already fetched settings. Without them the first paint had no logo at all —
 * the settings query is client-side, so the header rendered its generic icon and
 * only swapped in the hospital's mark after hydration. That flash is what made
 * the logo look like it was never fetched.
 */
export default function NovaHeader({
  initialLogo,
  initialName,
}: {
  initialLogo?: string | null;
  initialName?: string | null;
} = {}) {
  const pathname = usePathname();
  const { data: settings } = useGetSettingsQuery();

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [solid, setSolid] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Two-phase mount so the slide-in transition has a frame to start from.
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelShown, setPanelShown] = useState(false);
  const [section, setSection] = useState<string | null>(null);

  const closeTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Server value first so the mark is in the HTML, then the query supersedes it
  // once it lands (an admin can change the logo without a redeploy).
  const name = (settings?.site_name as string) || initialName || SITE_NAME;
  const tagline = ((settings?.tagline as string) || "").trim();
  const logo =
    resolveMediaUrl((settings?.logo_url as string) || initialLogo || "") ||
    undefined;
  const emergency =
    (settings?.emergency_phone as string) || (settings?.phone as string);
  const phone = settings?.phone as string | undefined;
  const email = settings?.email as string | undefined;
  const address = settings?.address as string | undefined;

  useEffect(() => setMounted(true), []);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    },
    []
  );

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(
      () => setOpenKey(null),
      CLOSE_DELAY
    );
  }, [cancelClose]);

  const closePanel = useCallback(() => {
    setPanelShown(false);
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      setPanelMounted(false);
      setSection(null);
    }, PANEL_EXIT);
  }, []);

  const openPanel = useCallback(() => {
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    setPanelMounted(true);
    requestAnimationFrame(() => setPanelShown(true));
  }, []);

  // Any navigation dismisses whatever is open.
  useEffect(() => {
    setOpenKey(null);
    setPanelShown(false);
    setPanelMounted(false);
    setSection(null);
  }, [pathname]);

  useEffect(() => {
    if (!panelMounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [panelMounted]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setSolid(window.scrollY > 6);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Crossing into desktop layout leaves the panel stranded off-canvas.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1100px)");
    const onChange = () => {
      if (query.matches) {
        setPanelShown(false);
        setPanelMounted(false);
      }
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!openKey && !panelMounted) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenKey(null);
      if (panelMounted) closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openKey, panelMounted, closePanel]);

  const isActive = useCallback(
    (href: string) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href),
    [pathname]
  );

  const groupActive = useCallback(
    (group: NavGroup) =>
      group.href
        ? isActive(group.href)
        : Boolean(group.links?.some((link) => isActive(link.href))),
    [isActive]
  );

  const openGroup = useMemo(
    () => NAV.find((group) => group.label === openKey && group.links) ?? null,
    [openKey]
  );

  // The sheet keeps the last section it showed so closing fades out real
  // content instead of collapsing to an empty panel.
  const [sheetGroup, setSheetGroup] = useState<NavGroup | null>(null);
  useEffect(() => {
    if (openGroup) setSheetGroup(openGroup);
  }, [openGroup]);

  /** ArrowDown from a menu button opens it and lands on the first link. */
  const onTopKeyDown = (event: React.KeyboardEvent, group: NavGroup) => {
    if (event.key !== "ArrowDown" || !group.links) return;
    event.preventDefault();
    setOpenKey(group.label);
    requestAnimationFrame(() => {
      sheetRef.current?.querySelector<HTMLAnchorElement>(".nvh__link")?.focus();
    });
  };

  const brand = (
    <Link href="/" className="nvh__brand" onMouseEnter={() => setOpenKey(null)}>
      <span className="nvh__mark">
        {logo ? (
          <SmartImage
            src={logo}
            alt=""
            fill
            unoptimized
            optimizeWidth={96}
            className="object-cover"
            sizes="36px"
            priority
          />
        ) : (
          <HeartPulse aria-hidden />
        )}
      </span>
      <span className="nvh__lockup">
        <span className="nvh__name">{name}</span>
        {/* The tagline from Admin → Settings. This was the literal string
            "Kore District · Oromia", which named a different district from the
            one the hero showed — two contradictory locations on one page, and
            neither editable. Rendered only when set: an empty lockup line is
            better than an invented one. */}
        {tagline ? <span className="nvh__place">{tagline}</span> : null}
      </span>
    </Link>
  );

  const sheet = (
    <div
      className="nvh__sheet"
      id="nvh-sheet"
      ref={sheetRef}
      aria-hidden={openGroup ? undefined : true}
    >
      <div className="nv-shell nv-shell--wide">
        <div className="nvh__sheet-in">
          <div className="nvh__intro">
            <span className="nvh__intro-kicker">{sheetGroup?.label}</span>
            <p className="nvh__intro-title">{sheetGroup?.blurb}</p>
            {sheetGroup?.allHref && (
              <Link href={sheetGroup.allHref} className="nvh__intro-go">
                {sheetGroup.allLabel ?? "View all"}
                <ArrowRight aria-hidden />
              </Link>
            )}
          </div>

          <div className="nvh__grid">
            {sheetGroup?.links?.map((link) => {
              const Glyph = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nvh__link"
                  data-on={isActive(link.href) || undefined}
                >
                  <span className="nvh__ico" aria-hidden>
                    <Glyph />
                  </span>
                  <span className="nvh__l-copy">
                    <span className="nvh__l-label">{link.label}</span>
                    <span className="nvh__l-hint">{link.hint}</span>
                  </span>
                  <ArrowUpRight className="nvh__go" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="nvh__sheet-foot">
          <p>
            <strong>Emergency, maternity and ambulance</strong> teams are on duty
            every hour of every day.
          </p>
          {emergency ? (
            <a href={`tel:${emergency}`} className="nvh__sheet-tel">
              <Siren aria-hidden />
              {emergency}
            </a>
          ) : (
            <Link href="/emergency" className="nvh__sheet-tel">
              <Siren aria-hidden />
              Emergency care
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  const panel =
    mounted &&
    panelMounted &&
    createPortal(
      <AnimatePresence>
        {panelShown && (
          <>
            <motion.button
              key="nvh-scrim"
              type="button"
              className="nvh-scrim"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closePanel}
            />

            <motion.aside
              key="nvh-panel"
              className="nvh-panel nvh-panel--fancy"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation menu"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: "0%", opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="nvh-panel__head flex items-center justify-between px-4 py-3.5 border-b border-slate-200/90 bg-slate-50/80">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-amber-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    Melkaoda
                  </span>
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">
                    Menu & Services
                  </span>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="nvh-panel__x border border-slate-200 bg-white text-slate-700 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 shadow-sm"
                  aria-label="Close menu"
                  onClick={closePanel}
                >
                  <X className="h-4 w-4" aria-hidden />
                </motion.button>
              </div>

              <div className="nvh-panel__body bg-white">
                <motion.div
                  className="space-y-2 py-2 px-1"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05, delayChildren: 0.04 },
                    },
                  }}
                >
                  {NAV.map((group, index) => {
                    const idxStr = String(index + 1).padStart(2, "0");
                    if (group.href) {
                      return (
                        <motion.div
                          key={group.label}
                          variants={{
                            hidden: { opacity: 0, x: 20 },
                            show: {
                              opacity: 1,
                              x: 0,
                              transition: { type: "spring", stiffness: 350, damping: 25 },
                            },
                          }}
                        >
                          <Link
                            href={group.href}
                            className="nvh-row group flex items-center justify-between p-3.5 rounded-xl bg-slate-50/90 hover:bg-amber-50/80 border border-slate-200/80 hover:border-amber-300/80 shadow-sm transition-all duration-200"
                            data-on={isActive(group.href) || undefined}
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/80 shadow-xs">
                                {idxStr}
                              </span>
                              <span className="text-base font-bold text-slate-900 group-hover:text-amber-800">
                                {group.label}
                              </span>
                            </span>
                            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </Link>
                        </motion.div>
                      );
                    }

                    const open = section === group.label;
                    return (
                      <motion.div
                        key={group.label}
                        variants={{
                          hidden: { opacity: 0, x: 20 },
                          show: {
                            opacity: 1,
                            x: 0,
                            transition: { type: "spring", stiffness: 350, damping: 25 },
                          },
                        }}
                        className="nvh-acc rounded-xl bg-slate-50/90 border border-slate-200/80 overflow-hidden transition-all shadow-sm"
                        data-open={open || undefined}
                      >
                        <button
                          type="button"
                          className="nvh-row group flex items-center justify-between w-full p-3.5 text-left hover:bg-amber-50/80 transition-colors"
                          data-on={groupActive(group) || undefined}
                          aria-expanded={open}
                          onClick={() =>
                            setSection((current) =>
                              current === group.label ? null : group.label
                            )
                          }
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/80 shadow-xs">
                              {idxStr}
                            </span>
                            <span className="text-base font-bold text-slate-900 group-hover:text-amber-800">
                              {group.label}
                            </span>
                          </span>
                          <motion.div
                            animate={{ rotate: open ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-amber-600" />
                          </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden bg-amber-50/30 border-t border-slate-200/80"
                            >
                              <ul className="p-2 space-y-1">
                                {group.links?.map((link, childIdx) => {
                                  const Glyph = link.icon;
                                  const isChildActive = isActive(link.href);
                                  return (
                                    <motion.li
                                      key={link.href}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: childIdx * 0.03, duration: 0.2 }}
                                    >
                                      <Link
                                        href={link.href}
                                        className={cn(
                                          "flex items-center justify-between p-2.5 rounded-lg text-sm transition-all",
                                          isChildActive
                                            ? "bg-amber-100 border border-amber-300 text-amber-950 font-bold shadow-xs"
                                            : "text-slate-800 hover:text-amber-900 hover:bg-amber-100/60 font-semibold"
                                        )}
                                      >
                                        <span className="flex items-center gap-2.5">
                                          <span className="p-1.5 rounded-md bg-amber-100 text-amber-700 border border-amber-300/80 shadow-xs">
                                            <Glyph className="h-4 w-4" />
                                          </span>
                                          <span className="flex flex-col">
                                            <span className="font-bold text-slate-900">{link.label}</span>
                                            {link.hint && (
                                              <span className="text-[11px] text-slate-600 font-medium">
                                                {link.hint}
                                              </span>
                                            )}
                                          </span>
                                        </span>
                                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-700" />
                                      </Link>
                                    </motion.li>
                                  );
                                })}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              <div className="nvh-panel__foot border-t border-slate-200/90 bg-slate-50/90 p-4 space-y-3">
                {emergency ? (
                  <a
                    href={`tel:${emergency}`}
                    className="g-btn g-btn--signal g-btn--block flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-bold text-sm shadow-md shadow-red-500/20 hover:scale-[1.01] transition-transform"
                  >
                    <Siren className="h-4 w-4 animate-bounce" />
                    Emergency Hotline ({emergency})
                  </a>
                ) : (
                  <Link
                    href="/emergency"
                    className="g-btn g-btn--signal g-btn--block flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-bold text-sm shadow-md shadow-red-500/20 hover:scale-[1.01] transition-transform"
                  >
                    <Siren className="h-4 w-4 animate-bounce" />
                    Emergency Care 24/7
                  </Link>
                )}

                <Link
                  href="/doctors"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-yellow-300 text-amber-950 font-bold text-sm border border-amber-400/80 shadow-md shadow-amber-400/20 transition-all hover:scale-[1.01]"
                >
                  Find a Doctor
                  <ArrowUpRight className="h-4 w-4 font-bold" />
                </Link>

                <ul className="nvh-panel__meta text-xs text-slate-700 space-y-1.5 pt-2 border-t border-slate-200/80">
                  {address && (
                    <li className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <span className="font-medium text-slate-700">{address}</span>
                    </li>
                  )}
                  {phone && (
                    <li className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <a href={`tel:${phone}`} className="font-semibold text-slate-800 hover:text-amber-700">{phone}</a>
                    </li>
                  )}
                  {email && (
                    <li className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <a href={`mailto:${email}`} className="font-semibold text-slate-800 hover:text-amber-700">{email}</a>
                    </li>
                  )}
                </ul>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
      <header
        className="nvh"
        data-solid={solid || undefined}
        data-open={openGroup ? "" : undefined}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="nvh__bar">
          <div className="nv-shell nv-shell--wide nvh__inner">
            {brand}

            <nav className="nvh__nav" aria-label="Primary">
              {NAV.map((group) => {
                const active = groupActive(group);

                if (group.href) {
                  return (
                    <Link
                      key={group.label}
                      href={group.href}
                      className="nvh__top"
                      data-on={active || undefined}
                      onMouseEnter={() => {
                        cancelClose();
                        setOpenKey(null);
                      }}
                    >
                      {group.label}
                    </Link>
                  );
                }

                const open = openKey === group.label;
                return (
                  <button
                    key={group.label}
                    type="button"
                    className="nvh__top"
                    data-on={active || undefined}
                    data-open={open || undefined}
                    aria-expanded={open}
                    aria-controls="nvh-sheet"
                    onMouseEnter={() => {
                      cancelClose();
                      setOpenKey(group.label);
                    }}
                    onClick={() =>
                      setOpenKey((current) =>
                        current === group.label ? null : group.label
                      )
                    }
                    onKeyDown={(event) => onTopKeyDown(event, group)}
                  >
                    {group.label}
                    <ChevronDown className="nvh__chev" aria-hidden />
                  </button>
                );
              })}
            </nav>

            <div className="nvh__acts">
              <Link href="/doctors" className="nvh__ghost">
                Find a doctor
                <ArrowUpRight aria-hidden />
              </Link>

              {emergency ? (
                <a href={`tel:${emergency}`} className="nvh__sos">
                  <Siren aria-hidden />
                  <span>Emergency</span>
                  <b>{emergency}</b>
                </a>
              ) : (
                <Link href="/emergency" className="nvh__sos">
                  <Siren aria-hidden />
                  <span>Emergency</span>
                </Link>
              )}

              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className={cn("nvh__burger", panelShown && "nvh__burger--open")}
                aria-label={panelShown ? "Close menu" : "Open menu"}
                aria-expanded={panelShown}
                onClick={panelShown ? closePanel : openPanel}
              >
                <div className="g-burger__bars" aria-hidden>
                  <motion.span
                    animate={panelShown ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                    className="g-burger__bar g-burger__bar--top"
                  />
                  <motion.span
                    animate={panelShown ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.15 }}
                    className="g-burger__bar g-burger__bar--mid"
                  />
                  <motion.span
                    animate={panelShown ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                    className="g-burger__bar g-burger__bar--bot"
                  />
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        {sheet}
      </header>

      {panel}
    </>
  );
}
