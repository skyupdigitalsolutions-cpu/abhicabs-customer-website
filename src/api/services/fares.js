// Fares service — maps frontend journey shape to backend API contract
// Backend: POST /fares/options  → { trip, options: [{vehicleClass, total, ...}], surge }
//          POST /fares/estimate → { vehicleClass, total, ... }
import { api, ApiError } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { VEHICLE_RATES, computeFare } from "../../data/mockData";

const DEFAULT_CITY_ID = 1;

// Backend vehicleClass enum values (from fareConfig rows seeded in DB)
// Backend fare_configs only has: hatchback, sedan, suv, tempo
const VEHICLE_CLASS_MAP = {
  hatchback: "hatchback",
  sedan:     "sedan",
  suv:       "suv",
  tempo:     "tempo",
  luxury:    "suv",
  premium:   "sedan",
  bus:       "tempo",
};
function toRealVehicleClass(category) {
  return VEHICLE_CLASS_MAP[(category || "").toLowerCase()] || "sedan";
}

// Backend tripType enum: ONE_WAY | ROUND_TRIP | AIRPORT | HOURLY
const TRIP_TYPE_MAP = {
  "one-way":    "ONE_WAY",
  "oneway":     "ONE_WAY",
  "round-trip": "ROUND_TRIP",
  "roundtrip":  "ROUND_TRIP",
  "airport":    "AIRPORT",
  "local":      "HOURLY",
  "hourly":     "HOURLY",
  "multi-city": "ONE_WAY",
};
function toRealTripType(tripType) {
  return TRIP_TYPE_MAP[(tripType || "").toLowerCase()] || "ONE_WAY";
}

function toIsoDateTime(date, time) {
  if (!date) return new Date().toISOString();
  const t = time || "00:00";
  const iso = new Date(`${date}T${t}:00`);
  return isNaN(iso.getTime()) ? new Date().toISOString() : iso.toISOString();
}

// Build the request body for /fares/options and /fares/estimate
// Matches allClassesSchema / estimateSchema in fare.schemas.js exactly
function toFareRequest(journey, vehicleCategory) {
  const tripType = toRealTripType(journey.tripType);
  const body = {
    cityId: DEFAULT_CITY_ID,
    tripType,
    pickup: { address: journey.pickup || "Bengaluru" },
    drop:   { address: journey.drop   || "Mysuru" },
    pickupAt: toIsoDateTime(journey.date, journey.time),
    waitingMinutes: 0,
  };

  if (vehicleCategory) {
    body.vehicleClass = toRealVehicleClass(vehicleCategory);
  }

  if (tripType === "ROUND_TRIP") {
    body.returnAt = toIsoDateTime(
      journey.returnDate || journey.date,
      journey.returnTime || "23:59"
    );
  }

  if (tripType === "AIRPORT" && journey.flight) {
    body.flightNumber = journey.flight;
  }

  if (tripType === "HOURLY") {
    // Send rentalHours as fallback — backend requires one of rentalPackageId or rentalHours
    body.rentalHours = journey.rentalHours || 8;
    if (journey.rentalPackageId) body.rentalPackageId = journey.rentalPackageId;
  }

  if (Array.isArray(journey.stops) && journey.stops.length) {
    body.stops = journey.stops.slice(0, 10).map((s) => ({ address: s }));
  }

  return body;
}

// ── Mock ──────────────────────────────────────────────────────────────────────
function mockOptions(journey) {
  return VEHICLE_RATES.map((v) => {
    const km = 200;
    const base = computeFare(v, journey, km);
    return {
      vehicleId: v.id, name: v.name, seats: v.seats, bags: v.bags, ac: v.ac,
      img: v.img, tagline: v.tagline, category: v.category, paxGroup: v.paxGroup,
      features: v.features, gallery: v.gallery,
      local: v.local, outstation: v.outstation,
      fare: base, baseFare: base,
      surge: false, surgeMultiplier: 1,
    };
  });
}

function mockEstimate(journey, vehicleId) {
  const v = VEHICLE_RATES.find((x) => x.id === vehicleId) || VEHICLE_RATES[0];
  const base = computeFare(v, journey, 200);
  return {
    vehicleId: v.id, baseFare: base, fare: base,
    surge: false, surgeMultiplier: 1,
    driverBhata: v.outstation.driverBhata,
  };
}

// Merge backend option (vehicleClass + total) with our local catalogue data
// so the booking-search page has the rich metadata (name, img, seats, etc.)
// that the backend fare API doesn't return.
function mergeOptionWithCatalogue(opt) {
  // Backend returns vehicleClass: "sedan"|"suv"|"tempo"
  // Find best catalogue match
  const catalogueMatch = VEHICLE_RATES.find(
    (v) => toRealVehicleClass(v.category) === opt.vehicleClass
  ) || VEHICLE_RATES[0];

  const total = Number(opt.total ?? opt.fare ?? 0);

  return {
    // Catalogue metadata
    vehicleId:      catalogueMatch.id,
    name:           catalogueMatch.name,
    seats:          catalogueMatch.seats,
    bags:           catalogueMatch.bags,
    ac:             catalogueMatch.ac,
    img:            catalogueMatch.img,
    tagline:        catalogueMatch.tagline,
    category:       catalogueMatch.category,
    paxGroup:       catalogueMatch.paxGroup,
    features:       catalogueMatch.features,
    gallery:        catalogueMatch.gallery,
    local:          catalogueMatch.local,
    outstation:     catalogueMatch.outstation,
    // Real backend fare
    fare:           total,
    baseFare:       total,
    vehicleClass:   opt.vehicleClass,
    // Fare breakdown from backend
    breakdown:      opt.breakdown || [],
    surge:          false,
    surgeMultiplier: 1,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getFareOptions(journey) {
  if (USE_MOCK) return mockOptions(journey);
  try {
    // POST /fares/options — requires auth (router.use(requireAuth))
    const data = await api.post("/fares/options", toFareRequest(journey));
    // Backend returns: { trip, options: [{vehicleClass, total, breakdown, ...}], surge }
    // apiClient unwraps the { success, data } envelope, so data IS the payload
    const rawOptions = Array.isArray(data?.options) ? data.options :
                       Array.isArray(data)          ? data          : [];
    // Deduplicate by vehicleClass — backend may return multiple rows per class
  // (e.g. surge vs no-surge). Keep the cheapest of each class to avoid
  // duplicate keys in the vehicle list.
  const seen = new Set();
  const deduped = rawOptions.filter((opt) => {
    if (seen.has(opt.vehicleClass)) return false;
    seen.add(opt.vehicleClass);
    return true;
  });
  return deduped.map(mergeOptionWithCatalogue);
  } catch (err) {
    if (MOCK_FALLBACK) return mockOptions(journey);
    throw err;
  }
}

export async function estimateFare(journey, vehicleId) {
  if (USE_MOCK) return mockEstimate(journey, vehicleId);
  try {
    const vehicle = VEHICLE_RATES.find((v) => v.id === vehicleId);
    const data = await api.post(
      "/fares/estimate",
      toFareRequest(journey, vehicle?.category)
    );
    const total = Number(data?.total ?? data?.fare ?? 0);
    return { ...data, fare: total, baseFare: total };
  } catch (err) {
    if (MOCK_FALLBACK) return mockEstimate(journey, vehicleId);
    throw err;
  }
}
