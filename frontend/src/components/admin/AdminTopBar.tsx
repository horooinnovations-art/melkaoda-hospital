"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearToken, setStoredUser } from "@/lib/auth";
import { resolveMediaUrl, shouldBypassImageOptimizer } from "@/lib/media";
import { useGetMeQuery, useLogoutMutation } from "@/store/adminApi";
import { useStoredUser } from "@/hooks/useClientAuth";
import { useAdminUi } from "./AdminShell";
import { getAdminPageMeta } from "./AdminSidebar";
import AdminNotifications from "./AdminNotifications";

export default function AdminTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const stored = useStoredUser();
  const { data: me } = useGetMeQuery();
  const user = me ?? stored;
  const [logout] = useLogoutMutation();
  const { setSidebarOpen } = useAdminUi();
  const meta = getAdminPageMeta(pathname);
  const Icon = meta.icon;
  const avatarUrl = resolveMediaUrl(user?.avatar || undefined);

  useEffect(() => {
    if (me) setStoredUser(me);
  }, [me]);

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
    <header className="hb-bar">
      <div className="hb-bar__inner">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className="hb-bar__menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <p className="hb-bar__kicker">{meta.group}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="hb-bar__icon">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <h1 className="hb-bar__title truncate">{meta.label}</h1>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <AdminNotifications />
          <Link href="/admin/profile" className="hb-user" title="Edit profile">
            <div className="hb-avatar">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user?.name || "Admin"}
                  fill
                  className="object-cover"
                  sizes="36px"
                  unoptimized={shouldBypassImageOptimizer(avatarUrl)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  {(user?.name || "A").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="pr-1 text-left">
              <p className="text-sm font-semibold leading-tight text-[var(--hb-ink)]">
                {user?.name || "Admin"}
              </p>
              <p className="max-w-[10rem] truncate text-[11px] text-[var(--hb-muted)]">
                {user?.email}
              </p>
            </div>
          </Link>
          <Link
            href="/admin/profile"
            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[var(--hb-line)] bg-white sm:hidden"
            aria-label="Edit profile"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user?.name || "Admin"}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized={shouldBypassImageOptimizer(avatarUrl)}
              />
            ) : (
              <User className="h-4 w-4 text-[var(--hb-accent)]" />
            )}
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="rounded-md border-[var(--hb-line)]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
