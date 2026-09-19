import React from "react";

// Rebuilt to match the Figma bundler export exactly — two banners with
// genuinely different layouts (not a shared variant system): the first is
// a full-bleed dark photo with left-aligned text; the second is solid
// yellow with the photo confined to the right 52% and text on the left.
export default function PromoBannersSection({ onOutstation, onGroup }) {
  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 22 }}>
        {/* Outstation */}
        <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", minHeight: 260, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <img src="/images/weekend.jpg" alt="Outstation trips" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(13,13,13,.9),rgba(13,13,13,.5))", pointerEvents: "none" }} />
          <div style={{ position: "relative", padding: "clamp(24px,3vw,40px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start" }}>
            <span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#FFC107" }}>Outstation</span>
            <h3 style={{ fontWeight: 800, fontSize: "clamp(24px,2.8vw,34px)", color: "#fff", margin: "10px 0 8px", lineHeight: 1.1 }}>Weekend Getaway?</h3>
            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.75)", fontWeight: 400, margin: "0 0 20px", maxWidth: 300 }}>
              Take the road to your next destination in comfort.
            </p>
            <button onClick={onOutstation} className="hover:!bg-[#FFB300]" style={{ padding: "13px 24px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
              Book Outstation
            </button>
          </div>
        </div>

        {/* Group Travel */}
        <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", minHeight: 260, display: "flex", background: "#FFC107" }}>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "52%" }}>
            <img src="/images/40seater.jpg" alt="Group travel" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#FFC107 40%,rgba(255,193,7,.2) 62%,transparent)", pointerEvents: "none" }} />
          <div style={{ position: "relative", padding: "clamp(24px,3vw,40px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", maxWidth: "60%" }}>
            <span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#7a5c00" }}>Group Travel</span>
            <h3 style={{ fontWeight: 800, fontSize: "clamp(24px,2.8vw,34px)", color: "#111", margin: "10px 0 8px", lineHeight: 1.1 }}>Travelling With a Group?</h3>
            <p style={{ fontSize: 14.5, color: "#3a2f00", fontWeight: 500, margin: "0 0 20px" }}>
              Comfortable vehicles for every group size.
            </p>
            <button onClick={onGroup} className="hover:!bg-black" style={{ padding: "13px 24px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
              Explore Group Travel
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
