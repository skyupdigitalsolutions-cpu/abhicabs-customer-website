import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectBooking } from "../store/slices/bookingSlice";
import { getBooking, getBookingByNumber } from "../api/services/bookings";

/**
 * FIX (originally on the Confirmation page, now shared): selectBooking(id)
 * only ever checks LOCAL Redux (state.booking.items), populated purely by
 * dispatch(createBooking(...)) right after paying — that only ever
 * contains a booking created in THIS exact browser session. Any booking
 * reached from elsewhere (e.g. My Booking's real, authenticated list,
 * fetched fresh from the backend) was never dispatched locally, so this
 * always showed "Booking not found" for it — even though the booking is
 * completely real and exists on the server.
 *
 * This adds a fallback: if the local Redux lookup comes up empty, fetch the
 * real booking from the backend instead (trying both by internal ID and by
 * booking number, since either could be in the URL depending on where the
 * link came from), and normalise its real field names into one consistent
 * shape both Confirmation and Booking Details render from.
 *
 * The local-first fast path is kept exactly as before — right after
 * checkout, this still shows instantly with no network round-trip.
 */
function normaliseRealBooking(b) {
  const isCorporate = (b.customer?.accountType || "").toUpperCase() === "CORPORATE";
  const fare = Number(b.finalFare ?? b.estimatedFare ?? 0);
  const balance = Number(b.balanceDue ?? 0);
  const advance = Number(b.advancePaid ?? 0);
  const paymentStatus =
    b.paymentMode === "ZERO" ? "Pay on trip completion" :
    balance <= 0 ? "Paid" :
    advance > 0 ? "Partially paid" :
    "Payment pending";

  return {
    bookingId: b.bookingNumber || b.id,
    pickup: b.pickupAddress,
    drop: b.dropAddress,
    date: b.pickupAt ? new Date(b.pickupAt).toLocaleDateString("en-IN") : "",
    time: b.pickupAt ? new Date(b.pickupAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
    tripType: b.tripType || "",
    vehicle: b.vehicleClass ? b.vehicleClass.charAt(0).toUpperCase() + b.vehicleClass.slice(1) : "",
    vehicleSeats: null, // not exposed on the real booking record
    passengerCount: null, // not exposed on the real booking record either — shown as "—" rather than a fabricated number
    customerType: isCorporate ? "corporate" : "retail",
    companyName: b.corporate?.companyName || "",
    passengerName: b.customer?.user?.name || "",
    status: b.status || "",
    paymentStatus,
    baseFare: fare,
    fare,
    // FIX: previously always showed "Total Paid" = the full fare, even for
    // "Pay on trip completion" (ZERO) bookings where nothing has actually
    // been charged yet, and even for PARTIAL bookings where only the
    // advance was captured. advancePaid/balanceDue are real backend
    // fields — just weren't being used for this row before.
    amountPaid: advance,
    balanceDue: balance,
    surgeFee: 0, // real backend bakes surge into the single fare total, not a separate line here
    cgst: 0,
    sgst: 0,
    email: b.customer?.user?.email || "",
    mobile: b.customer?.user?.phone || "",
  };
}

export default function useBookingLookup(bookingId) {
  const localBooking = useSelector(selectBooking(bookingId));
  const [remoteBooking, setRemoteBooking] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState(localBooking ? "skip" : "loading");

  useEffect(() => {
    if (localBooking || !bookingId) { setRemoteStatus("skip"); return; }
    let cancelled = false;
    getBooking(bookingId)
      .then((data) => { if (!cancelled && data) { setRemoteBooking(normaliseRealBooking(data)); setRemoteStatus("ready"); } else if (!cancelled) fallbackByNumber(); })
      .catch(() => { if (!cancelled) fallbackByNumber(); });

    function fallbackByNumber() {
      getBookingByNumber(bookingId)
        .then((data) => { if (!cancelled) { if (data) { setRemoteBooking(normaliseRealBooking(data)); setRemoteStatus("ready"); } else setRemoteStatus("notfound"); } })
        .catch(() => { if (!cancelled) setRemoteStatus("notfound"); });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const booking = localBooking || remoteBooking;
  const loading = !booking && remoteStatus === "loading";
  const notFound = !booking && remoteStatus === "notfound";

  return { booking, loading, notFound };
}
