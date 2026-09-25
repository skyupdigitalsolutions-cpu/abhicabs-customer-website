// Fares service — maps frontend journey shape to backend API contract
// Backend: POST /fares/options  → { trip, options: [{vehicleClass, total,
//            breakdown, base, distance, bata, night, surgeAmount, …}], surge }
//          POST /fares/estimate → { quote: {same shape as one option}, surge, trip }
//
// Every rupee shown to the rider — base fare, driver allowance (bata), night
// allowance, surge/demand pricing, minimum-fare top-up, rounding — comes from
// these two calls. Nothing here computes or overrides a fare; this file only
// reshapes the backend's answer for the UI and attaches the real vehicle
// photo/name from the catalogue (see vehicles.js) in place of it.
import { api } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { VEHICLE_RATES, computeFare } from "../../data/mockData";
import { getVehicleCatalogueMap } from "./vehicles";

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
      surge: false, surgeMultiplier: 1, surgePct: 0,
      breakdown: [],
    };
  });
}

function mockEstimate(journey, vehicleId) {
  const v = VEHICLE_RATES.find((x) => x.id === vehicleId) || VEHICLE_RATES[0];
  const base = computeFare(v, journey, 200);
  return {
    vehicleId: v.id, baseFare: base, fare: base,
    surge: false, surgeMultiplier: 1, surgePct: 0,
    driverBhata: v.outstation.driverBhata,
    breakdown: [],
  };
}

// Merge a priced backend option (vehicleClass + total + breakdown + surge)
// with the real vehicle catalogue entry for that class (real photo, name,
// seats, rating — see vehicles.js) so the card shows an actual uploaded
// vehicle photo instead of a stock mock image. The local mock catalogue is
// used only to fill in presentation details the backend catalogue doesn't
// carry yet (feature bullets, gallery, tagline) — never for the price.
function mergeOptionWithCatalogue(opt, catalogueMap, topLevelSurge) {
  const classKey = String(opt.vehicleClass || "").toLowerCase();
  const realVehicle = catalogueMap?.get(classKey) || null;

  // Local mock entry for the same class, used only for cosmetic fallbacks
  // (features/gallery/tagline) that the real catalogue doesn't model yet.
  const mockMatch = VEHICLE_RATES.find((v) => toRealVehicleClass(v.category) === classKey)
    || VEHICLE_RATES[0];

  const total = Number(opt.total ?? opt.fare ?? 0);

  // Prefer this option's own surge if present; options-list responses attach
  // surge at the top level instead, shared across every class in the list.
  const surgeInfo = opt.surge || topLevelSurge || null;
  const surgeMultiplier = Number(surgeInfo?.multiplier ?? 1);
  const surgePct = Number(surgeInfo?.pct ?? 0);

  return {
    // IMPORTANT: vehicleId stays the MOCK catalogue id, never the backend
    // class key. Several pages downstream (cab-details, checkout, payment)
    // still look vehicles up with VEHICLE_RATES.find(v => v.id === vehicleId)
    // for cosmetic fields the real catalogue doesn't carry (bags, features,
    // gallery). The real class lives separately in `vehicleClass` below —
    // that's what any backend call (fare re-quote, booking creation) must use.
    vehicleId:      mockMatch.id,
    name:           realVehicle?.name || mockMatch.name,
    seats:          realVehicle?.seats ?? mockMatch.seats,
    bags:           mockMatch.bags,
    ac:             mockMatch.ac,
    img:            realVehicle?.heroUrl || mockMatch.img,
    gallery:        (realVehicle?.images?.length ? realVehicle.images.map((i) => i.url) : mockMatch.gallery),
    tagline:        realVehicle?.blurb || mockMatch.tagline,
    rating:         realVehicle?.rating ?? null,
    category:       mockMatch.category,
    paxGroup:       mockMatch.paxGroup,
    features:       mockMatch.features,
    local:          mockMatch.local,
    outstation:     mockMatch.outstation,

    // Real backend fare — never derived locally.
    fare:           total,
    baseFare:       total,
    vehicleClass:   opt.vehicleClass,

    // Real fare breakdown from the backend (base, distance, driver
    // allowance/bata, night allowance, surge, minimum-fare top-up, rounding).
    breakdown:      opt.breakdown || [],
    // The individual named components too, for screens that want a single
    // line rather than the full breakdown (e.g. "+ Driver Allowance").
    driverAllowance: Number(opt.bata ?? 0),
    nightAllowance:  Number(opt.night ?? 0),
    surgeAmount:     Number(opt.surgeAmount ?? 0),

    // Real surge/demand-pricing info from the backend, not a hardcoded false.
    surge:           surgeMultiplier > 1,
    surgeMultiplier,
    surgePct,
    surgeTier:       surgeInfo?.tier || null,
    surgeArea:       surgeInfo?.area || null,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getFareOptions(journey) {
  if (USE_MOCK) return mockOptions(journey);
  try {
    // POST /fares/options — requires auth (router.use(requireAuth))
    const [data, catalogueMap] = await Promise.all([
      api.post("/fares/options", toFareRequest(journey)),
      getVehicleCatalogueMap(),
    ]);
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
    return deduped.map((opt) => mergeOptionWithCatalogue(opt, catalogueMap, data?.surge));
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
    // /fares/estimate nests the priced result under `quote` (see
    // quote.service.js#getQuote) rather than flattening it like /fares/options
    // does — unlike options, this is ONE class, so the response carries more
    // context (rentalPackage info, switchedToLocal, etc.) alongside it.
    const quote = data?.quote || data;
    const total = Number(quote?.total ?? data?.total ?? data?.fare ?? 0);
    const surgeInfo = data?.surge || null;
    return {
      ...quote,
      fare: total,
      baseFare: total,
      breakdown: quote?.breakdown || [],
      driverAllowance: Number(quote?.bata ?? 0),
      nightAllowance: Number(quote?.night ?? 0),
      surgeAmount: Number(quote?.surgeAmount ?? 0),
      surge: Number(surgeInfo?.multiplier ?? 1) > 1,
      surgeMultiplier: Number(surgeInfo?.multiplier ?? 1),
      surgePct: Number(surgeInfo?.pct ?? 0),
      surgeTier: surgeInfo?.tier || null,
      trip: data?.trip || null,
      switchedToLocal: data?.switchedToLocal || null,
    };
  } catch (err) {
    if (MOCK_FALLBACK) return mockEstimate(journey, vehicleId);
    throw err;
  }
}
