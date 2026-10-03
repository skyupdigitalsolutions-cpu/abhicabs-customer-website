import React, { useState } from "react";
import { useSelector } from "react-redux";
import { bookingRequestsApi } from "../api";
import { parseIndianMobile, cleanPhoneInput } from "../lib/phone";

/**
 * Booking request contact form — shown after the customer selects a vehicle
 * from the normal vehicle list on an out-of-area trip.
 *
 * When `selectedVehicleName` is passed (pre-selected from the vehicle list),
 * this shows ONLY the contact form — no vehicle grid, no step indicator,
 * no "We don't operate" header. Clean and direct.
 */

export default function BookingRequestForm({ journey, message, allowedStates = [], onChangeTrip, selectedVehicleName, selectedVehicleSeats }) {
  const saved = useSelector((s) => s.checkout?.details) || {};
  const preSelected = !!selectedVehicleName;
  const [name, setName] = useState(saved.fullName || "");
  const [phone, setPhone] = useState(cleanPhoneInput(saved.mobile || ""));
  const [email, setEmail] = useState(saved.email || "");
  const [passengers, setPassengers] = useState(saved.paxCount || "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(null);

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
        journey?.vehicleClass,
      );
      setDone(request);
    } catch (ex) {
      setSubmitError(ex?.message || "We couldn't send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ── Success ─────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div style={wrap}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)", display: "grid", placeItems: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3 style={{ fontWeight: 800, fontSize: 20, color: "#111", margin: 0 }}>Request sent!</h3>
          {done.requestNumber && (
            <p style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#6B7280", margin: 0, background: "#F3F4F6", padding: "4px 14px", borderRadius: 8 }}>{done.requestNumber}</p>
          )}
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: 0, textAlign: "center", maxWidth: 340 }}>
            Our team will call you on <strong>{parseIndianMobile(phone) || phone}</strong> with a confirmed price. Nothing has been charged.
          </p>
          <a href="/"
            style={{ marginTop: 8, display: "inline-block", padding: "12px 32px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Back to home
          </a>
        </div>
      </div>
    );
  }

  /* ── Form ─────────────────────────────────────────────────────────── */
  return (
    <div style={wrap}>
      {/* Header */}
      <div style={{ padding: "24px 28px 0", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FFC107", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </div>
        <h3 style={{ fontWeight: 800, fontSize: 20, color: "#111", margin: "0 0 6px" }}>
          Almost there!
        </h3>
        <p style={{ fontSize: 14, color: "#77736A", margin: 0, lineHeight: 1.5 }}>
          Leave your details and our team will call you with a confirmed price for this trip.
        </p>
      </div>

      {/* Selected vehicle bar */}
      <div style={{ margin: "20px 28px 0", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, background: "#FFFBEB", border: "1.5px solid #FDE68A" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFC107", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14M5 17a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2M5 17l-1 3h2l1-3m12 0l1 3h-2l-1-3"/>
            <circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "#111" }}>{selectedVehicleName || "Vehicle"}</div>
          {selectedVehicleSeats && <div style={{ fontSize: 12.5, color: "#92400E", marginTop: 1 }}>{selectedVehicleSeats}</div>}
        </div>
        {onChangeTrip && (
          <button type="button" onClick={onChangeTrip}
            style={{ fontSize: 12.5, fontWeight: 700, color: "#B08800", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>
            Change
          </button>
        )}
      </div>

      {/* Trip route */}
      <div style={{ margin: "12px 28px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#555" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="16"/><circle cx="12" cy="19" r="3"/></svg>
        <span>{journey?.pickup || "—"}</span>
        <span style={{ color: "#ccc" }}>→</span>
        <span>{journey?.drop || "—"}</span>
      </div>

      {/* Form fields */}
      <form onSubmit={submit} noValidate style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={lbl}>Your name <span style={{ color: "#DC2626" }}>*</span></label>
          <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" />
          {errors.name && <p style={errStyle}>{errors.name}</p>}
        </div>

        <div>
          <label style={lbl}>Mobile number <span style={{ color: "#DC2626" }}>*</span></label>
          <input style={inp} value={phone} onChange={(e) => setPhone(cleanPhoneInput(e.target.value))} placeholder="10-digit mobile" inputMode="numeric" autoComplete="tel" />
          {errors.phone && <p style={errStyle}>{errors.phone}</p>}
        </div>

        <div>
          <label style={lbl}>Email <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
          <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" />
          {errors.email && <p style={errStyle}>{errors.email}</p>}
        </div>

        <div className="brf-mini-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>Passengers <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
            <input style={inp} value={passengers} onChange={(e) => setPassengers(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="e.g. 4" inputMode="numeric" />
          </div>
          <div>
            <label style={lbl}>Special requests</label>
            <input style={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any notes" maxLength={500} />
          </div>
        </div>

        {submitError && (
          <p style={{ fontSize: 13, color: "#DC2626", fontWeight: 600, textAlign: "center", margin: 0, padding: "8px 12px", borderRadius: 8, background: "#FEF2F2" }}>{submitError}</p>
        )}

        <button type="submit" disabled={busy}
          style={{
            marginTop: 4, padding: "14px 0", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #FFC107 0%, #FFB300 100%)",
            boxShadow: "0 4px 16px rgba(255,193,7,0.35)",
            color: "#111", fontWeight: 800, fontSize: 15.5,
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
            transition: "transform 0.15s, box-shadow 0.2s",
          }}
        >
          {busy ? "Sending request…" : "Send Booking Request"}
        </button>

        <button type="button" onClick={onChangeTrip}
          style={{ padding: "12px 0", borderRadius: 12, border: "1.5px solid #E8E5DE", background: "#fff", color: "#555", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          ← Back to vehicles
        </button>
      </form>
    </div>
  );
}

const wrap = {
  maxWidth: 480, margin: "32px auto", background: "#fff",
  borderRadius: 24, overflow: "hidden",
  boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  border: "1px solid #F0EDE8",
};
const lbl = { display: "block", fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 5px" };
const inp = {
  width: "100%", boxSizing: "border-box", height: 44, padding: "0 14px", borderRadius: 12,
  border: "1.5px solid #E5E5E5", fontSize: 14, color: "#111", outline: "none", background: "#fff",
  transition: "border-color 0.2s",
};
const errStyle = { fontSize: 12, color: "#DC2626", margin: "4px 0 0", fontWeight: 500 };