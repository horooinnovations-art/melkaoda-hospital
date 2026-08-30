import type { MediaRef } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1";

export const BACKEND_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, "");

/**
 * Host for relative `/storage/...` paths.
 */
const STORAGE_HOST = (
  process.env.NEXT_PUBLIC_MEDIA_STORAGE_HOST ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  BACKEND_ORIGIN
).replace(/\/$/, "");

function normalizeBrokenUrl(url: string): string {
  let next = url;

  // Absolute Cloudinary URLs are already complete.
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(next)) {
    return next;
  }

  // Rewrite legacy storage domains (deder/loke/gambo/horooinnovations/onrender) to current STORAGE_HOST
  next = next.replace(
    /^https?:\/\/(?:[a-z0-9-]+\.)*(?:deder|loke|gambo)[-a-z0-9]*\.(?:onrender\.com|horooinnovations\.com)\/(storage|uploads)\//gi,
    `${STORAGE_HOST}/$1/`
  );

  // Absolute remote storage — keep host.
  if (
    /^https?:\/\//i.test(next) &&
    !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//i.test(next)
  ) {
    return next;
  }

  // Localhost absolute paths → live storage host.
  next = next.replace(
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/[^/]+\/public\/storage\//i,
    `${STORAGE_HOST}/storage/`
  );
  next = next.replace(
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/storage\//i,
    `${STORAGE_HOST}/storage/`
  );

  // Relative storage / uploads.
  if (next.startsWith("storage/") || next.startsWith("/storage/")) {
    next = `${STORAGE_HOST}/${next.replace(/^\//, "")}`;
  }
  if (next.startsWith("/uploads/") || next.startsWith("uploads/")) {
    next = `${BACKEND_ORIGIN}/${next.replace(/^\//, "")}`;
  }

  return next;
}

export function resolveMediaUrl(
  source?: string | MediaRef | null
): string | undefined {
  if (!source) return undefined;
  const raw = typeof source === "string" ? source : source.url;
  if (!raw) return undefined;
  const url = normalizeBrokenUrl(raw);
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

/** Alias used by admin panel */
export const mediaUrl = resolveMediaUrl;

export function getImageFromItem(
  item: Record<string, unknown>
): string | undefined {
  const featured = item.featured_image as MediaRef | undefined;
  const featuredPath =
    featured && typeof featured === "object"
      ? String((featured as { path?: string }).path || "")
      : "";

  // Prefer absolute Cloudinary paths when present on the media object.
  const featuredPathUrl =
    featuredPath && /^https?:\/\//i.test(featuredPath)
      ? resolveMediaUrl(featuredPath)
      : featuredPath && !featuredPath.includes("/")
        ? undefined
        : featuredPath
          ? resolveMediaUrl(
              featuredPath.startsWith("storage/")
                ? featuredPath
                : `storage/${featuredPath.replace(/^\//, "")}`
            )
          : undefined;

  return (
    resolveMediaUrl(item.image_url as string) ||
    resolveMediaUrl(item.featured_image_url as string) ||
    featuredPathUrl ||
    resolveMediaUrl(item.photo_url as string) ||
    resolveMediaUrl(item.media_url as string) ||
    resolveMediaUrl(item.logo_url as string) ||
    resolveMediaUrl(item.url as string) ||
    resolveMediaUrl(item.file_url as string) ||
    resolveMediaUrl(item.media_file_url as string) ||
    resolveMediaUrl(item.path as string) ||
    resolveMediaUrl(item.media_path as string) ||
    resolveMediaUrl(item.image as string | MediaRef) ||
    resolveMediaUrl(item.featured_image as MediaRef) ||
    resolveMediaUrl(item.photo as MediaRef) ||
    resolveMediaUrl(item.media as MediaRef) ||
    resolveMediaUrl(item.media_file as MediaRef) ||
    resolveMediaUrl(item.file as MediaRef) ||
    resolveMediaUrl(item.logo as MediaRef) ||
    resolveMediaUrl(item.patient_photo as MediaRef)
  );
}

/**
 * Fix `<img src="...">` URLs inside CMS HTML (descriptions, bios, articles).
 * Admin uploads often store localhost or relative paths that break on the public site.
 */
export function rewriteProseHtml(html: string): string {
  if (!html || !/<img\b/i.test(html)) return html;

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    let next = tag.replace(
      /\bsrc=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
      (_match, dbl: string, sgl: string, bare: string) => {
        const raw = (dbl ?? sgl ?? bare ?? "").trim();
        if (!raw) return _match;
        const fixed = optimizeImageUrl(resolveMediaUrl(raw) ?? raw) ?? raw;
        return `src="${fixed}"`;
      }
    );

    if (!/\bloading=/i.test(next)) {
      next = next.replace(/^<img\b/i, "<img loading=\"lazy\"");
    }
    if (!/\bclass=/i.test(next)) {
      next = next.replace(/^<img\b/i, '<img class="prose-hospital__img"');
    }

    return next;
  });
}

/** True when the URL is a CDN / host that responds quickly. */
export function isFastCdnUrl(url?: string | null): boolean {
  if (!url) return false;
  return /res\.cloudinary\.com/i.test(url);
}

const CLOUDINARY_BASE = "https://res.cloudinary.com/dz0zqwhyd/image/upload";

/**
 * Build a list of storage URL candidates. Primary is local/configured API,
 * fallback is Cloudinary CDN where assets are stored.
 */
export function storageImageCandidates(source?: string | null): string[] {
  if (!source) return [];
  const primary = resolveMediaUrl(source) ?? source;
  if (!primary) return [];
  const out: string[] = [primary];

  if (/res\.cloudinary\.com/i.test(primary)) {
    return out;
  }

  try {
    const url = new URL(primary);
    const cleanPath = url.pathname.replace(/^\/(?:public\/)?(?:storage\/)?/, "");
    if (cleanPath) {
      const c1 = `${CLOUDINARY_BASE}/deder-hospital/${cleanPath}`;
      const c2 = `${CLOUDINARY_BASE}/${cleanPath}`;
      if (!out.includes(c1)) out.push(c1);
      if (!out.includes(c2)) out.push(c2);
    }
  } catch {
    const cleanPath = String(source).replace(/^\/(?:public\/)?(?:storage\/)?/, "");
    if (cleanPath) {
      out.push(`${CLOUDINARY_BASE}/deder-hospital/${cleanPath}`);
      out.push(`${CLOUDINARY_BASE}/${cleanPath}`);
    }
  }

  return out;
}

/** Shrink CDN URLs when Next image optimization is bypassed. */
export function optimizeImageUrl(
  source?: string | null,
  width = 1200
): string | undefined {
  if (!source) return undefined;
  try {
    const u = new URL(source);
    if (u.hostname.includes("res.cloudinary.com") && u.pathname.includes("/upload/")) {
      // Avoid stacking transforms on an already-transformed path.
      if (!/\/upload\/[^/]*f_auto/.test(u.pathname)) {
        u.pathname = u.pathname.replace(
          "/upload/",
          `/upload/f_auto,q_auto,c_limit,w_${width}/`
        );
      }
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return source;
}

/**
 * Bypass Next's optimizer for remote hosts. The local `/_next/image` proxy
 * often 500s on Cloudinary/Render from this environment; CDN URL transforms
 * via `optimizeImageUrl` already shrink Cloudinary assets.
 */
export function shouldBypassImageOptimizer(src: string): boolean {
  return Boolean(src);
}
