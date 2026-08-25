"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminPermissionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isError, hasPanelAccess, canAccessPath, isSuper } = useAdminAccess();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      clearToken();
      router.replace("/admin/login");
      return;
    }
    if (!hasPanelAccess) {
      clearToken();
      router.replace("/admin/login");
    }
  }, [isLoading, isError, user, hasPanelAccess, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--hb-accent)] border-t-transparent" />
      </div>
    );
  }

  if (!hasPanelAccess) {
    return null;
  }

  const allowed = canAccessPath(pathname);

  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <p className="hb-kicker !text-rose-500">Access denied</p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">
          You don&apos;t have permission
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          {isSuper
            ? "This page could not be authorized."
            : "Your role does not include access to this section. Ask a super admin to update your permissions."}
        </p>
        <Button asChild className="mt-6 rounded-md">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
