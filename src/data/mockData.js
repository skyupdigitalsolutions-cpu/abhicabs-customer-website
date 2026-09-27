export const ROUTES = [
  { from: "Bangalore", to: "Mysore",    km: 145, hrs: "3 – 3.5 hrs", price: 1800, img: "/images/tea-garden-road.jpg",    badge: "Intercity" },
  { from: "Bangalore", to: "Coorg",     km: 260, hrs: "5 – 6 hrs",   price: 3200, img: "/images/mountain-road-full.jpg", badge: "Outstation" },
  { from: "Bangalore", to: "Mangalore", km: 350, hrs: "7 – 8 hrs",   price: 4200, img: "/images/coastal-road-sedan.jpg", badge: "Intercity" },
  { from: "Bangalore", to: "Chennai",   km: 345, hrs: "6 – 7 hrs",   price: 4000, img: "/images/sedan-cityscape.jpg",    badge: "Intercity" },
  { from: "Bangalore", to: "Hyderabad", km: 570, hrs: "9 – 10 hrs",  price: 6200, img: "/images/airport-family-full.jpg",badge: "Long Distance" },
  { from: "Bangalore", to: "Goa",       km: 560, hrs: "9 – 10 hrs",  price: 6000, img: "/images/airport-sunset-sedan.jpg",badge: "Outstation" }
];

export const VEHICLE_RATES = [
  // ── Sedans ──
  {
    id: "swift-desire", name: "Swift Desire A/C", seats: 4, bags: 2, ac: true,
    category: "sedan", paxGroup: "small",
    img: "/images/swift.jpg",
    gallery: ["/images/swift.jpg", "/images/sedan-studio.jpg", "/images/dashboard-pov.jpg"],
    tagline: "Comfortable sedan for small groups",
    features: ["Air Conditioned", "Music System", "GPS Tracking", "Verified Driver", "2 Luggage Bags"],
    local:      { base8hr80km: 2000, extraKm: 14 },
    outstation: { perKm: 14, driverBhata: 500 }
  },
  // ── SUVs ──
  {
    id: "ertiga", name: "Ertiga A/C 7 Seater", seats: 7, bags: 3, ac: true,
    category: "suv", paxGroup: "small",
    img: "/images/ertiga.jpg",
    gallery: ["/images/ertiga.jpg", "/images/interior-seats.jpg", "/images/dashboard-pov.jpg"],
    tagline: "Versatile MPV great for families",
    features: ["Air Conditioned", "7 Spacious Seats", "GPS Tracking", "Verified Driver", "3 Luggage Bags"],
    local:      { base8hr80km: 2000, extraKm: 10 },
    outstation: { perKm: 10, driverBhata: 500 }
  },
  {
    id: "innova", name: "Innova A/C 8 Seater", seats: 8, bags: 4, ac: true,
    category: "suv", paxGroup: "small",
    img: "/images/innova.jpg",
    gallery: ["/images/innova.jpg", "/images/interior-seats.jpg", "/images/dashboard-pov.jpg"],
    tagline: "India's favourite road-trip SUV",
    features: ["Air Conditioned", "Pushback Seats", "USB Charging", "GPS Tracking", "4 Luggage Bags"],
    local:      { base8hr80km: 2500, extraKm: 18 },
    outstation: { perKm: 18, driverBhata: 500 }
  },
  // ── Premium ──
  {
    id: "crysta", name: "Innova Crysta A/C 8 Seater", seats: 8, bags: 4, ac: true,
    category: "premium", paxGroup: "small",
    img: "/images/innovacyta.jpg",
    gallery: ["/images/innovacyta.jpg", "/images/interior-seats.jpg", "/images/dashboard-pov.jpg"],
    tagline: "Premium comfort for every occasion",
    features: ["Premium A/C", "Captain Seats", "Ambient Lighting", "USB Charging", "GPS Tracking"],
    local:      { base8hr80km: 3000, extraKm: 20 },
    outstation: { perKm: 20, driverBhata: 500 }
  },
  {
    id: "hycross", name: "Hycross A/C 8 Seater", seats: 8, bags: 4, ac: true,
    category: "luxury", paxGroup: "small",
    img: "/images/sedan-studio.jpg",
    gallery: ["/images/sedan-studio.jpg", "/images/interior-seats.jpg", "/images/dashboard-pov.jpg"],
    tagline: "Hybrid luxury SUV, refined & spacious",
    features: ["Hybrid Engine", "Panoramic Roof", "Premium Leather", "360° Camera", "GPS Tracking"],
    local:      { base8hr80km: 3500, extraKm: 25 },
    outstation: { perKm: 25, driverBhata: 500 }
  },
  // ── Mini Coaches ──
  {
    id: "tempo-12", name: "12 Seater Tempo Traveler A/C", seats: 12, bags: 6, ac: true,
    category: "tempo", paxGroup: "medium",
    img: "/images/12seatertempo.jpg",
    gallery: ["/images/12seatertempo.jpg", "/images/interior-seats.jpg", "/images/dashboard-pov.jpg"],
    tagline: "Ideal for group outings & pilgrimages",
    features: ["Push-back Seats", "Roof Carrier", "A/C Throughout", "GPS Tracking", "6 Luggage Bags"],
    local:      { base8hr80km: 5000, extraKm: 27 },
    outstation: { perKm: 27, driverBhata: 700 }
  },
  {
    id: "force-13", name: "13 Seater Force Urbania A/C", seats: 13, bags: 6, ac: true,
    category: "tempo", paxGroup: "medium",
    img: "/images/12seaterurbian.jpg",
    gallery: ["/images/12seaterurbian.jpg", "/images/13seater.jpg", "/images/interior-seats.jpg"],
    tagline: "Compact coach, great for office trips",
    features: ["Recliner Seats", "LED Lighting", "A/C", "GPS Tracking", "6 Luggage Bags"],
    local:      { base8hr80km: 7000, extraKm: 35 },
    outstation: { perKm: 35, driverBhata: 700 }
  },
  {
    id: "force-16", name: "16 Seater Force Urbania A/C", seats: 16, bags: 8, ac: true,
    category: "tempo", paxGroup: "medium",
    img: "/images/14seatre.jpg",
    gallery: ["/images/14seatre.jpg", "/images/13seater.jpg", "/images/interior-seats.jpg"],
    tagline: "Spacious coach for larger groups",
    features: ["High-back Seats", "Reading Lights", "A/C", "GPS Tracking", "8 Luggage Bags"],
    local:      { base8hr80km: 7500, extraKm: 25 },
    outstation: { perKm: 25, driverBhata: 900 }
  },
  {
    id: "tempo-17", name: "17 Seater Tempo Traveler A/C", seats: 17, bags: 8, ac: true,
    category: "tempo", paxGroup: "medium",
    img: "/images/17seater.jpg",
    gallery: ["/images/17seater.jpg", "/images/12seatertempo.jpg", "/images/interior-seats.jpg"],
    tagline: "Mid-size coach for outstation tours",
    features: ["Push-back Seats", "Roof Carrier", "A/C", "GPS Tracking", "8 Luggage Bags"],
    local:      { base8hr80km: 6000, extraKm: 33 },
    outstation: { perKm: 33, driverBhata: 700 }
  },
  {
    id: "urbania-20", name: "20 Seater Urbania Premium", seats: 20, bags: 8, ac: true,
    category: "luxury", paxGroup: "medium",
    img: "/images/12seaterurbian.jpg",
    gallery: ["/images/12seaterurbian.jpg", "/images/interior-seats.jpg", "/images/dashboard-pov.jpg"],
    tagline: "Luxury Maharaja coach with plush seats",
    features: ["Maharaja Seats", "LCD Screen", "Premium A/C", "Ambient Lighting", "GPS Tracking"],
    local:      { base8hr80km: 8000, extraKm: 40 },
    outstation: { perKm: 40, driverBhata: 900 }
  },
  {
    id: "benz-22", name: "22 Seater Bharat Benz Luxury A/C", seats: 22, bags: 10, ac: true,
    category: "bus", paxGroup: "medium",
    img: "/images/22seater.jpg",
    gallery: ["/images/22seater.jpg", "/images/interior-seats.jpg", "/images/dashboard-pov.jpg"],
    tagline: "Premium bus with air suspension",
    features: ["Air Suspension", "Recliner Seats", "Premium A/C", "GPS Tracking", "10 Luggage Bags"],
    local:      { base8hr80km: 8500, extraKm: 50 },
    outstation: { perKm: 50, driverBhata: 1200 }
  },
  // ── Full Coaches / Buses ──
  {
    id: "benz-28", name: "28 Seater Bharat Benz Luxury A/C", seats: 28, bags: 12, ac: true,
    category: "bus", paxGroup: "large",
    img: "/images/28seater.jpg",
    gallery: ["/images/28seater.jpg", "/images/22seater.jpg", "/images/interior-seats.jpg"],
    tagline: "Full-size luxury bus for big groups",
    features: ["Air Suspension", "Recliner Seats", "Onboard A/C", "GPS Tracking", "12 Luggage Bags"],
    local:      { base8hr80km: 9500, extraKm: 55 },
    outstation: { perKm: 55, driverBhata: 1200 }
  },
  {
    id: "benz-33", name: "33 Seater Bharat Benz Executive A/C", seats: 33, bags: 14, ac: true,
    category: "bus", paxGroup: "large",
    img: "/images/33seater.jpg",
    gallery: ["/images/33seater.jpg", "/images/28seater.jpg", "/images/interior-seats.jpg"],
    tagline: "Executive bus for corporate travel",
    features: ["Executive Seats", "Luggage Bay", "Dual A/C", "GPS Tracking", "14 Luggage Bags"],
    local:      { base8hr80km: 10000, extraKm: 58 },
    outstation: { perKm: 58, driverBhata: 1200 }
  }
];


export const DRIVERS = ["Ramesh Kumar","Suresh Naik","Anitha Rao","Mohammed Imran","Deepak Shetty","Lakshmi Prasad"];

export function computeFare(vehicle, journey, distanceKm) {
  const isLocal = journey.tripType === "local";
  const isRound = journey.tripType === "round-trip";
  const km = distanceKm || 145;
  if (isLocal) return vehicle.local.base8hr80km;
  return Math.round(vehicle.outstation.perKm * (isRound ? km * 1.9 : km));
}

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

/** The bundled catalogue entry for a backend key, for photos/features only. */
export function localVehicleForKey(key) {
  const localId = BACKEND_KEY_TO_LOCAL_ID[String(key || "").toLowerCase()];
  return localId ? VEHICLE_RATES.find((v) => v.id === localId) || null : null;
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
