import React, { useState } from "react";
import { useSelector } from "react-redux";
import { bookingRequestsApi } from "../api";
import { parseIndianMobile, cleanPhoneInput } from "../lib/phone";

/**
 * Shown when a trip touches a state we do not operate in
 * (backend code OUTSIDE_SERVICE_STATES, details.canRequest === true).
 *
 * Nothing is booked or charged. The enquiry is saved as a booking request and
 * our team calls back with a quote. Contact details are prefilled from the
 * checkout form when the visitor already typed them.
 */
const field = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
  border: "1.5px solid #E5E5E5", fontSize: 14, outline: "none", background: "#fff",
};
const label = { display: "block", fontSize: 12, fontWeight: 600, color: "#555", margin: "0 0 5px", textAlign: "left" };
const err = { fontSize: 12, color: "#DC2626", margin: "4px 0 0", textAlign: "left" };

export default function BookingRequestForm({ journey, message, allowedStates = [], onChangeTrip }) {
  const saved = useSelector((s) => s.checkout?.details) || {};
  const [name, setName] = useState(saved.fullName || "");
  const [phone, setPhone] = useState(cleanPhoneInput(saved.mobile || ""));
  const [email, setEmail] = useState(saved.email || "");
  const [passengers, setPassengers] = useState(saved.paxCount || "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(null);

  function validate() {
    const e = {};
    if (name.trim().length < 2) e.name = "Please enter your name.";
    if (!parseIndianMobile(phone)) e.phone = "Enter a valid 10-digit mobile number.";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email or leave it blank.";
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (busy) return;
    const e = validate();
    setErrors(e);
    setSubmitError("");
    if (Object.keys(e).length) return;
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

  const card = { maxWidth: 520, margin: "40px auto", background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 32, textAlign: "center" };

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

  return (
    <div style={card}>
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

      <div style={{ background: "#FAFAFA", border: "1px solid #EFEFEF", borderRadius: 12, padding: "10px 14px", margin: "0 0 18px", textAlign: "left", fontSize: 13, color: "#333", lineHeight: 1.6 }}>
        <div><strong>From:</strong> {journey?.pickup || "—"}</div>
        {journey?.drop ? <div><strong>To:</strong> {journey.drop}</div> : null}
        <div><strong>When:</strong> {[journey?.date, journey?.time].filter(Boolean).join(" ") || "—"}</div>
      </div>

      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        {onChangeTrip && (
          <button type="button" onClick={onChangeTrip}
                  style={{ padding: "13px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#555", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            ← Change trip
          </button>
        )}
      </form>
    </div>
  );
}
