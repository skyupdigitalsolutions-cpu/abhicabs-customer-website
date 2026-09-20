import React from "react";

// Rebuilt to match the Figma bundler export exactly.
export default function ReviewsSection({ reviews }) {
  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 34px" }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Reviews</span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>What Our Customers Say</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,280px),1fr))", gap: 22 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ color: "#FFC107", fontSize: 16, letterSpacing: 2 }}>{"★".repeat(r.stars || 5)}</div>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "#333", fontWeight: 400, flex: 1, margin: 0 }}>[{r.quote}]</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flex: "none", background: "#F7F7F7" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>{r.meta}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
