import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../api/config";

// Loaded once and reused by every LocationMapPicker instance — useJsApiLoader
// (unlike the older <LoadScript> component) is specifically designed to be
// called from multiple places without double-loading the Google Maps script
// or throwing "already included" console errors.
const LIBRARIES = ["places"];

// Centered roughly over Karnataka/Hyderabad, matching where this business
// actually operates.
const DEFAULT_CENTER = { lat: 15.3, lng: 77.5 };
const DEFAULT_ZOOM = 7;
const PICKED_ZOOM = 14;

const mapContainerStyle = { width: "100%", height: "100%" };

// Extracts the Indian state name from Google's address_components — the
// same structure is returned by both the Geocoder (map-click path) and
// Places Autocomplete (search path), so this one helper covers both.
function extractState(addressComponents) {
  const comp = addressComponents?.find((c) => c.types.includes("administrative_area_level_1"));
  return comp?.long_name || null;
}

export default function LocationMapPicker({ open, title, initialAddress, onConfirm, onClose }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "abhi-cabs-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [position, setPosition] = useState(null); // { lat, lng }
  const [address, setAddress] = useState(initialAddress || "");
  const [stateName, setStateName] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPosition(null);
      setAddress(initialAddress || "");
      setStateName(null);
      setError("");
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
        setAddress(results[0].formatted_address);
        setStateName(extractState(results[0].address_components));
      } else {
        setError("Couldn't fetch the address for this spot — you can still confirm using the pinned coordinates.");
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setStateName(null);
      }
    });
  }, []);

  function handleMapClick(e) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosition({ lat, lng });
    reverseGeocode(lat, lng);
  }

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setPosition({ lat, lng });
    setAddress(place.formatted_address || place.name || "");
    setStateName(extractState(place.address_components));
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(PICKED_ZOOM);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] w-full max-w-[640px] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEFEF]">
          <h3 className="font-bold text-[16px] m-0">{title || "Pick a location on the map"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="p-4">
          {!GOOGLE_MAPS_API_KEY ? (
            // Matches the same honest fallback pattern already used on the
            // Live Tracking page for a missing key — no broken/blank map,
            // just a clear message telling the operator what to configure.
            <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-5 text-center">
              <p className="text-[14px] font-semibold text-amber-800 m-0 mb-1.5">Map isn't configured yet</p>
              <p className="text-[13px] text-amber-700 m-0">
                Add a value for <code className="bg-amber-100 px-1.5 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your
                <code className="bg-amber-100 px-1.5 py-0.5 rounded mx-1">.env</code> file (see the comment above it for where
                to get one), then restart the dev server.
              </p>
            </div>
          ) : loadError ? (
            <div className="bg-red-50 border border-red-200 rounded-[12px] p-5 text-center">
              <p className="text-[14px] font-semibold text-red-700 m-0">Couldn't load Google Maps</p>
              <p className="text-[13px] text-red-600 m-0 mt-1">Check that your API key is valid and the Maps JavaScript + Places APIs are enabled for it.</p>
            </div>
          ) : !isLoaded ? (
            <div className="h-[320px] flex items-center justify-center text-gray-400 text-[14px]">Loading map…</div>
          ) : (
            <>
              <Autocomplete
                onLoad={(a) => { autocompleteRef.current = a; a.setComponentRestrictions({ country: "in" }); }}
                onPlaceChanged={handlePlaceChanged}
              >
                <input
                  defaultValue={initialAddress || ""}
                  placeholder="Search for a city, area or landmark…"
                  className="w-full border border-[#E5E5E5] rounded-[10px] px-3.5 py-2.5 text-[14px] outline-none focus:border-brand-black mb-3"
                />
              </Autocomplete>

              <div style={{ height: 320, borderRadius: 14, overflow: "hidden", border: "1px solid #EFEFEF" }}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={position || DEFAULT_CENTER}
                  zoom={position ? PICKED_ZOOM : DEFAULT_ZOOM}
                  onClick={handleMapClick}
                  onLoad={(map) => { mapRef.current = map; }}
                  options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                >
                  {position && <MarkerF position={position} />}
                </GoogleMap>
              </div>

              <p className="text-[12px] text-gray-500 mt-2.5 mb-0">
                Tap anywhere on the map to drop a pin, or search above. The address fills in automatically.
              </p>

              {error && <p className="text-[12.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2 mt-2.5">{error}</p>}

              <div className="mt-4 border-t border-[#EFEFEF] pt-4">
                <label className="text-[12px] font-bold text-gray-600 block mb-1.5">Selected location</label>
                <div className="text-[14px] font-medium min-h-[20px]">
                  {resolving ? "Looking up address…" : (address || "No location picked yet")}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={onClose} className="flex-1 py-3 rounded-[11px] border border-[#E5E5E5] font-semibold text-[14px]">
              Cancel
            </button>
            <button
              onClick={() => address && onConfirm(address, stateName)}
              disabled={!address || resolving || !GOOGLE_MAPS_API_KEY}
              className="flex-1 py-3 rounded-[11px] bg-primary text-brand-black font-bold text-[14px] disabled:opacity-40"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
