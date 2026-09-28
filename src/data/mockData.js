export const ROUTES = [
  { from: "Bangalore", to: "Mysore",    km: 145, hrs: "3 – 3.5 hrs", price: 1800, img: "/images/tea-garden-road.jpg",    badge: "Intercity" },
  { from: "Bangalore", to: "Coorg",     km: 260, hrs: "5 – 6 hrs",   price: 3200, img: "/images/mountain-road-full.jpg", badge: "Outstation" },
  { from: "Bangalore", to: "Mangalore", km: 350, hrs: "7 – 8 hrs",   price: 4200, img: "/images/coastal-road-sedan.jpg", badge: "Intercity" },
  { from: "Bangalore", to: "Chennai",   km: 345, hrs: "6 – 7 hrs",   price: 4000, img: "/images/sedan-cityscape.jpg",    badge: "Intercity" },
  { from: "Bangalore", to: "Hyderabad", km: 570, hrs: "9 – 10 hrs",  price: 6200, img: "/images/airport-family-full.jpg",badge: "Long Distance" },
  { from: "Bangalore", to: "Goa",       km: 560, hrs: "9 – 10 hrs",  price: 6000, img: "/images/airport-sunset-sedan.jpg",badge: "Outstation" }
];

export const DRIVERS = ["Ramesh Kumar","Suresh Naik","Anitha Rao","Mohammed Imran","Deepak Shetty","Lakshmi Prasad"];

export function fmtINR(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// Local ("HOURLY") packages are chosen in the UI as a display string —
// "4 hrs / 40 km", "8 hrs / 80 km", "12 hrs / 120 km". Both /fares/* and
// /bookings need the hours as a number. Nothing used to parse this, so
// every local trip was quoted AND booked as a hardcoded 8-hour package no
// matter which one the customer picked — and when the backend had no 8h
// package for that city it rejected the booking outright ("That rental
// package is not available") only at the payment step, after pricing had
// already succeeded.
// The backend prices by vehicleClass, and fare_configs only has these four
// real classes — luxury/premium/bus have no rate card of their own and must
// map onto the nearest one. Shared here so the fares service, the bookings
// service and the UI all resolve a catalogue vehicle to the SAME class
// (they each had their own private copy of this map before).
export const VEHICLE_CLASS_MAP = {
  hatchback: "hatchback",
  sedan:     "sedan",
  suv:       "suv",
  tempo:     "tempo",
  luxury:    "suv",
  premium:   "sedan",
  bus:       "tempo",
};

// The backend's vehicleClass IS a per-car catalogue key — swift-dzire,
// ertiga, innova-crysta, tempo-17, benz-33 … — NOT a generic size band.
// vehicleModels.json states the rule outright: "EACH KEY UNDER `classes` MUST
// EQUAL a vehicle_catalog.key, which must equal the vehicleClass on
// fare_configs", and the retire_sedan_suv migration deactivated the generic
// 'sedan'/'suv' rows as "placeholders from the first seed, from before the
// fleet was modelled car by car".
//
// So this map only bridges the LOCAL catalogue's ids (used for bundled photos
// and feature bullets) to those backend keys. It is not a pricing decision —
// the backend prices each car in its own right.
export const LOCAL_ID_TO_BACKEND_KEY = {
  "swift-desire": "swift-dzire",
  "ertiga":       "ertiga",
  "innova":       "innova",
  "crysta":       "innova-crysta",
  "hycross":      "innova-hycross",
  "tempo-12":     "tempo-12",
  "force-13":     "urbania-13",
  "force-16":     "urbania-16",
  "tempo-17":     "tempo-17",
  "urbania-20":   "urbania-maharaja",
  "benz-22":      "benz-22",
  "benz-28":      "benz-28",
  "benz-33":      "benz-33",
};

const BACKEND_KEY_TO_LOCAL_ID = Object.fromEntries(
  Object.entries(LOCAL_ID_TO_BACKEND_KEY).map(([local, key]) => [key, local])
);

/** Backend vehicleClass for a local catalogue vehicle (or an id/key string). */
export function toBackendVehicleClass(vehicleOrCategory, seatsArg) {
  const isObj = vehicleOrCategory && typeof vehicleOrCategory === "object";
  const id = String((isObj ? vehicleOrCategory.id : vehicleOrCategory) || "").toLowerCase();
  // Already a backend key, or a local id we can translate.
  if (BACKEND_KEY_TO_LOCAL_ID[id]) return id;
  if (LOCAL_ID_TO_BACKEND_KEY[id]) return LOCAL_ID_TO_BACKEND_KEY[id];
  return id || null;
}

export function parseRentalPackage(pkg) {
  if (!pkg) return null;
  const s = String(pkg);
  const h = s.match(/(\d+)\s*h/i);
  const k = s.match(/(\d+)\s*km/i);
  const hours = h ? Number(h[1]) : null;
  if (!hours) return null;
  return { hours, km: k ? Number(k[1]) : null };
}

export function rid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Full Google-autocomplete addresses are long and make a route line
// ("123, Some Long Building Name, Some Long Road, Near Some Landmark,
// Some Area, Bengaluru, Karnataka 560001, India → ...") wrap and look
// cluttered wherever it's shown inline (summary bars, sidebars, invoices).
// Short it down to just the first bit — full address stays available
// on hover via the title attribute wherever this is used.
export function shortAddress(addr, max = 24) {
  if (!addr) return addr || "";
  const first = String(addr).split(",")[0].trim();
  const base = first.length > 2 ? first : String(addr).trim();
  return base.length > max ? base.slice(0, max).trim() + "…" : base;
}
