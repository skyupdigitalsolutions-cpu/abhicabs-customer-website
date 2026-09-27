// Airports served, shared by the homepage booking widget and the inline trip
// form on /booking-search. It lived inside BookingWidget, which is why the
// inline form had no airport picker at all and produced a different kind of
// airport booking (plain pickup/drop text, no terminal) from the same site.
export const AIRPORTS = [
  { code: "BLR", city: "Bengaluru", name: "Kempegowda International Airport (BLR)",
    terminals: ["Terminal 1 (T1) — Domestic", "Terminal 2 (T2) — International & Domestic"] },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International Airport (HYD)",
    terminals: ["Terminal 1 (T1) — Domestic & International"] },
  { code: "MAA", city: "Chennai", name: "Chennai International Airport (MAA)",
    terminals: ["Terminal 1 (T1) — Domestic", "Terminal 4 (T4) — International"] },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International Airport (BOM)",
    terminals: ["Terminal 1 (T1) — Domestic", "Terminal 2 (T2) — International & Domestic"] },
  { code: "MYQ", city: "Mysuru", name: "Mysore Airport (MYQ)", terminals: ["Terminal 1 — Domestic"] },
  { code: "HBX", city: "Hubballi", name: "Hubballi Airport (HBX)", terminals: ["Terminal 1 — Domestic"] },
  { code: "VGA", city: "Vijayawada", name: "Vijayawada International Airport (VGA)",
    terminals: ["Terminal 1 — Domestic & International"] },
  { code: "IXE", city: "Mangaluru", name: "Mangaluru International Airport (IXE)",
    terminals: ["Terminal 1 — Domestic & International"] },
];
