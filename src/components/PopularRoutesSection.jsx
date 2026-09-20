import React from "react";

// Rebuilt to match the Figma bundler export exactly. Note: this section
// carries id="services" in the spec (the header nav's "Services" link
// scrolls here), not a separate services grid.
const BADGE_COLORS = {
  Intercity: { bg: "rgba(255,193,7,.9)", fg: "#111" },
  Outstation: { bg: "#111", fg: "#fff" },
  "Long Distance": { bg: "rgba(255,255,255,.9)", fg: "#111" },
};

export default function PopularRoutesSection({ routes, onBook, id = "services" }) {
  return (
    <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 34px" }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Routes</span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 6px", letterSpacing: "-.02em" }}>Popular Routes</h2>
        <p style={{ fontSize: 15.5, color: "#666", fontWeight: 400, margin: 0 }}>Explore some of the routes travellers book most often.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 20 }}>
        {routes.map((r) => {
          const badge = BADGE_COLORS[r.badge] || BADGE_COLORS.Intercity;
          return (
            <div key={`${r.from}-${r.to}`} style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #EFEFEF", background: "#fff" }} className="hover:-translate-y-1.5 transition-transform">
              <div style={{ position: "relative", height: 172, overflow: "hidden" }}>
                <img src={r.img} alt={`${r.from} to ${r.to}`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                <span style={{ position: "absolute", top: 12, left: 12, padding: "5px 11px", borderRadius: 9999, background: badge.bg, color: badge.fg, fontWeight: 600, fontSize: 11, zIndex: 2 }}>
                  {r.badge}
                </span>
              </div>
              <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{r.from} → {r.to}</div>
                <button
                  onClick={() => onBook(r)}
                  className="hover:!bg-black"
                  style={{ flex: "none", padding: "9px 15px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 600, fontSize: 12.5, border: "none", cursor: "pointer" }}
                >
                  Book Route
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
