/**
 * Favicon <link> tags.
 *
 * They point at `/api/favicon`, which fetches the icon the hospital actually
 * uploaded. Previously all three were hardcoded to `/vercel.svg`, so every
 * tenant shipped with the Next.js starter mark in the browser tab while their
 * own `favicon_url` sat unused in the settings payload.
 *
 * No `type` on the icon link: what comes back depends on what was uploaded (the
 * current tenant's is a JPEG), and declaring the wrong MIME type makes some
 * browsers discard the image.
 */
export default function FaviconLinks() {
  return (
    <>
      <link rel="icon" href="/api/favicon" sizes="any" />
      <link rel="shortcut icon" href="/api/favicon" />
      <link rel="apple-touch-icon" href="/api/favicon" />
    </>
  );
}
