"use client";

import { createContext, useContext, useEffect, useState } from "react";
import AdminTopNav from "./AdminTopNav";
import AdminPermissionGate from "./AdminPermissionGate";

/** Kept for older imports that expected a sidebar drawer API. */
const AdminUiContext = createContext<{
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
} | null>(null);

export function useAdminUi() {
  const ctx = useContext(AdminUiContext);
  if (!ctx) throw new Error("useAdminUi must be used within AdminShell");
  return ctx;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouch = body.style.touchAction;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "pan-y";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouch;
    };
  }, []);

  return (
    <AdminUiContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="admin-shell">
        <AdminTopNav />
        <main className="admin-shell-content min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 sm:px-5 lg:px-7 lg:py-6">
          <div className="ld-page mx-auto w-full min-w-0 max-w-full">
            <AdminPermissionGate>{children}</AdminPermissionGate>
          </div>
        </main>
        <footer className="ld-footer">
          Powered by:{" "}
          <a
            href="https://horooinnovations.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Horoo Innovations
          </a>
        </footer>
      </div>
    </AdminUiContext.Provider>
  );
}
