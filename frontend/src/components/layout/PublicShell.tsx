"use client";

import { usePathname } from "next/navigation";
import NovaHeader from "@/components/nova/NovaHeader";
import NovaFooter from "@/components/nova/NovaFooter";
import NovaAtmosphere from "@/components/nova/NovaAtmosphere";
import ScrollFade from "@/components/motion/ScrollFade";

export default function PublicShell({
  children,
  initialLogo,
  initialName,
}: {
  children: React.ReactNode;
  /** Server-fetched so the header's mark is present on first paint. */
  initialLogo?: string | null;
  initialName?: string | null;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  // The admin panel renders its own chrome and canvas.
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <ScrollFade />
      <NovaAtmosphere />

      <NovaHeader initialLogo={initialLogo} initialName={initialName} />
      <main className="g-public-main nv-main relative z-[1] flex-1">
        <div key={pathname} className="nv-page">
          {children}
        </div>
      </main>
      <NovaFooter />
    </>
  );
}
