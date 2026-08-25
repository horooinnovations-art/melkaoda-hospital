"use client";

import { useEffect } from "react";

const FAVICON_URL = "/vercel.svg";

function applyFavicon() {
  for (const rel of ["icon", "shortcut icon", "apple-touch-icon"]) {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (!link.href.includes(FAVICON_URL)) {
      link.href = `${FAVICON_URL}?t=${Date.now()}`;
      if (rel === "icon") link.type = "image/svg+xml";
    }
  }
}

/** Forces the browser to use /vercel.svg after hydration. */
export default function DynamicFavicon() {
  useEffect(() => {
    applyFavicon();
  }, []);

  return null;
}
