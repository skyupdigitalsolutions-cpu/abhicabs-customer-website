import React, { useRef } from "react";

// "CHOOSE YOUR RIDE" carousel — replaces the earlier tabs+grid
// (FleetChooseRideSection) with a horizontally-scrolling carousel of cards,
// matching the Figma bundler export exactly.
export default function FleetCarouselSection({ vehicles, onViewDetails, onViewAll }) {
  const scrollRef = useRef(null);

  function scrollBy(dir) {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }

  return (
    <section id="fleet" style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 26 }}>
        <div>
          <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Our Fleet</span>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 6px", letterSpacing: "-.02em" }}>Choose Your Ride</h2>
          <p style={{ fontSize: 15.5, color: "#666", fontWeight: 400, margin: 0, maxWidth: 520 }}>
            From everyday city travel to large group journeys, choose the vehicle that fits your trip.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => scrollBy(-1)} aria-label="Previous" style={{ width: 44, height: 44, borderRadius: "50%", border: "1.5px solid #E5E5E5", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={() => scrollBy(1)} aria-label="Next" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "#111", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="ac-scroll"
        style={{ display: "flex", gap: 20, overflowX: "hidden", scrollBehavior: "smooth", paddingBottom: 12, scrollSnapType: "x mandatory" }}
      >
        {vehicles.map((v) => (
          <div
            key={v.id}
            style={{ flex: "0 0 280px", scrollSnapAlign: "start", background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <div style={{ height: 150, background: "linear-gradient(135deg,#FFF7DE,#F7F7F7)", position: "relative", overflow: "hidden", flex: "none" }}>
              <img src={v.img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>{v.name}</h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#666", background: "#F7F7F7", padding: "4px 9px", borderRadius: 9999, flexShrink: 0 }}>{v.seats} Seater</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#666", fontWeight: 500, margin: "6px 0 14px" }}>
                {v.ac ? "A/C" : "Non-A/C"} · {v.category}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: "#666" }}>Local from</span>
                <span style={{ fontWeight: 700, color: "#111" }}>₹{v.local?.base8hr80km ?? "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "#666" }}>Outstation</span>
                <span style={{ fontWeight: 700, color: "#B8860B" }}>₹{v.outstation?.perKm ?? "—"}/km</span>
              </div>
              <button
                onClick={() => onViewDetails(v)}
                className="hover:!bg-[#111] hover:!text-white"
                style={{ marginTop: "auto", width: "100%", padding: 11, borderRadius: 11, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13.5, cursor: "pointer", flexShrink: 0 }}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "right", marginTop: 6 }}>
        <button
          onClick={onViewAll}
          className="hover:!text-[#B8860B]"
          style={{ background: "none", border: "none", color: "#111", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          View All Vehicles
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </section>
  );
}
