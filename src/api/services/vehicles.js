// Vehicle catalogue service — the real, admin-managed vehicle classes.
// Backend: GET /vehicles (PUBLIC, no auth) → { count, vehicles: [{ key, name,
//   seats, blurb, detail, luggage, glyph, transmission, fuel, rating, trips,
//   heroUrl, images, cars, sortOrder, isActive }] }
//
// This is the source of truth for what a vehicle CLASS actually looks like —
// real Cloudinary photos uploaded by an admin, real seat counts, real ratings.
// fares.js merges this with the priced options /fares/options returns (which
// only carries a bare `vehicleClass` key and money) so the booking-search and
// checkout screens show a real photo and real copy, not a hardcoded mock.
import { api } from "../client";
import { USE_MOCK } from "../config";

// Cached in memory for the tab's lifetime — this is "six cached rows of
// marketing copy" per the backend's own comment, safe to fetch once and
// reuse across every fare lookup in the session instead of once per option.
let cache = null;
let inflight = null;

function normaliseKey(key) {
  return String(key || "").trim().toLowerCase();
}

async function fetchCatalogue() {
  if (USE_MOCK) return [];
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = api
    .get("/vehicles", { auth: false })
    .then((data) => {
      const list = Array.isArray(data?.vehicles) ? data.vehicles : Array.isArray(data) ? data : [];
      cache = list;
      return list;
    })
    .catch(() => {
      // Genuinely unreachable — callers fall back to the local mock catalogue
      // for presentation only; the PRICE always still comes from /fares.
      cache = [];
      return [];
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** The full public catalogue, as the backend actually has it configured. */
export async function getVehicleCatalogue() {
  return fetchCatalogue();
}

/**
 * The catalogue as a Map keyed by vehicleClass ("sedan", "suv", "tempo",
 * "hatchback", …) so a fare option can look up its real photo/name in O(1).
 */
export async function getVehicleCatalogueMap() {
  const list = await fetchCatalogue();
  return new Map(list.map((v) => [normaliseKey(v.key), v]));
}

/** Force a re-fetch next time — call after an admin might have changed the
 *  catalogue in the same session (rare on the customer site, but cheap). */
export function invalidateVehicleCatalogueCache() {
  cache = null;
}
