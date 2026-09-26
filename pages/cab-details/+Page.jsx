import React from "react";
import { useSelector } from "react-redux";
import { selectSelectedCab } from "../../src/store/slices/selectionSlice";
import { selectJourney } from "../../src/store/slices/journeySlice";
import { VEHICLE_RATES, fmtINR } from "../../src/data/mockData";
import StateBlock from "../../src/components/StateBlock";
import MobileStickyBar from "../../src/components/MobileStickyBar";
import Button from "../../src/components/ui/Button";
import { IconPin } from "../../src/components/Icons";

// Rebuilt to match the Figma bundler export's "Vehicle Details" visual
// language exactly (card radius 22, gradient image placeholder, pricing
// grid) — rendered as a full page here rather than a modal, since this
// project gives vehicle details its own URL rather than an overlay.
export default function Page() {
  const selected = useSelector(selectSelectedCab);
  const journey = useSelector(selectJourney(selected?.journeyId));
  const vehicle = VEHICLE_RATES.find((v) => v.id === selected?.vehicleId);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 22px 70px" }}>
      <Breadcrumb items={[["Home", "/"], ["Available Cabs", "/booking-search"], ["Cab Details", null]]} />

      {!selected || !vehicle || !journey ? (
        <StateBlock
          tone="empty"
          icon={<IconPin className="w-6.5 h-6.5" />}
          title="No cab selected"
          description="Please search and select a cab first."
          action={<Button href="/#booking">Start a Search</Button>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 22 }} className="lg:!grid-cols-[1fr_360px]">
          <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 22, overflow: "hidden" }}>
            <div style={{ position: "relative", height: 260, background: "linear-gradient(135deg,#FFF7DE,#F7F7F7)" }}>
              <img src={selected?.img || selected?.vehicleImg || vehicle.img} alt={vehicle.name} onError={(e) => { const fb = selected?.vehicleImgFallback || vehicle.img || "/images/sedan-studio.jpg"; if (e.currentTarget.src.indexOf(fb) === -1) { e.currentTarget.src = fb; } }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>{vehicle.name}</h1>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#111", background: "#FFF7DE", padding: "5px 12px", borderRadius: 9999 }}>
                  {vehicle.category} · {vehicle.seats} Seater
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "14px 0 18px", fontSize: 13, color: "#666", fontWeight: 500 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="#666" strokeWidth="2" /><path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#666" strokeWidth="2" strokeLinecap="round" /></svg>
                  {vehicle.seats} Seats
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M8 8v8M16 8v8" stroke="#666" strokeWidth="2" strokeLinecap="round" /></svg>
                  A/C
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="5" y="8" width="14" height="10" rx="2" stroke="#666" strokeWidth="2" /><path d="M9 8V6h6v2" stroke="#666" strokeWidth="2" /></svg>
                  {vehicle.bags} Bags
                </span>
              </div>

              <JourneyMini journey={journey} />

              <div style={{ background: "#F7F7F7", borderRadius: 14, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "14px 18px", margin: "22px 0 4px" }}>
                <PricePair label="Local Package" value={fmtINR(vehicle.local?.base8hr80km ?? 0)} />
                <PricePair label="Outstation" value={`₹${vehicle.outstation?.perKm ?? 0}/km`} accent />
                <PricePair label="Extra KM" value={`₹${vehicle.local?.extraKm ?? 0}`} />
                <PricePair label="Driver Allowance" value={fmtINR(vehicle.outstation?.driverBhata ?? 0)} />
              </div>

              <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: "22px 0 10px" }}>Included Services</h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "#666", paddingLeft: 18, margin: 0 }}>
                <li>Fuel &amp; driver charges included</li>
                <li>All applicable taxes included</li>
                <li>Free cancellation up to 1 hour before pickup</li>
                <li>24×7 in-trip support</li>
              </ul>

              <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: "22px 0 10px" }}>Cancellation Policy</h3>
              <p style={{ fontSize: 13.5, color: "#666", lineHeight: 1.6, margin: 0 }}>
                Free cancellation up to 1 hour before pickup. Cancellations within 1 hour of pickup are subject to a partial fee.
                See our <a href="/cancellation" style={{ color: "#FFC107", fontWeight: 600 }}>Cancellation &amp; Refund Policy</a> for details.
              </p>
            </div>
          </div>

          <FareCard fare={selected.fare} />
        </div>
      )}

      {selected && vehicle && journey && (
        <MobileStickyBar label={fmtINR(selected.fare)} sub="Total fare" ctaLabel="Continue Booking" href="/checkout" />
      )}
    </main>
  );
}

function PricePair({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: accent ? "#B8860B" : "#111" }}>{value}</div>
    </div>
  );
}

function JourneyMini({ journey }) {
  return (
    <div style={{ background: "#F7F7F7", borderRadius: 14, padding: 16, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 15 }}>
        <IconPin className="w-4 h-4 text-primary" />
        {journey.pickup} → {journey.drop}
      </div>
      <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#666" }}>
        <div>Date<b style={{ display: "block", fontSize: 14, color: "#111" }}>{journey.date}</b></div>
        <div>Time<b style={{ display: "block", fontSize: 14, color: "#111" }}>{journey.time}</b></div>
      </div>
    </div>
  );
}

function FareCard({ fare }) {
  const base = Math.round(fare * 0.82);
  const driverAllowance = Math.round(fare * 0.08);
  const tax = fare - base - driverAllowance;
  return (
    <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 22, position: "sticky", top: 120 }}>
      <h3 style={{ fontSize: 16.5, fontWeight: 700, margin: "0 0 14px" }}>Fare Breakdown</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
        <FareRow label="Base Fare" value={fmtINR(base)} />
        <FareRow label="Driver Allowance" value={fmtINR(driverAllowance)} />
        <FareRow label="Taxes & Fees" value={fmtINR(tax)} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 14, marginTop: 14, borderTop: "1px dashed #EFEFEF" }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
        <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22 }}>{fmtINR(fare)}</span>
      </div>
      <a
        href="/checkout"
        className="hidden md:flex hover:!bg-[#FFB300]"
        style={{ marginTop: 16, width: "100%", padding: 15, borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15, textAlign: "center", justifyContent: "center", alignItems: "center" }}
      >
        Continue Booking
      </a>
    </div>
  );
}

function FareRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#666", marginBottom: 18 }}>
      {items.map(([label, href], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span>/</span>}
          {href ? <a href={href} className="hover:!text-primary" style={{ fontWeight: 600 }}>{label}</a> : <span>{label}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
