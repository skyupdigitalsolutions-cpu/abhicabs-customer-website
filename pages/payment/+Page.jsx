import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "vike/client/router";
import { selectSelectedCab } from "../../src/store/slices/selectionSlice";
import { selectJourney } from "../../src/store/slices/journeySlice";
import { createBooking } from "../../src/store/slices/bookingSlice";
import { selectCheckoutDetails, clearCheckoutDetails } from "../../src/store/slices/checkoutSlice";
import { bookingsApi, paymentsApi } from "../../src/api";
import { USE_MOCK } from "../../src/api/config";
import { fmtINR, rid, shortAddress } from "../../src/data/mockData";
import useSelectedVehicle from "../../src/hooks/useSelectedVehicle";
import { buildFareLines, splitPayment } from "../../src/lib/fareLines";
import BackLink, { recordNavStep } from "../../src/components/BackLink";
import StateBlock from "../../src/components/StateBlock";
import Modal from "../../src/components/Modal";
import Button from "../../src/components/ui/Button";
import { useToast } from "../../src/hooks/useToast";
import { IconPin, IconClose } from "../../src/components/Icons";

const PARTIAL_ADVANCE_PERCENT = 25;

// Backend validation errors come back as { fields: { <fieldName>: "message" } }
// (see ApiError.fields in src/api/client.js). Each of these fields is actually
// entered on a different page, so a validation failure sends the user
// straight to the right one instead of leaving them stuck on Payment.
const FIELD_TO_DESTINATION = {
  guestName:       { path: "/checkout", label: "Your name" },
  guestPhone:      { path: "/checkout", label: "Mobile number" },
  guestEmail:      { path: "/checkout", label: "Email" },
  companyName:     { path: "/checkout", label: "Company name" },
  gstNumber:       { path: "/checkout", label: "GST number" },
  address:         { path: "/checkout", label: "Address" },
  landmark:        { path: "/checkout", label: "Landmark" },
  pickup:          { path: "/booking-search", label: "Pickup location" },
  drop:            { path: "/booking-search", label: "Drop location" },
  stops:           { path: "/booking-search", label: "Stop location" },
  pickupAt:        { path: "/booking-search", label: "Pickup date/time" },
  returnAt:        { path: "/booking-search", label: "Return date/time" },
  cityId:          { path: "/booking-search", label: "Pickup location" },
  rentalPackageId: { path: "/booking-search", label: "Local package" },
  rentalHours:     { path: "/booking-search", label: "Local package" },
};

export default function Page() {
  const dispatch  = useDispatch();
  const toast     = useToast();
  const selected  = useSelector(selectSelectedCab);
  const journey   = useSelector(selectJourney(selected?.journeyId));
  // Resolve the stored id whether it's a LOCAL catalogue id (swift-desire) or
  // a BACKEND catalogue key (swift-dzire) — matching only the local id sent a
  // backend-keyed selection to the "No cab selected" state right before
  // payment. Final fallback is synthesized from the selection (which already
  // carries name/img/seats/ac) so a real, priced booking is never lost.
  const vehicle = useSelectedVehicle(selected);
  const details   = useSelector(selectCheckoutDetails);

  const [paymentMode,  setPaymentMode]  = useState(details.paymentMode || "FULL");
  const [processing,   setProcessing]   = useState(false);
  const [payFailOpen,  setPayFailOpen]  = useState(false);
  const [showInvoice,  setShowInvoice]  = useState(false);

  // Funnel: reaching the payment screen is the deepest pre-booking stage. The
  // backend merges this into the same attempt row started at FARES_VIEWED, so
  // an abandon here is visible in the ERP as a PAYMENT_CHOSEN drop-off.
  // Track where we've been so BackLink can step back one page.
  useEffect(() => { recordNavStep("/payment"); }, []);

  useEffect(() => {
    if (!selected || !journey) return;
    bookingsApi.trackDraft({
      stage: "PAYMENT_CHOSEN",
      vehicleClass: selected.vehicleClass || undefined,
      vehicleName: selected.vehicleName || vehicle?.name || undefined,
      // Trip exactly as the customer selected it.
      tripType:      journey.tripType,
      pickupAddress: journey.pickup,
      dropAddress:   journey.drop || undefined,
      stops:         (journey.stops || []).length ? journey.stops : undefined,
      pickupDate:    journey.date,
      pickupTime:    journey.time,
      returnDate:    journey.returnDate || undefined,
      returnTime:    journey.returnTime || undefined,
      rentalPackage: journey.package || undefined,
      // Contact as entered at checkout — never a fabricated value.
      guestName:  details.fullName || undefined,
      guestPhone: details.mobile || undefined,
      guestEmail: details.email || undefined,
      estimatedFare: selected.fare,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.journeyId]);

  // ── Single-flight guard ───────────────────────────────────────────────────
  // One ref that is set to true the moment confirmAndPay starts, and never
  // reset to false. This means the booking is attempted EXACTLY ONCE no
  // matter how many times the button is clicked or the invoice modal fires.
  const bookingFiredRef = useRef(false);

  // ── Cached booking result ─────────────────────────────────────────────────
  // Once the backend creates the booking we store it here so a payment retry
  // (e.g. after Razorpay failure) can reuse the same booking id instead of
  // creating a second one.
  const bookingRef = useRef(null);

  if (!selected || !vehicle || !journey) {
    return (
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
        <StateBlock tone="empty" icon={<IconPin className="w-6.5 h-6.5" />}
          title="Nothing to pay for yet"
          description="Please choose a journey and a cab first."
          action={<Button href="/#booking">Start a Search</Button>}
        />
      </main>
    );
  }

  if (!details.fullName || !details.mobile) {
    return (
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
        <StateBlock tone="empty" icon={<IconPin className="w-6.5 h-6.5" />}
          title="Passenger details needed first"
          description="Please fill in your details on the Checkout page before paying."
          action={<Button href="/checkout">Go to Checkout</Button>}
        />
      </main>
    );
  }

  // Every rupee shown on this page — and on the invoice — comes from this one
  // call, so the summary, the invoice and the amount actually charged can
  // never disagree. See src/lib/fareLines.js for why this was centralised.
  const isCorporate  = details.customerType === "corporate";
  const discountCode        = details.discountCode || null;
  const discountDescription = details.discountDescription || null;
  const fare = buildFareLines(selected, {
    isCorporate,
    discountAmount: discountCode ? details.discountAmount : 0,
    discountCode,
  });
  const {
    lines: fareLines, tripTotal, cgst, sgst, discount: discountAmount, totalPayable,
  } = fare;
  // Kept for the booking payload / invoice header, which record them
  // separately from the displayed lines.
  const baseFare    = tripTotal;
  const surgeFee    = Math.round(Number(selected.surgeFee || selected.surgeAmount || 0));
  const driverBhata = Math.round(Number(selected.driverBhata || selected.driverAllowance || 0));

  const { payNow: payNowAmount, payLater: payLaterAmount } =
    splitPayment(totalPayable, paymentMode, PARTIAL_ADVANCE_PERCENT);

  const confirmButtonLabel =
    paymentMode === "ZERO"    ? "Confirm Booking" :
    paymentMode === "PARTIAL" ? `Pay ${fmtINR(payNowAmount)} Advance` :
    `Pay ${fmtINR(payNowAmount)}`;

  // ── confirmAndPay — called at most ONCE ───────────────────────────────────
  const confirmAndPay = useCallback(async () => {
    // Hard guard — if already fired, do nothing
    if (bookingFiredRef.current) return;
    bookingFiredRef.current = true;
    setProcessing(true);

    const bookingPayload = {
      journeyId:     journey.id,
      pickup:        journey.pickup,
      drop:          journey.drop,
      stops:         journey.stops || [],
      date:          journey.date,
      time:          journey.time,
      tripType:      journey.tripType,
      returnDate:    journey.returnDate,
      returnTime:    journey.returnTime,
      // The chosen local package ("8 hrs / 80 km"). This was never forwarded,
      // so toBookingRequest() had nothing to derive rentalHours from and fell
      // back to a hardcoded 8 — the source of "That rental package is not
      // available" landing only at the payment step.
      package:       journey.package,
      rentalPackageId: journey.rentalPackageId,
      rentalHours:   journey.rentalHours,
      vehicleId:     vehicle.id,
      vehicleCategory: vehicle.category,
      // The class the fare was quoted under — booked as-is so the price
      // can't shift between the quote and the booking.
      vehicleClass:  selected.vehicleClass || undefined,
      vehicle:       vehicle.name,
      vehicleImg:    vehicle.img,
      vehicleImgFallback: vehicle.imgFallback || vehicle.img,
      vehicleSeats:  vehicle.seats,
      passengerName: details.fullName,
      mobile:        details.mobile,
      email:         details.email,
      address:       details.address,
      landmark:      details.landmark,
      notes:         details.notes,
      companyName:   isCorporate ? details.companyName : "",
      gstNumber:     isCorporate ? details.gstNumber   : "",
      customerType:  details.customerType,
      fare:          totalPayable,
      baseFare,
      amountPaid:    payNowAmount,
      balanceDue:    payLaterAmount,
      surgeFee, cgst, sgst, driverBhata,
      surge:         selected.surge,
      // The code IS forwarded to the backend now (as `promoCode` — see
      // toBookingRequest). createBookingSchema accepts it and booking.service
      // re-validates it against the fare it prices itself, so the discount is
      // actually applied and the redemption recorded. The amount/description
      // stay local, for the confirmation screen only.
      discountCode, discountAmount, discountDescription,
      promoCode: discountCode || undefined,
      // The actual instrument (UPI / card / net banking / wallet) is chosen
      // inside Razorpay's checkout and recorded by the backend from the webhook.
      paymentMethod: paymentMode === "ZERO" ? "PAY_LATER" : "ONLINE",
      paymentMode,
      paymentStatus:
        paymentMode === "ZERO"    ? "Pay on trip completion" :
        paymentMode === "PARTIAL" ? `${fmtINR(payNowAmount)} paid, ${fmtINR(payLaterAmount)} due on trip` :
        "Paid",
    };

    try {
      // Create booking ONCE — result cached in ref. Its own try/catch so a
      // failure here (bad address, network hiccup, backend validation) is
      // labelled as a booking problem — previously it fell into the same
      // catch as payment failures and just said "Something went wrong" on
      // the Pay button, which read as a completely unrelated error since
      // payment was never even reached yet.
      let booking = bookingRef.current;
      if (!booking) {
        try {
          booking = await bookingsApi.createBooking(bookingPayload);
        } catch (err) {
          // Field-level validation error from the backend (err.fields, e.g.
          // { guestPhone: "invalid" }) — instead of stranding the user on
          // this page with a generic message, send them straight back to
          // wherever that field actually lives. Nothing is lost doing this:
          // checkout details and the journey are both already persisted
          // (redux + localStorage), not cleared until a booking succeeds.
          const badField = err?.fields && Object.keys(err.fields)[0];
          const dest = badField ? FIELD_TO_DESTINATION[badField] : null;
          // Serviceability rejection at booking time — the trip can't be
          // taken at all, so don't leave them on Payment staring at a
          // generic error. Send them back to change the route.
          const code = String(err?.code || "").toUpperCase();
          const msg  = String(err?.message || "").toLowerCase();
          if (
            code === "OUTSIDE_SERVICE_AREA" || code === "CITY_NOT_SERVICED" ||
            code === "NO_SERVICE_AREA" || msg.includes("service area") ||
            msg.includes("not serviced") || msg.includes("outside our service")
          ) {
            setProcessing(false);
            bookingFiredRef.current = false;
            toast(
              err.message || "This pickup is outside the area we currently serve — please change it or request a custom booking.",
              "error"
            );
            navigate("/booking-search");
            return;
          }
          // Trip-detail rejections (rental package, unavailable vehicle,
          // unpriceable route). Nothing on THIS page can fix them, so route
          // back to where the trip is actually edited instead of leaving a
          // red toast over a dead Payment screen.
          if (
            code.includes("RENTAL_PACKAGE") || msg.includes("rental package") ||
            code.includes("PACKAGE_NOT") ||
            code.includes("VEHICLE_NOT_AVAILABLE") || msg.includes("not available for") ||
            code.includes("FARE") || msg.includes("fare")
          ) {
            setProcessing(false);
            bookingFiredRef.current = false;
            toast(
              `${err.message || "This trip can't be booked as selected."} — please adjust your trip and try again.`,
              "error"
            );
            navigate("/booking-search");
            return;
          }
          if (dest) {
            const fieldMsg = err.fields[badField];
            setProcessing(false);
            bookingFiredRef.current = false; // let them retry once the field is fixed
            toast(
              `${dest.label}: ${fieldMsg || "please check and update this before continuing"}`,
              "error"
            );
            navigate(dest.path);
            return;
          }
          throw new Error(`Couldn't create your booking — ${err.message || "please check your details and try again."}`);
        }
      }
      bookingRef.current = booking;

      // Payment step (skip for ZERO or cash). Everything here is driven by
      // the backend: it prices the order, creates the Razorpay order, returns
      // the public key, and confirms the payment via Razorpay's webhook.
      let paymentPending = false;
      if (paymentMode !== "ZERO") {
        const purpose = paymentMode === "PARTIAL" ? "ADVANCE" : "FULL";
        let order;
        try {
          order = await paymentsApi.createPaymentOrder(booking.id, purpose);
        } catch (err) {
          throw new Error(`Your booking is saved, but the payment couldn't be started — ${err.message || "please try again."}`);
        }

        if (!USE_MOCK) {
          if (order.provider === "mock") {
            // Server is on the mock gateway (test environments): confirm through
            // the backend's own signed-webhook pipeline instead of Razorpay.
            try {
              await paymentsApi.completeMockPayment(order);
            } catch (err) {
              throw new Error(`Test payment couldn't be completed — ${err.message || "please try again."}`);
            }
          } else {
            try {
              await paymentsApi.openRazorpayCheckout({
                order,
                name:        details.fullName,
                email:       details.email,
                contact:     details.mobile,
                description: `${shortAddress(journey.pickup, 30)} → ${shortAddress(journey.drop || journey.pickup, 30)}`,
              });
            } catch (err) {
              setProcessing(false);
              bookingFiredRef.current = false; // booking is kept in bookingRef; only payment retries
              if (err?.code === "PAYMENT_CANCELLED") {
                toast(order.lastError
                  ? `${order.lastError} Your booking is saved — you can try paying again.`
                  : "Payment cancelled. Your booking is saved — you can try paying again.", "error");
              } else {
                toast(err.message || "Payment couldn't be started.", "error");
              }
              return;
            }
          }
        }

        // Wait for the webhook to mark the payment CAPTURED on the server.
        const result = await paymentsApi.waitForPayment(order.paymentId);
        if (!result.success && !result.pending) {
          // Definitively failed — allow a payment retry (booking is reused).
          setProcessing(false);
          bookingFiredRef.current = false;
          setPayFailOpen(true);
          return;
        }
        // Checkout completed but the webhook hasn't landed yet. The money may
        // already be taken, so never ask to pay again — confirm the booking and
        // let the server finish reconciling.
        paymentPending = result.pending;
      }

      dispatch(createBooking({
        ...bookingPayload,
        ...booking,
        ...(paymentPending ? { paymentStatus: "Payment processing — confirmation shortly" } : {}),
      }));
      dispatch(clearCheckoutDetails());
      if (paymentPending) {
        toast("Payment received. It may take a minute to show as confirmed.", "success");
      }
      const id = booking.bookingNumber || booking.id;
      navigate("/confirmation?b=" + id);

    } catch (err) {
      setProcessing(false);
      bookingFiredRef.current = false; // allow retry on error
      toast(err.message || "Something went wrong. Please try again.", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMode]);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
      <BackLink to="/checkout" label="Back to Checkout" />
      <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,34px)", margin: "0 0 22px", letterSpacing: "-.02em" }}>Payment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5.5 items-start">
        <div className="flex flex-col gap-5">

          {/* ── Step 1: Payment Options ──────────────────────────────── */}
          {(
            <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 26 }}>
              <h2 className="text-[17px] font-bold mb-4">Payment Options</h2>
              <div style={{ border: "1px solid #EFEFEF", borderRadius: 12, overflow: "hidden" }}>
                {[
                  { key: "ZERO",    title: "Book at zero",  sub: `Pay ${fmtINR(totalPayable)} later`,                                                         amount: 0 },
                  { key: "PARTIAL", title: "Part Pay",      sub: `Pay ${PARTIAL_ADVANCE_PERCENT}% now, rest to the driver`,                                    amount: Math.round((totalPayable * PARTIAL_ADVANCE_PERCENT) / 100) },
                  { key: "FULL",    title: "Full Pay",      sub: "Full amount now",                                                                             amount: totalPayable },
                ].map((opt, i) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPaymentMode(opt.key)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", textAlign: "left", border: "none", cursor: "pointer",
                      borderTop: i > 0 ? "1px solid #EFEFEF" : "none",
                      background: paymentMode === opt.key ? "#FFFBEA" : "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${paymentMode === opt.key ? "#FFC107" : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {paymentMode === opt.key && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFC107" }} />}
                      </span>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 700, margin: 0 }}>{opt.title}</p>
                        <p style={{ fontSize: 11.5, color: "#666", margin: 0 }}>{opt.sub}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtINR(opt.amount)}</span>
                  </button>
                ))}
              </div>

              <button
                disabled={processing}
                onClick={confirmAndPay}
                className="hover:!bg-[#FFB300]"
                style={{
                  width: "100%", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: 16, borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 16,
                  cursor: processing ? "default" : "pointer", opacity: processing ? 0.7 : 1, boxShadow: "0 10px 26px rgba(255,193,7,.4)",
                }}
              >
                {processing && <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.4px solid rgba(17,17,17,.3)", borderTopColor: "#111", display: "inline-block", animation: "spin .7s linear infinite" }} />}
                {processing ? "Processing…" : confirmButtonLabel}
              </button>
              <p style={{ fontSize: 12, color: "#666", textAlign: "center", margin: "10px 0 0", lineHeight: 1.5 }}>
                {paymentMode === "ZERO"
                  ? "No payment now — pay the full fare at the end of your trip."
                  : USE_MOCK
                    ? "Demo mode — no real payment is processed."
                    : "Opens Razorpay's secure checkout — pay by UPI, card, net banking or wallet."}
              </p>
              <p style={{ fontSize: 11.5, color: "#666", textAlign: "center", marginTop: 6 }}>
                By confirming, you agree to our <a href="/terms" style={{ color: "#B8860B", fontWeight: 600 }}>Terms</a> &amp;{" "}
                <a href="/cancellation" style={{ color: "#B8860B", fontWeight: 600 }}>Cancellation Policy</a>.
              </p>
            </div>
          )}

        </div>

        {/* ── Booking Summary ─────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 22 }} className="lg:sticky lg:top-[120px]">
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 14px" }}>Booking Summary</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px dashed #EFEFEF", marginBottom: 14 }}>
            <span style={{ width: 56, height: 40, borderRadius: 9, overflow: "hidden", flexShrink: 0 }}>
              <img src={selected.vehicleImg || selected.vehicleImgFallback || vehicle.img} alt={selected.vehicleName || vehicle.name} onError={(e) => { const fb = vehicle.imgFallback || selected.vehicleImgFallback; if (fb && e.currentTarget.src !== fb) { e.currentTarget.src = fb; } }} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.vehicleName || vehicle.name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{selected.vehicleSeats || vehicle.seats} Seats · {(selected.vehicleAc ?? vehicle.ac) ? "A/C" : "Non-A/C"}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
            <SummaryRow label="Route"        value={`${shortAddress(journey.pickup)} → ${shortAddress(journey.drop)}`} />
            <SummaryRow label="Date · Time"  value={`${journey.date} · ${journey.time}`} />
            {journey.tripType === "local" && journey.package && (
              <SummaryRow label="Package" value={journey.package} />
            )}

            {/* Real, reconciling fare breakdown — these lines always sum to
                the trip fare below, whether they came from the backend's
                own breakdown or were derived from its named components. */}
            <div style={{ borderTop: "1px dashed #EFEFEF", marginTop: 4, paddingTop: 9, display: "flex", flexDirection: "column", gap: 9 }}>
              {fareLines.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "#666" }}>
                    {l.label}
                    {l.note && <span style={{ display: "block", fontSize: 11, color: "#999" }}>{l.note}</span>}
                  </span>
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmtINR(l.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #F2F2F2" }}>
                <span style={{ fontWeight: 700 }}>Trip fare</span>
                <span style={{ fontWeight: 700 }}>{fmtINR(tripTotal)}</span>
              </div>
            </div>

            {isCorporate && cgst + sgst > 0 && (
              <>
                <SummaryRow label="CGST (2.5%)" value={`+ ${fmtINR(cgst)}`} />
                <SummaryRow label="SGST (2.5%)" value={`+ ${fmtINR(sgst)}`} />
              </>
            )}
            {discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>Promo ({discountCode})</span>
                <span style={{ fontWeight: 600, color: "#15803D" }}>− {fmtINR(discountAmount)}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 14, marginTop: 14, borderTop: "1px dashed #EFEFEF" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22 }}>{fmtINR(totalPayable)}</span>
          </div>
          {paymentMode !== "FULL" && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#666", marginTop: 6 }}>
              <span>Payable now</span>
              <span style={{ fontWeight: 700 }}>{fmtINR(payNowAmount)}</span>
            </div>
          )}
          <button
            onClick={() => setShowInvoice(true)}
            style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 11, border: "1.5px solid #E5E5E5", background: "#fff", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Preview Invoice
          </button>
        </div>
      </div>

      <Modal
        open={payFailOpen}
        title="Payment Failed"
        description="The payment didn't go through. Your booking is saved — try again, or choose another payment option. If any amount was deducted, it will be refunded automatically by your bank."
        confirmLabel="Try Again"
        onClose={() => setPayFailOpen(false)}
        onConfirm={() => setPayFailOpen(false)}
      />

      {showInvoice && (
        <InvoiceModal
          journey={journey} vehicle={vehicle} details={details}
          fareLines={fareLines} tripTotal={tripTotal}
          cgst={cgst} sgst={sgst}
          discountCode={discountCode} discountAmount={discountAmount}
          totalPayable={totalPayable}
          onClose={() => setShowInvoice(false)}
          onConfirm={() => { setShowInvoice(false); confirmAndPay(); }}
        />
      )}
    </main>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function InvoiceModal({ journey, vehicle, details, fareLines, tripTotal, cgst, sgst, discountCode, discountAmount, totalPayable, onClose, onConfirm }) {
  const isCorporate  = details.customerType === "corporate";
  const invoiceNumber = "INV-" + Date.now().toString().slice(-9);
  const billedOn     = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const bookingId    = rid("ABHI");
  const invoiceRef   = useRef(null);

  function printInvoice() {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Invoice</title>
      <style>
        body { font-family: Montserrat, Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 6px 8px; vertical-align: top; }
        .header { background: #111111; color: white; padding: 12px 16px; }
        hr { border: none; border-top: 1px solid #ddd; margin: 8px 0; }
        .text-right { text-align: right; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${invoiceRef.current.innerHTML}
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[20px] w-full max-w-[720px] my-6 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEFEF]">
          <h2 className="text-[17px] font-bold">{isCorporate ? "TAX INVOICE" : "NON-TAX INVOICE"} — Preview</h2>
          <div className="flex gap-2">
            <button onClick={printInvoice} className="text-[13px] font-semibold border border-primary text-primary px-3.5 py-1.5 rounded-lg">
              Print / Download
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh] p-6" ref={invoiceRef}>
          <div className="bg-brand-black text-white px-5 py-3 rounded-[8px] flex items-center justify-between mb-0">
            <div>
              <div className="text-[20px] tracking-wide" style={{ fontFamily: "Montserrat,sans-serif", fontWeight: 700 }}>
                ABHI<span className="text-primary"> CABS</span>
              </div>
              <div className="text-[11px] text-white/70 font-semibold">CAR RENTALS</div>
            </div>
            <div className="text-right text-[11px] text-white/80 leading-relaxed">
              <div>#45, 2nd Floor, MG Road, Bangalore – 560 001</div>
              <div>Karnataka, India</div>
              <div>GSTIN: 29AABCA1234B1ZU</div>
            </div>
          </div>

          <div className="text-center py-3 border-x border-gray-300">
            <span className="text-[15px] font-bold tracking-widest uppercase text-gray-700">
              {isCorporate ? "Tax Invoice" : "Non-Tax Invoice"}
            </span>
          </div>

          <div className="table-scroll"><table className="w-full border border-gray-300 text-[12.5px]" style={{ minWidth: 480 }}>
            <tbody>
              <tr>
                <td className="bg-gray-50 font-bold text-[11px] uppercase tracking-wide px-3 py-1.5 border-b border-gray-300" colSpan={2}>Customer Details</td>
                <td className="bg-gray-50 font-bold text-[11px] uppercase tracking-wide px-3 py-1.5 border-b border-gray-300 border-l border-gray-300" colSpan={2}>Invoice Details</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-500 w-[100px]">Name</td>
                <td className="px-3 py-2 font-semibold">{details.fullName || "—"}</td>
                <td className="px-3 py-2 text-gray-500 border-l border-gray-300 w-[100px]">Invoice #</td>
                <td className="px-3 py-2 font-semibold font-mono">{invoiceNumber}</td>
              </tr>
              {isCorporate && (
                <tr>
                  <td className="px-3 py-1.5 text-gray-500">Company</td>
                  <td className="px-3 py-1.5 font-semibold">{details.companyName}</td>
                  <td className="px-3 py-1.5 text-gray-500 border-l border-gray-300">Billed On</td>
                  <td className="px-3 py-1.5 font-semibold">{billedOn}</td>
                </tr>
              )}
              <tr>
                <td className="px-3 py-1.5 text-gray-500">Email</td>
                <td className="px-3 py-1.5">{details.email || "—"}</td>
                <td className="px-3 py-1.5 text-gray-500 border-l border-gray-300">Booking ID</td>
                <td className="px-3 py-1.5 font-semibold font-mono">{bookingId}</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 text-gray-500">Phone</td>
                <td className="px-3 py-1.5">{details.mobile || "—"}</td>
                <td className="px-3 py-1.5 text-gray-500 border-l border-gray-300">&nbsp;</td>
                <td className="px-3 py-1.5">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          </div><div className="table-scroll"><table className="w-full border border-t-0 border-gray-300 text-[12.5px] mt-0" style={{ minWidth: 480 }}>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-bold text-[11px] uppercase tracking-wide w-1/2">Trip Details</th>
                <th className="px-3 py-2 text-right font-bold text-[11px] uppercase tracking-wide border-l border-gray-300 w-1/2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-1.5 border-t border-gray-200"><span className="text-gray-500">Trip Type</span><span className="ml-2 font-semibold">{journey.tripType}</span></td>
                <td className="px-3 py-1.5 border-t border-gray-200 border-l border-gray-300 text-right font-semibold" rowSpan={5}>
                  <div className="flex flex-col gap-1.5 items-end pt-1">
                    {fareLines.map((l, i) => (
                      <div key={i} className="flex justify-between w-full gap-3">
                        <span className="text-gray-500 text-left">{l.label}</span>
                        <span className="font-bold whitespace-nowrap">₹ {Math.round(l.amount).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    <div className="flex justify-between w-full border-t border-gray-200 pt-1.5 mt-0.5">
                      <span className="text-gray-600 font-semibold">Trip Fare</span>
                      <span className="font-bold">₹ {tripTotal.toLocaleString("en-IN")}</span>
                    </div>
                    {isCorporate && (cgst + sgst) > 0 && (<>
                      <div className="flex justify-between w-full"><span className="text-gray-500">CGST (2.5%)</span><span className="font-bold">₹ {cgst.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between w-full"><span className="text-gray-500">SGST (2.5%)</span><span className="font-bold">₹ {sgst.toLocaleString("en-IN")}</span></div>
                    </>)}
                    {discountAmount > 0 && (
                      <div className="flex justify-between w-full"><span className="text-green-700">Promo ({discountCode})</span><span className="font-bold text-green-700">− ₹ {discountAmount.toLocaleString("en-IN")}</span></div>
                    )}
                    <div className="border-t border-gray-300 pt-1.5 mt-0.5 w-full flex justify-between">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-[14px]">₹ {totalPayable.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr><td className="px-3 py-1"><span className="text-gray-500 text-[11.5px]">Vehicle</span><span className="ml-2 font-semibold">{vehicle.name}</span></td></tr>
              <tr><td className="px-3 py-1"><span className="text-gray-500 text-[11.5px]">Pick Up</span><span className="ml-2">{journey.pickup}</span></td></tr>
              <tr><td className="px-3 py-1"><span className="text-gray-500 text-[11.5px]">Drop</span><span className="ml-2">{journey.drop}</span></td></tr>
              <tr><td className="px-3 py-1.5"><span className="text-gray-500 text-[11.5px]">Date</span><span className="ml-2">{journey.date}</span></td></tr>
            </tbody>
          </table>

          <div className="mt-4 border border-gray-300 rounded-[6px] p-3.5 text-[11px] text-gray-500 leading-relaxed">
            <p className="font-bold text-gray-700 mb-1">Terms &amp; Conditions</p>
            <p># Toll fees, airport charges, parking, and state taxes are charged extra.</p>
            <p># Electronically generated — no signature required.</p>
            <p># For queries: support@abhicabs.in</p>
          </div>
          </div>
          {isCorporate && <div className="mt-2 text-[10.5px] text-gray-400 text-center">SAC: 996412</div>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-[#EFEFEF] bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">← Edit Details</Button>
          <Button onClick={onConfirm} className="flex-1">Confirm &amp; Pay</Button>
        </div>
      </div>
    </div>
  );
}

