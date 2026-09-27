/**
 * src/components/TrackingMap.jsx
 *
 * Real embedded Google Map for the Live Tracking page — replaces the earlier
 * static SVG placeholder. Loads the Google Maps JavaScript SDK dynamically
 * (same pattern as the admin dashboard's LiveTracking map), then plots:
 *   - a green pin at pickup
 *   - a red pin at drop
 *   - a blue car marker at the driver's live position (fed by the existing
 *     `trip:location` Socket.IO event — see pages/tracking/+Page.jsx)
 *
 * No new data is invented here: pickup/drop come from the booking's own
 * pickupLat/pickupLng/dropLat/dropLng (already returned by GET /bookings/:id),
 * and the driver marker only appears once a real GPS fix has actually arrived.
 */
import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_API_KEY } from "../api/config";

function useGoogleMapsLoader() {
  const [ready, setReady] = useState(!!(typeof window !== "undefined" && window.google?.maps));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.maps) { setReady(true); return; }
    if (!GOOGLE_MAPS_API_KEY) { setError("Map unavailable — Google Maps API key not configured."); return; }

    if (document.getElementById("gmap-script")) {
      // Another instance is already loading it — poll briefly for readiness.
      const check = setInterval(() => {
        if (window.google?.maps) { setReady(true); clearInterval(check); }
      }, 200);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.id = "gmap-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError("Failed to load Google Maps — check the configured API key.");
    document.head.appendChild(script);
  }, []);

  return { ready, error };
}

function carIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="16" fill="#3B65DB" stroke="#fff" stroke-width="2.5"/>
      <path d="M10 20l1.6-5.2c.3-1 1.2-1.6 2.2-1.6h6.4c1 0 1.9.6 2.2 1.6L24 20v3.2c0 .5-.4.9-.9.9h-.8a.9.9 0 0 1-.9-.9v-.7H12.6v.7c0 .5-.4.9-.9.9h-.8a.9.9 0 0 1-.9-.9V20z" fill="#fff"/>
      <circle cx="13" cy="21.5" r="1.3" fill="#3B65DB"/>
      <circle cx="21" cy="21.5" r="1.3" fill="#3B65DB"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function TrackingMap({ pickup, drop, driverPosition, height = 320 }) {
  const mapDivRef = useRef(null);
  const gmapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const { ready, error } = useGoogleMapsLoader();

  const hasPickup = pickup && Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng);
  const hasDrop = drop && Number.isFinite(drop.lat) && Number.isFinite(drop.lng);

  // Init map once, when the SDK is ready and we have somewhere to centre it.
  useEffect(() => {
    if (!ready || !mapDivRef.current || gmapRef.current) return;
    const G = window.google.maps;
    const center = hasPickup ? pickup : hasDrop ? drop : { lat: 12.9716, lng: 77.5946 };

    gmapRef.current = new G.Map(mapDivRef.current, {
      center,
      zoom: 13,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    if (hasPickup) {
      pickupMarkerRef.current = new G.Marker({
        position: pickup,
        map: gmapRef.current,
        label: { text: "P", color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: { path: G.SymbolPath.CIRCLE, scale: 10, fillColor: "#38B763", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
        title: pickup.address || "Pickup",
      });
    }
    if (hasDrop) {
      dropMarkerRef.current = new G.Marker({
        position: drop,
        map: gmapRef.current,
        label: { text: "D", color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: { path: G.SymbolPath.CIRCLE, scale: 10, fillColor: "#EF4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
        title: drop.address || "Drop",
      });
    }

    // Fit both pins in view when we have both.
    if (hasPickup && hasDrop) {
      const bounds = new G.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(drop);
      gmapRef.current.fitBounds(bounds, 64);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasPickup, hasDrop]);

  // Live driver marker — created/updated whenever a real GPS fix arrives.
  useEffect(() => {
    if (!ready || !gmapRef.current) return;
    if (!driverPosition || !Number.isFinite(driverPosition.lat) || !Number.isFinite(driverPosition.lng)) return;
    const G = window.google.maps;
    const pos = { lat: driverPosition.lat, lng: driverPosition.lng };

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(pos);
    } else {
      driverMarkerRef.current = new G.Marker({
        position: pos,
        map: gmapRef.current,
        icon: { url: carIcon(), scaledSize: new G.Size(34, 34), anchor: new G.Point(17, 17) },
        title: "Driver",
        zIndex: 999,
      });
    }
  }, [ready, driverPosition]);

  return (
    <div className="rounded-[22px] overflow-hidden border border-border relative" style={{ height }}>
      <div ref={mapDivRef} className="w-full h-full" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] px-6 text-center">
          <p className="text-[13px] text-text-secondary">{error}</p>
        </div>
      )}

      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#E7ECFB] gap-2">
          <div className="w-7 h-7 rounded-full border-[3px] border-[#c7d7f6] border-t-primary animate-spin" />
          <p className="text-[12.5px] font-semibold text-primary">Loading map…</p>
        </div>
      )}
    </div>
  );
}
