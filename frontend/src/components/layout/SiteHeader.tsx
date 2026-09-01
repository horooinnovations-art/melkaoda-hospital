"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Download,
  HeartPulse,
  History,
  Images,
  Menu,
  MessageSquareHeart,
  Newspaper,
  Phone,
  Shield,
  Stethoscope,
  Users,
  Briefcase,
  Siren,
  GraduationCap,
  Activity,
  X,
  ArrowUpRight,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import SmartImage from "@/components/shared/SmartImage";

interface NavChild {
  href: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavItem {
  label: string;
  href?: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Hospital",
    children: [
      { href: "/about", label: "About", hint: "Who we are", icon: Building2 },
      { href: "/partnerships", label: "Partnerships", hint: "Key collaborators", icon: Handshake },
      { href: "/leadership", label: "Leadership", hint: "People guiding care", icon: Users },
      { href: "/leadership/history", label: "History", hint: "Our journey", icon: History },
      { href: "/testimonials", label: "Stories", hint: "Patient voices", icon: MessageSquareHeart },
      { href: "/gallery", label: "Gallery", hint: "Moments on campus", icon: Images },
      { href: "/faqs", label: "FAQs", hint: "Quick answers", icon: CircleHelp },
    ],
  },
  {
    label: "Care",
    children: [
      { href: "/departments", label: "Departments", hint: "Clinical teams", icon: Activity },
      { href: "/services", label: "Services", hint: "What we offer", icon: ClipboardList },
      { href: "/doctors", label: "Doctors", hint: "Find a specialist", icon: Stethoscope },
      { href: "/emergency", label: "Emergency", hint: "Urgent help", icon: Siren },
      { href: "/insurance", label: "Insurance", hint: "Coverage options", icon: Shield },
      {
        href: "/health-education",
        label: "Health education",
        hint: "Learn & prevent",
        icon: GraduationCap,
      },
      {
        href: "/patient-guide",
        label: "Patient guide",
        hint: "Plan your visit",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: "Updates",
    children: [
      { href: "/news", label: "News", hint: "Latest stories", icon: Newspaper },
      {
        href: "/announcements",
        label: "Announcements",
        hint: "Hospital notices",
        icon: ClipboardList,
      },
      { href: "/events", label: "Events", hint: "What’s coming up", icon: CalendarDays },
      { href: "/careers", label: "Careers", hint: "Join the team", icon: Briefcase },
      {
        href: "/downloads",
        label: "Downloads",
        hint: "Forms & resources",
        icon: Download,
      },
    ],
  },
  { label: "Contact", href: "/contact" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const { data: settings } = useGetSettingsQuery();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const name = (settings?.site_name as string) || SITE_NAME;
  const logo = resolveMediaUrl(settings?.logo_url as string);
  const emergency =
    (settings?.emergency_phone as string) || (settings?.phone as string);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSection(null);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 1100px)").matches) {
        setMobileOpen(false);
        setMobileSection(null);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!openMenu && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMenu, mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const itemActive = (item: NavItem) =>
    item.href
      ? isActive(item.href)
      : Boolean(item.children?.some((c) => isActive(c.href)));

  const topLinks = useMemo(() => NAV, []);

  const mobileMenu =
    mounted &&
    createPortal(
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              key="mobile-scrim"
              type="button"
              aria-label="Close menu"
              className="g-mobile-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="mobile-panel"
              className="g-mobile g-mobile--open g-mobile--fancy"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation menu"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="g-mobile__aura" aria-hidden />
              <div className="g-mobile__sparkles" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </div>

              <nav className="g-mobile__nav mx-auto max-w-xl">
                <div className="g-mobile__header">
                  <div className="g-mobile__intro">
                    <span className="g-mobile__kicker">
                      <span className="g-mobile__kicker-dot" />
                      Melkaoda
                    </span>
                    <h2 className="g-mobile__title">Menu & Services</h2>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="g-mobile__close-btn"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>

                <motion.div
                  className="g-mobile__stack"
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
                  {NAV.map((item, index) => {
                    const idxStr = String(index + 1).padStart(2, "0");
                    if (item.href) {
                      return (
                        <motion.div
                          key={item.label}
                          variants={{
                            hidden: { opacity: 0, y: 15, scale: 0.98 },
                            show: {
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              transition: { type: "spring", stiffness: 350, damping: 24 },
                            },
                          }}
                          className="g-mobile__tile"
                        >
                          <Link
                            href={item.href}
                            className={cn(
                              "g-mobile__link",
                              isActive(item.href) && "g-mobile__link--active"
                            )}
                          >
                            <span className="g-mobile__index">{idxStr}</span>
                            <span className="g-mobile__link-copy">
                              <span className="g-mobile__link-label">
                                {item.label}
                              </span>
                            </span>
                            <span className="g-mobile__link-go" aria-hidden>
                              <ArrowUpRight className="g-mobile__link-arrow" />
                            </span>
                          </Link>
                        </motion.div>
                      );
                    }

                    const open = mobileSection === item.label;
                    return (
                      <motion.div
                        key={item.label}
                        variants={{
                          hidden: { opacity: 0, y: 15, scale: 0.98 },
                          show: {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: { type: "spring", stiffness: 350, damping: 24 },
                          },
                        }}
                        className={cn(
                          "g-mobile__group g-mobile__tile",
                          open && "g-mobile__group--open"
                        )}
                      >
                        <button
                          type="button"
                          className={cn(
                            "g-mobile__link",
                            open && "g-mobile__link--open",
                            itemActive(item) && "g-mobile__link--active"
                          )}
                          aria-expanded={open}
                          onClick={() =>
                            setMobileSection((c) =>
                              c === item.label ? null : item.label
                            )
                          }
                        >
                          <span className="g-mobile__index">{idxStr}</span>
                          <span className="g-mobile__link-copy">
                            <span className="g-mobile__link-label">
                              {item.label}
                            </span>
                            {item.children && (
                              <span className="g-mobile__link-hint">
                                {item.children.length} options
                              </span>
                            )}
                          </span>
                          <span className="g-mobile__link-go" aria-hidden>
                            <motion.div
                              animate={{ rotate: open ? 180 : 0 }}
                              transition={{ duration: 0.25, ease: EASE }}
                            >
                              <ChevronDown className="g-mobile__chev" />
                            </motion.div>
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.ul
                              className="g-mobile__list"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: EASE }}
                            >
                              {item.children?.map((child, childIdx) => {
                                const Icon = child.icon;
                                const isChildActive = isActive(child.href);
                                return (
                                  <motion.li
                                    key={child.href}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                      delay: childIdx * 0.03,
                                      duration: 0.2,
                                    }}
                                  >
                                    <Link
                                      href={child.href}
                                      className={cn(
                                        "g-mobile__child",
                                        isChildActive &&
                                          "g-mobile__child--active"
                                      )}
                                    >
                                      <span className="g-mobile__child-icon">
                                        <Icon className="h-3.5 w-3.5" />
                                      </span>
                                      <span className="g-mobile__child-copy">
                                        <span>{child.label}</span>
                                        {child.hint && (
                                          <span className="g-mobile__child-hint">
                                            {child.hint}
                                          </span>
                                        )}
                                      </span>
                                      <ArrowUpRight className="g-mobile__child-arrow" />
                                    </Link>
                                  </motion.li>
                                );
                              })}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>

                <div className="g-mobile__cta">
                  <p className="g-mobile__cta-kicker">Need immediate assistance?</p>
                  {emergency && (
                    <a
                      href={`tel:${emergency}`}
                      className="g-btn g-btn--signal g-btn--block"
                    >
                      <Phone className="h-4 w-4" />
                      Call emergency ({emergency})
                    </a>
                  )}
                  <Link href="/doctors" className="g-btn g-btn--ink g-btn--block">
                    Find a doctor
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
    <header
      className={cn(
        "g-header",
        scrolled && "g-header--scrolled",
        mobileOpen && "g-header--menu-open"
      )}
    >
      <div className="g-header__glow" aria-hidden />
      <div className="g-header__bar mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="g-brand"
          onMouseEnter={() => setOpenMenu(null)}
        >
          <span className="g-brand__emblem">
            <span className="g-brand__orbit g-brand__orbit--a" aria-hidden />
            <span className="g-brand__orbit g-brand__orbit--b" aria-hidden />
            <span className="g-brand__pulse" aria-hidden />
            <span className="g-brand__mark">
              <span className="g-brand__mark-glow" aria-hidden />
              <span className="g-brand__mark-shine" aria-hidden />
              {logo ? (
                <span className="g-brand__logo">
                  <SmartImage
                    src={logo}
                    alt=""
                    fill
                    unoptimized
                    optimizeWidth={96}
                    className="object-cover"
                    sizes="40px"
                    priority
                  />
                </span>
              ) : (
                <HeartPulse className="g-brand__fallback-icon" aria-hidden />
              )}
            </span>
          </span>
          <span className="g-brand__text">
            <span className="g-brand__name truncate">{name}</span>
            <span className="g-brand__tag">
              <span className="g-brand__tag-dot" aria-hidden />
              Trusted care
            </span>
          </span>
        </Link>

        <nav className="g-nav" onMouseLeave={() => setOpenMenu(null)}>
          <div className="g-nav__rail">
            {topLinks.map((item) => {
              const active = itemActive(item);
              const open = openMenu === item.label;

              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "g-nav__link",
                      active && "g-nav__link--active"
                    )}
                    onMouseEnter={() => setOpenMenu(null)}
                  >
                    <span className="g-nav__link-label">{item.label}</span>
                    {active && <span className="g-nav__ink" aria-hidden />}
                  </Link>
                );
              }

              return (
                <div
                  key={item.label}
                  className="g-nav__item"
                  onMouseEnter={() => setOpenMenu(item.label)}
                >
                  <button
                    type="button"
                    className={cn(
                      "g-nav__link",
                      (active || open) && "g-nav__link--active"
                    )}
                    aria-expanded={open}
                    onClick={() =>
                      setOpenMenu((c) =>
                        c === item.label ? null : item.label
                      )
                    }
                  >
                    <span className="g-nav__link-label">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "g-nav__chev",
                        open && "g-nav__chev--open"
                      )}
                    />
                    {(active || open) && (
                      <span className="g-nav__ink" aria-hidden />
                    )}
                  </button>

                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                        exit={{ opacity: 0, y: 6, scale: 0.98, x: "-50%" }}
                        transition={{ duration: 0.22, ease: EASE }}
                        className="g-nav__panel"
                      >
                        <div className="g-nav__panel-shine" aria-hidden />
                        <p className="g-nav__panel-kicker">{item.label}</p>
                        <ul className="g-nav__list">
                          {item.children?.map((child, i) => {
                            const Icon = child.icon;
                            const childActive = isActive(child.href);
                            return (
                              <motion.li
                                key={child.href}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: 0.04 + i * 0.035,
                                  duration: 0.28,
                                  ease: EASE,
                                }}
                              >
                                <Link
                                  href={child.href}
                                  className={cn(
                                    "g-nav__child",
                                    childActive && "g-nav__child--active"
                                  )}
                                >
                                  <span className="g-nav__child-icon">
                                    <Icon className="h-4 w-4" />
                                  </span>
                                  <span className="g-nav__child-copy">
                                    <span className="g-nav__child-label">
                                      {child.label}
                                    </span>
                                    {child.hint && (
                                      <span className="g-nav__child-hint">
                                        {child.hint}
                                      </span>
                                    )}
                                  </span>
                                  <ArrowUpRight className="g-nav__child-arrow" />
                                </Link>
                              </motion.li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="g-header__actions">
          {emergency && (
            <a
              href={`tel:${emergency}`}
              className="g-btn g-btn--signal g-header__cta g-header__cta--emergency"
            >
              <span className="g-btn__live" aria-hidden>
                <span className="g-btn__pulse" />
              </span>
              Emergency
            </a>
          )}
          <Link
            href="/doctors"
            className="g-btn g-btn--ink g-header__cta g-header__cta--doctor"
          >
            Find a doctor
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </Link>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className={cn("g-burger", mobileOpen && "g-burger--open")}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="g-burger__glow" aria-hidden />
            <span className="g-burger__ring" aria-hidden />
            <div className="g-burger__bars" aria-hidden>
              <motion.span
                animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="g-burger__bar g-burger__bar--top"
              />
              <motion.span
                animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.15 }}
                className="g-burger__bar g-burger__bar--mid"
              />
              <motion.span
                animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="g-burger__bar g-burger__bar--bot"
              />
            </div>
            <span className="g-burger__label">
              {mobileOpen ? "Close" : "Menu"}
            </span>
          </motion.button>
        </div>
      </div>
    </header>
    <div className="g-header-spacer" aria-hidden />
    {mobileMenu}
    </>
  );
}
