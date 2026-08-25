"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsAuthenticated } from "@/hooks/useClientAuth";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = useIsAuthenticated();

  useEffect(() => {
    if (authed === false) {
      router.replace("/admin/login");
    }
  }, [authed, router]);

  // Same loading UI on server and first client paint — localStorage is read only after mount.
  if (authed !== true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--hb-accent)] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
