// ─────────────────────────────────────────────────────────────────────────────
// Serviced cities — cityId resolution, loaded LIVE from the backend
// ─────────────────────────────────────────────────────────────────────────────
// Every fare quote and booking must tell the backend which city's rate card to
// price against (POST /fares/* and /bookings both take a required `cityId`).
// The backend trusts this id — it does not derive the city from the pickup — so
// the website must send the right one.
//
// This module loads the serviced cities from the PUBLIC endpoint GET /cities at
// runtime, so a city added on the backend appears on the website automatically,
// with NO frontend change or redeploy. If that endpoint isn't available yet, it
// falls back to the bundled list below, so the site keeps working either way.
//
// GET /cities is expected to return (envelope unwrapped by the api client):
//   { cities: [{ id, name, state, centreLat, centreLng, radiusKm, isActive }], total }
// centreLat/centreLng may arrive as strings (Prisma Decimal) — coerced here.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from "./client";
import { USE_MOCK } from "./config";

/**
 * Bundled fallback — used only until GET /cities responds (or if it's absent).
 * Mirrors the seeded Bengaluru row. Keep at least the primary city here so the
 * site can price a trip on the very first render before the fetch resolves.
 */
const FALLBACK_CITIES = [
  {
    id: 1,
    name: "Bengaluru",
    state: "Karnataka",
    centre: { lat: 12.9716, lng: 77.5946 },
    radiusKm: 60,
    aliases: ["bengaluru", "bangalore", "bengalooru", "blr", "karnataka"],
  },
];

let _cities = null;        // populated once GET /cities resolves
let _loadPromise = null;   // shared in-flight load

/** Normalise a backend city row into the shape resolveCityId expects. */
function fromBackend(row) {
  const name = String(row.name || "").trim();
  const state = String(row.state || "").trim();
  const lat = Number(row.centreLat ?? row.centre_lat ?? row.centre?.lat);
  const lng = Number(row.centreLng ?? row.centre_lng ?? row.centre?.lng);
  // Auto-derive aliases from the name + state so address matching works for a
  // newly added city without anyone hand-writing alias lists.
  const aliases = [name.toLowerCase(), state.toLowerCase()].filter(Boolean);
  return {
    id: Number(row.id),
    name,
    state,
    centre: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    radiusKm: Number(row.radiusKm ?? row.radius_km ?? 60),
    aliases,
  };
}

/**
 * Load the serviced cities from the backend once (cached for the tab's life).
 * Safe to call repeatedly and before every quote/booking — it's a no-op after
 * the first success. Never throws: on any failure it keeps the fallback list.
 */
export function ensureCitiesLoaded() {
  if (USE_MOCK) return Promise.resolve(getServicedCities());
  if (_cities) return Promise.resolve(_cities);
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const data = await api.get("/cities", { auth: false });
      const rows = Array.isArray(data?.cities) ? data.cities
                 : Array.isArray(data)          ? data
                 : [];
      const mapped = rows
        .filter((r) => r && (r.isActive === undefined || r.isActive))
        .map(fromBackend)
        .filter((c) => c.id);
      if (mapped.length) _cities = mapped;   // only replace if we actually got cities
    } catch {
      // Endpoint not deployed yet / unreachable — keep the bundled fallback.
    } finally {
      _loadPromise = null;
    }
    return getServicedCities();
  })();

  return _loadPromise;
}

/** The current serviced-city list (live if loaded, else the bundled fallback). */
export function getServicedCities() {
  return _cities && _cities.length ? _cities : FALLBACK_CITIES;
}

/** Force a re-fetch next time (e.g. after a long-lived session). */
export function invalidateCitiesCache() {
  _cities = null;
}

/** The primary/default city id — first serviced city, else 1. */
export function getDefaultCityId() {
  return getServicedCities()[0]?.id ?? 1;
}

// Back-compat export. Prefer getDefaultCityId() so it reflects the live list.
export const DEFAULT_CITY_ID = FALLBACK_CITIES[0]?.id ?? 1;

function toRad(d) { return (d * Math.PI) / 180; }

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return Infinity;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function pickupCoords(source) {
  if (!source) return null;
  const p = source.pickup;
  if (p && typeof p === "object" && p.lat != null && p.lng != null) {
    return { lat: Number(p.lat), lng: Number(p.lng) };
  }
  if (source.pickupLat != null && source.pickupLng != null) {
    return { lat: Number(source.pickupLat), lng: Number(source.pickupLng) };
  }
  return null;
}

function pickupText(source) {
  if (!source) return "";
  const p = source.pickup;
  if (typeof p === "string") return p;
  if (p && typeof p === "object" && p.address) return String(p.address);
  return String(source.pickupAddress || "");
}

/**
 * Resolve the correct backend cityId for a journey / booking payload, against
 * the current serviced-city list. Call ensureCitiesLoaded() first (fares.js and
 * bookings.js do) so a freshly added city is considered.
 *
 * Order: explicit cityId -> nearest city containing the pickup coordinates ->
 * city whose name/alias appears in the pickup address -> default city.
 *
 * The backend is still the authority on serviceability: a pickup outside every
 * serviced area is rejected there (OUTSIDE_SERVICE_AREA / CITY_NOT_SERVICED).
 */
export function resolveCityId(source) {
  if (source && source.cityId) return Number(source.cityId);

  const cities = getServicedCities();
  if (cities.length <= 1) return cities[0]?.id ?? DEFAULT_CITY_ID;

  // 1. By coordinates.
  const coords = pickupCoords(source);
  if (coords) {
    let inside = null, insideKm = Infinity;
    let nearest = null, nearestKm = Infinity;
    for (const c of cities) {
      if (!c.centre) continue;
      const km = haversineKm(coords, c.centre);
      if (km < nearestKm) { nearest = c; nearestKm = km; }
      if (km <= c.radiusKm && km < insideKm) { inside = c; insideKm = km; }
    }
    if (inside) return inside.id;
    if (nearest) return nearest.id; // outside all — best guess; backend may reject
  }

  // 2. By address text.
  const text = pickupText(source).toLowerCase();
  if (text) {
    for (const c of cities) {
      if (c.aliases.some((a) => a && text.includes(a))) return c.id;
    }
  }

  // 3. Fallback.
  return getDefaultCityId();
}
