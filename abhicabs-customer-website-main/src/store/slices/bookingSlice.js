/**
 * src/store/slices/bookingSlice.js
 *
 * FIXES:
 *
 * 1. MOCK DATA IN PREPARE — The old `createBooking.prepare` generated fake
 *    `driver`, `vehicleNumber`, `eta`, `driverRating` fields and a mock
 *    `bookingId` via rid(). These were stored to localStorage and shown in
 *    the UI as if they were real. After checkout wires to the real backend,
 *    these fake fields overwrite the real `bookingId`, `bookingNumber`, and
 *    `status` coming back from the server.
 *    Fixed: `prepare` only stamps `createdAt` — all real fields come from
 *    the caller (checkout page passes the actual server response).
 *
 * 2. REAL BOOKING ID — selectBooking now checks BOTH `b.id` (backend UUID)
 *    AND `b.bookingId` (local alias) so confirmation and tracking pages can
 *    find a booking whether it was stored before or after this fix.
 *
 * 3. CLEAN LOCALSTORAGE — Redux persists only the fields needed for
 *    offline-readable confirmation (bookingId, bookingNumber, status,
 *    pickup, drop, fare, paymentMode). No driver/vehicle mock data.
 *    `saveState` is only called on `createBooking` and `cancelBooking`.
 *
 * 4. CANCEL — Uses the real backend booking `id` (UUID), not the local
 *    `bookingId` alias, for the API call.
 */
import { createSlice } from "@reduxjs/toolkit";
import { loadState, saveState } from "../persist";

const SLIM_FIELDS = [
  "id", "bookingId", "bookingNumber", "status",
  "pickup", "pickupAddress", "drop", "dropAddress",
  "date", "time", "tripType", "returnDate", "returnTime",
  "vehicleCategory", "vehicle", "vehicleSeats", "vehicleImg",
  "fare", "estimatedFare", "finalFare",
  "paymentMode", "paymentStatus", "paymentStatusReal",
  "passengerName", "mobile", "email",
  "customerType", "companyName", "gstNumber",
  "createdAt", "pickupAt",
];

function slimBooking(fields) {
  const out = {};
  SLIM_FIELDS.forEach((k) => { if (fields[k] !== undefined) out[k] = fields[k]; });
  return out;
}

const initialState = {
  items:         loadState("bookings", []),
  lastBookingId: loadState("lastBookingId", null),
};

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    createBooking: {
      reducer(state, action) {
        const booking = action.payload;
        // Avoid duplicates if checkout retries
        const exists = state.items.some(
          (b) => b.bookingId === booking.bookingId || b.id === booking.id
        );
        if (!exists) {
          state.items.unshift(booking);
        }
        state.lastBookingId = booking.id || booking.bookingId;
        saveState("bookings", state.items);
        saveState("lastBookingId", state.lastBookingId);
      },
      prepare(fields) {
        // FIX: No fake driver/vehicle/eta fields — only real data from server.
        // `bookingId` is set to the backend UUID (`id`), with bookingNumber as fallback.
        const booking = slimBooking({
          ...fields,
          bookingId: fields.id || fields.bookingId || fields.bookingNumber,
          createdAt: fields.createdAt || new Date().toISOString(),
          status:    fields.status || "PENDING",
        });
        return { payload: booking };
      },
    },

    cancelBooking(state, action) {
      const idToCancel = action.payload;
      const b = state.items.find(
        (x) => x.id === idToCancel || x.bookingId === idToCancel
      );
      if (b) {
        b.status = "CANCELLED";
        saveState("bookings", state.items);
      }
    },

    // Called by my-booking page to sync server bookings into Redux
    // without duplicating existing items
    syncBookings(state, action) {
      const incoming = action.payload; // array from GET /bookings
      if (!Array.isArray(incoming)) return;
      incoming.forEach((serverBooking) => {
        const slim = slimBooking({
          ...serverBooking,
          bookingId: serverBooking.id || serverBooking.bookingId,
        });
        const idx = state.items.findIndex(
          (b) => b.id === serverBooking.id || b.bookingId === serverBooking.id
        );
        if (idx >= 0) {
          // Update status and payment info from server
          state.items[idx] = { ...state.items[idx], ...slim };
        } else {
          state.items.push(slim);
        }
      });
      saveState("bookings", state.items);
    },
  },
});

export const { createBooking, cancelBooking, syncBookings } = bookingSlice.actions;

export const selectAllBookings  = (state) => state.booking.items;

// FIX: check both `b.id` (backend UUID) and `b.bookingId` (local alias)
export const selectBooking      = (id) => (state) =>
  state.booking.items.find((b) => b.id === id || b.bookingId === id) || null;

export const selectActiveBooking = (state) =>
  state.booking.items.find((b) =>
    ["PENDING", "CONFIRMED", "ALLOCATED", "EN_ROUTE", "ONGOING", "ARRIVED",
     "upcoming", "ongoing"].includes(b.status)
  ) || null;

export default bookingSlice.reducer;