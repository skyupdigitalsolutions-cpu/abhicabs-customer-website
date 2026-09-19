// Bookings service — fixed round trip returnAt and pagination
import { api, ApiError } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { rid } from "../../data/mockData";

// ── Idempotency key ────────────────────────────────────────────────────────
const CHECKOUT_IDEM_KEY = "abhicabs_checkout_idempotency_key";

function getCheckoutIdempotencyKey() {
  if (typeof window === "undefined") return undefined;
  let key = sessionStorage.getItem(CHECKOUT_IDEM_KEY);
  if (!key) {
    key = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : "idem-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(CHECKOUT_IDEM_KEY, key);
  }
  return key;
}

export function clearCheckoutIdempotencyKey() {
  if (typeof window !== "undefined") sessionStorage.removeItem(CHECKOUT_IDEM_KEY);
}

function isGenuineNetworkFailure(err) {
  return err instanceof ApiError && (err.status === 0 || err.code === "NETWORK_ERROR");
}

// ── Mock ───────────────────────────────────────────────────────────────────
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

// ── Trip type / vehicle class maps ─────────────────────────────────────────
const DEFAULT_CITY_ID = 1;

const TRIP_TYPE_MAP = {
  "one-way":    "ONE_WAY",
  "oneway":     "ONE_WAY",
  "round-trip": "ROUND_TRIP",
  "roundtrip":  "ROUND_TRIP",
  "airport":    "AIRPORT",
  "local":      "HOURLY",
  "hourly":     "HOURLY",
};

const VEHICLE_CLASS_MAP = {
  sedan:   "sedan",
  suv:     "suv",
  tempo:   "tempo",
  luxury:  "suv",    // stopgap
  premium: "sedan",  // stopgap
  bus:     "tempo",  // stopgap
};

// ── toBookingRequest ────────────────────────────────────────────────────────
// FIX: Round trips — backend requires `returnAt` (ISO datetime) when
// tripType === 'ROUND_TRIP'. The old version never sent returnAt, so every
// round-trip booking failed with:
//   "A round trip needs a return date and time" (validation error)
//
// FIX: HOURLY trips require either rentalPackageId or rentalHours.
// If neither is present we fall back to rentalHours: 4 so the booking
// doesn't fail outright (the checkout page should ideally provide this).
function toBookingRequest(p) {
  const tripType     = TRIP_TYPE_MAP[(p.tripType || "").toLowerCase()] || "ONE_WAY";
  const vehicleClass = VEHICLE_CLASS_MAP[(p.vehicleCategory || "").toLowerCase()] || "sedan";
  const pickupAt     = p.date && p.time
    ? new Date(`${p.date}T${p.time}:00`).toISOString()
    : new Date().toISOString();
  const paymentMode  = p.paymentMode || "FULL";

  const body = {
    cityId:       p.cityId || DEFAULT_CITY_ID,
    vehicleClass,
    tripType,
    pickup:       { address: p.pickup },
    drop:         { address: tripType === "HOURLY" && !p.drop ? p.pickup : p.drop },
    pickupAt,
    scheduled:    true,
    paymentMode,
  };

  // Stops (multi-city / multi-stop)
  if (p.stops && p.stops.length) {
    body.stops = p.stops.map((s) => ({ address: s }));
  }

  // ROUND_TRIP — send returnAt (required by backend schema)
  if (tripType === "ROUND_TRIP") {
    const returnDate = p.returnDate || p.date;    // fallback: same day
    const returnTime = p.returnTime || "23:59";   // fallback: end of day
    body.returnAt = new Date(`${returnDate}T${returnTime}:00`).toISOString();
  }

  // AIRPORT — optional flight number
  if (tripType === "AIRPORT" && p.flight) {
    body.flightNumber = p.flight;
  }

  // HOURLY — need either package or hours
  if (tripType === "HOURLY") {
    if (p.rentalPackageId) {
      body.rentalPackageId = p.rentalPackageId;
    } else {
      body.rentalHours = p.rentalHours || 4; // fallback 4 hours
    }
  }

  return body;
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function createBooking(payload) {
  if (USE_MOCK) return mockCreateBooking(payload);
  try {
    const data = await api.post("/bookings", toBookingRequest(payload), {
      idempotent:      true,
      idempotencyKey:  getCheckoutIdempotencyKey(),
    });
    clearCheckoutIdempotencyKey();
    // FIX: the real backend response is { booking: {...}, payment: {...},
    // billing: {...} } (confirmed against booking.service.js's create()
    // return value) — the booking's id/bookingNumber live under
    // `data.booking`, not at the top level. Reading `data.id`/`data.bookingId`
    // directly was always undefined, which silently broke every redirect
    // right after a successful booking (confirmation page, tracking page,
    // payment order creation — anything needing the new booking's id).
    const booking = data.booking || data;
    return {
      ...payload,
      ...data,
      ...booking,
      id:            booking.id || booking.bookingId,
      bookingId:     booking.id || booking.bookingId,
      bookingNumber: booking.bookingNumber,
    };
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return mockCreateBooking(payload);
    throw err;
  }
}

export async function getBooking(bookingId) {
  if (USE_MOCK) return null;
  const data = await api.get(`/bookings/${bookingId}`);
  return data?.booking || data;
}

export async function getBookingByNumber(bookingNumber) {
  if (USE_MOCK) return null;
  const data = await api.get(`/bookings/number/${bookingNumber}`);
  return data?.booking || data;
}

/**
 * The trip-detail aggregate: booking + payments + assigned driver/vehicle +
 * invoice + live GPS position, in one call.
 * Backend: GET /bookings/:id/summary (src/services/summary.service.js).
 * Shape: { booking, payments, allocation: { driverName, driverPhone,
 *          vehicleNumber, vehicleModel, ... } | null, invoice, liveLocation }
 */
export async function getBookingSummary(bookingId) {
  if (USE_MOCK) return null;
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
  return api.post(`/bookings/${bookingId}/cancel`, { reason }, { idempotent: true });
}

export async function getInvoice(bookingId) {
  if (USE_MOCK) return null;
  // GET /bookings/:id/invoice — customer-scoped, ownership-gated
  const data = await api.get(`/bookings/${bookingId}/invoice`);
  return data?.invoice || data;
}

/**
 * List all bookings for the logged-in customer.
 * FIX: now supports pagination params so my-booking page can paginate.
 * Backend returns { items: [...], pagination: { total, page, limit, totalPages } }
 *
 * @param {{ page?: number, limit?: number }} params
 */
export async function listMyBookings(params = {}) {
  if (USE_MOCK) return { items: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
  const data = await api.get("/bookings", { params });
  // Normalise: return consistent { items, pagination } shape
  if (Array.isArray(data)) {
    return { items: data, pagination: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
  }
  return data; // already { items, pagination }
}