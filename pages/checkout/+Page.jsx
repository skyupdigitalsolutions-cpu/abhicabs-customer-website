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

const PARTIAL_ADVANCE_PERCENT = 25;

// Rebuilt to match the Figma bundler export's structure: Checkout is now
// ONLY passenger/invoice details + a fare summary ending in "Continue to
// Payment" — Payment Method and Payment Options moved to the new, separate
// /payment page (pages/payment/+Page.jsx), matching the spec's actual
// two-page split instead of the previous single combined page.
//
// Form values are saved to the new checkoutSlice (Redux, localStorage
// -backed) via setCheckoutDetails so the Payment page — which can no longer
// read this out of local component state now that it's a different page —
// has everything it needs to actually create the booking and take payment.
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
  const [paxCount, setPaxCount] = useState(saved.paxCount || "2");
  const [notes, setNotes] = useState(saved.notes || "");
  const [customerType, setCustomerType] = useState(saved.customerType || "retail");
  // NEW: was never actually capturable on this page before — checkoutSlice
  // already had a paymentMode field and Payment page already read it, but
  // nothing on Checkout ever let the user set it, so it silently stayed at
  // its "FULL" default no matter what. This is the missing piece.
  const [paymentMode, setPaymentMode] = useState(saved.paymentMode || "FULL");
  const [errors, setErrors] = useState({});

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
        `Vehicle: ${vehicle?.name || selected?.vehicleId || "unknown"}\n` +
        `Estimated fare: ${fmtINR(totalPayable)}`;

      const payload = JSON.stringify({
        name: fullName.trim(), mobile: mobile.trim(), email: email.trim(),
        topic: "Abandoned Booking", message,
      });

      try {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${API_BASE_URL}/contact`, blob);
      } catch { /* best-effort only */ }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") trySendAbandonment();
    }
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
    bookingCompletedRef.current = true; // stop abandonment tracking — they're proceeding, not leaving
    dispatch(setCheckoutDetails({
      fullName: fullName.trim(), mobile: mobile.trim(), email: email.trim(),
      address: address.trim(), landmark: landmark.trim(),
      gstNumber: isCorporate ? gstNumber.trim() : "", companyName: isCorporate ? companyName.trim() : "",
      paxCount, notes: notes.trim(), customerType, paymentMode,
    }));
    navigate("/payment");
  }

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
      <a href="/booking-search" className="inline-flex items-center gap-1.5 hover:!text-[#111]" style={{ color: "#666", fontWeight: 600, fontSize: 13.5, marginBottom: 18 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to Vehicles
      </a>
      <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,34px)", margin: "0 0 22px", letterSpacing: "-.02em" }}>Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5.5 items-start">
        <div className="flex flex-col gap-5">
          {/* Passenger Details — per spec: Full Name, Mobile, Email, Pickup
              Address, Landmark, Passengers, Special Instructions.
              FIX: the old separate "Invoice Type" card (a big two-option
              Retail/Corporate picker) is replaced by a small "+ GST" toggle
              here — clicking it reveals Company Name/GSTIN inline and marks
              the booking as corporate; clicking it again hides them and
              reverts to retail, clearing whatever was entered. */}
          <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 26 }}>
            <div className="flex items-center justify-between mb-4.5">
              <h2 className="text-[17px] font-bold">Passenger Details</h2>
              <button
                type="button"
                onClick={() => {
                  if (isCorporate) {
                    setCustomerType("retail");
                    setCompanyName("");
                    setGstNumber("");
                  } else {
                    setCustomerType("corporate");
                  }
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
              <div className="sm:col-span-2">
                <FormField label="Full Name" required error={errors.fullName}>
                  <input className={FIELD_INPUT} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                </FormField>
              </div>
              <FormField label="Mobile" required error={errors.mobile}>
                <input className={FIELD_INPUT} type="tel" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </FormField>
              <FormField label="Email" error={errors.email}>
                <input className={FIELD_INPUT} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Pickup Address">
                  <input className={FIELD_INPUT} placeholder="House / building, area" value={address} onChange={(e) => setAddress(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Landmark">
                <input className={FIELD_INPUT} placeholder="Nearby landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
              </FormField>
              <FormField label="Passengers">
                <input className={FIELD_INPUT} readOnly value={paxCount} style={{ background: "#F1F1F1", color: "#666" }} />
              </FormField>
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
              <div className="sm:col-span-2">
                <FormField label="Special Instructions">
                  <textarea className={`${FIELD_INPUT} min-h-[80px]`} placeholder="Anything the driver should know…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ position: "sticky", top: 120, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ height: 130, background: "linear-gradient(135deg,#FFF7DE,#F7F7F7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
                <path d="M4 16l1.5-5A2 2 0 017.4 9.5h9.2a2 2 0 011.9 1.5L20 16" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2.5" y="16" width="19" height="4" rx="1.5" stroke="#B8860B" strokeWidth="1.5" />
                <circle cx="7" cy="20" r="1.6" fill="#B8860B" />
                <circle cx="17" cy="20" r="1.6" fill="#B8860B" />
                <path d="M8 9.5l1-3.5h6l1 3.5" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ padding: 22 }}>
              <h3 style={{ fontWeight: 700, fontSize: 17, margin: "0 0 3px" }}>{vehicle.name}</h3>
              <div style={{ fontSize: 12.5, color: "#666", fontWeight: 500, marginBottom: 16 }}>{vehicle.seats} Seats · {vehicle.ac ? "A/C" : "Non-A/C"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, paddingBottom: 16, borderBottom: "1px dashed #EFEFEF" }}>
                <SummaryRow label="Route" value={`${journey.pickup} → ${journey.drop}`} />
                <SummaryRow label="Date" value={journey.date} />
                <SummaryRow label="Time" value={journey.time} />
                <SummaryRow label="Trip" value={journey.tripType} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, padding: "16px 0", borderBottom: "1px dashed #EFEFEF" }}>
                <SummaryRow label="Base Fare" value={fmtINR(baseFare)} />
                {driverBhata > 0 && <SummaryRow label="Driver Allowance" value={`+ ${fmtINR(driverBhata)}`} />}
                {surgeFee > 0 && <SummaryRow label="Surge Fee (5%)" value={`+ ${fmtINR(surgeFee)}`} />}
                {isCorporate && <SummaryRow label="Taxes (5%)" value={`+ ${fmtINR(cgst + sgst)}`} />}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 0 6px" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Estimated Total</span>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 24, color: "#111" }}>{fmtINR(totalPayable)}</span>
              </div>

              {/* Payment Options — decide when/how much here, before moving
                  on to Payment (which just collects the actual payment
                  method for whatever was chosen here). */}
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: ".04em", margin: "0 0 8px" }}>Payment Options</p>
                <div style={{ border: "1px solid #EFEFEF", borderRadius: 12, overflow: "hidden" }}>
                  {[
                    { key: "ZERO", title: "Book at zero", sub: `Pay ${fmtINR(totalPayable)} later`, amount: 0 },
                    { key: "PARTIAL", title: "Part Pay", sub: `Pay ${PARTIAL_ADVANCE_PERCENT}% now, rest to the driver`, amount: Math.round((totalPayable * PARTIAL_ADVANCE_PERCENT) / 100) },
                    { key: "FULL", title: "Full Pay", sub: "Full amount now", amount: totalPayable },
                  ].map((opt, i) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPaymentMode(opt.key)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", textAlign: "left", border: "none", cursor: "pointer",
                        borderTop: i > 0 ? "1px solid #EFEFEF" : "none",
                        background: paymentMode === opt.key ? "#FFFBEA" : "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${paymentMode === opt.key ? "#FFC107" : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {paymentMode === opt.key && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFC107" }} />}
                        </span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{opt.title}</p>
                          <p style={{ fontSize: 11, color: "#666", margin: 0 }}>{opt.sub}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtINR(opt.amount)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={continueToPayment}
                className="hover:!bg-black"
                style={{ width: "100%", marginTop: 14, padding: 15, borderRadius: 12, border: "none", background: "#111", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
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
