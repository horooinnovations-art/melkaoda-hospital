import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Serif, Source_Sans_3 } from "next/font/google";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import StoreProvider from "@/components/providers/StoreProvider";
import PublicShell from "@/components/layout/PublicShell";
import FaviconLinks from "@/components/layout/FaviconLinks";
import DynamicFavicon from "@/components/layout/DynamicFavicon";
import { API_BASE, SITE_NAME, DEFAULT_TAGLINE } from "@/lib/api";
import "./globals.css";
import "./atlas.css";
// Nova design system — loaded last so it wins over the legacy sheets above.
import "./nova-core.css";
import "./nova-atmosphere.css";
import "./nova-nav.css";
import "./nova-hero.css";
import "./nova-stack.css";
import "./nova-cards.css";
import "./nova-sections.css";
import "./nova-page.css";
import "./nova-footer.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
});

const novaDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-nv-display",
  display: "swap",
});

const novaSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-nv-serif",
  display: "swap",
});

export const dynamic = "force-dynamic";

async function getSiteSettings() {
  try {
    const response = await fetch(`${API_BASE.replace(/\/$/, "")}/public/settings`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = await response.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = (await getSiteSettings()) || {};
  const title =
    (settings.site_name as string) ||
    (settings.organization_name as string) ||
    (settings.name as string) ||
    SITE_NAME;

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description: (settings.tagline as string) || DEFAULT_TAGLINE,
    // The hospital's own mark. These were pinned to /vercel.svg — the Next.js
    // starter logo — while the settings payload carried a real favicon_url and
    // logo_url all along. `/api/favicon` resolves the same order server-side, so
    // the tab, the bookmark and the home-screen icon agree.
    icons: {
      icon: [{ url: "/api/favicon" }],
      shortcut: [{ url: "/api/favicon" }],
      apple: [{ url: "/api/favicon" }],
    },
  };
}

const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/, "");
const mediaHost =
  process.env.NEXT_PUBLIC_MEDIA_STORAGE_HOST ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  apiOrigin;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${novaDisplay.variable} ${novaSerif.variable}`}
      style={
        {
          ["--font-syne" as string]: "var(--font-nv-display)",
          ["--font-literata" as string]: "var(--font-nv-serif)",
          ["--font-figtree" as string]: "var(--font-source)",
        } as CSSProperties
      }
    >
      <head>
        <FaviconLinks />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&f[]=satoshi@400,500,700,900&display=swap"
        />
        <link rel="dns-prefetch" href={apiOrigin} />
        <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={mediaHost} />
        <link rel="preconnect" href={mediaHost} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="site-canvas flex min-h-screen flex-col antialiased"
        style={{
          backgroundColor: "#f6f4ef",
          color: "#191d26",
        }}
      >
        <NextTopLoader
          color="#96793f"
          height={2}
          showSpinner={false}
          shadow="0 0 10px rgba(150,121,63,0.55)"
        />
        <StoreProvider>
          <DynamicFavicon />
          <PublicShell>{children}</PublicShell>
          <Toaster position="top-right" richColors closeButton />
        </StoreProvider>
      </body>
    </html>
  );
}
