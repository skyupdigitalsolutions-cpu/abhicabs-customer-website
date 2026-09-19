import React from "react";

// Rebuilt to match the Figma bundler export exactly ("COVERAGE MAP",
// id="cities" — the header nav's "Cities" link scrolls here).
export default function CoverageSection({ coverage, id = "cities" }) {
  const regions = Object.entries(coverage);
  return (
    <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ background: "#111", borderRadius: 26, overflow: "hidden", display: "flex", flexWrap: "wrap", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "26px 26px", pointerEvents: "none" }} />
        <div style={{ flex: "1 1 340px", minWidth: "min(100%,320px)", padding: "clamp(28px,3.4vw,52px)", position: "relative" }}>
          <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#FFC107" }}>Coverage</span>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.1, margin: "10px 0 14px", letterSpacing: "-.02em", color: "#fff" }}>Built Around Your Routes</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.6)", fontWeight: 400, margin: "0 0 24px", maxWidth: 440 }}>
            Deep regional coverage across Karnataka and Telangana — the routes you actually travel.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 26 }}>
            {regions.map(([region, cities], i) => (
              <div key={region} style={{ flex: "1 1 170px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5, color: "#fff", marginBottom: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "#fff" : "#FFC107" }} />
                  {region}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {cities.map((c) => (
                    <span
                      key={c}
                      style={{
                        padding: "6px 11px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                        background: i === 0 ? "rgba(255,255,255,.08)" : "rgba(255,193,7,.14)",
                        color: i === 0 ? "rgba(255,255,255,.85)" : "#FFC107",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: "1 1 340px", minWidth: "min(100%,320px)", padding: "clamp(20px,2.4vw,40px)", position: "relative", display: "flex", alignItems: "center" }}>
          <svg viewBox="0 0 420 340" style={{ width: "100%", height: "auto", display: "block" }}>
            <path d="M80 100 Q160 70 165 165" stroke="#FFC107" strokeWidth="2.5" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
            <path d="M165 165 Q125 235 100 275" stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
            <path d="M165 165 Q225 150 235 108" stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
            <path d="M165 165 L345 130" stroke="#FFC107" strokeWidth="2.5" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
            <path d="M345 130 Q375 185 355 225" stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
            <g fontFamily="Poppins,sans-serif">
              <circle cx="165" cy="165" r="9" fill="#FFC107" /><circle cx="165" cy="165" r="17" fill="none" stroke="#FFC107" strokeWidth="1.5" opacity=".5" />
              <text x="165" y="197" fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle">Bengaluru</text>
              <circle cx="80" cy="100" r="5" fill="#fff" /><text x="80" y="88" fill="rgba(255,255,255,.75)" fontSize="11" textAnchor="middle">Hubballi</text>
              <circle cx="100" cy="275" r="5" fill="#fff" /><text x="100" y="295" fill="rgba(255,255,255,.75)" fontSize="11" textAnchor="middle">Mangaluru</text>
              <circle cx="235" cy="108" r="5" fill="#fff" /><text x="235" y="96" fill="rgba(255,255,255,.75)" fontSize="11" textAnchor="middle">Mysuru</text>
              <circle cx="345" cy="130" r="9" fill="#FFC107" /><circle cx="345" cy="130" r="17" fill="none" stroke="#FFC107" strokeWidth="1.5" opacity=".5" />
              <text x="345" y="116" fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle">Hyderabad</text>
              <circle cx="355" cy="225" r="5" fill="#fff" /><text x="355" y="245" fill="rgba(255,255,255,.75)" fontSize="11" textAnchor="middle">Warangal</text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
