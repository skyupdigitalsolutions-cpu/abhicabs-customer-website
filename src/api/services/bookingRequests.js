// Booking requests — enquiries for trips OUTSIDE the states we operate in.
//   POST /booking-requests   body: createSchema → { request }
//
// The quote endpoints refuse such a trip with code OUTSIDE_SERVICE_STATES and
// details.canRequest = true. This is what the rider is offered instead: nothing
// is booked or charged, our team gets the enquiry and calls back with a quote.
import { api } from "../client";

// Website tripType → backend enum.
const TRIP_TYPE_MAP = {
  "one-way": "ONE_WAY", oneway: "ONE_WAY", "multi-city": "ONE_WAY",
  "round-trip": "ROUND_TRIP", roundtrip: "ROUND_TRIP",
  airport: "AIRPORT", local: "HOURLY", hourly: "HOURLY",
};

function toIso(date, time, fallbackTime = "00:00") {
  if (!date) return undefined;
  const d = new Date(`${date}T${time || fallbackTime}:00`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** True when an ApiError says "we don't serve that state — send a request". */
export function isOutsideServiceStates(err) {
  return String(err?.code || "").toUpperCase() === "OUTSIDE_SERVICE_STATES";
}

/**
 * @param journey  the stored journey (pickup, drop, date, time, tripType…)
 * @param contact  { name, phone, email?, passengers?, note? }
 * @param vehicleClass optional catalogue key the rider had chosen
 */
export async function createBookingRequest(journey, contact, vehicleClass) {
  const tripType = TRIP_TYPE_MAP[String(journey?.tripType || "").toLowerCase()] || "ONE_WAY";

  const body = {
    tripType,
    pickupAddress: String(journey?.pickup || "").trim(),
    // A local/hourly trip has no drop; the backend requires one, so reuse pickup.
    dropAddress: String(journey?.drop || journey?.pickup || "").trim(),
    pickupAt: toIso(journey?.date, journey?.time),
    contactName: String(contact.name || "").trim(),
    contactPhone: String(contact.phone || "").trim(),
  };
  if (vehicleClass) body.vehicleClass = vehicleClass;
  if (tripType === "ROUND_TRIP") {
    body.returnAt = toIso(journey?.returnDate || journey?.date, journey?.returnTime, "23:59");
  }
  if (contact.email) body.contactEmail = String(contact.email).trim();
  const pax = Number(contact.passengers);
  if (pax >= 1) body.passengers = Math.min(pax, 60);
  if (contact.note) body.note = String(contact.note).trim().slice(0, 500);

  const data = await api.post("/booking-requests", body, { idempotent: true });
  return data?.request || data;
}
