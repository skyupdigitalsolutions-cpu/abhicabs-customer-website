import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "vike/client/router";
import { selectSelectedCab } from "../../src/store/slices/selectionSlice";
import { selectJourney } from "../../src/store/slices/journeySlice";
import { selectCheckoutDetails, setCheckoutDetails } from "../../src/store/slices/checkoutSlice";
import { API_BASE_URL } from "../../src/api/config";
import { isAuthenticated } from "../../src/api/tokens";
import { authApi } from "../../src/api";
import { VEHICLE_RATES, fmtINR } from "../../src/data/mockData";
import StateBlock from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import { FIELD_INPUT } from "../../src/components/ui/classNames";
import { useToast } from "../../src/hooks/useToast";
import { IconPin } from "../../src/components/Icons";
import { FareBreakupSection } from "../../src/components/checkout/FareBreakupSection";
import { CouponOffersSection } from "../../src/components/checkout/CouponOffersSection";

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

  const isGuest = !isAuthenticated();

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
  // The applied promo, if any — { ok, code, description, amount, payable }
  // straight from POST /discounts/check via CouponOffersSection.
  const [discount, setDiscount] = useState(
    saved.discountCode ? { ok: true, code: saved.discountCode, description: saved.discountDescription, amount: saved.discountAmount } : null
  );

  const bookingCompletedRef = useRef(false);
  const abandonmentSentRef = useRef(false);

  // Auto-fill from logged-in user profile on mount.
  // Only fills fields the user hasn't already typed — never overwrites edits.
  useEffect(() => {
    if (!isAuthenticated()) return;
    authApi.getMe()
      .then((user) => {
        if (!user) return;
        if (!fullName && (user.name || user.fullName))
          setFullName(user.name || user.fullName || "");
        if (!mobile && user.phone)
          setMobile(user.phone.replace(/[^\d]/g, "").slice(-10));
        if (!email && user.email && !user.email.includes("@placeholder.local"))
          setEmail(user.email);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // The real, backend-quoted total for this trip (already includes surge,
  // driver allowance, night allowance, minimum-fare top-up — see breakdown).
  const quotedTotal = selected.fare;
  const hasRealBreakdown = Array.isArray(selected.breakdown) && selected.breakdown.length > 0;
  const isCorporate = customerType === "corporate";
  // GST is shown only when the backend's own breakdown didn't already price
  // it in (corporate invoicing is applied server-side at booking time via
  // customerService.resolveBillingEntity) — this is a display-only estimate
  // for the corporate toggle, not a separate charge collected here.
  const cgst = isCorporate && !hasRealBreakdown ? Math.round(quotedTotal * 0.025) : 0;
  const sgst = isCorporate && !hasRealBreakdown ? Math.round(quotedTotal * 0.025) : 0;
  const discountAmount = discount?.ok ? Number(discount.amount || 0) : 0;
  const totalPayable = Math.max(0, quotedTotal + cgst + sgst - discountAmount);

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

  async function continueToPayment() {
    if (!validate()) { toast("Please fix the highlighted fields", "error"); return; }

    // Guest user — silently register so the backend can associate the booking
    // with a real account. Uses phone as the unique key; generates a
    // placeholder email if the user didn't provide one.
    if (!isAuthenticated()) {
      try {
        const guestEmail = email.trim() ||
          `guest.${mobile.trim()}@placeholder.local`;
        await authApi.register({
          name: fullName.trim(),
          email: guestEmail,
          phone: mobile.trim(),
        });
        // Silently succeed — no toast needed, guest just continues to payment
      } catch (err) {
        // EMAIL_TAKEN or PHONE_TAKEN = account already exists, safe to proceed
        // Any other error: log but don't block — booking endpoint accepts guests
        const code = err?.code || err?.message || "";
        if (!code.includes("TAKEN") && !code.includes("already")) {
          console.warn("Guest auto-register:", err.message);
        }
      }
    }

    bookingCompletedRef.current = true;
    dispatch(setCheckoutDetails({
      fullName: fullName.trim(), mobile: mobile.trim(), email: email.trim(),
      address: address.trim(), landmark: landmark.trim(),
      gstNumber: isCorporate ? gstNumber.trim() : "",
      companyName: isCorporate ? companyName.trim() : "",
      notes: notes.trim(), customerType,
      paymentMode: saved.paymentMode || "FULL",
      // Carried to the Payment page. NOTE: /bookings has no discountCode
      // field, so this is display/local-total metadata only — it was checked
      // live against POST /discounts/check (real), but nothing server-side
      // records the redemption or enforces single-use. See
      // CouponOffersSection's header comment for the full picture.
      discountCode: discount?.ok ? discount.code : null,
      discountAmount: discount?.ok ? Number(discount.amount || 0) : 0,
      discountDescription: discount?.ok ? discount.description : null,
    }));
    navigate("/payment");
  }

  return (
    <>
      {/* Terms now expand inline in the form — no popup */}

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 60px" }}>
        <a href="/booking-search" className="inline-flex items-center gap-1.5 hover:!text-[#111]" style={{ color: "#666", fontWeight: 600, fontSize: 13.5, marginBottom: 18 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to Vehicles
        </a>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,34px)", margin: "0 0 22px", letterSpacing: "-.02em" }}>Checkout</h1>

        <div className="checkout-grid grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5.5 items-start">

          {/* ── Left: Passenger Details ────────────────────────────── */}
          <div className="flex flex-col gap-5">
            <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 26 }}>
              {/* Guest checkout notice */}
              {isGuest && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>👤</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13.5, color: "#1e3a5f", margin: 0 }}>Booking as Guest</p>
                    <p style={{ fontSize: 12.5, color: "#3b5998", margin: "4px 0 0", lineHeight: 1.5 }}>
                      No account needed. Fill your details and proceed to payment.{" "}
                      <a href="/login" style={{ fontWeight: 700, color: "#1d4ed8" }}>Sign in</a> to track bookings later.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-4.5">
                <div>
                  <h2 className="text-[17px] font-bold">Passenger Details</h2>
                  {isAuthenticated() && (
                    <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>
                      Pre-filled from your profile — all fields are editable
                    </p>
                  )}
                </div>
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

                {/* Terms & Conditions — expandable inline (no popup) */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowTerms((s) => !s)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "#FAFAFA", border: "1px solid #EFEFEF", borderRadius: 12, padding: "13px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13.5, color: "#111" }}
                  >
                    <span>Terms &amp; Conditions — inclusions &amp; exclusions</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: showTerms ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                      <path d="M6 9l6 6 6-6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {showTerms && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Inclusions */}
                      <div style={{ background: "#F0FFF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 18px" }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "#166534", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: ".04em" }}>✓ What's Included</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                          {INCLUSIONS.map((item, i) => (
                            <li key={i} style={{ display: "flex", gap: 9, fontSize: 13, color: "#15803D" }}>
                              <span style={{ flexShrink: 0, marginTop: 1 }}>✓</span><span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Exclusions */}
                      <div style={{ background: "#FFF7F7", border: "1px solid #FECACA", borderRadius: 14, padding: "16px 18px" }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "#991B1B", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: ".04em" }}>✗ Not Included</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                          {EXCLUSIONS.map((item, i) => (
                            <li key={i} style={{ display: "flex", gap: 9, fontSize: 13, color: "#B91C1C" }}>
                              <span style={{ flexShrink: 0, marginTop: 1 }}>✗</span><span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* General terms */}
                      <div style={{ fontSize: 12.5, color: "#666", lineHeight: 1.7, padding: "0 2px" }}>
                        <p style={{ fontWeight: 700, color: "#333", fontSize: 13, marginBottom: 8 }}>General Terms</p>
                        <p style={{ margin: "0 0 7px" }}>Cancellations made more than 24 hours before pickup receive a full refund. Cancellations within 24 hours may attract a cancellation fee as per our policy.</p>
                        <p style={{ margin: "0 0 7px" }}>ABHI CABS reserves the right to substitute a vehicle of equivalent or superior category in case of unforeseen circumstances.</p>
                        <p style={{ margin: 0 }}>By proceeding with the booking, you agree to these terms and conditions.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Fare Summary ────────────────────────────────── */}
          {/* Sticky only from lg up — on a phone this panel is now taller
              (fare breakdown + coupon section), so keeping it sticky at every
              width would pin a tall block over the passenger form while
              scrolling. Matches the same lg:sticky pattern the Payment page
              already uses for its summary panel. */}
          <div className="lg:sticky lg:top-[120px]" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden" }}>
              {/* Vehicle banner — actual selected vehicle photo */}
              <div style={{ height: 180, overflow: "hidden", position: "relative", background: "#F7F7F7" }}>
                <img
                  src={selected.vehicleImg || vehicle.img}
                  alt={selected.vehicleName || vehicle.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                />
                {/* subtle gradient overlay so vehicle name below blends cleanly */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.18))" }} />
              </div>

              <div style={{ padding: 22 }}>
                <h3 style={{ fontWeight: 700, fontSize: 17, margin: "0 0 3px" }}>{selected.vehicleName || vehicle.name}</h3>
                <div style={{ fontSize: 12.5, color: "#666", fontWeight: 500, marginBottom: 16 }}>
                  {selected.vehicleSeats || vehicle.seats} Seats · {(selected.vehicleAc ?? vehicle.ac) ? "A/C" : "Non-A/C"}
                </div>

                {/* Route details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, paddingBottom: 16, borderBottom: "1px dashed #EFEFEF" }}>
                  <SummaryRow label="Trip Type" value={
                    journey.tripType === "one-way" ? "One Way" :
                    journey.tripType === "round-trip" ? "Round Trip" :
                    journey.tripType === "local" ? "Local" :
                    journey.tripType === "airport" ? "Airport" :
                    journey.tripType
                  } />
                  <SummaryRow label="From" value={journey.pickup || "—"} />
                  {journey.stops?.length > 0 && journey.stops.map((s, i) => (
                    <SummaryRow key={i} label={`Stop ${i + 1}`} value={s} />
                  ))}
                  <SummaryRow label="To" value={journey.drop || "—"} />
                  <SummaryRow label="Pickup Date" value={journey.date} />
                  <SummaryRow label="Pickup Time" value={(() => {
                    if (!journey.time) return "—";
                    const [hh, mm] = journey.time.split(":").map(Number);
                    const ap = hh < 12 ? "AM" : "PM";
                    const h = hh % 12 || 12;
                    return `${h}:${String(mm).padStart(2,"0")} ${ap}`;
                  })()} />
                  {journey.tripType === "round-trip" && journey.returnDate && (
                    <SummaryRow label="Return Date" value={journey.returnDate} />
                  )}
                  {journey.tripType === "local" && journey.package && (
                    <SummaryRow label="Package" value={journey.package} />
                  )}
                  {journey.passengers && (
                    <SummaryRow label="Passengers" value={journey.passengers} />
                  )}
                </div>

                {/* Fare breakdown — real, from the backend when available
                    (base fare, driver allowance, night allowance, surge,
                    minimum-fare top-up, rounding); falls back to the simpler
                    summary if this cab was picked without a live quote. */}
                <div style={{ padding: "16px 0", borderBottom: "1px dashed #EFEFEF" }}>
                  {hasRealBreakdown ? (
                    <FareBreakupSection breakdown={selected.breakdown} total={quotedTotal} />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
                      <SummaryRow label="Base Fare" value={fmtINR(baseFare)} />
                      {driverBhata > 0 && <SummaryRow label="Driver Allowance" value={`+ ${fmtINR(driverBhata)}`} />}
                      {surgeFee > 0 && <SummaryRow label={`Surge Fee${selected.surgePct ? ` (${selected.surgePct}%)` : ""}`} value={`+ ${fmtINR(surgeFee)}`} />}
                      {isCorporate && <SummaryRow label="Taxes (5%)" value={`+ ${fmtINR(cgst + sgst)}`} />}
                    </div>
                  )}
                </div>

                {/* Coupon & Offers — real promo codes, checked live against
                    this fare total */}
                <div style={{ padding: "16px 0", borderBottom: "1px dashed #EFEFEF" }}>
                  <CouponOffersSection
                    fareTotal={quotedTotal}
                    tripType={journey.tripType}
                    applied={discount}
                    onApplied={setDiscount}
                  />
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 13.5 }}>
                    <span style={{ color: "#666" }}>Promo ({discount.code})</span>
                    <span style={{ fontWeight: 700, color: "#15803D" }}>− {fmtINR(discountAmount)}</span>
                  </div>
                )}

                {/* Total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 0 14px" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{discountAmount > 0 ? "Payable Total" : "Estimated Total"}</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 24, color: "#111" }}>{fmtINR(totalPayable)}</span>
                </div>

                {/* Terms note — full details expandable on the left form */}
                <p style={{ fontSize: 12, color: "#888", textAlign: "center", margin: "0 0 14px", lineHeight: 1.6 }}>
                  By continuing you agree to our Terms &amp; Conditions, including inclusions &amp; exclusions.
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