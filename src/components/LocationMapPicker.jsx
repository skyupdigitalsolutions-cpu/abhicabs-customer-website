import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../api/config";

const LIBRARIES = ["places"];

// Centered over Karnataka/Telangana operating region
const DEFAULT_CENTER = { lat: 15.3, lng: 77.5 };
const DEFAULT_ZOOM = 7;
const PICKED_ZOOM = 15;

const mapContainerStyle = { width: "100%", height: "100%" };

function extractState(addressComponents) {
  const comp = addressComponents?.find((c) => c.types.includes("administrative_area_level_1"));
  return comp?.long_name || null;
}

function extractCity(addressComponents) {
  const comp = addressComponents?.find(
    (c) => c.types.includes("locality") || c.types.includes("administrative_area_level_2")
  );
  return comp?.long_name || null;
}

export default function LocationMapPicker({ open, title, initialAddress, onConfirm, onClose }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "abhi-cabs-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState(initialAddress || "");
  const [city, setCity] = useState(null);
  const [stateName, setStateName] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPosition(null);
      setAddress(initialAddress || "");
      setCity(null);
      setStateName(null);
      setError("");
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
      autocompleteRef.current = null;
      // Reset search input value
      if (searchInputRef.current) searchInputRef.current.value = initialAddress || "";
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoaded && !geocoderRef.current && window.google) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return;
    setResolving(true);
    setError("");
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      setResolving(false);
      if (status === "OK" && results?.[0]) {
        const addr = results[0].formatted_address;
        setAddress(addr);
        setStateName(extractState(results[0].address_components));
        setCity(extractCity(results[0].address_components));
        // Sync search input
        if (searchInputRef.current) searchInputRef.current.value = addr;
      } else {
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setError("Couldn't resolve address — coordinates saved.");
        setAddress(fallback);
        if (searchInputRef.current) searchInputRef.current.value = fallback;
        setStateName(null);
      }
    });
  }, []);

  function handleMapClick(e) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosition({ lat, lng });
    setMapCenter({ lat, lng });
    reverseGeocode(lat, lng);
  }

  function handlePlaceChanged(place) {
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const addr = place.formatted_address || place.name || "";
    setPosition({ lat, lng });
    setAddress(addr);
    setStateName(extractState(place.address_components));
    setCity(extractCity(place.address_components));
    setMapCenter({ lat, lng });
    setMapZoom(PICKED_ZOOM);
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(PICKED_ZOOM);
    }
    if (searchInputRef.current) searchInputRef.current.value = addr;
  }

  // Use browser geolocation
  function handleLocateMe() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setMapCenter({ lat, lng });
        setMapZoom(PICKED_ZOOM);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(PICKED_ZOOM);
        }
        reverseGeocode(lat, lng);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Please allow location access or pick manually.");
      },
      { timeout: 10000 }
    );
  }

  function attachAutocomplete(el) {
    if (!el || autocompleteRef.current) return;
    searchInputRef.current = el;
    const places = window.google?.maps?.places;
    if (!places) return;
    if (places.Autocomplete) {
      const ac = new places.Autocomplete(el, {
        componentRestrictions: { country: "in" },
        fields: ["geometry", "formatted_address", "name", "address_components"],
      });
      autocompleteRef.current = ac;
      ac.addListener("place_changed", () => handlePlaceChanged(ac.getPlace()));
    } else if (places.PlaceAutocompleteElement) {
      const ac = new places.PlaceAutocompleteElement({
        inputElement: el,
        componentRestrictions: { country: "in" },
      });
      autocompleteRef.current = { _new: ac };
      ac.addEventListener("gmp-placeselect", async ({ place }) => {
        await place.fetchFields({ fields: ["formattedAddress", "displayName", "location", "addressComponents"] });
        const lat = place.location?.lat() ?? 0;
        const lng = place.location?.lng() ?? 0;
        const addr = place.formattedAddress || place.displayName || "";
        setPosition({ lat, lng });
        setAddress(addr);
        setMapCenter({ lat, lng });
        setMapZoom(PICKED_ZOOM);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(PICKED_ZOOM);
        }
        if (searchInputRef.current) searchInputRef.current.value = addr;
      });
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[22px] w-full overflow-hidden shadow-2xl"
        style={{ maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0, color: "#111" }}>{title || "Pick a Location"}</h3>
            <p style={{ fontSize: 12, color: "#888", margin: "3px 0 0" }}>Search, or tap anywhere on the map to pin</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "#F5F5F5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#666" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 16px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>

          {!GOOGLE_MAPS_API_KEY ? (
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#92400E", margin: "0 0 6px" }}>Map not configured</p>
              <p style={{ fontSize: 13, color: "#78350F", margin: 0 }}>
                Add <code style={{ background: "#FEF3C7", padding: "1px 6px", borderRadius: 4 }}>VITE_GOOGLE_MAPS_API_KEY</code> to your <code style={{ background: "#FEF3C7", padding: "1px 6px", borderRadius: 4 }}>.env</code> file.
              </p>
            </div>
          ) : loadError ? (
            <div style={{ background: "#FFF5F5", border: "1px solid #FCA5A5", borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#991B1B", margin: "0 0 4px" }}>Couldn't load Google Maps</p>
              <p style={{ fontSize: 13, color: "#B91C1C", margin: 0 }}>Check your API key and ensure Maps JavaScript + Places APIs are enabled.</p>
            </div>
          ) : !isLoaded ? (
            <div style={{ height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#999" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #FFC107", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading map…</span>
            </div>
          ) : (
            <>
              {/* Search + Locate Me row */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={attachAutocomplete}
                  defaultValue={initialAddress || ""}
                  placeholder="Search city, area or landmark…"
                  style={{
                    flex: 1, border: "1.5px solid #E5E5E5", borderRadius: 10,
                    padding: "10px 14px", fontSize: 14, outline: "none",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#111"}
                  onBlur={(e) => e.target.style.borderColor = "#E5E5E5"}
                />
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={locating}
                  title="Use my current location"
                  style={{
                    flexShrink: 0, width: 44, height: 44, borderRadius: 10,
                    border: "1.5px solid #E5E5E5", background: locating ? "#FFF7DE" : "#fff",
                    cursor: locating ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {locating ? (
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid #FFC107", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="4" fill="#FFC107" />
                      <circle cx="12" cy="12" r="8" stroke="#FFC107" strokeWidth="1.8" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#FFC107" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Map */}
              <div style={{ height: 360, borderRadius: 14, overflow: "hidden", border: "1px solid #EFEFEF", position: "relative" }}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={mapZoom}
                  onClick={handleMapClick}
                  onLoad={(map) => { mapRef.current = map; }}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                    zoomControlOptions: { position: 7 },
                    clickableIcons: false,
                    styles: [
                      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
                    ],
                  }}
                >
                  {position && (
                    <MarkerF
                      position={position}
                      animation={window.google?.maps?.Animation?.DROP}
                      icon={{
                        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
                            <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#FFC107"/>
                            <circle cx="18" cy="18" r="8" fill="#111"/>
                          </svg>`),
                        scaledSize: { width: 36, height: 48 },
                        anchor: { x: 18, y: 48 },
                      }}
                    />
                  )}
                </GoogleMap>

                {/* Crosshair hint */}
                {!position && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", pointerEvents: "none",
                  }}>
                    <div style={{
                      background: "rgba(255,255,255,0.88)", borderRadius: 10,
                      padding: "8px 14px", fontSize: 12.5, fontWeight: 600, color: "#444",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    }}>
                      📍 Tap the map to drop a pin
                    </div>
                  </div>
                )}
              </div>

              {/* Selected location preview */}
              <div style={{
                background: position ? "#FFFBEB" : "#F9F9F9",
                border: `1px solid ${position ? "#FCD34D" : "#EFEFEF"}`,
                borderRadius: 12, padding: "12px 14px",
                display: "flex", alignItems: "flex-start", gap: 10,
                minHeight: 52,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2, color: position ? "#FFC107" : "#ccc" }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" />
                  <circle cx="12" cy="9" r="2.5" fill="#111" />
                </svg>
                <div style={{ flex: 1 }}>
                  {resolving ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 13 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #FFC107", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                      Resolving address…
                    </div>
                  ) : address ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "#111", lineHeight: 1.4 }}>{address}</div>
                      {(city || stateName) && (
                        <div style={{ fontSize: 11.5, color: "#888", marginTop: 3 }}>
                          {[city, stateName].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: "#aaa" }}>No location selected yet</span>
                  )}
                </div>
              </div>

              {error && (
                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, color: "#92400E" }}>
                  ⚠️ {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => address && onConfirm(address, stateName)}
            disabled={!address || resolving || !GOOGLE_MAPS_API_KEY}
            style={{
              flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
              background: address && !resolving ? "#FFC107" : "#F5F5F5",
              color: address && !resolving ? "#111" : "#aaa",
              fontWeight: 700, fontSize: 14, cursor: address && !resolving ? "pointer" : "not-allowed",
              transition: "background .2s",
            }}
          >
            {resolving ? "Resolving…" : address ? "Confirm Location" : "Pick a location first"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}