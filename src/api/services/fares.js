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
import { parseRentalPackage, toBackendVehicleClass } from "../../data/mockData";
import { getVehicleCatalogueMap, normaliseVehicle } from "./vehicles";
import { resolveCityId, ensureCitiesLoaded } from "../cities";

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

// Merge a priced backend option (vehicleClass + total + breakdown + surge)
// with the backend catalogue entry for that class (name, seats, luggage,
// photos, specs). Every field comes from the backend — the price from
// /fares/options, the vehicle from /vehicles.
function mergeOptionWithCatalogue(opt, catalogueMap, topLevelSurge) {
  const classKey = String(opt.vehicleClass || "").toLowerCase();
  // A class the backend priced but whose catalogue row is missing still gets
  // a (backend-named) card rather than being hidden or borrowing another car.
  const v = catalogueMap?.get(classKey) ||
    normaliseVehicle({ key: classKey, name: opt.vehicleName || opt.name || classKey, seats: opt.seats });

  const total = Number(opt.total ?? opt.fare ?? 0);

  // Prefer this option's own surge if present; options-list responses attach
  // surge at the top level instead, shared across every class in the list.
  const surgeInfo = opt.surge || topLevelSurge || null;
  const surgeMultiplier = Number(surgeInfo?.multiplier ?? 1);
  const surgePct = Number(surgeInfo?.pct ?? 0);

  return {
    ...v,
    // The backend class key IS the vehicle id everywhere downstream.
    vehicleId:      v.key,
    vehicleClass:   opt.vehicleClass,
    classMatched:   Boolean(catalogueMap?.get(classKey)),

    // Real backend fare — never derived locally.
    fare:           total,
    baseFare:       total,

    breakdown:       opt.breakdown || [],
    // GST as the backend applied it (rate, inclusive/exclusive, amount,
    // payable) — the only source for tax lines on checkout/payment.
    tax:             opt.tax || null,
    driverAllowance: Number(opt.bata ?? 0),
    nightAllowance:  Number(opt.night ?? 0),
    surgeAmount:     Number(opt.surgeAmount ?? 0),

    // Surge is decided once per trip (top-level `surge`), but each vehicle's
    // rate card can cap or exempt it — so a vehicle only "has surge" when ITS
    // own quote carries a surge amount, not merely because the trip does.
    surge:           surgeMultiplier > 1 && Number(opt.surgeAmount ?? 0) > 0,
    surgeMultiplier: Number(opt.meta?.surgeMultiplier ?? surgeMultiplier),
    surgePct,
    surgeTier:       surgeInfo?.tier || null,
    surgeArea:       surgeInfo?.area || null,
    // Backend copy explaining the premium (e.g. "Booked within 4 hours in a
    // village area"), shown instead of a generic line.
    surgeReason:     surgeInfo?.reason || null,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getFareOptions(journey) {
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
    throw err;
  }
}

export async function estimateFare(journey, vehicleId) {
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
      tax: quote?.tax || data?.tax || null,
      driverAllowance: Number(quote?.bata ?? 0),
      nightAllowance: Number(quote?.night ?? 0),
      surgeAmount: Number(quote?.surgeAmount ?? 0),
      surge: Number(surgeInfo?.multiplier ?? 1) > 1 && Number(quote?.surgeAmount ?? 0) > 0,
      surgeMultiplier: Number(quote?.meta?.surgeMultiplier ?? surgeInfo?.multiplier ?? 1),
      surgePct: Number(surgeInfo?.pct ?? 0),
      surgeTier: surgeInfo?.tier || null,
      surgeReason: surgeInfo?.reason || null,
      trip: data?.trip || null,
      switchedToLocal: data?.switchedToLocal || null,
    };
  } catch (err) {
    throw err;
  }
}
