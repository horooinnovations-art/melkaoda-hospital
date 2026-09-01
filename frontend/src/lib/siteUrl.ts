/**
 * The site's own absolute base URL, for robots.txt, sitemap.xml and canonical
 * tags.
 *
 * Both generators previously read `process.env.NEXT_PUBLIC_SITE_URL` directly
 * and fell back to `http://localhost:3000`. That variable was never set in the
 * deployment, so the live robots.txt pointed crawlers at localhost and every
 * sitemap entry resolved to localhost — the public site was effectively
 * unindexable (MEL-CFG-001).
 *
 * `NEXT_PUBLIC_*` values are also inlined at build time, so setting one after
 * the fact does nothing until the next rebuild. `SITE_URL` is read at request
 * time on the server, which is where robots.ts and sitemap.ts actually run, so
 * it can be corrected without a rebuild. Order of preference:
 *
 *   1. SITE_URL             — server-only, runtime, no rebuild needed
 *   2. NEXT_PUBLIC_SITE_URL — build-time, also available to client code
 *   3. RENDER_EXTERNAL_URL  — injected automatically by Render
 *   4. localhost            — development
 */
const DEV_FALLBACK = "http://localhost:3000";

export function getSiteUrl(): string {
  const candidate =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    DEV_FALLBACK;

  // Trailing slashes produce "https://host//sitemap.xml".
  return candidate.replace(/\/+$/, "");
}

/**
 * True when the resolved base URL is still the development fallback. Callers use
 * this to avoid publishing localhost URLs to crawlers.
 */
export function isSiteUrlConfigured(): boolean {
  return getSiteUrl() !== DEV_FALLBACK;
}
