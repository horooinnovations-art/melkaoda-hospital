"use client";

import dynamic from "next/dynamic";
import { Compass, MapPin, Navigation, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildMapsEmbedSrc,
  buildMapsOpenUrl,
  resolveMapCoords,
} from "@/lib/maps";

const LocationMapCanvas = dynamic(
  () => import("@/components/shared/LocationMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-slate-50">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-800 font-semibold">
          <Compass className="h-4 w-4 animate-spin text-emerald-600" />
          Locating Hospital Gate…
        </span>
      </div>
    ),
  }
);

interface LocationMapProps {
  latitude?: string | number | null;
  longitude?: string | number | null;
  mapsUrl?: string | null;
  address?: string | null;
  label: string;
  zoom?: number;
  className?: string;
}

export default function LocationMap({
  latitude,
  longitude,
  mapsUrl,
  address,
  label,
  zoom = 15,
  className,
}: LocationMapProps) {
  const coords = resolveMapCoords(latitude, longitude, mapsUrl);
  const openUrl = buildMapsOpenUrl(mapsUrl, address, coords);
  const embedSrc = coords ? null : buildMapsEmbedSrc(mapsUrl, address, null);

  return (
    <div
      className={cn(
        "v-map relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-md",
        className
      )}
    >
      <div className="relative h-[22rem] w-full sm:h-[26rem] lg:h-full lg:min-h-[30rem]">
        {coords ? (
          <LocationMapCanvas
            lat={coords.lat}
            lng={coords.lng}
            zoom={zoom}
            label={label}
            address={address}
            directionsUrl={openUrl}
          />
        ) : embedSrc ? (
          <iframe
            src={embedSrc}
            title={`${label} location`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0 contrast-[1.02]"
            allowFullScreen
          />
        ) : (
          <div className="grid h-full place-items-center bg-slate-50 px-8 text-center">
            <div>
              <MapPin className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-4 font-display text-xl font-bold text-slate-900">
                Map coordinates not set
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Add a latitude and longitude in Admin → Settings → Contact to drop
                the pin here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modern High-Contrast Floating HUD Header & Controls */}
      <div className="v-map__hud pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-5 z-[400]">
        {/* Top Floating Badge */}
        <div className="flex justify-end">
          <span className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-900 shadow-md backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
            </span>
            <span className="max-w-[24ch] truncate font-bold text-slate-900">{label}</span>
          </span>
        </div>

        {/* Bottom Bar: Coordinates pill & Direct Google Maps CTA */}
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          {coords ? (
            <span className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-wide text-slate-700 shadow-sm backdrop-blur-md">
              📍 {coords.lat.toFixed(5)}° N, {coords.lng.toFixed(5)}° E
            </span>
          ) : (
            <span />
          )}

          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-emerald-900 hover:scale-105"
            >
              <Navigation className="h-4 w-4" />
              Open in Maps
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
