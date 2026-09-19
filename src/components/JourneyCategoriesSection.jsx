import React from "react";

// Rebuilt to match the Figma bundler export exactly ("EDITORIAL" section,
// titled "Plan Your Next Journey"). Fixed 240px card height (not an
// aspect-ratio box), bottom-left label over a black gradient.
export default function JourneyCategoriesSection({ categories }) {
  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ marginBottom: 34 }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Plan Ahead</span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Plan Your Next Journey</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}>
        {categories.map((c) => (
          <div key={c} style={{ position: "relative", borderRadius: 18, overflow: "hidden", height: 240, cursor: "pointer", background: "linear-gradient(135deg,#e5e5e5,#c9c9c9)" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.75),transparent 60%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 18, bottom: 16, pointerEvents: "none" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>{c}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
