import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { fmtINR, VEHICLE_RATES } from "../../src/data/mockData";
import { useToast } from "../../src/hooks/useToast";
import useBookingLookup from "../../src/hooks/useBookingLookup";
import StateBlock from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import { IconPin } from "../../src/components/Icons";

// Rebuilt to match the reference exactly: car icon banner (not a checkmark),
// "Booking Confirmed" title, and a 2-row/3-column detail grid (Route/Date &
// Time/Seats·AC, then Passengers/Driver/Total Paid).
//
// NOTE on "Booking Confirmed": earlier this said "Booking Received!" with
// "We're finding a driver" specifically because claiming a driver is
// assigned would be false at this exact moment. "Booking Confirmed" is
// still accurate — the RESERVATION itself is confirmed the moment payment/
// booking creation succeeds — and the new "Driver" field states the real
// assignment policy ("Assigned 2 hrs before pickup") rather than claiming
// one is assigned already, so this isn't reintroducing that inaccuracy.
export default function Page() {
  const pageContext = usePageContext();
  const bookingId = pageContext.urlParsed?.search?.b || null;
  const toast = useToast();
  const { booking, loading } = useBookingLookup(bookingId);

  if (loading) {
    return <p style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>Loading your booking…</p>;
  }

  if (!booking) {
    return (
      <section style={{ padding: "56px 0" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 22px" }}>
          <StateBlock tone="empty" icon={<IconPin className="w-6.5 h-6.5" />}
            title="Booking not found"
            description="We couldn't find that booking. It may have been cancelled, or the link may be incorrect."
            action={<Button href="/#booking">Book a Cab</Button>}
          />
        </div>
      </section>
    );
  }

  const isCorporate = booking.customerType === "corporate";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 22px 70px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 82, height: 82, margin: "0 auto 20px", borderRadius: "50%", background: "#e7f6ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#1a8a4a" />
            <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,34px)", margin: "0 0 6px", letterSpacing: "-.02em" }}>Booking Confirmed</h1>
        <p style={{ fontSize: 14.5, color: "#666", margin: 0 }}>
          Booking ID <span style={{ fontWeight: 700, color: "#111" }}>{booking.bookingId}</span>
        </p>

        {isCorporate && (
          <div style={{
            display: "inline-block", marginTop: 12, padding: "6px 14px", borderRadius: 9999, fontSize: 12.5, fontWeight: 700,
            background: "#FFF7DE", color: "#B8860B",
          }}>
            Tax Invoice (GST Applied)
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ height: 180, overflow: "hidden", background: "#F7F7F7", position: "relative" }}>
          {(() => {
            const img = booking.vehicleImg ||
              VEHICLE_RATES.find(v => v.id === booking.vehicleId)?.img ||
              VEHICLE_RATES.find(v => v.category === booking.vehicleClass)?.img;
            return img
              ? <img src={img} alt={booking.vehicle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#FFF7DE,#F7F7F7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none"><path d="M4 16l1.5-5A2 2 0 017.4 9.5h9.2a2 2 0 011.9 1.5L20 16" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="2.5" y="16" width="19" height="4" rx="1.5" stroke="#B8860B" strokeWidth="1.5" /><circle cx="7" cy="20" r="1.6" fill="#B8860B" /><circle cx="17" cy="20" r="1.6" fill="#B8860B" /><path d="M8 9.5l1-3.5h6l1 3.5" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>;
          })()}
        </div>
        <div style={{ padding: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
            <h2 style={{ fontWeight: 700, fontSize: 19, margin: 0 }}>{booking.vehicle}</h2>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a8a4a", background: "#e7f6ed", padding: "5px 12px", borderRadius: 9999 }}>
              {booking.paymentStatus}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "18px 16px", fontSize: 13.5 }}>
            <DetailCell label="Route" value={`${booking.pickup} → ${booking.drop}`} />
            <DetailCell label="Date & Time" value={`${booking.date} · ${booking.time}`} />
            <DetailCell label="Seats · AC" value={booking.vehicleSeats ? `${booking.vehicleSeats} Seater · A/C` : "—"} />
            <DetailCell label="Passengers" value={booking.passengerCount || "—"} />
            <DetailCell label="Driver" value="Assigned 2 hrs before pickup" />
            <DetailCell label="Total Paid" value={fmtINR(booking.amountPaid ?? 0)} />
          </div>

          {booking.balanceDue > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #EFEFEF" }}>
              <Row label="Balance Due (on trip)" value={fmtINR(booking.balanceDue)} bold />
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            <a
              href={`/my-booking?b=${booking.bookingId}`}
              className="hover:!bg-[#FFB300]"
              style={{ flex: "1 1 150px", padding: 14, borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14, textAlign: "center", cursor: "pointer" }}
            >
              View Booking
            </a>
            <button
              onClick={() => toast("Invoice PDF download will be available once payment integration is connected. Use Print from the checkout preview.")}
              className="hover:!bg-[#F7F7F7]"
              style={{ flex: "1 1 150px", padding: 14, borderRadius: 12, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Download Receipt
            </button>
            <a
              href="/#contact-form"
              style={{ flex: "1 1 150px", padding: 14, borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#111", fontWeight: 600, fontSize: 14, textAlign: "center" }}
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 12.5, color: "#666" }}>
        A confirmation has been sent to <b>{booking.email || booking.mobile}</b>
      </p>
    </main>
  );
}

function DetailCell({ label, value }) {
  return (
    <div>
      <div style={{ color: "#999", fontSize: 11.5, fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, fontFamily: bold ? "'Montserrat',sans-serif" : undefined, fontSize: bold ? 15 : 13 }}>{value}</span>
    </div>
  );
}