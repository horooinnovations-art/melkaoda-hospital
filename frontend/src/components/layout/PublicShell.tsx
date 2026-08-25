"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import ScrollFade from "@/components/motion/ScrollFade";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    const id = "site-canvas-contrast-v2";
    const existing = document.getElementById(id);
    document.getElementById("site-canvas-contrast")?.remove();

    // The admin panel renders its own <main>, so these public-only contrast
    // overrides must never reach it — they would repaint admin headings the
    // same teal as the dark panels they sit on.
    if (isAdmin) {
      existing?.remove();
      return;
    }

    const style = existing ?? document.createElement("style");
    style.id = id;
    style.textContent = `
      main:not(.admin-shell-content) h2 { color: #171717 !important; }
      main:not(.admin-shell-content) .g-hero h2,
      main:not(.admin-shell-content) .g-visit h2 { color: #ffffff !important; }
      footer h3 { color: rgba(255,255,255,0.45) !important; }
    `;
    if (!existing) document.head.appendChild(style);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, [isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <ScrollFade />
      <SiteHeader />
      <main className="relative z-[1] flex-1">
        <div key={pathname} className="v-page-enter">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
