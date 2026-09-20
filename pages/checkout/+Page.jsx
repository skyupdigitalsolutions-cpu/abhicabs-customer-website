import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "vike/client/router";
import { selectSelectedCab } from "../../src/store/slices/selectionSlice";
import { selectJourney } from "../../src/store/slices/journeySlice";
import { selectCheckoutDetails, setCheckoutDetails } from "../../src/store/slices/checkoutSlice";
import { API_BASE_URL } from "../../src/api/config";
import { VEHICLE_RATES, fmtINR } from "../../src/data/mockData";
import StateBlock from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import { FIELD_INPUT } from "../../src/components/ui/classNames";
import { useToast } from "../../src/hooks/useToast";
import { IconPin } from "../../src/components/Icons";

const INCLUSIONS = [
  "Driver allowance (bata) included for outstation trips",
  "Toll charges covered on the route",
  "State tax / permit charges included",
  "GST included in the displayed fare (5%)",
  "Free waiting time — 30 min at pickup, 15 min at stops",
  "Round-trip fare includes return journey distance",
  "Night driving allowance included where applicable",
  "One pickup and one drop per booking",
];

const EXCLUSIONS = [
  "Parking charges at destination — paid by passenger",
  "Entry / green tax fees at tourist spots",
  "Extra kilometres beyond the package limit",
  "Extra waiting time beyond the free window",
  "Intercity or state-border permit fees not on route",
  "Alcohol, smoking, or food damage inside the vehicle",
  "Airport / railway terminal entry charges",
  "Return fare for one-way trips",
];

// ── Terms Modal ──────────────────────────────────────────────────────────────
function TermsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, maxWidth: 520, width: "100%",
          maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>Terms &amp; Conditions</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#888", lineHeight: 1 }}
            aria-label="Close"
          >×</button>
        </div>
        <p style={{ color: "#666", fontSize: 13, padding: "6px 24px 0", flexShrink: 0 }}>
          Please read before confirming your booking.
        </p>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "18px 24px 24px" }}>
          {/* Inclusions */}
          <div style={{
            background: "#F0FFF4", border: "1px solid #BBF7D0", borderRadius: 14,
            padding: "16px 18px", marginBottom: 16,
          }}>
            <p style={{ fontWeight: 700, fontSize: 13.5, color: "#166534", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".04em" }}>
              ✓ What's Included
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {INCLUSIONS.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: 9, fontSize: 13.5, color: "#15803D" }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Exclusions */}
          <div style={{
            background: "#FFF7F7", border: "1px solid #FECACA", borderRadius: 14,
            padding: "16px 18px", marginBottom: 20,
          }}>
            <p style={{ fontWeight: 700, fontSize: 13.5, color: "#991B1B", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".04em" }}>
              ✗ Not Included
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {EXCLUSIONS.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: 9, fontSize: 13.5, color: "#B91C1C" }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* General terms */}
          <div style={{ fontSize: 12.5, color: "#666", lineHeight: 1.7 }}>
            <p style={{ fontWeight: 700, color: "#333", fontSize: 13, marginBottom: 8 }}>General Terms</p>
            <p style={{ margin: "0 0 7px" }}>Cancellations made more than 24 hours before pickup receive a full refund. Cancellations within 24 hours may attract a cancellation fee as per our policy.</p>
            <p style={{ margin: "0 0 7px" }}>ABHI CABS reserves the right to substitute a vehicle of equivalent or superior category in case of unforeseen circumstances.</p>
            <p style={{ margin: 0 }}>By proceeding with the booking, you agree to these terms and conditions.</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid #EFEFEF", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: "#111", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Checkout Page ────────────────────────────────────────────────────────────
export default function Page() {
  const dispatch = useDispatch();
  const toast = useToast();
  const selected = useSelector(selectSelectedCab);
  const journey = useSelector(selectJourney(selected?.journeyId));
  const vehicle = VEHICLE_RATES.find((v) => v.id === selected?.vehicleId);
  const saved = useSelector(selectCheckoutDetails);

  const [fullName, setFullName] = useState(saved.fullName || "");
  const [mobile, setMobile] = useState(saved.mobile || "");
  const [email, setEmail] = useState(saved.email || "");
  const [address, setAddress] = useState(saved.address || "");
  const [landmark, setLandmark] = useState(saved.landmark || "");
  const [gstNumber, setGstNumber] = useState(saved.gstNumber || "");
  const [companyName, setCompanyName] = useState(saved.companyName || "");
  const [notes, setNotes] = useState(saved.notes || "");
  const [customerType, setCustomerType] = useState(saved.customerType || "retail");
  const [errors, setErrors] = useState({});
  const [showTerms, setShowTerms] = useState(false);

  const bookingCompletedRef = useRef(false);
  const abandonmentSentRef = useRef(false);

  if (!selected || !vehicle || !journey) {
    return (
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
        <StateBlock tone="empty" icon={<IconPin className="w-6.5 h-6.5" />}
          title="Nothing to check out yet"
          description="Please choose a journey and a cab first."
          action={<Button href="/#booking">Start a Search</Button>}
        />
      </main>
    );
  }

  const baseFare = selected.baseFare || selected.fare;
  const surgeFee = selected.surgeFee || 0;
  const driverBhata = selected.driverBhata || vehicle?.outstation?.driverBhata || 0;
  const subTotal = baseFare + surgeFee;
  const isCorporate = customerType === "corporate";
  const cgst = isCorporate ? Math.round(subTotal * 0.025) : 0;
  const sgst = isCorporate ? Math.round(subTotal * 0.025) : 0;
  const totalPayable = subTotal + cgst + sgst;

  useEffect(() => {
    function trySendAbandonment() {
      if (bookingCompletedRef.current || abandonmentSentRef.current) return;
      const nameOk = fullName.trim().length >= 2;
      const phoneOk = /^\d{10}$/.test(mobile.trim());
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      if (!nameOk || !phoneOk || !emailOk) return;
      abandonmentSentRef.current = true;
      const message =
        `Abandoned checkout before confirming.\n` +
        `Route: ${journey.pickup} → ${journey.drop}\n` +
        `Vehicle: ${vehicle?.name || "unknown"}\n` +
        `Estimated fare: ${fmtINR(totalPayable)}`;
      const payload = JSON.stringify({ name: fullName.trim(), mobile: mobile.trim(), email: email.trim(), topic: "Abandoned Booking", message });
      try { navigator.sendBeacon(`${API_BASE_URL}/contact`, new Blob([payload], { type: "application/json" })); } catch { /* best-effort */ }
    }
    function onVisibilityChange() { if (document.visibilityState === "hidden") trySendAbandonment(); }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", trySendAbandonment);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", trySendAbandonment);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, mobile, email, journey.pickup, journey.drop, totalPayable]);

  function validate() {
    const e = {};
    if (!fullName.trim()) e.fullName = "Please enter your full name";
    if (!/^\d{10}$/.test(mobile.trim())) e.mobile = "Enter a valid 10-digit mobile number";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email address";
    if (isCorporate && !companyName.trim()) e.companyName = "Company name is required for corporate invoices";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function continueToPayment() {
    if (!validate()) { toast("Please fix the highlighted fields", "error"); return; }
    bookingCompletedRef.current = true;
    dispatch(setCheckoutDetails({
      fullName: fullName.trim(), mobile: mobile.trim(), email: email.trim(),
      address: address.trim(), landmark: landmark.trim(),
      gstNumber: isCorporate ? gstNumber.trim() : "",
      companyName: isCorporate ? companyName.trim() : "",
      notes: notes.trim(), customerType,
      paymentMode: saved.paymentMode || "FULL",
    }));
    navigate("/payment");
  }

  return (
    <>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
        <a href="/booking-search" className="inline-flex items-center gap-1.5 hover:!text-[#111]" style={{ color: "#666", fontWeight: 600, fontSize: 13.5, marginBottom: 18 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to Vehicles
        </a>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,34px)", margin: "0 0 22px", letterSpacing: "-.02em" }}>Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5.5 items-start">

          {/* ── Left: Passenger Details ────────────────────────────── */}
          <div className="flex flex-col gap-5">
            <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 26 }}>
              <div className="flex items-center justify-between mb-4.5">
                <h2 className="text-[17px] font-bold">Passenger Details</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (isCorporate) { setCustomerType("retail"); setCompanyName(""); setGstNumber(""); }
                    else setCustomerType("corporate");
                  }}
                  style={{
                    fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 9999, cursor: "pointer",
                    border: isCorporate ? "1.5px solid #FFC107" : "1.5px solid #E5E5E5",
                    background: isCorporate ? "#FFFBEA" : "#fff",
                    color: isCorporate ? "#B8860B" : "#666",
                  }}
                >
                  {isCorporate ? "− Remove GST" : "+ GST"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name — full width */}
                <div className="sm:col-span-2">
                  <FormField label="Full Name" required error={errors.fullName}>
                    <input className={FIELD_INPUT} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                  </FormField>
                </div>

                {/* Mobile + Email — side by side */}
                <FormField label="Mobile" required error={errors.mobile}>
                  <input className={FIELD_INPUT} type="tel" maxLength={10} placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </FormField>
                <FormField label="Email" error={errors.email}>
                  <input className={FIELD_INPUT} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </FormField>

                {/* Pickup Address — full width */}
                <div className="sm:col-span-2">
                  <FormField label="Pickup Address">
                    <input className={FIELD_INPUT} placeholder="House / building, area" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </FormField>
                </div>

                {/* Landmark — full width (was half-width next to the now-removed Passengers) */}
                <div className="sm:col-span-2">
                  <FormField label="Landmark">
                    <input className={FIELD_INPUT} placeholder="Nearby landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
                  </FormField>
                </div>

                {/* Corporate fields */}
                {isCorporate && (
                  <>
                    <FormField label="Company Name" required error={errors.companyName}>
                      <input className={FIELD_INPUT} placeholder="Your company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </FormField>
                    <FormField label="GSTIN (optional)">
                      <input className={FIELD_INPUT} placeholder="e.g. 29AABCT1332L1ZU" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                    </FormField>
                  </>
                )}

                {/* Special Instructions — full width */}
                <div className="sm:col-span-2">
                  <FormField label="Special Instructions">
                    <textarea className={`${FIELD_INPUT} min-h-[80px]`} placeholder="Anything the driver should know…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Fare Summary ────────────────────────────────── */}
          <div style={{ position: "sticky", top: 120, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden" }}>
              {/* Vehicle banner — actual selected vehicle photo */}
              <div style={{ height: 180, overflow: "hidden", position: "relative", background: "#F7F7F7" }}>
                <img
                  src={vehicle.img}
                  alt={vehicle.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                />
                {/* subtle gradient overlay so vehicle name below blends cleanly */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.18))" }} />
              </div>

              <div style={{ padding: 22 }}>
                <h3 style={{ fontWeight: 700, fontSize: 17, margin: "0 0 3px" }}>{vehicle.name}</h3>
                <div style={{ fontSize: 12.5, color: "#666", fontWeight: 500, marginBottom: 16 }}>
                  {vehicle.seats} Seats · {vehicle.ac ? "A/C" : "Non-A/C"}
                </div>

                {/* Route details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, paddingBottom: 16, borderBottom: "1px dashed #EFEFEF" }}>
                  <SummaryRow label="Route" value={`${journey.pickup} → ${journey.drop}`} />
                  <SummaryRow label="Date" value={journey.date} />
                  <SummaryRow label="Time" value={journey.time} />
                  <SummaryRow label="Trip" value={journey.tripType} />
                </div>

                {/* Fare breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, padding: "16px 0", borderBottom: "1px dashed #EFEFEF" }}>
                  <SummaryRow label="Base Fare" value={fmtINR(baseFare)} />
                  {driverBhata > 0 && <SummaryRow label="Driver Allowance" value={`+ ${fmtINR(driverBhata)}`} />}
                  {surgeFee > 0 && <SummaryRow label="Surge Fee (5%)" value={`+ ${fmtINR(surgeFee)}`} />}
                  {isCorporate && <SummaryRow label="Taxes (5%)" value={`+ ${fmtINR(cgst + sgst)}`} />}
                </div>

                {/* Total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 0 14px" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Estimated Total</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 24, color: "#111" }}>{fmtINR(totalPayable)}</span>
                </div>

                {/* Terms & Conditions link */}
                <p style={{ fontSize: 12, color: "#888", textAlign: "center", margin: "0 0 14px", lineHeight: 1.6 }}>
                  By continuing you agree to our{" "}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#B8860B", fontWeight: 700, fontSize: 12, textDecoration: "underline" }}
                  >
                    Terms &amp; Conditions
                  </button>
                  {" "}including inclusions &amp; exclusions.
                </p>

                {/* CTA */}
                <button
                  onClick={continueToPayment}
                  className="hover:!bg-black"
                  style={{ width: "100%", padding: 15, borderRadius: 12, border: "none", background: "#111", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
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

function FormField({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold text-text">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {children}
      {error && <span className="text-[12.5px] text-error">{error}</span>}
    </div>
  );
}
