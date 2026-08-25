import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import StoreProvider from "@/components/providers/StoreProvider";
import PublicShell from "@/components/layout/PublicShell";
import FaviconLinks from "@/components/layout/FaviconLinks";
import DynamicFavicon from "@/components/layout/DynamicFavicon";
import { API_BASE, SITE_NAME, DEFAULT_TAGLINE } from "@/lib/api";
import "./globals.css";
import "./atlas.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
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
    icons: {
      icon: [{ url: "/vercel.svg", type: "image/svg+xml" }],
      shortcut: [{ url: "/vercel.svg" }],
      apple: [{ url: "/vercel.svg" }],
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
      className={sourceSans.variable}
      style={
        {
          ["--font-syne" as string]: "var(--font-source)",
          ["--font-literata" as string]: "var(--font-source)",
          ["--font-figtree" as string]: "var(--font-source)",
        } as CSSProperties
      }
    >
      <head>
        <FaviconLinks />
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
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <NextTopLoader
          color="#0369a1"
          height={2}
          showSpinner={false}
          shadow={false}
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
