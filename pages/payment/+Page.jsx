import React, { useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "vike/client/router";
import { selectSelectedCab } from "../../src/store/slices/selectionSlice";
import { selectJourney } from "../../src/store/slices/journeySlice";
import { createBooking } from "../../src/store/slices/bookingSlice";
import { selectCheckoutDetails, clearCheckoutDetails } from "../../src/store/slices/checkoutSlice";
import { bookingsApi, paymentsApi } from "../../src/api";
import { USE_MOCK } from "../../src/api/config";
import { VEHICLE_RATES, fmtINR, rid } from "../../src/data/mockData";
import StateBlock from "../../src/components/StateBlock";
import Modal from "../../src/components/Modal";
import Button from "../../src/components/ui/Button";
import { useToast } from "../../src/hooks/useToast";
import { IconPin, IconClose } from "../../src/components/Icons";

const PARTIAL_ADVANCE_PERCENT = 25;

export default function Page() {
  const dispatch  = useDispatch();
  const toast     = useToast();
  const selected  = useSelector(selectSelectedCab);
  const journey   = useSelector(selectJourney(selected?.journeyId));
  const vehicle   = VEHICLE_RATES.find((v) => v.id === selected?.vehicleId);
  const details   = useSelector(selectCheckoutDetails);

  const [payMethod,    setPayMethod]    = useState("upi");
  const [paymentMode,  setPaymentMode]  = useState(details.paymentMode || "FULL");
  const [processing,   setProcessing]   = useState(false);
  const [payFailOpen,  setPayFailOpen]  = useState(false);
  const [showInvoice,  setShowInvoice]  = useState(false);
  const [step,         setStep]         = useState(1);

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

  const baseFare     = selected.baseFare || selected.fare;
  const surgeFee     = selected.surgeFee || 0;
  const driverBhata  = selected.driverBhata || vehicle?.outstation?.driverBhata || 0;
  const subTotal     = baseFare + surgeFee;
  const isCorporate  = details.customerType === "corporate";
  const cgst         = isCorporate ? Math.round(subTotal * 0.025) : 0;
  const sgst         = isCorporate ? Math.round(subTotal * 0.025) : 0;
  const totalPayable = subTotal + cgst + sgst;

  const payNowAmount =
    paymentMode === "ZERO"    ? 0 :
    paymentMode === "PARTIAL" ? Math.round((totalPayable * PARTIAL_ADVANCE_PERCENT) / 100) :
    totalPayable;
  const payLaterAmount = totalPayable - payNowAmount;

  const confirmButtonLabel =
    paymentMode === "ZERO"    ? "Confirm Booking" :
    paymentMode === "PARTIAL" ? "Confirm & Pay Advance" :
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
      flight:        journey.flight,
      vehicleId:     vehicle.id,
      vehicleCategory: vehicle.category,
      vehicle:       vehicle.name,
      vehicleImg:    vehicle.img,
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
      paymentMethod: payMethod,
      paymentMode,
      paymentStatus:
        paymentMode === "ZERO"    ? "Pay on trip completion" :
        paymentMode === "PARTIAL" ? `${fmtINR(payNowAmount)} paid, ${fmtINR(payLaterAmount)} due on trip` :
        "Paid",
    };

    try {
      // Create booking ONCE — result cached in ref
      const booking = bookingRef.current || await bookingsApi.createBooking(bookingPayload);
      bookingRef.current = booking;

      // Payment step (skip for ZERO or cash)
      if (paymentMode !== "ZERO" && payMethod !== "cash") {
        const purpose = paymentMode === "PARTIAL" ? "ADVANCE" : "FULL";
        const order   = await paymentsApi.createPaymentOrder(booking.id, purpose);

        if (!USE_MOCK) {
          await paymentsApi.openRazorpayCheckout({
            order,
            amount:      payNowAmount,
            name:        details.fullName,
            email:       details.email,
            contact:     details.mobile,
            description: `${journey.pickup} → ${journey.drop}`,
          });
        }

        const result = await paymentsApi.waitForPayment(
          order.orderId || order.paymentId || order.id
        );
        if (!result.success) {
          // Payment failed — allow retry (only payment, NOT booking creation)
          setProcessing(false);
          bookingFiredRef.current = false; // allow payment retry
          setPayFailOpen(true);
          return;
        }
      }

      dispatch(createBooking({ ...bookingPayload, ...booking }));
      dispatch(clearCheckoutDetails());
      const id = booking.bookingNumber || booking.id;
      navigate("/confirmation?b=" + id);

    } catch (err) {
      setProcessing(false);
      bookingFiredRef.current = false; // allow retry on error
      toast(err.message || "Something went wrong. Please try again.", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMode, payMethod]);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
      <a href="/checkout" className="inline-flex items-center gap-1.5 hover:!text-[#111]" style={{ color: "#666", fontWeight: 600, fontSize: 13.5, marginBottom: 18 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to Checkout
      </a>
      <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,34px)", margin: "0 0 22px", letterSpacing: "-.02em" }}>Payment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5.5 items-start">
        <div className="flex flex-col gap-5">

          {/* ── Step 1: Payment Options ──────────────────────────────── */}
          {step === 1 && (
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
                onClick={() => paymentMode === "ZERO" ? confirmAndPay() : setStep(2)}
                className="hover:!bg-[#FFB300]"
                style={{
                  width: "100%", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: 16, borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 16,
                  cursor: processing ? "default" : "pointer", opacity: processing ? 0.7 : 1, boxShadow: "0 10px 26px rgba(255,193,7,.4)",
                }}
              >
                {processing && <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.4px solid rgba(17,17,17,.3)", borderTopColor: "#111", display: "inline-block", animation: "spin .7s linear infinite" }} />}
                {processing ? "Processing…" : paymentMode === "ZERO" ? confirmButtonLabel : "Continue"}
              </button>
            </div>
          )}

          {/* ── Step 2: Payment Method ───────────────────────────────── */}
          {step === 2 && (
            <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 26 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 hover:!text-[#111]"
                style={{ color: "#666", fontWeight: 600, fontSize: 12.5, marginBottom: 14, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Back to Payment Options
              </button>
              <h2 className="text-[17px] font-bold mb-1">Choose Payment Method</h2>
              <p style={{ fontSize: 13, color: "#666", margin: "0 0 18px" }}>This is a demo flow — no real payment is processed.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { key: "upi",        title: "UPI",          sub: "GPay · PhonePe · Paytm",  icon: <path d="M4 17V7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.8" /> },
                  { key: "card",       title: "Card",         sub: "Credit / Debit",           icon: <><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" /></> },
                  { key: "netbanking", title: "Net Banking",  sub: "All major banks",          icon: <path d="M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 19h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /> },
                ].map((opt) => {
                  const active = payMethod === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPayMethod(opt.key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", textAlign: "left", cursor: "pointer",
                        borderRadius: 14, border: active ? "1.5px solid #FFC107" : "1px solid #E5E5E5",
                        background: active ? "#FFFBEA" : "#fff",
                      }}
                    >
                      <span style={{ width: 40, height: 40, borderRadius: 10, background: active ? "rgba(255,193,7,.18)" : "#F7F7F7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: active ? "#B8860B" : "#666" }}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">{opt.icon}</svg>
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: "#111" }}>{opt.title}</p>
                        <p style={{ fontSize: 12.5, color: "#666", margin: "2px 0 0" }}>{opt.sub}</p>
                      </div>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${active ? "#FFC107" : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {active && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#FFC107" }} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={processing}
                onClick={confirmAndPay}
                className="hover:!bg-[#FFB300]"
                style={{
                  width: "100%", marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: 16, borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 16,
                  cursor: processing ? "default" : "pointer", opacity: processing ? 0.7 : 1, boxShadow: "0 10px 26px rgba(255,193,7,.4)",
                }}
              >
                {processing && <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.4px solid rgba(17,17,17,.3)", borderTopColor: "#111", display: "inline-block", animation: "spin .7s linear infinite" }} />}
                {processing ? "Processing…" : confirmButtonLabel}
              </button>
              <p style={{ fontSize: 11.5, color: "#666", textAlign: "center", marginTop: 10 }}>
                By confirming, you agree to our <a href="/terms" style={{ color: "#FFC107", fontWeight: 600 }}>Terms</a> &amp;{" "}
                <a href="/cancellation" style={{ color: "#FFC107", fontWeight: 600 }}>Cancellation Policy</a>.
              </p>
            </div>
          )}
        </div>

        {/* ── Booking Summary ─────────────────────────────────────────── */}
        <div style={{ position: "sticky", top: 120, background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 22 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 14px" }}>Booking Summary</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px dashed #EFEFEF", marginBottom: 14 }}>
            <span style={{ width: 56, height: 40, borderRadius: 9, overflow: "hidden", flexShrink: 0 }}>
              <img src={vehicle.img} alt={vehicle.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{vehicle.name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{vehicle.seats} Seats · {vehicle.ac ? "A/C" : "Non-A/C"}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
            <SummaryRow label="Route"        value={`${journey.pickup} → ${journey.drop}`} />
            <SummaryRow label="Date · Time"  value={`${journey.date} · ${journey.time}`} />
            <SummaryRow label="Base Fare"    value={fmtINR(baseFare)} />
            {driverBhata > 0 && <SummaryRow label="Driver Allowance" value={`+ ${fmtINR(driverBhata)}`} />}
            {surgeFee > 0    && <SummaryRow label="Surge Fee (5%)"   value={`+ ${fmtINR(surgeFee)}`} />}
            {isCorporate     && <SummaryRow label="Taxes (5%)"        value={`+ ${fmtINR(cgst + sgst)}`} />}
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
        description="We couldn't process your payment. No amount has been deducted — please try again or use a different method."
        confirmLabel="Try Again"
        onClose={() => setPayFailOpen(false)}
        onConfirm={() => setPayFailOpen(false)}
      />

      {showInvoice && (
        <InvoiceModal
          journey={journey} vehicle={vehicle} details={details}
          baseFare={baseFare} surgeFee={surgeFee} cgst={cgst} sgst={sgst} totalPayable={totalPayable}
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

function InvoiceModal({ journey, vehicle, details, baseFare, surgeFee, cgst, sgst, totalPayable, onClose, onConfirm }) {
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

          <table className="w-full border border-gray-300 text-[12.5px]">
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

          <table className="w-full border border-t-0 border-gray-300 text-[12.5px] mt-0">
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
                    <div className="flex justify-between w-full"><span className="text-gray-500">Base Fare</span><span className="font-bold">₹ {baseFare.toLocaleString("en-IN")}</span></div>
                    {surgeFee > 0 && <div className="flex justify-between w-full"><span className="text-amber-600">Surge Fee (5%)</span><span className="font-bold text-amber-600">₹ {surgeFee.toLocaleString("en-IN")}</span></div>}
                    {isCorporate && (<>
                      <div className="flex justify-between w-full"><span className="text-gray-500">CGST (2.5%)</span><span className="font-bold">₹ {cgst.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between w-full"><span className="text-gray-500">SGST (2.5%)</span><span className="font-bold">₹ {sgst.toLocaleString("en-IN")}</span></div>
                    </>)}
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

