"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Megaphone,
  Images,
  Crown,
  History,
  Calendar,
  MessageSquareQuote,
  HelpCircle,
  BookOpen,
  Building2,
  FolderTree,
  Stethoscope,
  Sparkles,
  HeartPulse,
  Shield,
  Siren,
  Briefcase,
  Users,
  ShieldCheck,
  KeyRound,
  ImageIcon,
  Inbox,
  Settings,
  ScrollText,
  ChevronRight,
  Hexagon,
  ExternalLink,
  X,
  UserRound,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/api";
import { resolveMediaUrl, shouldBypassImageOptimizer } from "@/lib/media";
import { useGetAdminSettingsQuery, useGetDashboardQuery } from "@/store/adminApi";
import { useAdminUi } from "./AdminShell";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText },
      { href: "/admin/news", label: "News", icon: Newspaper },
      { href: "/admin/news-categories", label: "News Categories", icon: FolderTree },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/gallery-categories", label: "Gallery Categories", icon: FolderTree },
      { href: "/admin/leadership", label: "Leadership", icon: Crown },
      { href: "/admin/leadership-history", label: "Leadership History", icon: History },
      { href: "/admin/partnerships", label: "Partnerships", icon: Handshake },
      { href: "/admin/partnership-categories", label: "Partnership Categories", icon: FolderTree },
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/admin/health-education", label: "Health Education", icon: BookOpen },
    ],
  },
  {
    label: "Medical",
    items: [
      { href: "/admin/departments", label: "Departments", icon: Building2 },
      { href: "/admin/department-categories", label: "Categories", icon: FolderTree },
      { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
      { href: "/admin/specializations", label: "Specializations", icon: Sparkles },
      { href: "/admin/services", label: "Services", icon: HeartPulse },
      { href: "/admin/emergency-services", label: "Emergency", icon: Siren },
      { href: "/admin/insurance", label: "Insurance", icon: Shield },
    ],
  },
  {
    label: "Careers",
    items: [{ href: "/admin/careers", label: "Job Openings", icon: Briefcase }],
  },
  {
    label: "System",
    items: [
      { href: "/admin/profile", label: "My Profile", icon: UserRound },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/roles", label: "Roles", icon: ShieldCheck },
      { href: "/admin/permissions", label: "Permissions", icon: KeyRound },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
      { href: "/admin/contact-submissions", label: "Contact Inbox", icon: Inbox },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

export function getAdminPageMeta(pathname: string) {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      const active =
        item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
      if (active) return { ...item, group: group.label };
    }
  }
  return { href: "/admin", label: "Admin", icon: LayoutDashboard, group: "Overview" };
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAdminUi();
  const { can } = useAdminAccess();
  const { data: dashboard } = useGetDashboardQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnFocus: true,
  });
  const { data: settings } = useGetAdminSettingsQuery();
  const unreadContacts = Number(dashboard?.counts?.new_contacts ?? 0);
  const logoUrl =
    resolveMediaUrl(settings?.logo_url as string) ||
    resolveMediaUrl(settings?.logo as string | null) ||
    undefined;
  const brandName =
    (settings?.site_name as string) ||
    (settings?.name as string) ||
    SITE_NAME;

  const visibleGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const permission =
        item.href in ADMIN_ROUTE_PERMISSIONS
          ? ADMIN_ROUTE_PERMISSIONS[item.href]
          : null;
      return can(permission);
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "hb-rail shrink-0",
        sidebarOpen
          ? "translate-x-0"
          : "pointer-events-none -translate-x-full lg:pointer-events-auto lg:translate-x-0"
      )}
    >
      <div className="relative flex h-full flex-col">
        <div className="hb-rail__brand">
          <Link
            href="/admin"
            className="group flex min-w-0 items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="hb-rail__mark shrink-0">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={brandName}
                  fill
                  className="object-contain p-1.5"
                  sizes="44px"
                  unoptimized={shouldBypassImageOptimizer(logoUrl)}
                  priority
                />
              ) : (
                <Hexagon className="relative z-10 h-5 w-5 text-[var(--hb-accent)]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="hb-rail__eyebrow">Admin</p>
              <p className="hb-rail__title truncate">{brandName}</p>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-[var(--hb-muted)] hover:bg-[var(--hb-paper)] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="hb-rail__nav">
          {visibleGroups.map((group) => (
            <div key={group.label} className="hb-nav-group">
              <p className="hb-nav-group__label">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "hb-nav-link",
                          active && "hb-nav-link--active"
                        )}
                      >
                        <span className="hb-nav-ico">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm font-medium">
                          {item.label}
                        </span>
                        {item.href === "/admin/contact-submissions" &&
                        unreadContacts > 0 ? (
                          <span className="hb-nav-badge">
                            {unreadContacts > 99 ? "99+" : unreadContacts}
                          </span>
                        ) : null}
                        {active &&
                          !(
                            item.href === "/admin/contact-submissions" &&
                            unreadContacts > 0
                          ) && (
                            <ChevronRight className="h-3.5 w-3.5 text-[var(--hb-accent)]" />
                          )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hb-rail__foot">
          <Link href="/" target="_blank" className="hb-rail__site">
            View public site
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
