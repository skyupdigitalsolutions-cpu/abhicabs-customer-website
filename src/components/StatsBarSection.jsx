import React from "react";

// Rebuilt to match the Figma bundler export exactly.
export default function StatsBarSection({
  stats,
  disclaimer = "Sample figures shown for layout — replace with verified company data before launch.",
}) {
  return (
    <section style={{ margin: "clamp(46px,6vw,80px) 0 0", background: "#FFC107" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(40px,5vw,60px) 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 20 }}>
          {stats.map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: "clamp(34px,4.4vw,52px)", color: "#111", lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#3a2f00", marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
        {disclaimer && (
          <p style={{ textAlign: "center", margin: "24px 0 0", fontSize: 11.5, color: "#6b5900", fontWeight: 500 }}>{disclaimer}</p>
        )}
      </div>
    </section>
  );
}
