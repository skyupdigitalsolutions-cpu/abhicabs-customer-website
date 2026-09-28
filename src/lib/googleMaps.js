// Google Maps loader + Places Autocomplete helpers, shared by every location
// field on the site (homepage booking form, vehicles-page trip form and its
// stops, checkout pickup address, and the map picker).
//
// Before this, the Maps JS API was only loaded when a customer opened the
// map-picker popup. Every other field just polled for window.google, so until
// someone opened a map, typing an address gave no suggestions anywhere.
// Now the first location field on a page loads the API itself.
import { useEffect, useState } from "react";
import { GOOGLE_MAPS_API_KEY } from "../api/config";

let mapsPromise = null;

export function hasMapsKey() {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

/** Load the Maps JS API (with Places) once per page. Resolves when ready. */
export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.google?.maps?.places) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Google Maps key is not configured (VITE_GOOGLE_MAPS_API_KEY)."));
  }
  mapsPromise = new Promise((resolve, reject) => {
    const cb = "__abhiCabsMapsReady";
    window[cb] = () => { delete window[cb]; resolve(); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places&callback=${cb}&loading=async`;
    s.async = true;
    s.defer = true;
    s.onerror = () => { mapsPromise = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(s);
  });
  return mapsPromise;
}

/** true once Places is available. Starts loading the API on first use. */
export function useGoogleMapsReady() {
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && !!window.google?.maps?.places
  );
  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadGoogleMaps().then(() => { if (alive) setReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, [ready]);
  return ready;
}

/** {lat,lng} from a Places result, or null. */
export function pointFromPlace(place) {
  const loc = place?.geometry?.location;
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Attach Places Autocomplete (India only) to an <input>, re-binding if the
 * element changes (e.g. a form that re-mounts). `slot` is a ref object that
 * remembers the binding; onPlace(place) receives the chosen place.
 */
export function bindPlacesAutocomplete(el, slot, onPlace) {
  if (!el || typeof window === "undefined" || !window.google?.maps?.places?.Autocomplete) return;
  if (slot.current?.el === el) { slot.current.onPlace = onPlace; return; }
  if (slot.current?.ac) window.google.maps.event.clearInstanceListeners(slot.current.ac);
  const ac = new window.google.maps.places.Autocomplete(el, {
    componentRestrictions: { country: "in" },
    fields: ["formatted_address", "name", "address_components", "geometry"],
  });
  slot.current = { el, ac, onPlace };
  ac.addListener("place_changed", () => slot.current?.onPlace?.(ac.getPlace()));
}
