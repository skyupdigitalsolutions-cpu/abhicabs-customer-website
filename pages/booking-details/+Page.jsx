import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { fmtINR } from "../../src/data/mockData";
import useBookingLookup from "../../src/hooks/useBookingLookup";
import StateBlock from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import { IconPin } from "../../src/components/Icons";

const STATUS_LABEL = { upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed", cancelled: "Cancelled" };
const STATUS_COLORS = {
  upcoming: { bg: "#FFF7DE", fg: "#B8860B" },
  ongoing: { bg: "#E5F0FF", fg: "#1155CC" },
  completed: { bg: "#e7f6ed", fg: "#1a8a4a" },
  cancelled: { bg: "#FEE2E2", fg: "#B23B00" },
};

// Same real backend status -> display-bucket mapping already used on My
// Bookings, so both pages agree on what "Upcoming"/"Ongoing"/etc. mean.
function toDisplayStatus(realStatus) {
  switch (realStatus) {
    case "COMPLETED": return "completed";
    case "CANCELLED":
    case "EXPIRED": return "cancelled";
    case "EN_ROUTE":
    case "ONGOING":
    case "ARRIVED": return "ongoing";
    default: return "upcoming"; // PENDING, CONFIRMED, ALLOCATED
  }
}

// A simpler, non-celebratory "just show me the details" view — distinct
// from the Confirmation page's success screen (checkmark, "Booking
// Confirmed", etc.), which is only appropriate right after paying, not
// when revisiting an existing booking later from the My Bookings list.
export default function Page() {
  const pageContext = usePageContext();
  const bookingId = pageContext.urlParsed?.search?.b || null;
  const { booking, loading } = useBookingLookup(bookingId);

  if (loading) {
    return <p style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>Loading booking…</p>;
  }

  if (!booking) {
    return (
      <section style={{ padding: "56px 0" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 22px" }}>
          <StateBlock tone="empty" icon={<IconPin className="w-6.5 h-6.5" />}
            title="Booking not found"
            description="We couldn't find that booking. It may have been cancelled, or the link may be incorrect."
            action={<Button href="/my-booking">Back to My Bookings</Button>}
          />
        </div>
      </section>
    );
  }

  const displayStatus = toDisplayStatus(booking.status);
  const sc = STATUS_COLORS[displayStatus];

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 22px 70px" }}>
      <a href="/my-booking" className="inline-flex items-center gap-1.5 hover:!text-[#111]" style={{ color: "#666", fontWeight: 700, fontSize: 13.5, marginBottom: 18 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to My Bookings
      </a>

      <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ height: 150, background: "linear-gradient(135deg,#FFF7DE,#F7F7F7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <path d="M4 16l1.5-5A2 2 0 017.4 9.5h9.2a2 2 0 011.9 1.5L20 16" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="2.5" y="16" width="19" height="4" rx="1.5" stroke="#B8860B" strokeWidth="1.5" />
            <circle cx="7" cy="20" r="1.6" fill="#B8860B" />
            <circle cx="17" cy="20" r="1.6" fill="#B8860B" />
            <path d="M8 9.5l1-3.5h6l1 3.5" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ padding: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(20px,2.6vw,26px)", margin: 0, letterSpacing: "-.01em" }}>
              {booking.pickup} → {booking.drop}
            </h1>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 9999, background: sc.bg, color: sc.fg, flexShrink: 0 }}>
              {STATUS_LABEL[displayStatus]}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>Booking {booking.bookingId}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "18px 16px", fontSize: 13.5, paddingBottom: 18, borderBottom: "1px dashed #EFEFEF" }}>
            <DetailCell label="Vehicle" value={booking.vehicle || "—"} />
            <DetailCell label="Date & Time" value={`${booking.date} · ${booking.time}`} />
            <DetailCell label="Passengers" value={booking.passengerCount || "—"} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 18 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#666" }}>Total</span>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 24 }}>{fmtINR(booking.fare)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function DetailCell({ label, value }) {
  return (
    <div>
      <div style={{ color: "#999", fontSize: 11.5, fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
