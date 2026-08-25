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
        className: "v-pin-wrapper",
        html: `
          <div className="v-pin-container">
            <span className="v-pin-pulse"></span>
            <span className="v-pin-pulse v-pin-pulse--delay"></span>
            <div className="v-pin-marker">
              <div className="v-pin-marker__head">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
              </div>
              <div className="v-pin-marker__tip"></div>
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
        <Popup className="v-map-popup">
          <div className="p-1 text-slate-900">
            <strong className="block text-base font-bold text-emerald-950 mb-1">{label}</strong>
            {address && <span className="block text-xs text-slate-600 leading-relaxed mb-2">{address}</span>}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
              >
                Get Directions →
              </a>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
