/** Map helpers: resolve coordinates and open/embed URLs from settings. */

export type MapCoords = { lat: number; lng: number };

export function parseCoord(value?: string | number | null): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

/** Prefer explicit lat/lng; else parse @lat,lng from Google Maps URL. */
export function resolveMapCoords(
  latitude?: string | number | null,
  longitude?: string | number | null,
  mapsUrl?: string | null
): MapCoords | null {
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  if (lat != null && lng != null) return { lat, lng };

  const url = mapsUrl?.trim();
  if (!url) return null;
  const match = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (match) {
    return { lat: Number(match[1]), lng: Number(match[2]) };
  }
  return null;
}

export function buildMapsOpenUrl(
  mapsUrl?: string | null,
  address?: string | null,
  coords?: MapCoords | null
): string | null {
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }
  const url = mapsUrl?.trim();
  if (url) return url;
  const addr = address?.trim();
  if (!addr) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

export function buildMapsEmbedSrc(
  mapsUrl?: string | null,
  address?: string | null,
  coords?: MapCoords | null
): string | null {
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&output=embed&z=15`;
  }

  const url = mapsUrl?.trim();
  if (url) {
    const embed = toEmbedUrl(url);
    if (embed) return embed;
  }

  const addr = address?.trim();
  if (!addr) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed&z=15`;
}

function toEmbedUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);

    if (parsed.pathname.includes("/embed")) {
      return parsed.toString();
    }

    const q = parsed.searchParams.get("q") || parsed.searchParams.get("query");
    if (q) {
      return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed&z=15`;
    }

    const pb = parsed.searchParams.get("pb");
    if (pb) {
      return `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`;
    }

    const coords = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (coords) {
      return `https://www.google.com/maps?q=${coords[1]},${coords[2]}&output=embed&z=15`;
    }

    if (
      parsed.hostname.includes("google.") ||
      parsed.hostname.includes("goo.gl") ||
      parsed.hostname.includes("maps.app.goo.gl")
    ) {
      return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&output=embed&z=15`;
    }

    return null;
  } catch {
    return null;
  }
}
