const API_PROXY_TARGET = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1"
).replace(/\/$/, "");

const isDev = process.env.NODE_ENV === "development";

/** Scheme + host of the API, without the /api/v1 path. */
const API_ORIGIN = API_PROXY_TARGET.replace(/\/api\/v1$/, "");

/**
 * Security headers for the HTML surface.
 *
 * The Express API is covered by helmet, but helmet only guards JSON responses —
 * the documents, the admin panel and the session token in localStorage all live
 * on this server, which previously sent no security headers at all
 * (MEL-SEC-006).
 *
 * CSP notes: Next injects inline bootstrap scripts and styled-jsx style tags, so
 * 'unsafe-inline' is required for style-src, and script-src needs
 * 'unsafe-inline' too until every inline script carries a nonce. Framing is
 * denied outright — nothing here is meant to be embedded, and /admin/login was
 * clickjackable without it.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next's hydration bootstrap is inline; eval is needed by the dev overlay only.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Cloudinary and the media host serve images; data:/blob: cover previews.
  // The API origin serves legacy /storage assets and must be listed, or those
  // images are silently blocked in production; the localhost entries are
  // development-only and no longer leak into the deployed policy.
  // Map tiles are images. The tile layer serves CARTO's Voyager basemap, so
  // that host must be listed or every tile is blocked and the map renders as an
  // empty grey pane with only the attribution showing. OpenStreetMap's own
  // hosts stay listed because they are the fallback tile source.
  `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com ${API_ORIGIN}${isDev ? " http://127.0.0.1:5000 http://localhost:5000" : ""}`,
  // The map falls back to a Google Maps embed when the hospital has an address
  // but no coordinates. Without this the fallback inherits default-src 'self'
  // and the browser replaces it with "This content is blocked", which is worse
  // than no map at all. Framing OUT is still denied by frame-ancestors above;
  // this only permits framing that one host IN.
  "frame-src https://www.google.com https://maps.google.com",
  // Same-origin API via the rewrite below, plus the API host directly.
  `connect-src 'self' ${API_PROXY_TARGET.replace(/\/api\/v1$/, "")}${isDev ? " ws: http://127.0.0.1:5000 http://localhost:5000" : ""}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS only makes sense once TLS is terminated in front of this server.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not advertise the framework and version.
  poweredByHeader: false,
  /**
   * Self-contained server bundle: `.next/standalone/server.js` plus only the
   * node_modules the app actually imports.
   *
   * cPanel runs Node apps under Phusion Passenger, which boots a startup file
   * directly — there is no `npm start`, and no way to run the Next CLI. The
   * standalone server is a plain Node entry point, which is exactly what
   * Passenger needs. See docs/CPANEL-DEPLOYMENT.md.
   */
  output: "standalone",
  /**
   * Without this, a package-lock.json in a sibling project folder makes Next
   * infer the wrong workspace root and nest the standalone build several
   * directories deep, breaking the upload layout.
   */
  outputFileTracingRoot: import.meta.dirname,
  // `npm run dev` uses turbopack and `npm run build` uses webpack; the two write
  // incompatible artifacts into the same directory and neither prunes the
  // other's, which is what makes `next start` 500 on every SSR route after a dev
  // session. Building into a separate tree keeps a verification build clean
  // without touching the dev server's own `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // This deployment's own hosts. Sibling-project hostnames (Deder, Gambo,
      // Loke, and the old Render app) are deliberately not listed: media now
      // lives on this account's own disk.
      { protocol: "https", hostname: "melkaoda.horooinnovations.com" },
      { protocol: "https", hostname: "melkaodaapi.horooinnovations.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=3600",
          },
        ],
      },
      {
        source: "/api/favicon",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=3600",
          },
        ],
      },
      // Never immutable-cache assets in local dev — it freezes old JS/CSS in the browser.
      ...(!isDev
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : [
            {
              source: "/_next/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "no-store, must-revalidate",
                },
              ],
            },
          ]),
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      // The admin panel is never cached and never indexed.
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // A browser requests /favicon.ico whether or not the document asks it to,
      // so it resolves to the hospital's own mark rather than the starter logo.
      { source: "/favicon.ico", destination: "/api/favicon" },
      // Same-origin API proxy — browsers hit /api/v1/* even when Next is on :3001+.
      { source: "/api/v1/:path*", destination: `${API_PROXY_TARGET}/:path*` },
    ];
  },
};

export default nextConfig;
