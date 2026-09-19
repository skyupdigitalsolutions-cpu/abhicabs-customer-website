import React from "react";

// Rebuilt to match the Figma bundler export exactly.
export default function HowItWorksSection({ steps }) {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 48px" }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>How It Works</span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Book Your Journey in 3 Simple Steps</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 28, position: "relative" }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ textAlign: "center", padding: "0 8px" }}>
            <div
              style={{
                width: 70, height: 70, margin: "0 auto 20px", borderRadius: 22,
                background: i === steps.length - 1 ? "#FFC107" : "#111",
                color: i === steps.length - 1 ? "#111" : "#FFC107",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 23,
              }}
            >
              {s.n}
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 8px" }}>{s.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666", fontWeight: 400, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
