"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LocationMapCanvasProps {
  lat: number;
  lng: number;
  zoom?: number;
  label: string;
  address?: string | null;
  /** Rendered inside the popup under the address. */
  directionsUrl?: string | null;
}

/** Recentres without remounting when the coordinates change in the CMS. */
function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [map, lat, lng, zoom]);
  return null;
}

/**
 * Leaflet MapContainer must only mount on the client, and must fully unmount
 * before remounting (React Strict Mode / mobile route revisits).
 */
export default function LocationMapCanvas({
  lat,
  lng,
  zoom = 15,
  label,
  address,
  directionsUrl,
}: LocationMapCanvasProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, []);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "nv-pin-wrapper",
        // Raw HTML, not JSX: Leaflet injects this string into the DOM directly,
        // so the attribute must be `class`. It said `className` before, which is
        // why every pin style in the sheet was dead and the marker rendered as a
        // bare SVG on the tile.
        html: `
          <div class="nv-pin">
            <span class="nv-pin__pulse"></span>
            <span class="nv-pin__pulse nv-pin__pulse--delay"></span>
            <div class="nv-pin__marker">
              <div class="nv-pin__head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
              </div>
              <div class="nv-pin__tip"></div>
            </div>
          </div>
        `,
        iconSize: [52, 64],
        iconAnchor: [26, 58],
        popupAnchor: [0, -50],
      }),
    []
  );

  if (!ready) return null;

  return (
    <MapContainer
      key={`map-${lat}-${lng}`}
      center={[lat, lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
      />
      <Recenter lat={lat} lng={lng} zoom={zoom} />
      <Marker position={[lat, lng]} icon={icon}>
        {/* Leaflet supplies the bubble; nova-page.css restyles its wrapper and
            tip to charcoal, so only the contents are ours. */}
        <Popup>
          <div>
            <strong className="nv-mpop__name">{label}</strong>
            {address && <span className="nv-mpop__addr">{address}</span>}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="nv-mpop__go"
              >
                Get directions
              </a>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
