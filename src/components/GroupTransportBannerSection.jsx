import React from "react";

// Rebuilt to match the Figma bundler export exactly.
export default function GroupTransportBannerSection({ seaterOptions, exploreHref = "#fleet", onRequestQuote }) {
  return (
    <section style={{ margin: "clamp(46px,6vw,80px) 0 0", background: "#111", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, right: -80, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,193,7,.16),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(48px,6vw,82px) 22px", position: "relative" }}>
        <div style={{ maxWidth: 640 }}>
          <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#FFC107" }}>Group Transportation</span>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(28px,3.8vw,46px)", lineHeight: 1.1, margin: "10px 0 0", letterSpacing: "-.02em", color: "#fff" }}>
            Travelling With a Group?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,.65)", fontWeight: 400, margin: "16px 0 0", maxWidth: 520 }}>
            From family tours and corporate travel to school and college groups, travel together in comfort — 12 to 49 seat coaches available.
          </p>
        </div>
        <div className="ac-scroll" style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "28px 0 32px" }}>
          {seaterOptions.map((n) => (
            <button
              key={n}
              className="hover:!bg-primary hover:!text-brand-black hover:!border-primary"
              style={{ padding: "14px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              {n} Seater
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <a
            href={exploreHref}
            className="hover:!bg-[#FFB300]"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 28px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15 }}
          >
            Explore Group Vehicles
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <button
            onClick={onRequestQuote}
            className="hover:!border-white"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 28px", borderRadius: 9999, background: "transparent", border: "1.5px solid rgba(255,255,255,.3)", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
          >
            Request Group Quote
          </button>
        </div>
      </div>
    </section>
  );
}
