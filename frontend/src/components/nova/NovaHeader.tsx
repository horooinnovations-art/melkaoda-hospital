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
        <span className="nvh__place">Kore District · Oromia</span>
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
      <>
        <button
          type="button"
          className="nvh-scrim"
          data-show={panelShown || undefined}
          aria-label="Close menu"
          onClick={closePanel}
        />

        <aside
          className="nvh-panel"
          data-show={panelShown || undefined}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="nvh-panel__head">
            <span className="nvh-panel__title">Menu</span>
            <button
              type="button"
              className="nvh-panel__x"
              aria-label="Close menu"
              onClick={closePanel}
            >
              <X aria-hidden />
            </button>
          </div>

          <div className="nvh-panel__body">
            {NAV.map((group) => {
              if (group.href) {
                return (
                  <Link
                    key={group.label}
                    href={group.href}
                    className="nvh-row"
                    data-on={isActive(group.href) || undefined}
                  >
                    {group.label}
                    <ArrowUpRight aria-hidden />
                  </Link>
                );
              }

              const open = section === group.label;
              return (
                <div
                  key={group.label}
                  className="nvh-acc"
                  data-open={open || undefined}
                  style={{ "--n": group.links?.length ?? 0 } as CSSProperties}
                >
                  <button
                    type="button"
                    className="nvh-row"
                    data-on={groupActive(group) || undefined}
                    aria-expanded={open}
                    onClick={() =>
                      setSection((current) =>
                        current === group.label ? null : group.label
                      )
                    }
                  >
                    {group.label}
                    <ChevronDown aria-hidden />
                  </button>

                  <div className="nvh-acc__body">
                    <ul className="nvh-acc__list">
                      {group.links?.map((link) => {
                        const Glyph = link.icon;
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="nvh-sub"
                              data-on={isActive(link.href) || undefined}
                            >
                              <Glyph aria-hidden />
                              {link.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="nvh-panel__foot">
            {emergency ? (
              <a
                href={`tel:${emergency}`}
                className="nv-btn nv-btn--signal nv-btn--block"
              >
                <Siren className="h-4 w-4" />
                Call emergency
              </a>
            ) : (
              <Link
                href="/emergency"
                className="nv-btn nv-btn--signal nv-btn--block"
              >
                <Siren className="h-4 w-4" />
                Emergency care
              </Link>
            )}

            <Link href="/doctors" className="nv-btn nv-btn--glass nv-btn--block">
              Find a doctor
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <ul className="nvh-panel__meta">
              {address && (
                <li>
                  <MapPin aria-hidden />
                  <span>{address}</span>
                </li>
              )}
              {phone && (
                <li>
                  <Phone aria-hidden />
                  <a href={`tel:${phone}`}>{phone}</a>
                </li>
              )}
              {email && (
                <li>
                  <Mail aria-hidden />
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
            </ul>
          </div>
        </aside>
      </>,
      document.body
    );

  return (
    <>
      <header
        className="nvh"
        data-solid={solid || undefined}
        data-open={openGroup ? "" : undefined}
        /* The bar is transparent until it is scrolled or opened, so on the home
           page it spends its first screenful sitting on the hero — which is a
           dark island: charcoal ground, white copy. The header's own ink is the
           page's dark ink, so without this the hospital's name in the lockup is
           near-black on near-black, and the ghost and burger outlines vanish
           with it. Interior pages open on a porcelain masthead and must keep the
           dark ink, which is why this is the route and not the scroll position
           alone. See the token block in nova-nav.css. */
        data-over={pathname === "/" && !solid && !openGroup ? "dark" : undefined}
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

              <button
                type="button"
                className="nvh__burger"
                aria-label="Open menu"
                aria-expanded={panelShown}
                onClick={openPanel}
              >
                <Menu aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {sheet}
      </header>

      {panel}
    </>
  );
}
