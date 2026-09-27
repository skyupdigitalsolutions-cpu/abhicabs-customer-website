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
import { api, ApiError } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { VEHICLE_RATES, computeFare, parseRentalPackage, toBackendVehicleClass, localVehicleForKey } from "../../data/mockData";
import { getVehicleCatalogueMap } from "./vehicles";
import { resolveCityId, ensureCitiesLoaded } from "../cities";

// Only a genuinely unreachable backend may fall back to mock prices. A
// business rejection (OUTSIDE_SERVICE_AREA, CITY_NOT_SERVICED, no rate card,
// validation) MUST bubble up — previously `if (MOCK_FALLBACK) return
// mockOptions()` swallowed those too, so an out-of-service pickup came back
// looking like a normal priced list and the booking sailed through.
// Same rule bookings.js already applies.
function isGenuineNetworkFailure(err) {
  return err instanceof ApiError && (err.status === 0 || err.code === "NETWORK_ERROR");
}

// vehicleClass mapping lives in src/data/mockData.js so the fares service,
// the bookings service and the UI all resolve a vehicle to the SAME class —
// they each kept a private copy before, which is how a directly-chosen
// vehicle could be priced under one class and booked under another.
const toRealVehicleClass = toBackendVehicleClass;

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
function toFareRequest(journey, vehicleCategory, vehicleSeats) {
  const tripType = toRealTripType(journey.tripType);
  const body = {
    // Correct city's rate card for this pickup (Bengaluru today; routes
    // automatically once more cities exist — see src/api/cities.js).
    cityId: resolveCityId(journey),
    tripType,
    pickup: { address: journey.pickup || "Bengaluru" },
    pickupAt: toIsoDateTime(journey.date, journey.time),
    waitingMinutes: 0,
  };

  // Drop is OPTIONAL in the backend schema (allClassesSchema/estimateSchema)
  // and the quote service defaults it to the pickup for HOURLY, skipping the
  // distance leg entirely. The old `drop: { address: journey.drop || "Mysuru" }`
  // invented a destination: a local/hourly Bengaluru rental was quoted with a
  // Bengaluru→Mysuru leg, and a one-way with an empty drop silently priced a
  // ~150 km intercity trip the customer never asked for. Send it only when
  // there really is one.
  if (tripType !== "HOURLY" && journey.drop && String(journey.drop).trim()) {
    body.drop = { address: String(journey.drop).trim() };
  }

  // Per-car catalogue key, not a size band.
  const cls = toRealVehicleClass(vehicleCategory, vehicleSeats);
  if (cls) body.vehicleClass = cls;

  if (tripType === "ROUND_TRIP") {
    body.returnAt = toIsoDateTime(
      journey.returnDate || journey.date,
      journey.returnTime || "23:59"
    );
  }


  if (tripType === "HOURLY") {
    // Honour the package the customer actually picked ("4 hrs / 40 km" etc).
    // This used to hardcode 8, so a 4h or 12h selection was priced as 8h.
    const pkg = parseRentalPackage(journey.package);
    body.rentalHours = journey.rentalHours || pkg?.hours || 8;
    if (pkg?.km) body.rentalKm = pkg.km;
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
  // NOTE: there is no `hatchback` entry in VEHICLE_RATES, so that class
  // finds nothing and falls through to VEHICLE_RATES[0] — Swift Dzire. That
  // borrowed id/photo made the hatchback option render as a second Swift
  // Dzire card, and match `?vehicle=swift-desire` too, so BOTH cards lit up
  // as "✓ Your Selection". `classMatched` below flags that case so the UI
  // can tell a real catalogue vehicle from a borrowed stand-in.
  // The backend row IS the vehicle — vehicle_catalog.key equals the
  // vehicleClass on fare_configs, one row per real car. The bundled list is
  // consulted only for cosmetics it doesn't carry (feature bullets, gallery,
  // tagline), matched through the explicit key map rather than guessed.
  const exactMatch = localVehicleForKey(classKey);
  const mockMatch = exactMatch || VEHICLE_RATES[0];
  // A class the backend priced is real and bookable whether or not the
  // bundled list happens to know it, so never hide it on that basis.
  const classMatched = Boolean(exactMatch || realVehicle);

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
    // True only when this class genuinely exists in the catalogue. When
    // false the name/photo are a borrowed stand-in and must never be
    // treated as the customer's specifically-chosen vehicle.
    classMatched,
    name:           realVehicle?.name || exactMatch?.name || mockMatch.name,
    seats:          realVehicle?.seats ?? exactMatch?.seats ?? mockMatch.seats,
    bags:           realVehicle?.luggage || mockMatch.bags,
    ac:             mockMatch.ac,
    img:            realVehicle?.heroUrl || mockMatch.img,
    // A guaranteed-local image for this class, used if the real heroUrl (a
    // Cloudinary URL that can 404 or be replaced) fails to load in the browser.
    imgFallback:    mockMatch.img,
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
    // Make sure the serviced-city list is loaded so this pickup prices against
    // the right city's rate card (auto-picks up cities added on the backend).
    await ensureCitiesLoaded();
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
    const merged = deduped.map((opt) => mergeOptionWithCatalogue(opt, catalogueMap, data?.surge));

    // quote.service.quoteAllClasses already lists ONLY classes with an active
    // vehicle_catalog row (that is how retire_sedan_suv took the generic
    // placeholders off every fare screen). So whatever comes back is exactly
    // the fleet the admin has switched on — return it as-is and let the
    // backend remain the single source of truth for what exists.
    return merged;
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return mockOptions(journey);
    throw err;
  }
}

export async function estimateFare(journey, vehicleId) {
  if (USE_MOCK) return mockEstimate(journey, vehicleId);
  try {
    await ensureCitiesLoaded();
    // vehicleId may already be a backend catalogue key; toBackendVehicleClass
    // passes those straight through and translates bundled local ids.
    const data = await api.post(
      "/fares/estimate",
      toFareRequest(journey, vehicleId)
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
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return mockEstimate(journey, vehicleId);
    throw err;
  }
}
