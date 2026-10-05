import VehicleHero from "../../src/components/VehicleHero";
import { formatDateTime } from "../../src/lib/dateTime";
import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { fmtINR } from "../../src/data/mockData";
import useVehicleLookup from "../../src/hooks/useVehicleLookup";
import useBookingLookup from "../../src/hooks/useBookingLookup";
import StateBlock from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import {
  IconPin, IconMapPin, IconCar, IconClock, IconUsers, IconReceipt,
  IconNavigation, IconCheckCircle, IconXCircle,
} from "../../src/components/Icons";

const STATUS_LABEL = { upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed", cancelled: "Cancelled" };
const STATUS_COLORS = {
  upcoming: { bg: "#FFF7DE", fg: "#B8860B" },
  ongoing: { bg: "#E5F0FF", fg: "#1155CC" },
  completed: { bg: "#e7f6ed", fg: "#1a8a4a" },
  cancelled: { bg: "#FEE2E2", fg: "#B23B00" },
};
const STATUS_ICON = {
  upcoming: IconClock,
  ongoing: IconNavigation,
  completed: IconCheckCircle,
  cancelled: IconXCircle,
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
  const lookupVehicle = useVehicleLookup();
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
  const StatusIcon = STATUS_ICON[displayStatus];

  return (
    <main className="page-main" style={{ maxWidth: 760, margin: "0 auto", padding: "24px 22px 70px" }}>
      <a href="/my-booking" className="inline-flex items-center gap-1.5 hover:!text-[#111]" style={{ color: "#666", fontWeight: 600, fontSize: 13.5, marginBottom: 18 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to My Bookings
      </a>

      <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ aspectRatio: "16/9", overflow: "hidden", background: "#F7F7F7", position: "relative" }}>
          <VehicleHero booking={booking} lookupVehicle={lookupVehicle} />
        </div>
        <div style={{ padding: "clamp(18px,4vw,26px)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
            <h1 style={{ display: "flex", alignItems: "flex-start", gap: 8, fontWeight: 700, fontSize: "clamp(18px,2.6vw,26px)", margin: 0, letterSpacing: "-.01em", flex: 1, minWidth: 0 }}>
              <span style={{ color: "#B8860B", flexShrink: 0, marginTop: 3, display: "inline-flex" }}><IconMapPin className="w-5 h-5" /></span>
              <span style={{ minWidth: 0, wordBreak: "break-word" }}>{booking.pickup} → {booking.drop}</span>
            </h1>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 9999, background: sc.bg, color: sc.fg, flexShrink: 0, whiteSpace: "nowrap" }}>
              <StatusIcon className="w-3.5 h-3.5" />
              {STATUS_LABEL[displayStatus]}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 22px", paddingLeft: 28 }}>Booking {booking.bookingId}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "18px 16px", fontSize: 13.5, paddingBottom: 18, borderBottom: "1px dashed #EFEFEF" }}>
            <DetailCell icon={<IconCar className="w-4 h-4" />} label="Vehicle" value={booking.vehicle || "—"} />
            <DetailCell icon={<IconClock className="w-4 h-4" />} label="Date & Time" value={formatDateTime(booking.date, booking.time)} />
            <DetailCell icon={<IconUsers className="w-4 h-4" />} label="Passengers" value={booking.passengerCount || "—"} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 18 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: "#666" }}>
              <span style={{ color: "#B8860B", display: "inline-flex" }}><IconReceipt className="w-4 h-4" /></span>
              Total
            </span>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 24 }}>{fmtINR(booking.fare)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function DetailCell({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: "#FFF7DE", color: "#B8860B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#999", fontSize: 11.5, fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 600, wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}
