import React from "react";
import BookingWidget from "./BookingWidget";

// Rebuilt to match the Figma bundler export exactly.
//
// Two sibling <section>s, per spec:
// 1. Hero photo + gradient + headline (background #0d0d0d).
// 2. Booking Engine — overlaps the hero via a simple negative top margin
//    (margin-top: clamp(-96px,-9vw,-110px)), NOT absolute positioning.
//    This replaces an earlier, more complex absolute-position
//    implementation (top:547/left:182 from a partial screenshot) — this
//    full spec shows the actual, simpler technique the design really uses.
export default function HeroSection({ widgetKey, widgetProps }) {
  return (
    <>
      {/* HERO */}
      <section style={{ position: "relative", background: "#0d0d0d", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src="/images/Herosection.jpg"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(100deg,rgba(13,13,13,.95) 0%,rgba(13,13,13,.82) 38%,rgba(13,13,13,.35) 72%,rgba(13,13,13,.15) 100%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "clamp(48px,7vw,92px) 22px clamp(120px,12vw,150px)" }}>
          <div style={{ maxWidth: 640 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 9, padding: "8px 15px",
                borderRadius: 9999, background: "rgba(255,193,7,.13)", border: "1px solid rgba(255,193,7,.35)",
                color: "#FFC107", fontWeight: 600, fontSize: 12, letterSpacing: ".05em",
              }}
            >
              PREMIUM MOBILITY · KARNATAKA &amp; HYDERABAD
            </span>
            <h1
              style={{
                fontWeight: 800, fontSize: "clamp(38px,6vw,74px)", lineHeight: 1.02, color: "#fff",
                margin: "22px 0 0", letterSpacing: "-.025em", maxWidth: "min(850px, 100%)",
              }}
            >
              Travel Far.<br /><span style={{ color: "#FFC107", whiteSpace: "nowrap" }}>Travel Comfortably.</span>
            </h1>
            <p
              style={{
                fontSize: "clamp(15px,1.7vw,19px)", lineHeight: 1.6, color: "rgba(255,255,255,.72)",
                fontWeight: 400, margin: "20px 0 0", maxWidth: 540,
              }}
            >
              Reliable chauffeur-driven cabs, airport transfers, outstation travel and group transportation — all in one place.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(180px, 1fr))", gap: "12px 40px", marginTop: 26, maxWidth: 480 }}>
              {["Verified Drivers", "Transparent Pricing", "Comfortable Vehicles", "24×7 Support"].map((f) => (
                <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#fff", fontWeight: 500, fontSize: 14 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#FFC107" />
                    <path d="M8 12.5l2.5 2.5 5-5.5" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING ENGINE (overlaps hero) */}
      <section id="booking" style={{ position: "relative", marginTop: "clamp(-40px,-9vw,-110px)", zIndex: 5 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 22px" }}>
          <div
            style={{
              background: "#fff", borderRadius: 22, boxShadow: "0 30px 70px rgba(0,0,0,.22)",
              border: "1px solid #EFEFEF", overflow: "hidden",
            }}
          >
            <BookingWidget key={widgetKey} {...widgetProps} />
          </div>
        </div>
      </section>
    </>
  );
}
