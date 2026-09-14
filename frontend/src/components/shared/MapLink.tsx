"use client";

import { useMemo } from "react";
import { useGetSettingsQuery } from "@/store/slices/apiSlice";
import { buildMapsOpenUrl, resolveMapCoords } from "@/lib/maps";
import { cn } from "@/lib/utils";

/**
 * The hospital's map URL, from settings.
 *
 * Resolution order matches the map on the Contact page, so a click in the
 * footer and a click on the map itself land on the same pin: explicit
 * coordinates first, then whatever Google Maps link an editor pasted, then the
 * plain address as a search. Null when the hospital has none of the three, so
 * callers can decline to render a link rather than sending someone to a search
 * for nothing.
 *
 * The settings query is shared, so calling this from several components in one
 * page costs one request.
 */
export function useHospitalMapsUrl(): string | null {
  const { data: settings } = useGetSettingsQuery();

  return useMemo(() => {
    if (!settings) return null;
    const coords = resolveMapCoords(
      settings.latitude as string | number | undefined,
      settings.longitude as string | number | undefined,
      settings.google_maps_url as string | undefined
    );
    return buildMapsOpenUrl(
      settings.google_maps_url as string | undefined,
      settings.address as string | undefined,
      coords
    );
  }, [settings]);
}

/**
 * Wraps an address, a city line or a map pin so it opens the hospital's
 * location in the visitor's map application.
 *
 * With no location configured it falls back to a plain span, not to nothing. A
 * link that goes nowhere is worse than plain text because it still looks
 * clickable, but dropping the element takes the caller's layout class with it —
 * the footer address is a flex row, and without its wrapper the pin and the
 * address unstack.
 *
 * A span rather than a paragraph, so this is valid wherever it is used,
 * including inside a paragraph of its own.
 */
export default function MapLink({
  children,
  className,
  label = "Open the hospital location in Maps",
}: {
  children: React.ReactNode;
  className?: string;
  /** Accessible name. The visible text is usually just an address. */
  label?: string;
}) {
  const href = useHospitalMapsUrl();

  if (!href) return <span className={className}>{children}</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={cn("nv-maplink", className)}
    >
      {children}
    </a>
  );
}
