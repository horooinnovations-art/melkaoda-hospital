import { NextResponse } from "next/server";
import { SERVER_API_BASE } from "@/lib/api";

/**
 * Serves the hospital's own favicon, fetched from the backend.
 *
 * This used to read `public/vercel.svg` off disk — the Next.js starter mark —
 * while the settings endpoint had been returning a real `favicon_url` all along.
 * Routing the icon through here rather than pointing `<link>` tags straight at
 * the Cloudinary URL buys three things: `/favicon.ico` can rewrite to it (a
 * browser asks for that path whether or not the document says to), the upstream
 * host stays out of the markup, and the icon can be cached at our own edge on a
 * schedule that suits an icon rather than an API response.
 */
export const dynamic = "force-dynamic";

const FALLBACK = "/vercel.svg";

async function resolveIconUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${SERVER_API_BASE.replace(/\/$/, "")}/public/settings`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const s = (json?.data ?? json ?? {}) as Record<string, unknown>;
    // favicon first, then the logo: a tenant that uploaded only a logo still
    // gets its own mark in the tab rather than someone else's.
    const url = (s.favicon_url as string) || (s.logo_url as string) || "";
    return url && /^https?:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const iconUrl = await resolveIconUrl();

  if (!iconUrl) {
    // Nothing configured upstream — hand back the local placeholder rather than
    // a 404, which some browsers cache far more aggressively than an image.
    return NextResponse.redirect(new URL(FALLBACK, request.url), 302);
  }

  try {
    const upstream = await fetch(iconUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(new URL(FALLBACK, request.url), 302);
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/png",
        // Short public cache with a long revalidate window: the tab icon should
        // pick up an admin change within minutes, not on the next deploy.
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.redirect(new URL(FALLBACK, request.url), 302);
  }
}
