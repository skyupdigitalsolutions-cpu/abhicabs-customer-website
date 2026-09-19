// Fares & vehicle options service
import { api } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { VEHICLE_RATES, computeFare } from "../../data/mockData";

// ── Real backend constants (confirmed against fare.schemas.js / seed data) ──
// Only ONE city is seeded: Bengaluru, and City.id is a Postgres autoincrement
// starting at 1 with no other city ever inserted, so this is safe today. If a
// second city is added later, this needs a real city-picker instead.
const DEFAULT_CITY_ID = 1;

// The real backend only prices 4 generic vehicle classes per city — NOT the
// rich 17-vehicle catalogue (Swift Desire, Innova Crysta, etc.) this site
// displays. Map each catalogue category to the closest real class so live
// fare calls are accepted; the catalogue itself still drives what's SHOWN.
const VEHICLE_CLASS_MAP = {
  sedan: "sedan", premium: "sedan", luxury: "suv",
  suv: "suv", tempo: "tempo", bus: "tempo",
};
function toRealVehicleClass(category) {
  return VEHICLE_CLASS_MAP[category] || "sedan";
}

// Real backend trip type enum: ONE_WAY | ROUND_TRIP | AIRPORT | HOURLY
// (there is no "local" value — that's HOURLY on this backend).
const TRIP_TYPE_MAP = {
  "one-way": "ONE_WAY",
  "round-trip": "ROUND_TRIP",
  "airport": "AIRPORT",
  "local": "HOURLY",
  "multi-city": "ONE_WAY", // priced as one-way; stops carry the via-cities
};
function toRealTripType(tripType) {
  return TRIP_TYPE_MAP[tripType] || "ONE_WAY";
}

// Combine separate date+time fields into the ISO datetime string the real
// backend requires for pickupAt/returnAt.
function toIsoDateTime(date, time) {
  if (!date) return undefined;
  const t = time || "00:00";
  const iso = new Date(`${date}T${t}:00`);
  return isNaN(iso.getTime()) ? undefined : iso.toISOString();
}

// ── Mock implementations ─────────────────────────────────────────────────────
function mockOptions(journey) {
  return VEHICLE_RATES.map((v) => {
    const km = 200;
    const base = computeFare(v, journey, km);
    const fare = Math.round(base * (journey.surgeMultiplier || 1));
    return {
      vehicleId: v.id, name: v.name, seats: v.seats, bags: v.bags, ac: v.ac,
      img: v.img, tagline: v.tagline, category: v.category, paxGroup: v.paxGroup,
      features: v.features, gallery: v.gallery,
      local: v.local, outstation: v.outstation,
      fare, baseFare: base,
      surge: !!journey.surge, surgeMultiplier: journey.surgeMultiplier || 1
    };
  });
}

function mockEstimate(journey, vehicleId) {
  const v = VEHICLE_RATES.find((x) => x.id === vehicleId) || VEHICLE_RATES[0];
  const base = computeFare(v, journey, 200);
  const fare = Math.round(base * (journey.surgeMultiplier || 1));
  return {
    vehicleId: v.id, baseFare: base, fare,
    surge: !!journey.surge, surgeMultiplier: journey.surgeMultiplier || 1,
    driverBhata: v.outstation.driverBhata
  };
}

// ── Map a frontend journey to the REAL backend fare request shape ───────────
// Confirmed field-by-field against src/validators/fare.schemas.js's
// baseQuote/allClassesSchema/estimateSchema on the actual backend.
function toFareRequest(journey, vehicleCategory) {
  const body = {
    cityId: DEFAULT_CITY_ID,
    tripType: toRealTripType(journey.tripType),
    // Real schema: pickup/drop are OBJECTS { address } or { lat, lng } —
    // never plain strings.
    pickup: { address: journey.pickup },
    drop: { address: journey.drop },
    pickupAt: toIsoDateTime(journey.date, journey.time),
    waitingMinutes: 0,
  };
  if (vehicleCategory) body.vehicleClass = toRealVehicleClass(vehicleCategory);
  if (journey.tripType === "round-trip") {
    body.returnAt = toIsoDateTime(journey.returnDate, journey.returnTime);
  }
  if (journey.tripType === "airport" && journey.flight) {
    body.flightNumber = journey.flight;
  }
  if (Array.isArray(journey.stops) && journey.stops.length) {
    // Real schema: stops is an array of the same { address } / { lat, lng }
    // location objects as pickup/drop, max 10.
    body.stops = journey.stops.slice(0, 10).map((s) => ({ address: s }));
  }
  return body;
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function getFareOptions(journey) {
  if (USE_MOCK) return mockOptions(journey);
  try {
    // POST /fares/options — prices every vehicle class for the route
    const data = await api.post("/fares/options", toFareRequest(journey), { auth: false });
    return data;
  } catch (err) {
    if (MOCK_FALLBACK) return mockOptions(journey);
    throw err;
  }
}

export async function estimateFare(journey, vehicleId) {
  if (USE_MOCK) return mockEstimate(journey, vehicleId);
  try {
    const vehicle = VEHICLE_RATES.find((v) => v.id === vehicleId);
    // POST /fares/estimate — server owns all pricing; vehicleClass is
    // required here (unlike /options, where it's optional).
    return await api.post("/fares/estimate", toFareRequest(journey, vehicle?.category), { auth: false });
  } catch (err) {
    if (MOCK_FALLBACK) return mockEstimate(journey, vehicleId);
    throw err;
  }
}
