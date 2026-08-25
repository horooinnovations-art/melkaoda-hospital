"use client";

import { usePathname } from "next/navigation";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import AdminShell from "@/components/admin/AdminShell";
import "../admin.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <div className="admin-login">{children}</div>;
  }

  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
