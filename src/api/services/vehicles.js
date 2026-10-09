// Vehicle catalogue service — the ONLY source of vehicle data on the site.
//
// Backend:
//   GET /vehicles                 (PUBLIC)  → { count, vehicles: [{ key, name,
//        seats, blurb, detail, luggage, glyph, transmission, fuel, rating,
//        trips, heroUrl, images:[{label,url}], cars:[{specs,…}], sortOrder,
//        isActive }] }
//   GET /fares/rental-packages?cityId  (guest auth) → { packages: [{
//        vehicleClass, label, includedHours, includedKm, packageFare,
//        extraPerHour, extraPerKm }] }
//
// Nothing here is bundled or invented: names, seats, luggage, photos, specs
// and every rupee shown on a browse card come from these two calls. When the
// backend has no photo for a class, a neutral placeholder is generated from
// the backend's own `glyph` + `name` rather than borrowing another car's photo.
import { api } from "../client";
import { ensureCitiesLoaded, getDefaultCityId } from "../cities";

let cache = null;          // normalised vehicle list
let inflight = null;
let ratesCache = new Map(); // cityId → Map(vehicleClass → rate)
let ratesInflight = new Map();

export function normaliseKey(key) {
  return String(key || "").trim().toLowerCase();
}

// ── Presentation helpers derived ONLY from backend fields ────────────────────

function placeholderImage(name, glyph) {
  const label = String(name || "Vehicle").replace(/[<>&"]/g, "");
  const icon = String(glyph || "🚗").replace(/[<>&"]/g, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF7DE"/><stop offset="1" stop-color="#F3F2EF"/></linearGradient></defs>` +
    `<rect width="640" height="360" fill="url(#g)"/>` +
    `<text x="320" y="185" font-size="110" text-anchor="middle" dominant-baseline="middle">${icon}</text>` +
    `<text x="320" y="300" font-family="Montserrat,Arial,sans-serif" font-size="26" font-weight="700" fill="#555" text-anchor="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function categoryFor(row, specs) {
  const seats = Number(row.seats) || 0;
  const tags = specs.map((s) => String(s).toLowerCase());
  const premium = tags.some((t) => t.includes("luxury") || t.includes("executive") || t.includes("premium") || t.includes("recliner"));
  if (seats <= 8 && premium) return "luxury";
  if (seats <= 4) return "sedan";
  if (seats <= 8) return "suv";
  if (seats <= 20) return premium ? "luxury" : "tempo";
  return "bus";
}

/** Backend catalogue row → the vehicle shape every screen renders. */
export function normaliseVehicle(row) {
  if (!row || !row.key) return null;
  const car = Array.isArray(row.cars) && row.cars.length ? row.cars[0] : null;
  const specs = Array.isArray(car?.specs) ? car.specs.filter(Boolean) : [];
  const gallery = (Array.isArray(row.images) ? row.images : [])
    .map((i) => i?.url)
    .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  const hero = row.heroUrl || gallery[0] || null;
  const placeholder = placeholderImage(row.name, row.glyph);
  const ac =
    specs.some((s) => /a\/?c/i.test(String(s))) || /a\/c/i.test(String(row.name || ""));

  const features = [
    ...specs,
    row.transmission,
    row.fuel,
  ].filter(Boolean).filter((f, i, a) => a.indexOf(f) === i);

  return {
    id: normaliseKey(row.key),
    key: normaliseKey(row.key),
    vehicleClass: normaliseKey(row.key),
    name: row.name,
    seats: row.seats,
    bags: row.luggage || null,          // backend text, e.g. "2 medium bags"
    ac,
    img: hero || placeholder,
    imgFallback: placeholder,
    hasPhoto: Boolean(hero),
    gallery: gallery.length ? gallery : [hero || placeholder],
    tagline: row.blurb || "",
    detail: row.detail || "",
    glyph: row.glyph || "🚗",
    transmission: row.transmission || null,
    fuel: row.fuel || null,
    specs,
    features,
    category: categoryFor(row, specs),
    rating: row.rating ?? null,
    trips: row.trips ?? null,
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive !== false,
    // Variant grouping — backend sends groupKey (falls back to the row's own
    // key) and variantLabel (null when there is nothing to choose between).
    // Two rows with the same groupKey are drawn as ONE card with a fuel toggle.
    groupKey: normaliseKey(row.groupKey || row.key),
    variantLabel: row.variantLabel || null,
  };
}

// ── Catalogue ────────────────────────────────────────────────────────────────

async function fetchCatalogue() {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = api
    .get("/vehicles", { auth: false })
    .then((data) => {
      const rows = Array.isArray(data?.vehicles) ? data.vehicles : Array.isArray(data) ? data : [];
      cache = rows
        .map(normaliseVehicle)
        .filter((v) => v && v.isActive)
        .sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.name).localeCompare(String(b.name)));
      return cache;
    })
    .finally(() => {
      inflight = null;
    });

  // Errors are NOT swallowed: an unreachable backend must show a real error
  // state, never a bundled stand-in fleet.
  return inflight;
}

/** The full, active, normalised catalogue exactly as the backend has it. */
export async function getVehicleCatalogue() {
  return fetchCatalogue();
}

/** Map keyed by vehicleClass for O(1) lookup (fare options, bookings). */
export async function getVehicleCatalogueMap() {
  const list = await fetchCatalogue().catch(() => []);
  return new Map(list.map((v) => [v.key, v]));
}

/** One vehicle by backend key (fetches the catalogue if needed). */
export async function getVehicleByKey(key) {
  const map = await getVehicleCatalogueMap();
  return map.get(normaliseKey(key)) || null;
}

/** Synchronous lookup in the already-loaded catalogue (null if not loaded). */
export function peekVehicle(key) {
  if (!cache) return null;
  const k = normaliseKey(key);
  return cache.find((v) => v.key === k) || null;
}

export function invalidateVehicleCatalogueCache() {
  cache = null;
  ratesCache = new Map();
}

// ── Local package rates (real rate cards, from the backend) ──────────────────

function pickHeadlinePackage(list) {
  if (!list.length) return null;
  // Prefer the classic 8 hr package; otherwise the smallest one offered.
  const eight = list.find((p) => Number(p.includedHours) === 8);
  const sorted = [...list].sort((a, b) => Number(a.includedHours) - Number(b.includedHours));
  return eight || sorted[0];
}

/**
 * Map(vehicleClass → { label, hours, km, packageFare, extraPerKm,
 * extraPerHour, packages }) for the default (or given) city. Empty map on
 * failure — cards then say "fare on request" instead of showing a number.
 */
export async function getRentalRates(cityIdArg) {
  await ensureCitiesLoaded();
  const cityId = cityIdArg || getDefaultCityId();
  if (ratesCache.has(cityId)) return ratesCache.get(cityId);
  if (ratesInflight.has(cityId)) return ratesInflight.get(cityId);

  const p = api
    .get("/fares/rental-packages", { params: { cityId } })
    .then((data) => {
      const pkgs = Array.isArray(data?.packages) ? data.packages : [];
      const byClass = new Map();
      for (const pkg of pkgs) {
        const k = normaliseKey(pkg.vehicleClass);
        if (!byClass.has(k)) byClass.set(k, []);
        byClass.get(k).push(pkg);
      }
      const out = new Map();
      for (const [k, list] of byClass) {
        const head = pickHeadlinePackage(list);
        if (!head) continue;
        out.set(k, {
          label: head.label || `${head.includedHours} hrs / ${head.includedKm} km`,
          hours: Number(head.includedHours),
          km: Number(head.includedKm),
          packageFare: Number(head.packageFare),
          extraPerKm: Number(head.extraPerKm),
          extraPerHour: Number(head.extraPerHour),
          packages: list,
        });
      }
      ratesCache.set(cityId, out);
      return out;
    })
    .catch(() => new Map())
    .finally(() => ratesInflight.delete(cityId));

  ratesInflight.set(cityId, p);
  return p;
}
