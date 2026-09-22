import React, { useEffect, useRef, useState, useCallback } from "react";
import { GOOGLE_MAPS_API_KEY } from "../api/config";

// ─── Singleton Google Maps loader ─────────────────────────────────────────────
// Loads the Maps JS API once per page; all LocationMapPicker instances share it.
let _mapsPromise = null;
function loadGoogleMaps() {
  if (_mapsPromise) return _mapsPromise;
  if (window.google?.maps?.places) {
    _mapsPromise = Promise.resolve();
    return _mapsPromise;
  }
  _mapsPromise = new Promise((resolve, reject) => {
    const cb = "__abhiCabsMapsReady";
    window[cb] = () => { delete window[cb]; resolve(); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${cb}&loading=async`;
    s.async = true;
    s.defer = true;
    s.onerror = () => { _mapsPromise = null; reject(new Error("Maps failed to load")); };
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getState(comps) {
  return comps?.find(c => c.types?.includes("administrative_area_level_1"))?.long_name || null;
}
function getCity(comps) {
  return comps?.find(c =>
    c.types?.includes("locality") || c.types?.includes("administrative_area_level_2")
  )?.long_name || null;
}

const DEFAULT_CENTER = { lat: 14.5, lng: 77.5 }; // center of KA+TG
const DEFAULT_ZOOM   = 7;
const PICKED_ZOOM    = 15;

// ─── Custom SVG pin ───────────────────────────────────────────────────────────
const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">` +
  `<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="#FFC107"/>` +
  `<circle cx="18" cy="18" r="7" fill="#111"/>` +
  `</svg>`
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LocationMapPicker({ open, title, initialAddress, onConfirm, onClose }) {
  const [mapsReady, setMapsReady]   = useState(false);
  const [mapsError, setMapsError]   = useState(null);
  const [address,   setAddress]     = useState("");
  const [stateName, setStateName]   = useState(null);
  const [city,      setCity]        = useState(null);
  const [resolving, setResolving]   = useState(false);
  const [locating,  setLocating]    = useState(false);
  const [pinned,    setPinned]      = useState(false); // true once user has placed a pin
  const [notice,    setNotice]      = useState("");

  const mapDivRef       = useRef(null);
  const mapRef          = useRef(null);
  const markerRef       = useRef(null);
  const geocoderRef     = useRef(null);
  const autocompleteRef = useRef(null);
  const searchRef       = useRef(null);
  const openRef         = useRef(open);

  // Track open state in ref so async callbacks can check it
  useEffect(() => { openRef.current = open; }, [open]);

  // ── Load Maps SDK once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(err => setMapsError(err.message));
  }, []);

  // ── Reset state every time picker opens ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setAddress(initialAddress || "");
    setStateName(null);
    setCity(null);
    setResolving(false);
    setLocating(false);
    setPinned(false);
    setNotice("");
    if (searchRef.current) searchRef.current.value = initialAddress || "";
    // Detach old autocomplete so it doesn't fire on stale input
    if (autocompleteRef.current) {
      window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build map after SDK ready + modal open ────────────────────────────────
  useEffect(() => {
    if (!open || !mapsReady || !mapDivRef.current) return;
    if (mapRef.current) return; // already built this session

    const google = window.google;
    geocoderRef.current = new google.maps.Geocoder();

    const map = new google.maps.Map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: "greedy",
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
    });
    mapRef.current = map;

    // Custom pin marker (hidden until first pin)
    const marker = new google.maps.Marker({
      map,
      visible: false,
      animation: google.maps.Animation.DROP,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${PIN_SVG}`,
        scaledSize: new google.maps.Size(36, 48),
        anchor: new google.maps.Point(18, 48),
      },
    });
    markerRef.current = marker;

    // Click to pin
    map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      placePin(lat, lng);
    });

    // If initialAddress, geocode it to center the map
    if (initialAddress && geocoderRef.current) {
      geocoderRef.current.geocode({ address: initialAddress }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          map.setCenter(loc);
          map.setZoom(PICKED_ZOOM);
        }
      });
    }

    return () => {
      // Cleanup on unmount
      if (markerRef.current) markerRef.current.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, mapsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Attach Autocomplete after map built + search input mounted ────────────
  const attachSearch = useCallback((el) => {
    if (!el || !mapsReady || autocompleteRef.current) return;
    searchRef.current = el;
    const google = window.google;
    const ac = new google.maps.places.Autocomplete(el, {
      componentRestrictions: { country: "in" },
      fields: ["geometry", "formatted_address", "address_components", "name"],
    });
    autocompleteRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place?.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const addr = place.formatted_address || place.name || "";
      setAddress(addr);
      setStateName(getState(place.address_components));
      setCity(getCity(place.address_components));
      setPinned(true);
      if (searchRef.current) searchRef.current.value = addr;
      placePin(lat, lng, false); // false = don't re-geocode
    });
  }, [mapsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Place pin on map ──────────────────────────────────────────────────────
  function placePin(lat, lng, doGeocode = true) {
    const marker = markerRef.current;
    const map    = mapRef.current;
    if (!marker || !map) return;
    const pos = new window.google.maps.LatLng(lat, lng);
    marker.setPosition(pos);
    marker.setVisible(true);
    marker.setAnimation(window.google.maps.Animation.DROP);
    map.panTo(pos);
    if (map.getZoom() < PICKED_ZOOM) map.setZoom(PICKED_ZOOM);
    setPinned(true);
    if (doGeocode) reverseGeocode(lat, lng);
  }

  // ── Reverse geocode ───────────────────────────────────────────────────────
  function reverseGeocode(lat, lng) {
    if (!geocoderRef.current) return;
    setResolving(true);
    setNotice("");
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (!openRef.current) return;
      setResolving(false);
      if (status === "OK" && results?.[0]) {
        const addr = results[0].formatted_address;
        setAddress(addr);
        setStateName(getState(results[0].address_components));
        setCity(getCity(results[0].address_components));
        if (searchRef.current) searchRef.current.value = addr;
      } else {
        const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setAddress(fallback);
        setStateName(null);
        setCity(null);
        if (searchRef.current) searchRef.current.value = fallback;
        setNotice("Address not found — coordinates saved.");
      }
    });
  }

  // ── Live location ─────────────────────────────────────────────────────────
  function handleLocateMe() {
    if (!navigator.geolocation) {
      setNotice("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!openRef.current) return;
        setLocating(false);
        placePin(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setNotice("Could not get your location. Please enable location access or pick manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // ── Confirm ────────────────────────────────────────────────────────────────
  function handleConfirm() {
    if (!address || resolving) return;
    onConfirm(address, stateName);
  }

  if (!open) return null;

  const noKey = !GOOGLE_MAPS_API_KEY;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 22, width: "100%", maxWidth: 700, maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>{title || "Pick a Location"}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              {noKey ? "Enter address manually below" : "Search, use live location, or tap map to pin"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "#F5F5F5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#555" strokeWidth="2.2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px" }}>

          {/* Search row */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={attachSearch}
              defaultValue={initialAddress || ""}
              placeholder={noKey ? "Type your location here…" : "Search city, area or landmark…"}
              style={{ flex: 1, border: "1.5px solid #E0E0E0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", transition: "border-color .2s" }}
              onFocus={e => e.target.style.borderColor = "#111"}
              onBlur={e => e.target.style.borderColor = "#E0E0E0"}
              onChange={e => { if (noKey) setAddress(e.target.value); }}
            />
            {!noKey && (
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating || !mapsReady}
                title="Use my current location"
                style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 10, border: "1.5px solid #E0E0E0", background: locating ? "#FFFBEB" : "#fff", cursor: locating ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {locating
                  ? <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2.5px solid #FFC107", borderTopColor: "transparent", animation: "lmpSpin .8s linear infinite" }} />
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="4" fill="#FFC107"/>
                      <circle cx="12" cy="12" r="8" stroke="#FFC107" strokeWidth="1.6"/>
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#FFC107" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                }
              </button>
            )}
          </div>

          {/* Map area */}
          {!noKey && (
            <div style={{ position: "relative", height: 370, borderRadius: 14, overflow: "hidden", border: "1px solid #EFEFEF", background: "#f0ece4", flexShrink: 0 }}>
              {/* The map renders into this div */}
              <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

              {/* Loading overlay */}
              {!mapsReady && !mapsError && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#f8f6f1" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #FFC107", borderTopColor: "transparent", animation: "lmpSpin .8s linear infinite" }} />
                  <span style={{ fontSize: 13, color: "#888" }}>Loading map…</span>
                </div>
              )}

              {/* Error overlay */}
              {mapsError && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#fff5f5", padding: 24, textAlign: "center" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/></svg>
                  <div style={{ fontWeight: 700, color: "#B91C1C", fontSize: 14 }}>Map failed to load</div>
                  <div style={{ fontSize: 12, color: "#666" }}>Check your Maps API key. You can still type your location manually above.</div>
                </div>
              )}

              {/* "Tap to pin" hint */}
              {mapsReady && !pinned && !mapsError && (
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.92)", borderRadius: 10, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#444", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", pointerEvents: "none", whiteSpace: "nowrap" }}>
                  📍 Tap the map to drop a pin
                </div>
              )}
            </div>
          )}

          {/* Selected location preview card */}
          <div style={{ background: pinned || (noKey && address) ? "#FFFBEB" : "#F9F9F9", border: `1.5px solid ${pinned || (noKey && address) ? "#FCD34D" : "#EFEFEF"}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10, minHeight: 54, transition: "all .2s" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1, color: pinned || (noKey && address) ? "#FFC107" : "#ccc" }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
              <circle cx="12" cy="9" r="2.5" fill="#111"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              {resolving
                ? <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 13 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #FFC107", borderTopColor: "transparent", animation: "lmpSpin .8s linear infinite" }} />
                    Resolving address…
                  </div>
                : address
                  ? <>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "#111", lineHeight: 1.4, wordBreak: "break-word" }}>{address}</div>
                      {(city || stateName) && <div style={{ fontSize: 11.5, color: "#888", marginTop: 3 }}>{[city, stateName].filter(Boolean).join(", ")}</div>}
                    </>
                  : <span style={{ fontSize: 13, color: "#aaa" }}>{noKey ? "Type an address above" : "No location selected yet"}</span>
              }
            </div>
          </div>

          {/* Notice / warning */}
          {notice && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, color: "#92400E" }}>
              ⚠️ {notice}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1.5px solid #E0E0E0", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!address || resolving}
            style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: address && !resolving ? "#FFC107" : "#F0F0F0", color: address && !resolving ? "#111" : "#aaa", fontWeight: 700, fontSize: 14, cursor: address && !resolving ? "pointer" : "not-allowed", transition: "background .2s, color .2s" }}
          >
            {resolving ? "Resolving address…" : address ? "✓ Confirm Location" : "Pick a location first"}
          </button>
        </div>
      </div>

      <style>{`@keyframes lmpSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}