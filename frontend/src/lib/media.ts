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

  /**
   * A storage path on someone else's host is a stale reference. Re-point it.
   *
   * This matched a hand-written list of hostnames — deder, loke, gambo — which
   * covered the sibling projects and missed this site's own former home. The
   * media table still holds rows like
   * `https://melkaoda-hospital-eb7x.onrender.com/storage/leadership/<file>`
   * from the Render deployment, so those URLs were used unchanged: pointing at
   * an app that no longer exists, and blocked by the site's own image policy
   * before they could even fail.
   *
   * Media lives on this deployment's own disk, so any absolute URL whose path
   * is a `/storage/` or `/uploads/` path belongs here whichever host it names —
   * including the web host, which does not serve those paths. Matching on the
   * path rather than the hostname also survives the next rename.
   *
   * Cloudinary returned above; its URLs are not storage paths.
   */
  next = next.replace(
    /^https?:\/\/[^/]+(\/(?:storage|uploads)\/[^\s]*)$/i,
    (_match, path) => `${STORAGE_HOST}${path}`
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

/**
 * Cloudinary fallback, off unless a cloud name is configured.
 *
 * This used to be hard-coded to `dz0zqwhyd` with a `deder-hospital/` folder —
 * another project's account, left behind when this site moved to media on its
 * own cPanel disk. Every image therefore produced THREE requests: the real one,
 * a guess at `deder-hospital/<path>`, and a guess at `<path>`, with the last two
 * guaranteed to 404 because the assets were never in that account.
 *
 * On a page whose records point at uploads that were not migrated, that is
 * dozens of failed round-trips before the browser gives up and draws the
 * placeholder, which is a large part of why listings felt slow. It also sent
 * this hospital's file paths to a third party on every page view.
 *
 * Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to turn the fallback back on, and
 * NEXT_PUBLIC_CLOUDINARY_FOLDER if the assets sit under a folder.
 */
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_FOLDER = (process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "")
  .replace(/^\/+|\/+$/g, "");
const CLOUDINARY_BASE = CLOUDINARY_CLOUD
  ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`
  : "";

/**
 * Storage URL candidates, tried in order until one loads.
 *
 * Normally exactly one: the configured media host. A second is added only when
 * a Cloudinary account is configured, because a candidate that cannot succeed
 * costs a real request and a real wait.
 */
export function storageImageCandidates(source?: string | null): string[] {
  if (!source) return [];
  const primary = resolveMediaUrl(source) ?? source;
  if (!primary) return [];
  const out: string[] = [primary];

  if (!CLOUDINARY_BASE) return out;
  if (/res\.cloudinary\.com/i.test(primary)) return out;

  const prefix = CLOUDINARY_FOLDER ? `${CLOUDINARY_FOLDER}/` : "";
  let cleanPath = "";
  try {
    cleanPath = new URL(primary).pathname.replace(
      /^\/(?:public\/)?(?:storage\/)?/,
      ""
    );
  } catch {
    cleanPath = String(source).replace(/^\/(?:public\/)?(?:storage\/)?/, "");
  }

  if (cleanPath) {
    const candidate = `${CLOUDINARY_BASE}/${prefix}${cleanPath}`;
    if (!out.includes(candidate)) out.push(candidate);
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
