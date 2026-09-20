import React from "react";

// Rebuilt to match the Figma bundler export exactly ("FEATURED VEHICLES").
export default function GroupFleetSection({ vehicles, onViewDetails, id = "group-fleet" }) {
  return (
    <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 34px" }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Featured Vehicles</span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Premium &amp; Group Fleet</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,230px),1fr))", gap: 18 }}>
        {vehicles.map((v) => (
          <div key={v.name} style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ height: 128, background: "linear-gradient(135deg,#F0F0F0,#FAFAFA)", position: "relative" }}>
              <img src={v.img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "absolute", top: 9, left: 10, fontSize: 10, fontWeight: 600, color: "#111", background: "#FFC107", padding: "3px 9px", borderRadius: 9999 }}>
                {v.seats}
              </span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 4px", lineHeight: 1.25 }}>{v.name}</h3>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 10 }}>{v.type}</div>
              <button
                onClick={() => onViewDetails(v)}
                className="hover:!bg-primary"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: "#F7F7F7", color: "#111", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
