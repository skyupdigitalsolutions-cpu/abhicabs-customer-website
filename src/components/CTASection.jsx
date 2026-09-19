import React from "react";

// Rebuilt to match the Figma bundler export exactly ("FINAL CTA",
// id="contact" — the header utility bar's Support link and footer's
// Contact link scroll here).
export default function CTASection({ onBookMode, id = "contact" }) {
  return (
    <section id={id} style={{ margin: "clamp(46px,6vw,80px) 0 0", position: "relative", overflow: "hidden", background: "#0d0d0d" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <img src="/images/dashboard-pov.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(13,13,13,.82),rgba(13,13,13,.9))", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 820, margin: "0 auto", padding: "clamp(56px,8vw,100px) 22px", textAlign: "center" }}>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(30px,4.4vw,56px)", lineHeight: 1.08, color: "#fff", margin: 0, letterSpacing: "-.025em" }}>
          Wherever the Road <span style={{ color: "#FFC107" }}>Takes You.</span>
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,.7)", fontWeight: 400, margin: "18px auto 32px", maxWidth: 500 }}>
          Book your next journey across Karnataka and Hyderabad.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          <button
            onClick={() => onBookMode("one-way")}
            className="hover:!bg-[#FFB300]"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "16px 32px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer" }}
          >
            Book a Cab
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            onClick={() => onBookMode("group-coach")}
            className="hover:!border-white"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "16px 32px", borderRadius: 9999, background: "transparent", border: "1.5px solid rgba(255,255,255,.35)", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer" }}
          >
            Request Group Quote
          </button>
        </div>
      </div>
    </section>
  );
}
