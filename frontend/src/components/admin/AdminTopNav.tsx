"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/api";
import { clearToken, setStoredUser } from "@/lib/auth";
import { resolveMediaUrl, shouldBypassImageOptimizer } from "@/lib/media";
import {
  useGetAdminSettingsQuery,
  useGetDashboardQuery,
  useGetMeQuery,
  useLogoutMutation,
} from "@/store/adminApi";
import { useStoredUser } from "@/hooks/useClientAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/permissions";
import {
  ADMIN_NAV_GROUPS,
  getAdminPageMeta,
} from "@/components/admin/AdminSidebar";
import AdminNotifications from "@/components/admin/AdminNotifications";

export default function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const stored = useStoredUser();
  const { data: me } = useGetMeQuery();
  const user = me ?? stored;
  const [logout] = useLogoutMutation();
  const { can } = useAdminAccess();
  const { data: dashboard } = useGetDashboardQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnFocus: true,
  });
  const { data: settings } = useGetAdminSettingsQuery();
  const unreadContacts = Number(dashboard?.counts?.new_contacts ?? 0);
  const meta = getAdminPageMeta(pathname);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const logoUrl =
    resolveMediaUrl(settings?.logo_url as string) ||
    resolveMediaUrl(settings?.logo as string | null) ||
    undefined;
  const brandName =
    (settings?.site_name as string) ||
    (settings?.name as string) ||
    SITE_NAME;
  const avatarUrl = resolveMediaUrl(user?.avatar || undefined);

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

  useEffect(() => {
    if (me) setStoredUser(me);
  }, [me]);

  useEffect(() => {
    setDrawerOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleLogout() {
    try {
      await logout().unwrap();
    } catch {
      clearToken();
    }
    toast.success("Signed out");
    router.replace("/admin/login");
  }

  return (
    <div className="ld-chrome">
      <header className="ld-topnav" ref={navRef}>
        <div className="ld-topnav__row">
          <button
            type="button"
            className="ld-topnav__burger"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {drawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link href="/admin" className="ld-topnav__brand">
            <span className="ld-topnav__mark">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={brandName}
                  fill
                  className="object-contain p-0.5"
                  sizes="32px"
                  unoptimized={shouldBypassImageOptimizer(logoUrl)}
                  priority
                />
              ) : (
                <span className="text-[11px] font-bold">GH</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="ld-topnav__eyebrow">Ledger atelier</span>
              <span className="ld-topnav__title block">{brandName}</span>
            </span>
          </Link>

          <nav className="ld-topnav__menus" aria-label="Admin sections">
            {visibleGroups.map((group) => {
              const groupActive = group.items.some((item) =>
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href)
              );
              const expanded = openMenu === group.label;
              return (
                <div
                  key={group.label}
                  className="ld-menu"
                  onMouseEnter={() => {
                    if (window.matchMedia("(hover: hover)").matches) {
                      setOpenMenu(group.label);
                    }
                  }}
                  onMouseLeave={() => {
                    if (window.matchMedia("(hover: hover)").matches) {
                      setOpenMenu((current) =>
                        current === group.label ? null : current
                      );
                    }
                  }}
                >
                  <button
                    type="button"
                    className={cn(
                      "ld-menu__btn",
                      (expanded || groupActive) && "ld-menu__btn--active"
                    )}
                    aria-expanded={expanded}
                    onClick={() =>
                      setOpenMenu(expanded ? null : group.label)
                    }
                  >
                    {group.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                  {expanded && (
                    <div className="ld-menu__panel">
                      {group.items.map((item) => {
                        const active =
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "ld-menu__link",
                              active && "ld-menu__link--active"
                            )}
                            onClick={() => setOpenMenu(null)}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{item.label}</span>
                            {item.href === "/admin/contact-submissions" &&
                            unreadContacts > 0 ? (
                              <span className="ld-menu__badge">
                                {unreadContacts > 99 ? "99+" : unreadContacts}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="ld-topnav__actions">
            <AdminNotifications />
            <Link
              href="/admin/profile"
              className="ld-topnav__iconbtn ld-topnav__profile"
              aria-label="Profile"
              title={user?.name || "Profile"}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user?.name || "Profile"}
                  fill
                  className="object-cover"
                  sizes="38px"
                  unoptimized={shouldBypassImageOptimizer(avatarUrl)}
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Link>
            <button
              type="button"
              className="ld-topnav__logout"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="ld-drawer lg:hidden">
          {visibleGroups.map((group) => (
            <div key={group.label} className="ld-drawer__group">
              <p className="ld-drawer__label">{group.label}</p>
              {group.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "ld-drawer__link",
                      active && "ld-drawer__link--active"
                    )}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.href === "/admin/contact-submissions" &&
                    unreadContacts > 0 ? (
                      <span className="ld-menu__badge">
                        {unreadContacts > 99 ? "99+" : unreadContacts}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="ld-subbar">
        <div className="min-w-0">
          <p className="ld-subbar__path">
            {meta.group} / {meta.label}
          </p>
          <h1 className="ld-subbar__title truncate">{meta.label}</h1>
        </div>
        <Link
          href="/"
          target="_blank"
          className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--ld-ink)] underline underline-offset-2"
        >
          Public site
        </Link>
      </div>
    </div>
  );
}
