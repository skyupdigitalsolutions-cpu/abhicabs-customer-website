import React, { useState } from "react";
import { useSelector } from "react-redux";
import { bookingRequestsApi } from "../api";
import { parseIndianMobile, cleanPhoneInput } from "../lib/phone";

/**
 * Shown when a trip touches a state we do not operate in
 * (backend code OUTSIDE_SERVICE_STATES, details.canRequest === true).
 *
 * TWO-STEP FLOW:
 *   Step 1 — Contact details (name, phone, email, passengers, note)
 *   Step 2 — Vehicle selection → then "Send booking request" appears
 *
 * Nothing is booked or charged. The enquiry is saved as a booking request and
 * our team calls back with a quote.
 */
const field = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
  border: "1.5px solid #E5E5E5", fontSize: 14, outline: "none", background: "#fff",
};
const label = { display: "block", fontSize: 12, fontWeight: 600, color: "#555", margin: "0 0 5px", textAlign: "left" };
const err = { fontSize: 12, color: "#DC2626", margin: "4px 0 0", textAlign: "left" };

const VEHICLES = [
  { value: "swift-dzire",       label: "Swift Dzire",        seats: "4 Seater",   tag: "Popular" },
  { value: "ertiga",            label: "Ertiga",             seats: "6 Seater" },
  { value: "innova",            label: "Innova",             seats: "7 Seater" },
  { value: "innova-crysta",     label: "Innova Crysta",      seats: "7 Seater",   tag: "Premium" },
  { value: "innova-hycross",    label: "Innova Hycross",     seats: "7 Seater" },
  { value: "fortuner",          label: "Fortuner",           seats: "7 Seater",   tag: "SUV" },
  { value: "mercedes-e",        label: "Mercedes E-Class",   seats: "4 Seater",   tag: "Luxury" },
  { value: "tempo-12",          label: "Tempo Traveller",    seats: "12 Seater" },
  { value: "tempo-17",          label: "Tempo Traveller",    seats: "17 Seater" },
  { value: "urbania-13",        label: "Urbania",            seats: "13 Seater" },
  { value: "urbania-16",        label: "Urbania",            seats: "16 Seater" },
  { value: "urbania-maharaja",  label: "Urbania Maharaja",   seats: "16 Seater",  tag: "Premium" },
  { value: "bus",               label: "Bus",                seats: "20+ Seater" },
];

export default function BookingRequestForm({ journey, message, allowedStates = [], onChangeTrip, selectedVehicleName, selectedVehicleSeats }) {
  const saved = useSelector((s) => s.checkout?.details) || {};
  const preSelected = !!selectedVehicleName;
  const [step, setStep] = useState(preSelected ? 2 : 1); // 1 = vehicle, 2 = contact
  const [name, setName] = useState(saved.fullName || "");
  const [phone, setPhone] = useState(cleanPhoneInput(saved.mobile || ""));
  const [email, setEmail] = useState(saved.email || "");
  const [passengers, setPassengers] = useState(saved.paxCount || "");
  const [note, setNote] = useState("");
  const [vehicleClass, setVehicleClass] = useState(journey?.vehicleClass || "");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(null);

  function goToStep2(ev) {
    ev?.preventDefault?.();
    if (!vehicleClass) {
      setErrors({ vehicle: "Please select a vehicle to continue." });
      return;
    }
    setErrors({});
    setStep(2);
    const card = document.getElementById("br-card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(ev) {
    ev.preventDefault();
    if (busy) return;
    const e = {};
    if (name.trim().length < 2) e.name = "Please enter your name.";
    if (!parseIndianMobile(phone)) e.phone = "Enter a valid 10-digit mobile number.";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email or leave it blank.";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSubmitError("");
    setBusy(true);
    try {
      const request = await bookingRequestsApi.createBookingRequest(
        journey,
        { name, phone: parseIndianMobile(phone), email, passengers, note },
        vehicleClass,
      );
      setDone(request);
    } catch (ex) {
      setSubmitError(ex?.message || "We couldn't send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const card = { maxWidth: 520, margin: "40px auto", background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 32, textAlign: "center" };

  // ── Success screen ──────────────────────────────────────────────────
  if (done) {
    return (
      <div style={card} data-testid="booking-request-done">
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 10px", color: "#111" }}>Request received</h3>
        {done.requestNumber && (
          <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: "#111" }}>{done.requestNumber}</p>
        )}
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 22px" }}>
          Our team will call you on {parseIndianMobile(phone) || phone} with a quote. No booking has been made and you have not been charged.
        </p>
        <a href="/" style={{ display: "block", padding: "13px 0", borderRadius: 12, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
          Back to home
        </a>
      </div>
    );
  }

  // ── Step indicator ──────────────────────────────────────────────────
  const stepBar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "0 0 20px" }}>
      {[1, 2].map((s) => (
        <React.Fragment key={s}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800,
            background: s <= step ? "#FFC107" : "#F3F4F6",
            color: s <= step ? "#111" : "#999",
            transition: "all .25s",
          }}>
            {s < step ? "✓" : s}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: s <= step ? "#111" : "#999" }}>
            {s === 1 ? "Select vehicle" : "Your details"}
          </span>
          {s < 2 && <div style={{ width: 28, height: 2, borderRadius: 1, background: step > 1 ? "#FFC107" : "#E5E5E5" }} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div style={card} id="br-card">
      {!preSelected && (
        <>
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 10px", color: "#111" }}>We don't operate on this route yet</h3>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 6px" }}>
            {message || "This trip goes outside the states we currently serve."}
          </p>
          {allowedStates.length > 0 && (
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: "0 0 6px" }}>
              We currently serve: {allowedStates.join(", ")}.
            </p>
          )}
          <p style={{ fontSize: 13.5, color: "#888", lineHeight: 1.6, margin: "0 0 20px" }}>
            Send us a booking request instead. Our team will confirm availability and price by phone.
          </p>

          {/* Trip summary */}
          <div style={{ background: "#FAFAFA", border: "1px solid #EFEFEF", borderRadius: 12, padding: "10px 14px", margin: "0 0 18px", textAlign: "left", fontSize: 13, color: "#333", lineHeight: 1.6 }}>
            <div><strong>From:</strong> {journey?.pickup || "—"}</div>
            {journey?.drop ? <div><strong>To:</strong> {journey.drop}</div> : null}
            <div><strong>When:</strong> {[journey?.date, journey?.time].filter(Boolean).join(" ") || "—"}</div>
          </div>

          {stepBar}
        </>
      )}

      {preSelected && (
        <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 16px", color: "#111" }}>Complete your booking request</h3>
      )}

      {/* ── STEP 1: Vehicle selection (like normal booking, no price) ── */}
      {step === 1 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 4px", textAlign: "left" }}>
            Choose your ride
          </p>
          <p style={{ fontSize: 13, color: "#888", margin: "0 0 14px", textAlign: "left" }}>
            Select a vehicle for this trip. You'll add your contact details next.
          </p>

          {errors.vehicle && (
            <p style={{ ...err, textAlign: "center", fontSize: 13, margin: "0 0 12px",
              padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA" }}>
              {errors.vehicle}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {VEHICLES.map((v) => {
              const active = vehicleClass === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => { setVehicleClass(v.value); setErrors({}); }}
                  style={{
                    position: "relative", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 14, textAlign: "left",
                    border: active ? "2px solid #FFC107" : "1.5px solid #E5E5E5",
                    background: active ? "#FFFBEB" : "#fff",
                    cursor: "pointer", transition: "all .15s",
                    width: "100%",
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? "#FFC107" : "#F3F4F6",
                  }}>
                    <span style={{ fontSize: 18 }}>🚗</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{v.label}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{v.seats}</div>
                  </div>
                  {v.tag && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
                      background: active ? "#FFC107" : "#F3F4F6",
                      color: active ? "#111" : "#888",
                    }}>
                      {v.tag}
                    </span>
                  )}
                  {active && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: "#FFC107", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goToStep2}
            disabled={!vehicleClass}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12,
              background: vehicleClass ? "#FFC107" : "#E5E5E5",
              color: vehicleClass ? "#111" : "#999",
              fontWeight: 700, fontSize: 15, border: "none",
              cursor: vehicleClass ? "pointer" : "default",
              transition: "all .2s",
            }}
          >
            Next →
          </button>
          {onChangeTrip && (
            <button type="button" onClick={onChangeTrip}
                    style={{ width: "100%", marginTop: 8, padding: "13px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#555", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              ← Change trip
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: Contact details + submit ───────────────────────── */}
      {step === 2 && (
        <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Selected vehicle summary */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "#FFFBEB", border: "1.5px solid #FFC107", marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#FFC107", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🚗</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "#111" }}>
                {preSelected ? selectedVehicleName : VEHICLES.find(v => v.value === vehicleClass)?.label}
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                {preSelected ? (selectedVehicleSeats || "") : VEHICLES.find(v => v.value === vehicleClass)?.seats}
              </div>
            </div>
            <button type="button" onClick={preSelected ? onChangeTrip : () => setStep(1)} style={{ fontSize: 12, fontWeight: 700, color: "#B08800", background: "none", border: "none", cursor: "pointer" }}>
              Change vehicle
            </button>
          </div>

          <div>
            <label style={label} htmlFor="br-name">Your name</label>
            <input id="br-name" style={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            {errors.name && <p style={err}>{errors.name}</p>}
          </div>
          <div>
            <label style={label} htmlFor="br-phone">Mobile number</label>
            <input id="br-phone" style={field} value={phone} inputMode="numeric" autoComplete="tel"
                   onChange={(e) => setPhone(cleanPhoneInput(e.target.value))} placeholder="10-digit mobile" />
            {errors.phone && <p style={err}>{errors.phone}</p>}
          </div>
          <div>
            <label style={label} htmlFor="br-email">Email (optional)</label>
            <input id="br-email" style={field} value={email} type="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <p style={err}>{errors.email}</p>}
          </div>
          <div>
            <label style={label} htmlFor="br-pax">Passengers (optional)</label>
            <input id="br-pax" style={field} value={passengers} inputMode="numeric"
                   onChange={(e) => setPassengers(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </div>
          <div>
            <label style={label} htmlFor="br-note">Anything we should know? (optional)</label>
            <textarea id="br-note" style={{ ...field, minHeight: 70, resize: "vertical" }} maxLength={500}
                      value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {submitError && <p style={{ ...err, textAlign: "center", fontSize: 13 }}>{submitError}</p>}

          <button type="submit" disabled={busy}
                  style={{ padding: "13px 0", borderRadius: 12, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Sending…" : "Send booking request"}
          </button>
          <button type="button" onClick={preSelected ? onChangeTrip : () => setStep(1)}
                  style={{ padding: "13px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#555", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            ← {preSelected ? "Back to vehicles" : "Back"}
          </button>
        </form>
      )}
    </div>
  );
}