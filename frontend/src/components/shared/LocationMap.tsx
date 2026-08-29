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
      <div className="nv-mstate">
        <span className="nv-mhud__chip">
          <Compass className="animate-spin" aria-hidden />
          Locating hospital gate…
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
        "relative overflow-hidden rounded-[15px] bg-[var(--nv-plate-well)]",
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
          <div className="nv-mstate">
            <div>
              <span className="nv-mstate__ico" aria-hidden>
                <MapPin />
              </span>
              <p className="nv-state__title mt-4">Map coordinates not set</p>
              <p className="nv-state__desc mt-2">
                Add a latitude and longitude in Admin → Settings → Contact to drop
                the pin here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls floating over the tile. Translucent on purpose — the surface
          underneath is terrain, and an opaque plate would hide the thing the
          reader came to look at. */}
      <div className="nv-mhud">
        <div className="flex justify-end">
          <span className="nv-mhud__chip">
            <span className="nv-mhud__live" aria-hidden />
            <span className="nv-mhud__name">{label}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          {coords ? (
            <span className="nv-mhud__chip nv-mhud__chip--coords">
              {coords.lat.toFixed(5)}° N, {coords.lng.toFixed(5)}° E
            </span>
          ) : (
            <span />
          )}

          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="nv-mhud__chip nv-mhud__chip--go"
            >
              <Navigation aria-hidden />
              Open in Maps
              <ExternalLink aria-hidden />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
