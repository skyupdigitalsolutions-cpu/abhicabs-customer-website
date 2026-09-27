// Bookings service — matches actual backend contract exactly
// POST /bookings          body: createBookingSchema → { booking, payment, billing }
// GET  /bookings          query: listBookingsQuerySchema → paginated({ items, pagination })
// GET  /bookings/:id      → { booking }
// GET  /bookings/number/:bookingNumber → { booking }
// GET  /bookings/:id/summary → { booking, payments, allocation, invoice, liveLocation }
// GET  /bookings/:id/actions → { actions }
// GET  /bookings/:id/cancellation-quote → { fee, refund }
// POST /bookings/:id/cancel body: { reason } → { booking }
// GET  /bookings/:id/invoice → { invoice }
import { api, ApiError } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { rid, parseRentalPackage, toBackendVehicleClass } from "../../data/mockData";
import { resolveCityId, ensureCitiesLoaded } from "../cities";

// ── Idempotency key ───────────────────────────────────────────────────────────
// Generate a FRESH key on every createBooking call.
// Caching the key across calls caused "Idempotency-Key was already used with
// a different request body" — the backend rejects the same key with a
// different payload (e.g. different vehicle, route, or retry after an error).
// One fresh UUID per button-click gives exactly the right guarantee:
// double-clicking "Confirm" won't create two bookings, but a new booking
// attempt always gets its own key.
function generateIdempotencyKey() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "idem-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

// Kept for any external callers — safe to remove in a future cleanup.
export function clearCheckoutIdempotencyKey() {}

function isGenuineNetworkFailure(err) {
  return err instanceof ApiError && (err.status === 0 || err.code === "NETWORK_ERROR");
}

// ── Trip type / vehicle class maps ────────────────────────────────────────────
const TRIP_TYPE_MAP = {
  "one-way":    "ONE_WAY",
  "oneway":     "ONE_WAY",
  "round-trip": "ROUND_TRIP",
  "roundtrip":  "ROUND_TRIP",
  "airport":    "AIRPORT",
  "local":      "HOURLY",
  "hourly":     "HOURLY",
};


// ── Build createBookingSchema-compatible body ──────────────────────────────────
// Matches createBookingSchema in booking.schemas.js field-for-field
function toBookingRequest(p) {
  const tripType     = TRIP_TYPE_MAP[(p.tripType || "").toLowerCase()] || "ONE_WAY";
  // Prefer the class the fare was actually QUOTED under (carried through from
  // /fares/options via selectedCab.vehicleClass). Deriving it again from the
  // catalogue category risks booking a different class than was priced —
  // which the customer would see as a changed fare at the last step.
  const vehicleClass = p.vehicleClass || toBackendVehicleClass(p.vehicleCategory, p.vehicleSeats);
  const pickupAt     = p.date && p.time
    ? new Date(`${p.date}T${p.time}:00`).toISOString()
    : new Date().toISOString();
  const paymentMode  = p.paymentMode || "FULL";

  const body = {
    cityId:      resolveCityId(p),
    vehicleClass,
    tripType,
    pickup:      { address: p.pickup },
    drop:        tripType === "HOURLY" ? { address: p.pickup } : { address: p.drop },
    pickupAt,
    scheduled:   true,
    paymentMode,
  };

  // Stops
  if (Array.isArray(p.stops) && p.stops.length) {
    body.stops = p.stops.map((s) => ({ address: s }));
  }

  // ROUND_TRIP — returnAt required by schema
  if (tripType === "ROUND_TRIP") {
    const returnDate = p.returnDate || p.date;
    const returnTime = p.returnTime || "23:59";
    body.returnAt = new Date(`${returnDate}T${returnTime}:00`).toISOString();
  }


  // HOURLY — schema requires rentalPackageId OR rentalHours
  if (tripType === "HOURLY") {
    // Must match exactly what /fares priced, or the booking is rejected
    // after the customer has already seen and accepted a fare.
    const pkg = parseRentalPackage(p.package);
    if (p.rentalPackageId) {
      body.rentalPackageId = p.rentalPackageId;
    } else {
      body.rentalHours = p.rentalHours || pkg?.hours || 8;
      if (pkg?.km) body.rentalKm = pkg.km;
    }
  }

  // Special requests from notes field
  if (p.notes) {
    body.specialRequests = p.notes;
  }

  // Passenger contact. REQUIRED for a guest booking — the backend rejects a
  // guest booking with GUEST_CONTACT_REQUIRED if there's no name + phone, since
  // the driver needs someone to call and the invoice needs a name. Harmlessly
  // ignored for a signed-in (non-guest) customer, whose details come from their
  // account. Always sent so login is never required to complete a booking.
  const contactName = p.passengerName || p.fullName;
  if (contactName) body.guestName = String(contactName).trim();
  if (p.mobile)    body.guestPhone = String(p.mobile).trim();
  if (p.email)     body.guestEmail = String(p.email).trim();

  // Promo code. createBookingSchema accepts `promoCode` and booking.service
  // re-validates it against the fare it prices itself — so without this the
  // discount the rider was shown at checkout was NEVER applied to what they
  // were actually charged, and no redemption was recorded against the code
  // (no usedCount, no audit trail, single-use limits unenforceable).
  const promo = p.promoCode || p.discountCode;
  if (promo) body.promoCode = String(promo).trim().toUpperCase();

  return body;
}

// ── Mock ──────────────────────────────────────────────────────────────────────
function mockCreateBooking(payload) {
  return {
    id:            rid("ABHI"),
    bookingId:     rid("ABHI"),
    bookingNumber: rid("ABHI"),
    status:        "PENDING",
    ...payload,
    createdAt: new Date().toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function createBooking(payload) {
  if (USE_MOCK) return mockCreateBooking(payload);
  try {
    await ensureCitiesLoaded();
    const data = await api.post("/bookings", toBookingRequest(payload), {
      idempotent:     true,
      idempotencyKey: generateIdempotencyKey(),
    });

    // Backend returns: { booking, payment: { mode, advanceDue, balanceDue, total }, billing }
    // apiClient has already unwrapped the { success, data } envelope
    const booking = data.booking || data;
    return {
      ...payload,
      ...data,
      ...booking,
      id:            booking.id,
      bookingId:     booking.bookingNumber || booking.id,
      bookingNumber: booking.bookingNumber,
    };
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return mockCreateBooking(payload);
    throw err;
  }
}

export async function getBooking(bookingId) {
  if (USE_MOCK) return null;
  // Backend: GET /bookings/:id → { success, data: { booking } }
  // apiClient unwraps to { booking }
  const data = await api.get(`/bookings/${bookingId}`);
  return data?.booking || data;
}

export async function getBookingByNumber(bookingNumber) {
  if (USE_MOCK) return null;
  const data = await api.get(`/bookings/number/${bookingNumber}`);
  return data?.booking || data;
}

export async function getBookingSummary(bookingId) {
  if (USE_MOCK) return null;
  // Backend: GET /bookings/:id/summary → { booking, payments, allocation, invoice, liveLocation }
  return api.get(`/bookings/${bookingId}/summary`);
}

export async function getValidActions(bookingId) {
  if (USE_MOCK) return { actions: [] };
  return api.get(`/bookings/${bookingId}/actions`);
}

export async function getCancellationQuote(bookingId) {
  if (USE_MOCK) return { fee: 0, refund: 0 };
  return api.get(`/bookings/${bookingId}/cancellation-quote`);
}

export async function cancelBooking(bookingId, reason) {
  if (USE_MOCK) return { status: "CANCELLED" };
  // Backend lifecycle.schemas.js cancelSchema: { reason: string min(3) max(500) }
  return api.post(`/bookings/${bookingId}/cancel`, { reason }, { idempotent: true });
}

export async function getInvoice(bookingId) {
  if (USE_MOCK) return null;
  const data = await api.get(`/bookings/${bookingId}/invoice`);
  return data?.invoice || data;
}

export async function listMyBookings(params = {}) {
  if (USE_MOCK) return { items: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
  // Backend list returns paginated({ items, pagination }) shape directly in data
  const data = await api.get("/bookings", { params });
  if (Array.isArray(data)) {
    return { items: data, pagination: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
  }
  // data is already { items, pagination }
  return data;
}

// Draft tracking — fire and forget, never blocks the user.
// POST /bookings/draft is behind requireAuth and keys the funnel row on the
// caller's id (req.user.id), so it MUST be sent authenticated. With guest
// sessions in place, an anonymous visitor still has a token, so drop-offs are
// captured too. The backend dedups: repeated calls update ONE pending attempt
// row (advancing its stage), so calling this at several stages is safe.
export async function trackDraft(draftData) {
  try {
    await api.post("/bookings/draft", toDraftRequest(draftData)); // authed (guest or logged-in)
  } catch {
    // Intentionally swallowed — funnel tracking must never break the booking flow
  }
}

/**
 * Coerce a loose draft into EXACTLY what POST /bookings/draft accepts.
 *
 * The backend validates this body with zod (trackDraftSchema) and REJECTS the
 * whole request on any mismatch — it doesn't just ignore bad fields. Three
 * things must be right or every draft 400s and the funnel records nothing:
 *
 *   • `stage` must be one of STARTED | PICKUP_SET | DROP_SET | FARES_VIEWED |
 *     PAYMENT_CHOSEN. Anything else is a hard validation failure.
 *   • `tripType` must be the UPPERCASE enum (ONE_WAY / ROUND_TRIP / AIRPORT /
 *     HOURLY), not the UI's lowercase "one-way".
 *   • `stops` must be [{lat,lng}] objects, never address strings.
 *
 * Everything else the schema doesn't declare is silently stripped by zod, so
 * sending it is harmless but pointless. NOTE: that includes guest contact
 * (name/phone/email) — the funnel row has no column for it and
 * funnel.service.track() ignores it. Capturing partial guest contact needs a
 * backend change; until then the abandonment beacon to /contact is what
 * actually reaches staff.
 */
const DRAFT_STAGES = ["STARTED", "PICKUP_SET", "DROP_SET", "FARES_VIEWED", "PAYMENT_CHOSEN"];

function toDraftRequest(d = {}) {
  const body = {};
  if (DRAFT_STAGES.includes(d.stage)) body.stage = d.stage;

  const tt = TRIP_TYPE_MAP[String(d.tripType || "").toLowerCase()];
  if (tt) body.tripType = tt;

  if (d.vehicleClass) body.vehicleClass = String(d.vehicleClass).slice(0, 24);
  if (d.pickupAddress) body.pickupAddress = String(d.pickupAddress).slice(0, 500);
  if (d.dropAddress) body.dropAddress = String(d.dropAddress).slice(0, 500);

  // The schema wants one ISO datetime, not separate date/time fields.
  if (d.pickupAt) {
    body.pickupAt = d.pickupAt;
  } else if (d.pickupDate) {
    const dt = new Date(`${d.pickupDate}T${d.pickupTime || "00:00"}:00`);
    if (!Number.isNaN(dt.getTime())) body.pickupAt = dt.toISOString();
  }

  if (Number.isFinite(Number(d.estimatedFare))) {
    body.estimatedFare = Math.max(0, Number(d.estimatedFare));
  }

  // Coordinates only — address strings are rejected by the schema.
  const coord = (p) =>
    p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
      ? { lat: Number(p.lat), lng: Number(p.lng) }
      : null;
  if (coord(d.pickup)) body.pickup = coord(d.pickup);
  if (coord(d.drop)) body.drop = coord(d.drop);
  const stops = (Array.isArray(d.stops) ? d.stops : []).map(coord).filter(Boolean).slice(0, 5);
  if (stops.length) body.stops = stops;

  return body;
}
