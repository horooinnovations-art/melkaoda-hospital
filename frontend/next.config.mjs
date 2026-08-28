const API_PROXY_TARGET = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://gambo-general-hospital.onrender.com/api/v1"
    : "http://127.0.0.1:5000/api/v1")
).replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Enable Next optimizer for Unsplash/Cloudinary. Storage hosts on Render
    // still pass `unoptimized` via SmartImage to avoid cold-start 502s.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "deder-hospital-eb7x.onrender.com" },
      { protocol: "https", hostname: "deder.horooinnovations.com" },
      { protocol: "https", hostname: "loke-general-hospital.onrender.com" },
      { protocol: "https", hostname: "loke-hospital-eb7x.onrender.com" },
      { protocol: "https", hostname: "gambo-general-hospital.onrender.com" },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
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
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/vercel.svg" },
      // Same-origin API proxy — browsers hit /api/v1/* even when Next is on :3001+.
      { source: "/api/v1/:path*", destination: `${API_PROXY_TARGET}/:path*` },
    ];
  },
};

export default nextConfig;
