"use client";

import { useEffect } from "react";

const FAVICON_URL = "/api/favicon";

function applyFavicon() {
  for (const rel of ["icon", "shortcut icon", "apple-touch-icon"]) {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (!link.href.includes(FAVICON_URL)) {
      link.href = FAVICON_URL;
    }
  }
}

/**
 * Re-asserts the hospital's favicon after hydration.
 *
 * Chrome caches a tab icon hard and will keep showing a previously seen one even
 * after the markup changes, so this rewrites the links once on mount. It points
 * at the same route as the server-rendered tags — not at a hardcoded asset, as
 * it did before — so there is one source for the icon.
 */
export default function DynamicFavicon() {
  useEffect(() => {
    applyFavicon();
  }, []);

  return null;
}
